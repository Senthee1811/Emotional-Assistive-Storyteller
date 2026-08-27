import numpy as np
import csv
import os
from config import DATASET_FILE

class SignPredictor:
    def __init__(self, model, label_encoder):
        self.model = model
        self.label_encoder = label_encoder
        
    def predict(self, text):
        text = text.strip()
        if not text:
            return None, 0.0

        text_lower = text.lower()

        # If the input exactly matches a known label, return it immediately.
        for cls in self.label_encoder.classes_:
            if cls.lower() == text_lower:
                return cls, 1.0

        # Heuristic fallback: if the input contains a known label substring, return it.
        # This helps when the ML model is not trained or returns a constant prediction.
        for cls in self.label_encoder.classes_:
            if cls.lower() in text_lower:
                return cls, 0.9

        # Try to predict via the model if available.
        try:
            seq = [ord(c) for c in text]
            model_input_shape = self.model.input_shape[1]

            if len(seq) < model_input_shape:
                seq = seq + [0] * (model_input_shape - len(seq))
            else:
                seq = seq[:model_input_shape]

            seq_array = np.array(seq).reshape((1, model_input_shape, 1))
            pred = self.model.predict(seq_array, verbose=0)

            pred_label_idx = np.argmax(pred)
            pred_label = self.label_encoder.inverse_transform([pred_label_idx])[0]
            confidence = float(np.max(pred))

            # If the model is essentially untrained (confidence is low), fall back to a heuristic match.
            if confidence < 0.5:
                for cls in self.label_encoder.classes_:
                    if cls.lower() in text_lower:
                        return cls, 0.8

            return pred_label, confidence
        except Exception as e:
            print(f"Prediction error: {e}")

        # Fallbacks when prediction fails or model is untrained: use fuzzy match / substring.
        from difflib import get_close_matches

        # Substring match (high priority)
        for cls in self.label_encoder.classes_:
            if cls.lower() in text_lower:
                return cls, 0.75

        # Fuzzy match on the entire input string
        candidates = [c.lower() for c in self.label_encoder.classes_]
        close = get_close_matches(text_lower, candidates, n=1, cutoff=0.4)
        if close:
            match = close[0]
            idx = candidates.index(match)
            return self.label_encoder.classes_[idx], 0.6

        return None, 0.0
    
    def load_sign_frames(self, label):

        frames = []
        label_lower = label.strip().lower()
        
        if not os.path.exists(DATASET_FILE):
            return frames, None
        
        try:
            with open(DATASET_FILE, "r") as f:
                reader = csv.reader(f)
                try:
                    header = next(reader)
                except StopIteration:
                    return frames, None
                
                for row in reader:
                    if row and len(row) > 0:
                        row_label = row[0].strip().lower()
                        if row_label == label_lower:
                            frames.append(row)
            
            return frames, header
            
        except Exception as e:
            print(f"Error reading dataset: {e}")
            return frames, None
    
    def list_available_labels(self):

        if not os.path.exists(DATASET_FILE):
            return []
        
        try:
            with open(DATASET_FILE, "r") as f:
                reader = csv.reader(f)
                try:
                    header = next(reader)
                except StopIteration:
                    return []
                
                labels = set()
                for row in reader:
                    if row and len(row) > 0:
                        labels.add(row[0].strip().lower())
                
                return sorted(labels)
        except Exception as e:
            print(f"Error reading dataset: {e}")
            return []
import os
from transformers import pipeline
from config import Config

os.environ["TRANSFORMERS_NO_TF"] = "1"


class EmotionPredictor:
    def __init__(self):
        model_dir = os.path.abspath(Config.MODEL_SAVE_DIR)
        self.classifier = pipeline(
            "text-classification",
            model=model_dir,
            tokenizer=model_dir,
            local_files_only=True
        )

    def predict(self, sentence: str):
        result = self.classifier(sentence)[0]
        return result["label"], result["score"]
