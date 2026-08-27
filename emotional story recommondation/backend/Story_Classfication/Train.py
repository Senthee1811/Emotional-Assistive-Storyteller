import pandas as pd
import re
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report



# LOAD DATASETS

train_df = pd.read_csv("dataset/training.csv")
val_df = pd.read_csv("dataset/validation.csv")
train_df.columns = ["text", "label"]
val_df.columns = ["text", "label"]



#  EMOTION MAPPING
emotion_map = {
    "sad": 0,
    "happy": 1,
    "love": 2,
    "angry": 3,
    "fearful": 4
}

# Convert  labels
if train_df["label"].dtype == "object":
    train_df["label"] = train_df["label"].map(emotion_map)
    val_df["label"] = val_df["label"].map(emotion_map)



# CLEAN TEXT
def clean(text):
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^A-Za-z\s]", " ", text)
    return text.lower().strip()

train_df["clean"] = train_df["text"].apply(clean)
val_df["clean"] = val_df["text"].apply(clean)



# TF-IDF VECTORIZATION

vectorizer = TfidfVectorizer(stop_words="english")
X_train = vectorizer.fit_transform(train_df["clean"])
y_train = train_df["label"]

X_val = vectorizer.transform(val_df["clean"])
y_val = val_df["label"]



# TRAIN MODEL

model = LogisticRegression(max_iter=3000)
model.fit(X_train, y_train)


# VALIDATION ACCURACY

y_pred = model.predict(X_val)

print("\nValidation Accuracy:", accuracy_score(y_val, y_pred))
print("\nClassification Report:\n", classification_report(y_val, y_pred))



# SAVE MODEL

joblib.dump(model, "../Story_Models/emotion_model.pkl")
joblib.dump(vectorizer, "../Story_Models/emotion_vectorizer.pkl")
joblib.dump(emotion_map, "../Story_Models/emotion_labels.pkl")

print("\nModel trained and saved successfully!")
