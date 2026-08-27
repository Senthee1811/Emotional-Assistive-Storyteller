"""
Inspect label distribution in dataset splits.

Usage:
  python Story_Classfication/inspect_labels.py
"""

import pandas as pd
from collections import Counter
from pathlib import Path

BASE = Path(__file__).resolve().parent / "dataset"


def main():
    for split in ["training", "validation", "test"]:
        path = BASE / f"{split}.csv"
        if not path.exists():
            continue
        df = pd.read_csv(path, header=None, names=["text", "label"])
        counts = Counter(df["label"])
        print(f"\n{split} | samples: {len(df)} | unique labels: {len(counts)}")
        for lbl, cnt in counts.most_common():
            print(f"  {lbl}: {cnt}")
        print("  sample rows:")
        print(df.head(3))


if __name__ == "__main__":
    main()
