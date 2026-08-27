"""
Evaluate the trained text emotion model on available splits.

Usage:
  python Story_Classfication/eval_text_model.py
"""

import joblib
import pandas as pd
from pathlib import Path
from sklearn.metrics import accuracy_score, classification_report

BASE = Path(__file__).resolve().parent
MODEL_DIR = BASE.parent / "Story_Models"


def load_artifacts():
    model = joblib.load(MODEL_DIR / "emotion_model.pkl")
    vectorizer = joblib.load(MODEL_DIR / "emotion_vectorizer.pkl")
    label_map = joblib.load(MODEL_DIR / "emotion_labels.pkl")
    reverse = {v: k for k, v in label_map.items()}
    return model, vectorizer, label_map, reverse


def evaluate_split(name, model, vectorizer, label_map, reverse):
    path = BASE / "dataset" / f"{name}.csv"
    if not path.exists():
        return None
    df = pd.read_csv(path, header=0, names=["text", "label"])
    if df["label"].dtype == "object":
        df["label"] = df["label"].map(label_map)
    before = len(df)
    df = df.dropna(subset=["label"])
    dropped = before - len(df)
    if len(df) == 0:
        return 0.0, "No samples after label mapping.", dropped
    X = vectorizer.transform(df["text"].fillna(""))
    y = df["label"]
    preds = model.predict(X)
    acc = accuracy_score(y, preds)
    target_names = [reverse[i] for i in sorted(reverse)]
    report = classification_report(y, preds, target_names=target_names, digits=3)
    return acc, report, dropped


def main():
    model, vectorizer, label_map, reverse = load_artifacts()
    for split in ["training", "validation", "test", "merged_test"]:
        result = evaluate_split(split, model, vectorizer, label_map, reverse)
        if result is None:
            continue
        acc, report, dropped = result
        print(f"\n== {split} ==")
        print(f"Accuracy: {acc:.4f}")
        if dropped:
            print(f"Note: dropped {dropped} rows with unmapped/NaN labels.")
        print(report)


if __name__ == "__main__":
    main()
