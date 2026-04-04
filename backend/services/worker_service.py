from utils.db import get_db


class WorkerService:
    def register_worker(self, user_id: int, skills: str, daily_rate: float,
                        location: str, bio: str = '') -> dict:
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO workers (worker_id, skills, daily_rate, location, bio) "
                "VALUES (%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE "
                "skills=%s, daily_rate=%s, location=%s, bio=%s",
                (user_id, skills, daily_rate, location, bio,
                 skills, daily_rate, location, bio)
            )
            conn.commit()
            return {'success': True}
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            cursor.close()
            conn.close()

    def list_workers(self, available_only: bool = True) -> list:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            sql = (
                "SELECT w.*, u.full_name, u.phone, u.email "
                "FROM workers w JOIN users u ON w.worker_id = u.id "
            )
            if available_only:
                sql += "WHERE w.is_available = TRUE "
            sql += "ORDER BY w.rating DESC"
            cursor.execute(sql)
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    def get_open_jobs(self) -> list:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT jr.*, u.full_name AS farmer_name "
                "FROM job_requests jr "
                "JOIN users u ON jr.farmer_id = u.id "
                "WHERE jr.worker_id IS NULL AND jr.status = 'Pending' "
                "ORDER BY jr.created_at DESC"
            )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    def request_job(self, farmer_id: int, worker_id, description: str,
                    location: str, expected_days: int, agreed_rate: float) -> dict:
        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO job_requests (farmer_id, worker_id, job_description, location, expected_days, agreed_rate) "
                "VALUES (%s,%s,%s,%s,%s,%s)",
                (farmer_id, worker_id, description, location, expected_days, agreed_rate)
            )
            job_id = cursor.lastrowid
            conn.commit()
            return {'success': True, 'job_id': job_id}
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            cursor.close()
            conn.close()

    def accept_open_job(self, job_id: int, worker_id: int) -> dict:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT status, worker_id FROM job_requests WHERE id = %s", (job_id,))
            job = cursor.fetchone()
            if not job:
                return {'success': False, 'error': 'Job not found'}
            if job['worker_id'] is not None:
                return {'success': False, 'error': 'Job already assigned to someone else'}
            if job['status'] != 'Pending':
                return {'success': False, 'error': 'Job is no longer open'}

            cursor.execute("UPDATE job_requests SET worker_id = %s, status = 'Accepted' WHERE id = %s", (worker_id, job_id))
            cursor.execute(
                "INSERT INTO job_status_logs (job_request_id, changed_by, old_status, new_status, note) "
                "VALUES (%s,%s,%s,%s,%s)",
                (job_id, worker_id, 'Pending', 'Accepted', 'Accepted from open board')
            )
            cursor.execute("UPDATE workers SET is_available = FALSE WHERE worker_id = %s", (worker_id,))
            conn.commit()
            return {'success': True}
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            cursor.close()
            conn.close()

    def update_job_status(self, job_id: int, new_status: str, changed_by: int, note: str = '') -> dict:
        valid = ('Pending', 'Accepted', 'Rejected', 'Completed')
        if new_status not in valid:
            return {'success': False, 'error': f'Status must be one of {valid}'}

        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT status FROM job_requests WHERE id = %s", (job_id,))
            job = cursor.fetchone()
            if not job:
                return {'success': False, 'error': 'Job not found'}

            old_status = job['status']
            cursor.execute("UPDATE job_requests SET status = %s WHERE id = %s", (new_status, job_id))
            cursor.execute(
                "INSERT INTO job_status_logs (job_request_id, changed_by, old_status, new_status, note) "
                "VALUES (%s,%s,%s,%s,%s)",
                (job_id, changed_by, old_status, new_status, note)
            )

            # Mark worker as busy on acceptance
            if new_status == 'Accepted':
                cursor.execute("UPDATE workers SET is_available = FALSE WHERE worker_id = "
                               "(SELECT worker_id FROM job_requests WHERE id = %s)", (job_id,))
            elif new_status in ('Rejected', 'Completed'):
                cursor.execute("UPDATE workers SET is_available = TRUE WHERE worker_id = "
                               "(SELECT worker_id FROM job_requests WHERE id = %s)", (job_id,))

            conn.commit()
            return {'success': True}
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            cursor.close()
            conn.close()

    def get_my_jobs(self, user_id: int, role: str) -> list:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            if role == 'Farmer':
                cursor.execute(
                    "SELECT jr.*, u.full_name AS worker_name, w.daily_rate "
                    "FROM job_requests jr "
                    "JOIN workers w ON jr.worker_id = w.worker_id "
                    "JOIN users u ON w.worker_id = u.id "
                    "WHERE jr.farmer_id = %s ORDER BY jr.created_at DESC",
                    (user_id,)
                )
            else:
                cursor.execute(
                    "SELECT jr.*, u.full_name AS farmer_name "
                    "FROM job_requests jr JOIN users u ON jr.farmer_id = u.id "
                    "WHERE jr.worker_id = %s ORDER BY jr.created_at DESC",
                    (user_id,)
                )
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()
