"""
OCR images, classify their emotion using the trained text model, and sort into folders.

Usage:
  python sort_images.py           # copies into sorted_images/<emotion>/
  python sort_images.py --move    # moves instead of copies

Requirements:
  - Pillow (PIL) and pytesseract Python packages
  - Tesseract OCR installed on the system and available on PATH
"""

import argparse
import shutil
from pathlib import Path
from typing import Optional

try:
    import pytesseract
    from PIL import Image
except ImportError as e:
    pytesseract = None
    Image = None
    _import_error = e
else:
    _import_error = None

import joblib
import re


BASE_DIR = Path(__file__).resolve().parent
IMG_DIR = BASE_DIR / "test_images"
OUT_DIR = BASE_DIR / "sorted_images"
MODEL_DIR = BASE_DIR.parent / "Story_Models"


def clean(text: str) -> str:
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^A-Za-z\s]", " ", text)
    return text.lower().strip()


def load_model_components():
    vectorizer = joblib.load(MODEL_DIR / "emotion_vectorizer.pkl")
    model = joblib.load(MODEL_DIR / "emotion_model.pkl")
    emotion_map = joblib.load(MODEL_DIR / "emotion_labels.pkl")
    reverse_map = {v: k for k, v in emotion_map.items()}
    return model, vectorizer, reverse_map


def extract_text_from_image(img_path: Path) -> Optional[str]:
    if _import_error is not None or pytesseract is None or Image is None:
        print("pytesseract/PIL not available. Install with: pip install pillow pytesseract")
        return None
    try:
        _ = pytesseract.get_tesseract_version()  # fails if binary not installed
    except Exception:
        print("Tesseract OCR binary not found. Install Tesseract and ensure it is on PATH.")
        return None

    try:
        img = Image.open(img_path)
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        print(f"Failed to OCR {img_path.name}: {e}")
        return None


def predict_emotion(text: str, model, vectorizer, reverse_map) -> Optional[str]:
    if not text:
        return None
    vec = vectorizer.transform([clean(text)])
    probs = model.predict_proba(vec)[0]
    idx = int(probs.argmax())
    return reverse_map.get(idx)


def sort_images(move: bool = False) -> None:
    if _import_error is not None:
        print("Missing dependency:", _import_error)
        return

    if not IMG_DIR.exists():
        print(f"No image folder found at {IMG_DIR}. Create it and add images to classify.")
        return

    model, vectorizer, reverse_map = load_model_components()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    img_files = sorted(
        [p for p in IMG_DIR.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}]
    )
    if not img_files:
        print("No images found in test_images.")
        return

    for img_path in img_files:
        text = extract_text_from_image(img_path)
        if not text:
            print(f"Skipping {img_path.name}: no text extracted.")
            continue

        emotion = predict_emotion(text, model, vectorizer, reverse_map)
        if emotion is None:
            print(f"Skipping {img_path.name}: could not predict emotion.")
            continue

        target_dir = OUT_DIR / emotion.lower()
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / img_path.name

        if move:
            shutil.move(str(img_path), target_path)
            action = "Moved"
        else:
            shutil.copy2(img_path, target_path)
            action = "Copied"

        print(f"{action} {img_path.name} -> {target_dir.relative_to(BASE_DIR)}")

    print("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sort story images by predicted emotion.")
    parser.add_argument("--move", action="store_true", help="Move files instead of copying.")
    args = parser.parse_args()
    sort_images(move=args.move)
