import os
import json
import argparse
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score

from config import DATA_DIR, DEVICE, MODEL_PATH
from train import EmotionCNN
from balanced_train import get_balanced_dataloader


def evaluate(split="test", model_path=MODEL_PATH):
    data_dir = os.path.join(DATA_DIR, split)
    loader = get_balanced_dataloader(data_dir, shuffle=False, is_training=False)
    class_names = loader.dataset.classes

    model = EmotionCNN().to(DEVICE)
    model.load_state_dict(torch.load(model_path, map_location=DEVICE))
    model.eval()

    y_true = []
    y_pred = []

    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(DEVICE)
            outputs = model(imgs)
            preds = outputs.argmax(dim=1).cpu().numpy()
            y_pred.extend(preds.tolist())
            y_true.extend(labels.numpy().tolist())

    acc = accuracy_score(y_true, y_pred)
    conf = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))
    report = classification_report(
        y_true,
        y_pred,
        labels=list(range(len(class_names))),
        target_names=class_names,
        digits=4,
        zero_division=0,
        output_dict=True,
    )

    save_dir = Path(model_path).resolve().parent / "metrics"
    save_dir.mkdir(parents=True, exist_ok=True)
    np.savetxt(save_dir / "confusion_matrix.csv", conf, fmt="%d", delimiter=",")
    conf_norm = conf.astype(np.float32) / np.clip(conf.sum(axis=1, keepdims=True), 1, None)
    np.savetxt(save_dir / "confusion_matrix_normalized.csv", conf_norm, fmt="%.6f", delimiter=",")

    payload = {
        "split": split,
        "accuracy": acc,
        "labels": class_names,
        "classification_report": report,
    }
    with open(save_dir / "classification_report.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Accuracy ({split}): {acc:.4f}")
    print("Per-class recall:")
    for cname in class_names:
        print(f"  {cname}: {report.get(cname, {}).get('recall', 0.0):.4f}")
    print(f"Saved evaluation artifacts to: {save_dir}")


def _parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--split", type=str, default="test")
    parser.add_argument("--model-path", type=str, default=MODEL_PATH)
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    evaluate(split=args.split, model_path=args.model_path)
