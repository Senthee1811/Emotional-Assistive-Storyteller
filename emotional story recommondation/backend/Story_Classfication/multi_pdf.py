import joblib
import re
import nltk
import pdfplumber
from nltk.tokenize import sent_tokenize
import numpy as np
import os

nltk.download('punkt')

# Load trained model
import os
script_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
model_path = os.path.join(script_dir, "models", "Story_Models", "emotion_model.pkl")
vectorizer_path = os.path.join(script_dir, "models", "Story_Models", "emotion_vectorizer.pkl")
labels_path = os.path.join(script_dir, "models", "Story_Models", "emotion_labels.pkl")

model = joblib.load(model_path)
vectorizer = joblib.load(vectorizer_path)
emotion_map = joblib.load(labels_path)
reverse_map = {v: k for k, v in emotion_map.items()}


def clean_text(text):
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^A-Za-z\s]", " ", text)
    return text.lower().strip()


def extract_pdf_text(pdf_path):
    full_text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                full_text += "\n" + page_text
    return full_text.strip()


def predict_sentence(sentence):
    vec = vectorizer.transform([clean_text(sentence)])
    return model.predict_proba(vec)[0]


def predict_pdf_emotion(pdf_path):
    story_text = extract_pdf_text(pdf_path)

    if not story_text:
        return None, None, None


    sentences = sent_tokenize(story_text)

    probabilities_list = []

    # Predict each sentence
    for s in sentences:
        s = s.strip()
        if len(s) > 0:
            probs = predict_sentence(s)
            probabilities_list.append(probs)

    # Average probabilities
    avg_probs = np.mean(probabilities_list, axis=0)

    # Final prediction
    numeric_label = int(np.argmax(avg_probs))
    text_label = reverse_map[numeric_label]

    return numeric_label, text_label, avg_probs




if __name__ == "__main__":
    folder_path = "test_pdfs"

    # Get all PDF files
    pdf_files = [f for f in os.listdir(folder_path) if f.lower().endswith(".pdf")]

    if not pdf_files:
        print("No PDF files found in 'test_pdfs' folder.")
        exit()

    for pdf in pdf_files:
        pdf_path = os.path.join(folder_path, pdf)
        print("\n-***-")
        print("Processing:", pdf)


        num, txt, scores = predict_pdf_emotion(pdf_path)

        if txt is None:
            print("No text found in PDF.")
            continue

        print("Final Emotion (label):", txt)

