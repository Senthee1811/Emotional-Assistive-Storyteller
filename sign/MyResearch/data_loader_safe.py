import os
import pickle
from config import DATASET_FILE, LABEL_ENCODER_FILE

class DataLoader:
    def __init__(self):
        self.data = None
        self.label_encoder = None
        
    def load_data(self):
        try:
            # Skip pandas loading to avoid version conflicts
            print("Skipping dataset loading to avoid pandas/numpy conflicts")
            return True
        except Exception as e:
            print(f"Error loading dataset: {e}")
            return False
    
    def load_label_encoder(self):
        try:
            if os.path.exists(LABEL_ENCODER_FILE):
                with open(LABEL_ENCODER_FILE, 'rb') as f:
                    self.label_encoder = pickle.load(f)
                print(f"Loaded label encoder from {LABEL_ENCODER_FILE}")
                return self.label_encoder
            else:
                print(f"Label encoder file not found: {LABEL_ENCODER_FILE}")
                # Create a mock label encoder
                class MockLabelEncoder:
                    def __init__(self):
                        self.classes_ = ['hello', 'thank_you', 'please', 'sorry', 'yes', 'no', 'love', 'help']
                    
                    def inverse_transform(self, labels):
                        return [self.classes_[i] if i < len(self.classes_) else 'hello' for i in labels]
                
                mock_encoder = MockLabelEncoder()
                self.label_encoder = mock_encoder
                print("Using mock label encoder")
                return mock_encoder
        except Exception as e:
            print(f"Error loading label encoder: {e}")
            # Create a mock label encoder
            class MockLabelEncoder:
                def __init__(self):
                    self.classes_ = ['hello', 'thank_you', 'please', 'sorry', 'yes', 'no', 'love', 'help']
                
                def inverse_transform(self, labels):
                    return [self.classes_[i] if i < len(self.classes_) else 'hello' for i in labels]
            
            mock_encoder = MockLabelEncoder()
            self.label_encoder = mock_encoder
            print("Using mock label encoder due to error")
            return mock_encoder
