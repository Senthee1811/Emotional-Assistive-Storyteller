from predictor import EmotionPredictor
from tts_engine import init_tts, apply_emotion_settings

def main():
    story = [
        "I am so happy to see you!",
        "He cried when he lost his favorite toy.",
        "She shouted angrily at the dragon."
    ]

    predictor = EmotionPredictor()
    engine = init_tts()

    for sentence in story:
        label, score = predictor.predict(sentence)

        print(f"Sentence: {sentence}")
        print(f"Detected Emotion: {label} (Score: {score:.2f})\n")

        apply_emotion_settings(engine, label)

        engine.say(sentence)
        engine.runAndWait()


if __name__ == "__main__":
    main()
