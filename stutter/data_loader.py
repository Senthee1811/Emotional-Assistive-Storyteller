import os
import glob
import numpy as np
from features import get_features

emotions = {
    '01': 'Normal',
    '02': 'Stuttering_Disorder'
}

def load_data():
    X, y = [], []
    count = 0

    # Support multiple audio formats
    audio_extensions = ["*.wav", "*.ogg", "*.mp3", "*.flac", "*.m4a"]
    
    for ext in audio_extensions:
        for file in glob.glob(f"DataSet\\Data_*\\{ext}"):
            file_name = os.path.basename(file)
            
            # Handle different file naming patterns
            if "-" in file_name:
                parts = file_name.split("-")
                if len(parts) >= 2:
                    emotion_code = parts[-2]
                else:
                    continue  # Skip if format doesn't match expected pattern
            else:
                continue  # Skip files without expected naming pattern
            
            emotion = emotions.get(emotion_code)
            
            if emotion:  # Only process if emotion is recognized
                features = get_features(file)
                X.append(features)
                y.append(emotion)

                count += 1
                print(f"\rProcessed {count} audio files", end="")

    return np.array(X), np.array(y)
