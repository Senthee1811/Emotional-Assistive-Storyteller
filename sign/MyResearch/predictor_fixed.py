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
        for cls in self.label_encoder.classes_:
            if cls.lower() == text_lower:
                return cls, 1.0
        
        seq = [ord(c) for c in text]
        model_input_shape = self.model.input_shape[1]
        
        if len(seq) < model_input_shape:
            seq = seq + [0] * (model_input_shape - len(seq))
        else:
            seq = seq[:model_input_shape]
        
        seq_array = np.array(seq).reshape((1, model_input_shape, 1))
        
        prediction = self.model.predict(seq_array)
        predicted_class = np.argmax(prediction)
        
        emotion = self.label_encoder.inverse_transform([predicted_class])[0]
        confidence = float(np.max(prediction))
        
        return emotion, confidence

class EmotionPredictor:
    def __init__(self):
        try:
            # Try to import transformers pipeline
            from transformers import pipeline
            import os
            
            model_dir = os.path.abspath("model")  # Adjust path as needed
            os.environ["TRANSFORMERS_NO_TF"] = "1"  # Disable TensorFlow
            
            self.classifier = pipeline(
                "text-classification",
                model=model_dir,
                tokenizer=model_dir,
                local_files_only=True
            )
            self.model_loaded = True
            print("EmotionPredictor loaded successfully")
        except Exception as e:
            print(f"Warning: Could not load EmotionPredictor model: {e}")
            self.classifier = None
            self.model_loaded = False

    def predict(self, sentence: str):
        if not self.model_loaded or self.classifier is None:
            # Fallback prediction
            emotions = ["happy", "sad", "angry", "neutral", "surprise"]
            import random
            return random.choice(emotions), 0.5
            
        try:
            result = self.classifier(sentence)[0]
            return result["label"], result["score"]
        except Exception as e:
            print(f"Warning: EmotionPredictor prediction failed: {e}")
            # Fallback prediction
            emotions = ["happy", "sad", "angry", "neutral", "surprise"]
            import random
            return random.choice(emotions), 0.5
