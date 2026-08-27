import cv2
import torch
import time
from PIL import Image
from torchvision import transforms
from train import build_model
from config import MODEL_PATH, DEVICE, EMOTION_CLASSES, IMG_SIZE
from Story_Classfication.multi_pdf import predict_pdf_emotion
import pdfplumber
import os
import numpy as np



# LOAD FACE EMOTION MODEL

model = build_model().to(DEVICE)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()

transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


def predict_face(face_img_pil):
    img = transform(face_img_pil).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        output = model(img)
        _, predicted = torch.max(output, 1)
    return EMOTION_CLASSES[predicted.item()]

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


# READ FULL STORY FROM PDF
def extract_pdf_text_only(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
    return text.strip()



# FIND BEST MATCHING STORY PDF

def find_best_story(target_emotion):
    folder_path = "Story_Classfication/test_pdfs"
    pdf_files = [f for f in os.listdir(folder_path) if f.endswith(".pdf")]

    best_pdf = None
    best_score = -1

    preferences = [p.lower() for p in SUGGEST_MAP.get(target_emotion.lower(), [target_emotion])]

    for pdf in pdf_files:
        path = os.path.join(folder_path, pdf)

        num, txt, scores = predict_pdf_emotion(path)
        if txt is None:
            continue

        # match story emotion within preferred list for this detected emotion
        if txt.lower() in preferences:
            score = scores[num]

            if score > best_score:
                best_pdf = pdf
                best_score = score
            

    return best_pdf



# LIVE EMOTION  AVERAGE (+ 15 SEC)

def live_camera():
    cap = cv2.VideoCapture(0)
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    emotion_buffer = []
    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

            face_img = frame[y:y+h, x:x+w]
            face_pil = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))

            emotion = predict_face(face_pil)

            cv2.putText(frame, emotion, (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

            emotion_buffer.append(emotion)

        cv2.imshow("Emotion Detection", frame)

        # Every 15 seconds → calculate average emotion
        if time.time() - start_time >= 15:

            if len(emotion_buffer) > 0:
                final_emotion = max(set(emotion_buffer),
                                    key=emotion_buffer.count)

                print("\n==============================")
                print("15 SEC FINAL EMOTION:", final_emotion)
                print("==============================")

                if final_emotion.lower() != "neutral":

                    best_pdf = find_best_story(final_emotion)

                    if best_pdf:
                        print("BEST STORY PDF:", best_pdf)

                        full_path = os.path.join("Story_Classfication/test_pdfs", best_pdf)
                        story_text = extract_pdf_text_only(full_path)

                        print("\nSTORY CONTENT:")
                        print("--------------***------------------------------")
                        print(story_text)


                    else:
                        print("No matching story found.\n")

            emotion_buffer = []
            start_time = time.time()

        # Quit Q
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    live_camera()
