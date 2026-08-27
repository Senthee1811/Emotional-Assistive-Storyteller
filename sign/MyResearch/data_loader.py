import os
import csv
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import pickle

from config import DATASET_FILE, LABEL_ENCODER_FILE, DATA_CONFIG

class DataLoader:
    def __init__(self):
        self.sequences = []
        self.labels = []
        self.label_encoder = None
        self.max_len = 0
        
    def load_dataset(self):
        print("Loading dataset...")
        
        if not os.path.exists(DATASET_FILE):
            print(f"Dataset file '{DATASET_FILE}' not found!")
            return False
        
        self.sequences = []
        self.labels = []
        
        try:
            with open(DATASET_FILE, "r") as f:
                reader = csv.reader(f)
                try:
                    header = next(reader)
                except StopIteration:
                    print("Dataset file is empty!")
                    return False
                
                for row_num, row in enumerate(reader):
                    if row and len(row) > 2:
                        self.labels.append(row[0].strip())
                        try:
                            features = [float(x) for x in row[2:] if x.strip() != ""]
                            self.sequences.append(features)
                        except ValueError:
                            print(f"⚠ Warning: Invalid data in row {row_num+1}")
                            continue
            
            print(f"Loaded {len(self.sequences)} sequences, {len(set(self.labels))} unique labels")
            return True
            
        except Exception as e:
            print(f"Error loading dataset: {e}")
            return False
    
    def encode_labels(self):
        """Encode string labels to integers"""
        if not self.labels:
            return None
        
        self.label_encoder = LabelEncoder()
        y_encoded = self.label_encoder.fit_transform(self.labels)
        
        # Save label encoder
        with open(LABEL_ENCODER_FILE, "wb") as f:
            pickle.dump(self.label_encoder, f)
        
        print(f"Encoded {len(self.label_encoder.classes_)} classes: {self.label_encoder.classes_}")
        return y_encoded
    
    def pad_sequences(self, max_len=None):
        if not self.sequences:
            return np.array([])
        
        if not max_len:
            self.max_len = max(len(seq) for seq in self.sequences)
        else:
            self.max_len = max_len
        
        padded = []
        for seq in self.sequences:
            if len(seq) < self.max_len:
                padded_seq = seq + [0.0] * (self.max_len - len(seq))
            else:
                padded_seq = seq[:self.max_len]
            padded.append(padded_seq)
        
        return np.array(padded)
    
    def prepare_data(self, test_size=0.1):
        X = self.pad_sequences()
        y_encoded = self.encode_labels()
        
        if X.size == 0 or y_encoded is None:
            return None, None, None, None
        
        from tensorflow.keras.utils import to_categorical
        X = X.reshape((X.shape[0], self.max_len, 1))
        y = to_categorical(y_encoded)
        
        if len(X) >= 10:
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=test_size, random_state=42, stratify=y_encoded
            )
            return X_train, X_val, y_train, y_val
        else:
            return X, None, y, None
    
    def load_label_encoder(self):

        if not os.path.exists(LABEL_ENCODER_FILE):
            return None
        
        try:
            with open(LABEL_ENCODER_FILE, "rb") as f:
                return pickle.load(f)
        except Exception as e:
            print(f"Error loading label encoder: {e}")
            return None