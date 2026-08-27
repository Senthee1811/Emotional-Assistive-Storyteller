import pandas as pd
import re
import joblib
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.svm import LinearSVC
from sklearn.metrics import accuracy_score, classification_report


# Paths are resolved relative to this file so it works no matter where you run it
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "dataset"
OUTPUT_DIR = BASE_DIR.parent / "Story_Models"


# Label set (expand here if you add more emotions)
EMOTION_LABELS = [
    "sad",
    "happy",
    "love",
    "angry",
    "fearful",
    "neutral",
    "disgust",
    "surprise",
]
emotion_map = {name: idx for idx, name in enumerate(EMOTION_LABELS)}
reverse_map = {v: k for k, v in emotion_map.items()}


def load_split(name: str) -> pd.DataFrame:
    # Files include a header row ("text,label"); we read it as header=0 to skip it
    df = pd.read_csv(DATA_DIR / f"{name}.csv", header=0, names=["text", "label"])
    if df["label"].dtype == "object":
        df["label"] = df["label"].map(emotion_map)
    before = len(df)
    df = df.dropna(subset=["label"])
    dropped = before - len(df)
    if dropped:
        print(f"{name}: dropped {dropped} rows with unmapped labels.")
    return df


# CLEAN TEXT
def clean(text):
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^A-Za-z\s]", " ", text)
    return text.lower().strip()


# Load data
train_df = load_split("training")
val_df = load_split("validation")

train_df["clean"] = train_df["text"].apply(clean)
val_df["clean"] = val_df["text"].apply(clean)


# TF-IDF VECTORIZATION
# Word + char TF-IDF features
word_vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=2)
char_vec = TfidfVectorizer(analyzer="char", ngram_range=(3, 5), min_df=5)
vectorizer = FeatureUnion([("word", word_vec), ("char", char_vec)])

X_train = vectorizer.fit_transform(train_df["clean"])
y_train = train_df["label"]

X_val = vectorizer.transform(val_df["clean"])
y_val = val_df["label"]


# TRAIN MODEL
def compute_class_weights(labels):
    import numpy as np
    counts = pd.Series(labels).value_counts().reindex(range(len(EMOTION_LABELS)), fill_value=1)
    total = counts.sum()
    weights = total / (len(counts) * counts)
    # Manual tweaks: boost sad/neutral/disgust/surprise, dampen love
    multipliers = {
        0: 1.5,  # sad
        5: 2.0,  # neutral
        6: 2.0,  # disgust
        7: 2.0,  # surprise
        2: 0.7   # love
    }
    for idx, mult in multipliers.items():
        weights.iloc[idx] *= mult
    return {cls: w for cls, w in weights.items()}


# class_weight expects mapping from class index to weight
class_weights = compute_class_weights(y_train)

# Train LinearSVC (one-vs-rest) with class weights
model = LinearSVC(class_weight=class_weights)
model.fit(X_train, y_train)


# VALIDATION ACCURACY
y_pred = model.predict(X_val)

print("\nValidation Accuracy:", accuracy_score(y_val, y_pred))
print("\nClassification Report:\n", classification_report(y_val, y_pred, target_names=EMOTION_LABELS))


# SAVE MODEL
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
joblib.dump(model, OUTPUT_DIR / "emotion_model.pkl")
joblib.dump(vectorizer, OUTPUT_DIR / "emotion_vectorizer.pkl")
joblib.dump(emotion_map, OUTPUT_DIR / "emotion_labels.pkl")

print("\nModel trained and saved successfully!")
