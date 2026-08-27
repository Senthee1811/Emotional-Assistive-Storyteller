import os


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_FILE = os.path.join(BASE_DIR, "sign_dataset.csv")
MODEL_FILE = os.path.join(BASE_DIR, "sign_model.h5")
LABEL_ENCODER_FILE = os.path.join(BASE_DIR, "label_encoder.pkl")


MODEL_CONFIG = {
    'lstm_units': [128, 64],
    'dense_units': 32,
    'dropout_rate': 0.3,
    'learning_rate': 0.001,
    'batch_size': 8,
    'epochs': 10,
    'patience': 10,
    'test_size': 0.1
}

# Animation configuration
ANIMATION_CONFIG = {
    'canvas_size': (640, 480),
    'skin_color': (180, 160, 140),
    'shirt_color': (70, 130, 180),
    'pants_color': (50, 50, 50),
    'frame_delay': 60  # ms
}

# Data configuration
DATA_CONFIG = {
    'pose_points': 33,
    'hand_points': 21,
    'pose_values_per_point': 4,
    'hand_values_per_point': 3
}
import warnings
warnings.filterwarnings("ignore")

class Config:
    MODEL_NAME = "distilbert-base-uncased"
    MODEL_SAVE_DIR = "./emotion_model"
    MAX_LENGTH = 64
    NUM_LABELS = 6
