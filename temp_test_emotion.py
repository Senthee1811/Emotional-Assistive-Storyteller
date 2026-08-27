import numpy as np
from emotional_story_recommondation.backend import app

frame = np.zeros((100, 100, 3), dtype=np.uint8)
emotion, confidence, err = app.predict_face_emotion_from_frame(frame)
print('result', emotion, confidence, err)
