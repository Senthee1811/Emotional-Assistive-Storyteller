import torch

# Device
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Dataset
DATA_DIR = "Dataset/"

# Training parameters
BATCH_SIZE = 32  # Reduced for better gradient stability
NUM_EPOCHS = 25  # Increased for better convergence
LEARNING_RATE = 0.0001  # Reduced for stable training
IMG_SIZE = 64  # Increased for better detail capture

# Model path
MODEL_PATH = "model.pth"

#  classes - Updated to match actual dataset structure
EMOTION_CLASSES = ["angry", "disgust", "disgusted", "fear", "fearful", "happy", "neutral", "sad", "surprise", "surprised"]
