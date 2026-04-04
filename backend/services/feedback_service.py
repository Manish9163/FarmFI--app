
from utils.db import get_db

DISEASE_CLASSES = [
    'Apple___Apple_scab',
    'Apple___Black_rot',
    'Apple___Cedar_apple_rust',
    'Apple___healthy',
    'Blueberry___healthy',
    'Cherry_(including_sour)___Powdery_mildew',
    'Cherry_(including_sour)___healthy',
    'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot',
    'Corn_(maize)___Common_rust_',
    'Corn_(maize)___Northern_Leaf_Blight',
    'Corn_(maize)___healthy',
    'Grape___Black_rot',
    'Grape___Esca_(Black_Measles)',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
    'Grape___healthy',
    'Orange___Haunglongbing_(Citrus_greening)',
    'Peach___Bacterial_spot',
    'Peach___healthy',
    'Pepper,_bell___Bacterial_spot',
    'Pepper,_bell___healthy',
    'Potato___Early_blight',
    'Potato___Late_blight',
    'Potato___healthy',
    'Raspberry___healthy',
    'Soybean___healthy',
    'Squash___Powdery_mildew',
    'Strawberry___Leaf_scorch',
    'Strawberry___healthy',
    'Tomato___Bacterial_spot',
    'Tomato___Early_blight',
    'Tomato___Late_blight',
    'Tomato___Leaf_Mold',
    'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite',
    'Tomato___Target_Spot',
    'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    'Tomato___Tomato_mosaic_virus',
    'Tomato___healthy',
]


def _ensure_feedback_history_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS prediction_feedback_history (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            prediction_id   INT          NOT NULL,
            user_id         INT          NOT NULL,
            feedback_type   VARCHAR(20)  NOT NULL,
            is_correct      BOOLEAN      NOT NULL,
            actual_disease  VARCHAR(150),
            comment         TEXT,
            edited_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_pfh_prediction (prediction_id),
            INDEX idx_pfh_user (user_id),
            CONSTRAINT fk_pfh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_pfh_prediction FOREIGN KEY (prediction_id) REFERENCES disease_records(id) ON DELETE CASCADE
        )
        """
    )


def _append_feedback_history(cursor, user_id, prediction_id, feedback_type, is_correct, actual_disease, comment):
    cursor.execute(
        """
        INSERT INTO prediction_feedback_history
            (prediction_id, user_id, feedback_type, is_correct, actual_disease, comment)
        VALUES
            (%s, %s, %s, %s, %s, %s)
        """,
        (prediction_id, user_id, feedback_type, bool(is_correct), actual_disease or '', comment or '')
    )


def submit_feedback(user_id, prediction_id, feedback_type, actual_disease, comment):
    """
    Upserts a feedback record.
    feedback_type: 'Correct' | 'Incorrect'
    actual_disease: filled only when feedback_type == 'Incorrect'
    Returns (result_dict, error_string).
    """
    is_correct = (feedback_type == 'Correct')
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _ensure_feedback_history_table(cursor)

        cursor.execute(
            "SELECT predicted_disease FROM disease_records WHERE id = %s AND user_id = %s",
            (prediction_id, user_id)
        )
        record = cursor.fetchone()
        if not record:
            return None, 'Prediction record not found or does not belong to you'

        cursor.execute(
            "SELECT id FROM prediction_feedback WHERE prediction_id = %s AND user_id = %s",
            (prediction_id, user_id)
        )
        existing = cursor.fetchone()

        stored_actual = actual_disease if not is_correct else ''

        if existing:
            cursor.execute(
                """UPDATE prediction_feedback
                      SET feedback_type = %s,
                          is_correct    = %s,
                          actual_disease = %s,
                          comment       = %s
                    WHERE id = %s""",
                (feedback_type, is_correct, stored_actual, comment or '', existing['id'])
            )
        else:
            cursor.execute(
                """INSERT INTO prediction_feedback
                       (user_id, prediction_id, predicted_disease,
                        actual_disease, feedback_type, is_correct, comment)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (user_id, prediction_id, record['predicted_disease'],
                 stored_actual, feedback_type, is_correct, comment or '')
            )

        _append_feedback_history(
            cursor,
            user_id=user_id,
            prediction_id=prediction_id,
            feedback_type=feedback_type,
            is_correct=is_correct,
            actual_disease=stored_actual,
            comment=comment or '',
        )

        conn.commit()
        return {'success': True, 'message': 'Feedback saved — thank you for helping improve the model!'}, None
    finally:
        cursor.close()
        conn.close()


def get_prediction_feedback_history(user_id, prediction_id):
    """Returns chronological feedback edit history for one prediction record."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _ensure_feedback_history_table(cursor)

        cursor.execute(
            "SELECT id FROM disease_records WHERE id = %s AND user_id = %s",
            (prediction_id, user_id)
        )
        if not cursor.fetchone():
            return None, 'Prediction record not found or does not belong to you'

        cursor.execute(
            """
            SELECT id, prediction_id, user_id, feedback_type, is_correct,
                   actual_disease, comment, edited_at
            FROM prediction_feedback_history
            WHERE prediction_id = %s AND user_id = %s
            ORDER BY edited_at DESC
            """,
            (prediction_id, user_id)
        )
        return cursor.fetchall(), None
    finally:
        cursor.close()
        conn.close()


def get_stats():
    """Aggregated feedback statistics for admin / ML dashboard."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                COUNT(*)                                             AS total,
                SUM(is_correct)                                      AS correct,
                COUNT(*) - SUM(is_correct)                          AS incorrect,
                ROUND(SUM(is_correct) / COUNT(*) * 100, 1)          AS accuracy_pct
            FROM prediction_feedback
        """)
        summary = cursor.fetchone()

        # Top misclassification pairs 
        cursor.execute("""
            SELECT predicted_disease,
                   actual_disease,
                   COUNT(*) AS count
            FROM   prediction_feedback
            WHERE  is_correct = 0
              AND  actual_disease IS NOT NULL
              AND  actual_disease != ''
            GROUP  BY predicted_disease, actual_disease
            ORDER  BY count DESC
            LIMIT  20
        """)
        misclassifications = cursor.fetchall()

        return {'summary': summary, 'top_misclassifications': misclassifications}, None
    finally:
        cursor.close()
        conn.close()


def get_export_rows():
    """Returns all feedback rows for CSV export."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT pf.id,
                   u.full_name          AS user_name,
                   pf.prediction_id,
                   pf.predicted_disease,
                   pf.actual_disease,
                   pf.feedback_type,
                   pf.is_correct,
                   pf.comment,
                   pf.created_at
            FROM   prediction_feedback pf
            JOIN   users u ON u.id = pf.user_id
            ORDER  BY pf.created_at DESC
        """)
        return cursor.fetchall(), None
    finally:
        cursor.close()
        conn.close()
