import torch
from pathlib import Path

# Device
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

BASE_DIR = Path(__file__).resolve().parent.parent

# Dataset
DATA_DIR = str(BASE_DIR / "data" / "Dataset")

# Training parameters
BATCH_SIZE = 32  # Reduced for better learning
NUM_EPOCHS = 30
LEARNING_RATE = 0.0001  # Reduced for stable training
IMG_SIZE = 64  # Increased for better detail capture
EARLY_STOPPING_PATIENCE = 8

# Model path
MODEL_PATH = str(BASE_DIR / "models" / "model.pth")

# Emotion classes
EMOTION_CLASSES = ["Angry", "Disgust", "Fear", "Happy", "Neutral", "Sad", "Surprise"]
