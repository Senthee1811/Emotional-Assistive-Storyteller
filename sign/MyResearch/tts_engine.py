import pyttsx3

def init_tts():
    engine = pyttsx3.init()
    voices = engine.getProperty("voices")
    engine.setProperty("voice", voices[0].id)
    return engine


def apply_emotion_settings(engine, emotion_label):
    emotion_settings = {
        "LABEL_1": {"rate": 180, "volume": 1.0},
        "LABEL_0": {"rate": 120, "volume": 0.6},
        "LABEL_3": {"rate": 200, "volume": 1.0},
    }

    settings = emotion_settings.get(emotion_label, {"rate": 150, "volume": 0.8})
    engine.setProperty("rate", settings["rate"])
    engine.setProperty("volume", settings["volume"])
