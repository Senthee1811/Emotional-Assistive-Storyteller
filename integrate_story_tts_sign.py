"""Integration script: story recommendation -> TTS -> sign language.

This script stitches together the following components:
 1) Emotional story recommendation (from the "emotional story recommondation" folder)
 2) TTS generation (from "tts/MyProject_Final")
 3) Sign-language frame generation (using the sign model in "sign/MyResearch")

Usage:
  python integrate_story_tts_sign.py --emotion happy

Outputs:
  - audio files saved under tts/MyProject_Final/tts_output/xtts_ravdess
  - sign frames saved in JSON at <output_dir>/sign_frames.json

Note: This script expects the required ML models and dependencies to be installed.
"""

import argparse
import json
import os
import sys
from pathlib import Path


def load_module_from_path(name: str, path: Path):
    """Load a Python module from an arbitrary file path."""
    import importlib.util

    spec = importlib.util.spec_from_file_location(name, str(path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def ensure_dirs(*dirs):
    for d in dirs:
        os.makedirs(d, exist_ok=True)


def main():
    root = Path(__file__).resolve().parent

    # Paths
    emo_root = root / "emotional story recommondation"
    tts_root = root / "tts" / "MyProject_Final"

    # Import story recommendation module (folder has spaces; ensure its folder is on sys.path).
    # The model checkpoint path is relative to the folder, so temporarily change cwd.
    sys.path.insert(0, str(emo_root))
    original_cwd = os.getcwd()
    os.chdir(str(emo_root))
    try:
        story_module = load_module_from_path(
            "story_recommender",
            emo_root / "Final_recommendation.py",
        )
    finally:
        os.chdir(original_cwd)

    # The story module imports a `config` module from its directory.  To avoid
    # affecting the TTS project, ensure the correct `config` is imported later.
    sys.modules.pop("config", None)

    # Ensure TTS project modules are importable
    sys.path.insert(0, str(tts_root))
    from predictor import EmotionPredictor
    from pipeline_xtts_ravdess import generate_child_friendly_emotion_tts
    from text_utils import split_sentences

    # Load sign predictor logic
    sys.path.insert(0, str(tts_root))
    from sign_support import SignPredictor, extract_xy_landmarks, MODEL_FILE, LABEL_ENCODER_FILE

    parser = argparse.ArgumentParser(description="Run end-to-end story -> TTS -> sign pipeline")
    parser.add_argument(
        "--emotion",
        type=str,
        default="happy",
        help="Emotion to use when choosing a story (e.g., happy, sad, angry)",
    )
    parser.add_argument(
        "--child-id",
        type=str,
        default="child_001",
        help="Child/session id used for voice selection",
    )
    parser.add_argument(
        "--gender",
        type=str,
        default="male",
        help="Voice gender to use for TTS (male/female)",
    )
    parser.add_argument(
        "--child-friendly",
        action="store_true",
        help="Make the voice child-friendly (uses child-friendly reference selections)",
    )
    parser.add_argument(
        "--out-dir",
        type=str,
        default=str(tts_root / "tts_output" / "integration"),
        help="Output directory for sign frames and metadata",
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=0.6,
        help="Minimum emotion classifier score to use a sentence for TTS",
    )

    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    ensure_dirs(out_dir)

    # 1) Choose story PDF based on emotion
    emotion = args.emotion.lower().strip()

    # The story recommender expects to be run from inside its own folder
    original_cwd = os.getcwd()
    os.chdir(str(emo_root))
    try:
        pdf_filename = story_module.find_best_story(emotion)
    finally:
        os.chdir(original_cwd)

    if not pdf_filename:
        print(f"No story found for emotion '{emotion}'.")
        return

    story_pdf_path = emo_root / "Story_Classfication" / "test_pdfs" / pdf_filename
    if not story_pdf_path.exists():
        print(f"Expected story PDF does not exist: {story_pdf_path}")
        return

    story_text = story_module.extract_pdf_text_only(str(story_pdf_path))
    print(f"Selected story: {pdf_filename}")
    print(f"Story length: {len(story_text)} characters")

    # 2) Generate TTS for the story
    # The TTS sentiment model uses a relative path (`./emotion_model`) so we chdir into the TTS folder
    original_cwd = os.getcwd()
    os.chdir(str(tts_root))
    try:
        predictor = EmotionPredictor()
    finally:
        os.chdir(original_cwd)

    # break story into sentences for more expressive TTS
    sentences = split_sentences(story_text)

    # map predicted emotion labels into the TTS model's numeric IDs

    def resolve_emotion_label(raw_label):
        try:
            idx = int(float(raw_label))
            return {
                0: "Sad",
                1: "Happy",
                2: "Love",
                3: "Angry",
                4: "Fear",
                5: "Surprise",
            }.get(idx, "Unknown")
        except Exception:
            pass

        if isinstance(raw_label, str):
            lower = raw_label.lower().strip()
            if "label_" in lower:
                try:
                    idx = int(lower.split("_")[-1])
                    return {
                        0: "Sad",
                        1: "Happy",
                        2: "Love",
                        3: "Angry",
                        4: "Fear",
                        5: "Surprise",
                    }.get(idx, "Unknown")
                except Exception:
                    pass

            for emotion in ["Sad", "Happy", "Love", "Angry", "Fear", "Surprise"]:
                if emotion.lower() == lower:
                    return emotion

        return "Unknown"

    def emotion_label_to_id(emotion_label: str) -> int:
        return {
            "sad": 0,
            "happy": 1,
            "love": 2,
            "angry": 3,
            "fear": 4,
            "surprise": 5,
        }.get((emotion_label or "").lower(), -1)

    playlist = []
    for idx, sentence in enumerate(sentences):
        sentence = sentence.strip()
        if not sentence:
            continue

        raw_label, score = predictor.predict(sentence)
        emotion_label = resolve_emotion_label(raw_label)

        if score is None or float(score) < args.min_score:
            # skip low-confidence sentences
            continue

        emotion_id = emotion_label_to_id(emotion_label)
        if emotion_id < 0:
            continue

        audio_out_dir = tts_root / "tts_output" / "xtts_ravdess"
        out_path, meta = generate_child_friendly_emotion_tts(
            text=sentence,
            emotion_id=emotion_id,
            child_id=args.child_id,
            gender=args.gender,
            session_id=f"story_{emotion}",
            ravdess_root=str(tts_root / "audio_speech_actors_01-24"),
            out_dir=str(audio_out_dir),
            child_friendly=args.child_friendly,
        )

        rel_audio_path = os.path.relpath(out_path, start=out_dir)

        playlist.append({
            "sentence": sentence,
            "emotion": emotion_label,
            "emotion_id": emotion_id,
            "score": round(float(score), 3),
            "audio_path": out_path,
            "audio_path_rel": rel_audio_path,
            "meta": meta,
        })

    if not playlist:
        print("No valid sentences were found for TTS generation.")
        return

    # 3) Generate sign frames for each sentence in playlist
    try:
        import tensorflow as tf
        import pickle

        model = tf.keras.models.load_model(os.path.abspath(MODEL_FILE))
        with open(os.path.abspath(LABEL_ENCODER_FILE), "rb") as f:
            le = pickle.load(f)

        sign_predictor = SignPredictor(model, le)
    except Exception as exc:
        print("⚠️ Unable to load sign model:", exc)
        sign_predictor = None

    sign_results = []
    if sign_predictor:
        for item in playlist:
            sentence = item["sentence"]
            # simple tokenization: split on commas, newlines, and short phrases
            tokens = [t.strip() for t in sentence.replace("\n", ",").split(",") if t.strip()]
            if not tokens:
                tokens = [sentence]

            sentence_result = {
                "sentence": sentence,
                "tokens": [],
            }

            for token in tokens:
                direct_frames, _ = sign_predictor.load_sign_frames(token)
                predicted_label = None
                confidence = 0.0
                resolved_label = token
                resolution_source = "direct"
                frames = direct_frames

                if not frames:
                    predicted_label, confidence = sign_predictor.predict(token)
                    if predicted_label:
                        resolved_label = predicted_label
                        frames, _ = sign_predictor.load_sign_frames(predicted_label)
                        resolution_source = "predicted"

                parsed = []
                max_frames = 90
                for row in frames[:max_frames]:
                    parsed_frame = extract_xy_landmarks(row)
                    if parsed_frame is not None:
                        parsed.append(parsed_frame)

                sentence_result["tokens"].append({
                    "input": token,
                    "resolved_label": resolved_label,
                    "resolution_source": resolution_source,
                    "confidence": float(confidence or 0.0),
                    "frame_count": len(parsed),
                    "frames": parsed,
                })

            sign_results.append(sentence_result)

    # 4) Persist results
    output_data = {
        "story_pdf": pdf_filename,
        "emotion": emotion,
        "playlist": playlist,
        "sign": sign_results,
    }

    out_json = out_dir / "story_tts_sign.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)

    print(f"✅ Integration complete. Output written to: {out_json}")
    print("Audio files:")
    for item in playlist:
        print(" -", item["audio_path"])
    if sign_results:
        print(f"Sign frames saved in JSON file with {len(sign_results)} sentence entries.")


if __name__ == "__main__":
    main()
