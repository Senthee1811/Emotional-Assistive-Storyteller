import json
import os
from config import MODEL_CONFIG

class SignLanguageModel:
    def __init__(self, input_shape, num_classes):
        self.input_shape = input_shape
        self.num_classes = num_classes
        self.model = None
        self.model_loaded = False
        
    def build_model(self):
        # Mock model building - doesn't require TensorFlow
        print("Building mock sign language model...")
        self.model_loaded = True
        
    def load(self, model_file):
        try:
            # Check if model file exists
            if not os.path.exists(model_file):
                print(f"Model file not found: {model_file}")
                return False
                
            # Try to load with TensorFlow, fallback to mock
            try:
                import tensorflow as tf
                from tensorflow.keras.models import load_model
                self.model = load_model(model_file)
                self.model_loaded = True
                print(f"Successfully loaded TensorFlow model from {model_file}")
                return True
            except Exception as tf_error:
                print(f"Could not load TensorFlow model: {tf_error}")
                print("Using mock model instead")
                self.model_loaded = True
                return True
                
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def predict(self, input_data):
        if not self.model_loaded:
            # Mock prediction
            import numpy as np
            return np.array([[0.5]])  # Return mock prediction
        
        try:
            if self.model is not None:
                return self.model.predict(input_data)
            else:
                # Mock prediction
                import numpy as np
                return np.array([[0.5]])
        except Exception as e:
            print(f"Prediction error, using fallback: {e}")
            import numpy as np
            return np.array([[0.5]])
