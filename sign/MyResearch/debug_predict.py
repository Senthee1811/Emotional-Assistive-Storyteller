import sys
sys.path.append(r'c:/Users/brint/OneDrive/Desktop/New folder - Copy (2)/sign/MyResearch')
from flaskApi import get_sign_predictor
p,_ = get_sign_predictor()
for text in ['hello','thank you','good morning','foo']:
    frames,_ = p.load_sign_frames(text)
    if frames:
        print(text, 'direct', len(frames))
    else:
        pl,conf = p.predict(text)
        frames2,_ = p.load_sign_frames(pl) if pl else ([], None)
        print(text, 'pred', pl, conf, 'frames', len(frames2))
