"""
Classify all PDFs in test_pdfs and organize them into subfolders by predicted emotion.

Usage:
  python sort_pdfs.py          # copies into sorted_pdfs/<emotion>/
  python sort_pdfs.py --move   # moves instead of copies
"""

import argparse
import shutil
from pathlib import Path

from multi_pdf import predict_pdf_emotion

BASE_DIR = Path(__file__).resolve().parent
PDF_DIR = BASE_DIR / "test_pdfs"
OUT_DIR = BASE_DIR / "sorted_pdfs"


def sort_pdfs(move: bool = False) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pdf_files = sorted(PDF_DIR.glob("*.pdf"))

    if not pdf_files:
        print("No PDF files found in 'test_pdfs'.")
        return

    for pdf_path in pdf_files:
        num, emotion, _ = predict_pdf_emotion(pdf_path)

        if emotion is None:
            print(f"Skipping {pdf_path.name}: no text found.")
            continue

        target_dir = OUT_DIR / emotion.lower()
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / pdf_path.name

        if move:
            shutil.move(str(pdf_path), target_path)
            action = "Moved"
        else:
            shutil.copy2(pdf_path, target_path)
            action = "Copied"

        print(f"{action} {pdf_path.name} -> {target_dir.relative_to(BASE_DIR)}")

    print("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Sort PDFs by predicted emotion into subfolders."
    )
    parser.add_argument(
        "--move",
        action="store_true",
        help="Move files instead of copying them.",
    )
    args = parser.parse_args()
    sort_pdfs(move=args.move)
