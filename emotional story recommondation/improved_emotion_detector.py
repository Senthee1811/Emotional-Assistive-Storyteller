import cv2
import torch
import numpy as np
from pathlib import Path
from collections import deque, Counter
from PIL import Image
from torchvision import transforms
from train import EmotionEnsemble
from config import MODEL_PATH, DEVICE, EMOTION_CLASSES, IMG_SIZE
import time
import urllib.request


class ImprovedEmotionDetector:
    def __init__(self, model_path=MODEL_PATH):
        self.model = EmotionEnsemble().to(DEVICE)
        self.model.load_state_dict(torch.load(model_path, map_location=DEVICE))
        self.model.eval()
        
        # Enhanced transform for inference
        self.transform = transforms.Compose([
            transforms.Grayscale(num_output_channels=3),
            transforms.Resize((IMG_SIZE, IMG_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Temporal smoothing
        self.emotion_history = deque(maxlen=10)
        self.confidence_history = deque(maxlen=10)
        
        # Face detection
        self.face_detector = self._init_face_detector()
        
    def _init_face_detector(self):
        """Initialize YuNet face detector with fallback to Haar"""
        yunet_path = Path(__file__).parent / "models" / "face_detection_yunet_2023mar.onnx"
        
        if yunet_path.exists() and hasattr(cv2, "FaceDetectorYN"):
            try:
                detector = cv2.FaceDetectorYN.create(
                    str(yunet_path),
                    "",
                    (320, 320),
                    score_threshold=0.8,
                    nms_threshold=0.3,
                    top_k=5000,
                )
                return {"type": "yunet", "detector": detector}
            except Exception:
                pass
        
        # Fallback to Haar
        haar = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        return {"type": "haar", "detector": haar}
    
    def detect_faces(self, frame):
        """Detect faces with improved accuracy"""
        h, w = frame.shape[:2]
        
        if self.face_detector["type"] == "yunet":
            self.face_detector["detector"].setInputSize((w, h))
            _, faces = self.face_detector["detector"].detect(frame)
            if faces is None:
                return []
            return [(int(f[0]), int(f[1]), int(f[2]), int(f[3])) for f in faces]
        else:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_detector["detector"].detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=6, minSize=(48, 48)
            )
            return [(int(x), int(y), int(w), int(h)) for x, y, w, h in faces]
    
    def _expand_bbox(self, x, y, w, h, frame_w, frame_h, margin_ratio=0.2):
        """Expand bounding box with margin for better context"""
        pad_w = int(w * margin_ratio)
        pad_h = int(h * margin_ratio)
        x1 = max(0, x - pad_w)
        y1 = max(0, y - pad_h)
        x2 = min(frame_w, x + w + pad_w)
        y2 = min(frame_h, y + h + pad_h)
        return x1, y1, x2, y2
    
    def predict_emotion_with_confidence(self, face_img):
        """Predict emotion with confidence score"""
        img = self.transform(face_img).unsqueeze(0).to(DEVICE)
        
        with torch.no_grad():
            output = self.model(img)
            probabilities = torch.softmax(output, dim=1)
            confidence, predicted = torch.max(probabilities, 1)
            
            emotion = EMOTION_CLASSES[predicted.item()]
            confidence_score = confidence.item()
            
            return emotion, confidence_score, probabilities.squeeze().cpu().numpy()
    
    def smooth_prediction(self, emotion, confidence):
        """Apply temporal smoothing to reduce flickering"""
        self.emotion_history.append(emotion)
        self.confidence_history.append(confidence)
        
        if len(self.emotion_history) >= 3:
            # Weighted voting based on confidence
            emotion_weights = {}
            for hist_emotion, hist_conf in zip(self.emotion_history, self.confidence_history):
                emotion_weights[hist_emotion] = emotion_weights.get(hist_emotion, 0) + hist_conf
            
            # Return emotion with highest weighted vote
            smoothed_emotion = max(emotion_weights.items(), key=lambda x: x[1])[0]
            avg_confidence = np.mean(list(emotion_weights.values()))
            
            return smoothed_emotion, avg_confidence
        
        return emotion, confidence
    
    def process_frame(self, frame):
        """Process single frame for emotion detection"""
        faces = self.face_detector["detector"].detect(frame) if self.face_detector["type"] == "yunet" else None
        
        if self.face_detector["type"] == "yunet":
            h, w = frame.shape[:2]
            self.face_detector["detector"].setInputSize((w, h))
            _, faces = self.face_detector["detector"].detect(frame)
            if faces is None:
                return frame, []
            bboxes = [(int(f[0]), int(f[1]), int(f[2]), int(f[3])) for f in faces]
        else:
            bboxes = self.detect_faces(frame)
        
        results = []
        fh, fw = frame.shape[:2]
        
        for x, y, w, h in bboxes:
            # Expand bbox for better context
            x1, y1, x2, y2 = self._expand_bbox(x, y, w, h, fw, fh)
            
            # Extract face region
            face_img = frame[y1:y2, x1:x2]
            if face_img.size == 0:
                continue
                
            face_pil = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))
            
            # Predict with confidence
            emotion, confidence, probabilities = self.predict_emotion_with_confidence(face_pil)
            
            # Apply temporal smoothing
            smoothed_emotion, avg_confidence = self.smooth_prediction(emotion, confidence)
            
            # Store results
            results.append({
                'bbox': (x1, y1, x2, y2),
                'emotion': smoothed_emotion,
                'confidence': avg_confidence,
                'probabilities': probabilities
            })
            
            # Draw bounding box and label
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Create label with confidence
            label = f"{smoothed_emotion}: {avg_confidence:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
            cv2.rectangle(frame, (x1, y1 - label_size[1] - 10), 
                         (x1 + label_size[0], y1), (0, 255, 0), -1)
            cv2.putText(frame, label, (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        
        return frame, results
    
    def live_detection(self):
        """Run live emotion detection with improvements"""
        cap = cv2.VideoCapture(0)
        print(f"Starting improved emotion detection with {self.face_detector['type']} detector...")
        print("Press 'q' to quit")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            processed_frame, results = self.process_frame(frame)
            
            # Display FPS
            fps_text = f"FPS: {int(cap.get(cv2.CAP_PROP_FPS))}"
            cv2.putText(processed_frame, fps_text, (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            cv2.imshow("Improved Emotion Detection", processed_frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    detector = ImprovedEmotionDetector()
    detector.live_detection()
