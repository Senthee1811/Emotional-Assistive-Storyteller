import cv2
import torch
import time
from pathlib import Path
from PIL import Image
from torchvision import transforms
from train import build_model
from config import MODEL_PATH, DEVICE, EMOTION_CLASSES, IMG_SIZE
from Story_Classfication.multi_pdf import predict_pdf_emotion
import pdfplumber
import os
import numpy as np


# Trained Model (same architecture as train.py)
model = build_model().to(DEVICE)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()


# Image Transform (match training pipeline: 3-channel grayscale + ImageNet normalization)
transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


# Preferred story emotions to suggest for each detected face emotion
SUGGEST_MAP = {
    "sad":      ["happy", "neutral"],     # Lift mood or calm down
    "happy":    ["happy", "surprise"],    # Maintain energy
    "angry":    ["neutral", "happy"],     # Cool down or distract
    "fearful":  ["happy", "neutral"],     # Safety and stability
    "neutral":  ["surprise", "happy"],    # Engage and wake up
    "disgust":  ["happy", "surprise"],    # Reset mood
    "surprise": ["happy", "surprise"]     # Channel excitement
}


def extract_pdf_text_only(pdf_path: Path) -> str:
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
    return text.strip()


def find_best_story(target_emotion: str):
    folder_path = Path("Story_Classfication") / "test_pdfs"
    pdf_files = [f for f in folder_path.iterdir() if f.suffix.lower() == ".pdf"]

    best_pdf = None
    best_score = -1

    preferences = [p.lower() for p in SUGGEST_MAP.get(target_emotion.lower(), [target_emotion])]

    for pdf_path in pdf_files:
        num, txt, scores = predict_pdf_emotion(pdf_path)
        if txt is None:
            continue

        if txt.lower() in preferences:
            score = scores[num]
            if score > best_score:
                best_pdf = pdf_path
                best_score = score

    return best_pdf


def recommend_story(emotion: str):
    best_pdf = find_best_story(emotion)
    if not best_pdf:
        print(f"No matching story found for emotion '{emotion}'.")
        return

    story_text = extract_pdf_text_only(best_pdf)
    preview = story_text[:600] + ("..." if len(story_text) > 600 else "")

    print("\n==============================")
    print(f"Detected emotion: {emotion}")
    print(f"Recommended story: {best_pdf.name}")
    print("------------------------------")
    print(preview)
    print("==============================\n")


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

    # Haar cascade
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    last_emotion = None
    last_print_time = 0
    print("Starting camera... Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        for (x, y, w, h) in faces:
            #  face box
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

            # face region
            face_img = frame[y:y + h, x:x + w]
            face_pil = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))

            # Predict
            emotion = predict_face(face_pil)

            # label
            cv2.putText(frame, emotion, (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

            # Only recommend when emotion changes or every 15 seconds to avoid spamming
            now = time.time()
            if emotion != last_emotion or (now - last_print_time) >= 15:
                recommend_story(emotion)
                last_emotion = emotion
                last_print_time = now

        cv2.imshow("Emotion Detection", frame)

        # Quit on Q
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    live_camera()
