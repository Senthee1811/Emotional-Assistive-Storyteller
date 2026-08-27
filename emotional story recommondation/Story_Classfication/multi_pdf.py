import joblib
import re
import nltk
import pdfplumber
from nltk.tokenize import sent_tokenize
import numpy as np
import os
from pathlib import Path

nltk.download('punkt')

# Resolve paths relative to this file so it works regardless of current working dir
BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR.parent / "Story_Models"

# Load trained model artifacts
model = joblib.load(MODEL_DIR / "emotion_model.pkl")
vectorizer = joblib.load(MODEL_DIR / "emotion_vectorizer.pkl")
emotion_map = joblib.load(MODEL_DIR / "emotion_labels.pkl")
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
    # LinearSVC doesn't expose predict_proba; fall back to softmax over decision_function
    if hasattr(model, "predict_proba"):
        return model.predict_proba(vec)[0]
    scores = model.decision_function(vec)
    scores = np.array(scores).ravel()
    exp_scores = np.exp(scores - scores.max())
    probs = exp_scores / exp_scores.sum()
    return probs


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
    folder_path = BASE_DIR / "test_pdfs"

    # Get all PDF files
    pdf_files = [f for f in folder_path.iterdir() if f.suffix.lower() == ".pdf"]

    if not pdf_files:
        print("No PDF files found in 'test_pdfs' folder.")
        exit()

    for pdf_path in pdf_files:
        print("\n-***-")
        print("Processing:", pdf_path.name)

        num, txt, scores = predict_pdf_emotion(pdf_path)

        if txt is None:
            print("No text found in PDF.")
            continue

        print("Final Emotion (label):", txt)

