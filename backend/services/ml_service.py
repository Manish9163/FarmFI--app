import os
import cv2
import numpy as np
import tensorflow as tf

class PlantDiseaseService:
    def __init__(self):
        os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
        os.environ['TF_FORCE_GPU_ALLOW_GROWTH'] = 'true'
        tf.config.set_soft_device_placement(True)
        
        try:
            gpus = tf.config.list_physical_devices('GPU')
            if gpus:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
        except:
            pass

        model_path = os.path.join(os.path.dirname(__file__), '../ml_models/detector_disease.keras')
        self.model = tf.keras.models.load_model(model_path)
        
        self.class_names = [
            'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy',
            'Blueberry___healthy','Cherry_(including_sour)___Powdery_mildew', 'Cherry_(including_sour)___healthy',
            'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', 'Corn_(maize)___Common_rust_',
            'Corn_(maize)___Northern_Leaf_Blight', 'Corn_(maize)___healthy',
            'Grape___Black_rot', 'Grape___Esca_(Black_Measles)', 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)',
            'Grape___healthy', 'Orange___Haunglongbing_(Citrus_greening)', 'Peach___Bacterial_spot',
            'Peach___healthy', 'Pepper,_bell___Bacterial_spot', 'Pepper,_bell___healthy',
            'Potato___Early_blight', 'Potato___Late_blight', 'Potato___healthy',
            'Raspberry___healthy', 'Soybean___healthy', 'Squash___Powdery_mildew',
            'Strawberry___Leaf_scorch', 'Strawberry___healthy', 'Tomato___Bacterial_spot',
            'Tomato___Early_blight', 'Tomato___Late_blight', 'Tomato___Leaf_Mold',
            'Tomato___Septoria_leaf_spot', 'Tomato___Spider_mites Two-spotted_spider_mite',
            'Tomato___Target_Spot', 'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
            'Tomato___Tomato_mosaic_virus', 'Tomato___healthy'
        ]

    def is_leaf(self, img):
        """
        Simple heuristic: Check if image has enough green/yellow/brown 
        pixels to be considered a plant/leaf.
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        lower_green = np.array([25, 40, 40])
        upper_green = np.array([95, 255, 255])
        
        lower_brown = np.array([10, 40, 40])
        upper_brown = np.array([25, 255, 255])

        mask_green = cv2.inRange(hsv, lower_green, upper_green)
        mask_brown = cv2.inRange(hsv, lower_brown, upper_brown)
        
        mask = cv2.bitwise_or(mask_green, mask_brown)
        
        leaf_ratio = cv2.countNonZero(mask) / (img.shape[0] * img.shape[1])
        return leaf_ratio >= 0.05

        # Preprocess matching working logic
    def predict_image(self, image_bytes):
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if not self.is_leaf(img):
            raise ValueError("The uploaded image does not appear to be a plant leaf. Please upload a clear photo of a leaf or plant.")

        # Resize 
        img = cv2.resize(img, (240, 240))
        img = img.astype(np.float32) / 255.0
        img = np.expand_dims(img, axis=0)
        
        predictions = self.model.predict(img)
        predicted_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_idx]) * 100
        disease_name = self.class_names[predicted_idx]
        
        # Logic for risk severity
        severity = "High" if confidence > 85 and "healthy" not in disease_name.lower() else "Medium"
        if "healthy" in disease_name.lower() or confidence < 50:
            severity = "Low"

        return {
            "disease_name": disease_name,
            "confidence": float(f"{confidence:.2f}"),
            "severity_level": severity
        }

    def highlight_disease_regions(self, image_bytes):
        """
        Detect and highlight diseased regions on a leaf image.
        Uses HSV color segmentation to find brown/yellow/black spots
        that indicate disease. Draws farmer-friendly circles + labels.
        Returns: annotated image bytes (PNG), or None if healthy.
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return None

        h, w = img.shape[:2]
        annotated = img.copy()
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # ── Detect diseased regions (non-green areas on the leaf) ──
        # Brown/yellow spots (common in blight, rot, rust)
        lower_brown = np.array([5, 50, 50])
        upper_brown = np.array([25, 255, 200])
        mask_brown = cv2.inRange(hsv, lower_brown, upper_brown)

        # Dark spots (black rot, late blight necrosis)
        lower_dark = np.array([0, 0, 10])
        upper_dark = np.array([180, 80, 80])
        mask_dark = cv2.inRange(hsv, lower_dark, upper_dark)

        # Yellow patches (nutrient deficiency, virus)
        lower_yellow = np.array([18, 80, 80])
        upper_yellow = np.array([35, 255, 255])
        mask_yellow = cv2.inRange(hsv, lower_yellow, upper_yellow)

        # White/powdery areas (powdery mildew)
        lower_white = np.array([0, 0, 200])
        upper_white = np.array([180, 40, 255])
        mask_white = cv2.inRange(hsv, lower_white, upper_white)

        # Combine all disease masks
        disease_mask = cv2.bitwise_or(mask_brown, mask_dark)
        disease_mask = cv2.bitwise_or(disease_mask, mask_yellow)
        disease_mask = cv2.bitwise_or(disease_mask, mask_white)

        # Clean up noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        disease_mask = cv2.morphologyEx(disease_mask, cv2.MORPH_OPEN, kernel, iterations=2)
        disease_mask = cv2.morphologyEx(disease_mask, cv2.MORPH_CLOSE, kernel, iterations=2)

        # Also compute a leaf mask (green areas) to avoid marking background
        lower_green = np.array([25, 30, 30])
        upper_green = np.array([95, 255, 255])
        leaf_mask = cv2.inRange(hsv, lower_green, upper_green)
        leaf_mask = cv2.morphologyEx(leaf_mask, cv2.MORPH_CLOSE, 
                                      cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)), iterations=3)

        # Disease spots that are near/on the leaf
        # Dilate leaf mask to also include edge spots
        leaf_dilated = cv2.dilate(leaf_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)), iterations=2)
        disease_on_leaf = cv2.bitwise_and(disease_mask, leaf_dilated)

        # Find contours of disease spots
        contours, _ = cv2.findContours(disease_on_leaf, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return None  # No disease spots found — likely healthy

        # Filter significant contours (remove tiny noise)
        min_area = (h * w) * 0.002  # At least 0.2% of image
        significant = [c for c in contours if cv2.contourArea(c) > min_area]

        if not significant:
            return None

        # ── Draw annotations ──
        # Semi-transparent red overlay on disease regions
        overlay = annotated.copy()
        
        # Draw filled contours on overlay for transparency effect
        cv2.drawContours(overlay, significant, -1, (0, 0, 255), -1)
        cv2.addWeighted(overlay, 0.25, annotated, 0.75, 0, annotated)

        # Draw contour outlines
        cv2.drawContours(annotated, significant, -1, (0, 0, 255), 2)

        # Draw circles around the top disease regions
        regions = []
        top_regions = sorted(significant, key=cv2.contourArea, reverse=True)
        for i, c in enumerate(top_regions):
            if i >= 5:
                break
            (cx, cy), radius = cv2.minEnclosingCircle(c)
            cx, cy, radius = int(cx), int(cy), int(radius)
            if radius < 8:
                radius = 8

            # Draw circle with padding
            cv2.circle(annotated, (cx, cy), radius + 8, (0, 0, 255), 2)

            regions.append({
                "x": float(f"{cx / w:.3f}"),
                "y": float(f"{cy / h:.3f}"),
                "radius": float(f"{(radius + 8) / max(w, h):.3f}")
            })

        # Add label at the top
        label = "Problem area detected"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.6 * (w / 400)  # Scale with image size
        thickness = max(1, int(w / 300))
        (tw, th), _ = cv2.getTextSize(label, font, font_scale, thickness)

        # Semi-transparent label background
        label_y = 30
        cv2.rectangle(annotated, (8, label_y - th - 8), (tw + 16, label_y + 8), (0, 0, 200), -1)
        cv2.putText(annotated, label, (12, label_y), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

        # Also add count of spots
        count_label = f"{len(significant)} spot{'s' if len(significant) > 1 else ''} found"
        (cw, ch), _ = cv2.getTextSize(count_label, font, font_scale * 0.8, thickness)
        cv2.rectangle(annotated, (8, label_y + 12), (cw + 16, label_y + ch + 24), (0, 0, 200), -1)
        cv2.putText(annotated, count_label, (12, label_y + ch + 16), font, font_scale * 0.8, (255, 255, 255), thickness, cv2.LINE_AA)

        # Encode to PNG
        _, buffer = cv2.imencode('.png', annotated)
        return {
            "image_bytes": buffer.tobytes(),
            "regions": regions,
            "spot_count": len(significant)
        }