# pytorch_infer.py
import sys
import os
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
EMOTION_DIR = ROOT / 'emotional story recommondation'
sys.path.insert(0, str(EMOTION_DIR))

import cv2
import torch
import numpy as np
from PIL import Image
from torchvision import transforms
from train import build_model
from config import DEVICE, EMOTION_CLASSES, IMG_SIZE

MODEL_PATH = str(EMOTION_DIR / 'model.pth')
_model = None

EMOTION_MAP = {
    'happy': 'happy',
    'sad': 'sad',
    'angry': 'angry',
    'fear': 'fear',
    'fearful': 'fear',
    'surprise': 'surprised',
    'surprised': 'surprised',
    'neutral': 'calm',
    'disgust': 'angry',
    'disgusted': 'angry'
}

def get_model():
    global _model
    if _model is None:
        _model = build_model().to(DEVICE)
        _model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
        _model.eval()
    return _model

transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def infer_image(image_path: str):
    if not os.path.exists(image_path):
        return {'error': f'Image not found: {image_path}', 'emotion': 'happy', 'confidence': 0.8}
        
    model = get_model()
    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        return {'error': 'Failed to read image', 'emotion': 'happy', 'confidence': 0.8}
        
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(32, 32))
    
    face_detected = len(faces) > 0
    if face_detected:
        (x, y, w, h) = faces[0]
        pad = int(w * 0.1)
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(img_bgr.shape[1], x + w + pad)
        y2 = min(img_bgr.shape[0], y + h + pad)
        crop = img_bgr[y1:y2, x1:x2]
        face_pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
    else:
        face_pil = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
        
    tensor = transform(face_pil).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        out = model(tensor)
        probabilities = torch.softmax(out, dim=1).cpu().numpy()[0]
        
    all_scores = []
    for idx, cls_name in enumerate(EMOTION_CLASSES):
        mapped = EMOTION_MAP.get(cls_name, cls_name)
        all_scores.append({
            'emotion': mapped,
            'originalEmotion': cls_name,
            'confidence': round(float(probabilities[idx]), 4)
        })
        
    all_scores.sort(key=lambda s: s['confidence'], reverse=True)
    best = all_scores[0]
    
    return {
        'emotion': best['emotion'],
        'dominantEmotion': best['emotion'],
        'confidence': best['confidence'],
        'allEmotions': all_scores,
        'face_detected': face_detected,
        'source': 'PyTorch EmotionEnsemble (model.pth)'
    }

if __name__ == '__main__':
    if len(sys.argv) > 1:
        path = sys.argv[1]
        res = infer_image(path)
        print(json.dumps(res))
    else:
        print(json.dumps({'error': 'No image provided'}))
