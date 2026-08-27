import cv2
import torch
import urllib.request
from pathlib import Path
from collections import deque, Counter
from PIL import Image
from torchvision import transforms
from train import EmotionCNN
from config import MODEL_PATH, DEVICE, EMOTION_CLASSES, IMG_SIZE


# Trained Model
model = EmotionCNN().to(DEVICE)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()


# Image Transform
transform = transforms.Compose([
    transforms.Grayscale(),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5], std=[0.5])
])


# YuNet face detector model (OpenCV Zoo). Falls back to Haar if unavailable.
YUNET_MODEL_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/"
    "face_detection_yunet_2023mar.onnx"
)
YUNET_MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "face_detection_yunet_2023mar.onnx"


def _ensure_yunet_model():
    YUNET_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    if YUNET_MODEL_PATH.exists():
        return str(YUNET_MODEL_PATH)
    try:
        urllib.request.urlretrieve(YUNET_MODEL_URL, str(YUNET_MODEL_PATH))
        return str(YUNET_MODEL_PATH)
    except Exception:
        return None


class FaceDetector:
    def __init__(self):
        self.mode = "haar"
        self.yunet = None
        self.haar = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

        model_path = _ensure_yunet_model()
        if model_path is not None and hasattr(cv2, "FaceDetectorYN"):
            try:
                self.yunet = cv2.FaceDetectorYN.create(
                    model_path,
                    "",
                    (320, 320),
                    score_threshold=0.8,
                    nms_threshold=0.3,
                    top_k=5000,
                )
                self.mode = "yunet"
            except Exception:
                self.yunet = None
                self.mode = "haar"

    def detect(self, frame):
        h, w = frame.shape[:2]
        if self.mode == "yunet" and self.yunet is not None:
            self.yunet.setInputSize((w, h))
            _, faces = self.yunet.detect(frame)
            if faces is None:
                return []
            bboxes = []
            for f in faces:
                x, y, bw, bh = f[:4].astype(int).tolist()
                bboxes.append((x, y, bw, bh))
            return bboxes

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.haar.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5, minSize=(48, 48))
        return [(int(x), int(y), int(wf), int(hf)) for (x, y, wf, hf) in faces]


def _expand_bbox(x, y, w, h, frame_w, frame_h, margin_ratio=0.18):
    pad_w = int(w * margin_ratio)
    pad_h = int(h * margin_ratio)
    x1 = max(0, x - pad_w)
    y1 = max(0, y - pad_h)
    x2 = min(frame_w, x + w + pad_w)
    y2 = min(frame_h, y + h + pad_h)
    return x1, y1, x2, y2


# Predict Emotion
def predict_face(face_img_pil):
    img = transform(face_img_pil).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        output = model(img)
        _, predicted = torch.max(output, 1)

    return EMOTION_CLASSES[predicted.item()]


# Live Detection
def live_camera():
    cap = cv2.VideoCapture(0)
    detector = FaceDetector()
    print(f"Face detector mode: {detector.mode}")
    history = deque(maxlen=5)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        faces = detector.detect(frame)
        fh, fw = frame.shape[:2]

        for (x, y, w, h) in faces:
            x1, y1, x2, y2 = _expand_bbox(x, y, w, h, fw, fh)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # Face region with margin is more stable than tight crop.
            face_img = frame[y1:y2, x1:x2]
            face_pil = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))

            emotion = predict_face(face_pil)
            history.append(emotion)
            smoothed_emotion = Counter(history).most_common(1)[0][0]

            cv2.putText(frame, smoothed_emotion, (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

        cv2.imshow("Emotion Detection", frame)

        # Quit on Q
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    live_camera()
