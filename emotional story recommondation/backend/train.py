import os
import json
import argparse
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from sklearn.metrics import confusion_matrix, classification_report

# Use absolute import to avoid conflicts
import importlib.util
backend_dir = Path(__file__).resolve().parent
config_path = backend_dir / "config.py"
spec = importlib.util.spec_from_file_location("config", config_path)
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)

DATA_DIR = config.DATA_DIR
DEVICE = config.DEVICE
NUM_EPOCHS = config.NUM_EPOCHS
LEARNING_RATE = config.LEARNING_RATE
MODEL_PATH = config.MODEL_PATH
EMOTION_CLASSES = config.EMOTION_CLASSES
EARLY_STOPPING_PATIENCE = config.EARLY_STOPPING_PATIENCE


# Emotion  Model
class EmotionCNN(nn.Module):
    def __init__(self, num_classes=len(EMOTION_CLASSES)):
        super(EmotionCNN, self).__init__()

        self.features = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.Conv2d(32, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.Conv2d(128, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )

        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(256 * 4 * 4, 512),  # Adjusted for 64x64 input
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)   # flatten
        x = self.classifier(x)
        return x


class FocalLoss(nn.Module):
    def __init__(self, alpha=None, gamma=2.0, reduction="mean", label_smoothing=0.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction
        self.label_smoothing = label_smoothing

    def forward(self, logits, targets):
        ce = nn.functional.cross_entropy(
            logits,
            targets,
            weight=self.alpha,
            reduction="none",
            label_smoothing=self.label_smoothing,
        )
        pt = torch.exp(-ce)
        loss = ((1 - pt) ** self.gamma) * ce
        if self.reduction == "sum":
            return loss.sum()
        if self.reduction == "none":
            return loss
        return loss.mean()


# Training Function
def train(
    epochs=NUM_EPOCHS,
    learning_rate=LEARNING_RATE,
    use_focal_loss=False,
    focal_gamma=2.0,
    early_stopping_patience=EARLY_STOPPING_PATIENCE,
    run_name="default",
    model_path=MODEL_PATH,
):
    from balanced_train import get_balanced_dataloader, get_class_weights_from_dir

    train_loader = get_balanced_dataloader(os.path.join(DATA_DIR, "train"), is_training=True)
    test_loader = get_balanced_dataloader(os.path.join(DATA_DIR, "test"), shuffle=False, is_training=False)

    model = EmotionCNN().to(DEVICE)

    class_weights, class_names = get_class_weights_from_dir(os.path.join(DATA_DIR, "train"))
    class_weights = class_weights.to(DEVICE)

    if use_focal_loss:
        criterion = FocalLoss(alpha=class_weights, gamma=focal_gamma, label_smoothing=0.05)
        print(f"Using FocalLoss(gamma={focal_gamma})")
    else:
        criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=0.05)
        print("Using CrossEntropyLoss")

    optimizer = optim.Adam(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=3)

    best_acc = 0
    best_macro_f1 = -1.0
    best_conf = None
    best_report = None
    best_epoch = 0
    best_val_loss = float("inf")
    epochs_without_improvement = 0

    for epoch in range(epochs):
        model.train()
        total_loss = 0
        correct = 0
        total = 0

        for batch_idx, (imgs, labels) in enumerate(train_loader):
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)

            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            correct += (predicted == labels).sum().item()
            total += labels.size(0)

            # Print progress every 100 batches
            if batch_idx % 100 == 0:
                print(f"Epoch [{epoch+1}/{epochs}], Batch [{batch_idx}/{len(train_loader)}], Loss: {loss.item():.4f}")

        train_acc = correct / total
        print(f"Epoch [{epoch+1}/{epochs}] "
              f"Loss: {total_loss/len(train_loader):.4f}, Train Acc: {train_acc:.4f}")

        # Validation
        model.eval()
        correct_test = 0
        total_test = 0
        val_loss = 0
        y_true = []
        y_pred = []

        with torch.no_grad():
            for imgs, labels in test_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                _, predicted = torch.max(outputs, 1)
                correct_test += (predicted == labels).sum().item()
                total_test += labels.size(0)
                y_true.extend(labels.cpu().numpy().tolist())
                y_pred.extend(predicted.cpu().numpy().tolist())

        test_acc = correct_test / total_test
        avg_val_loss = val_loss / len(test_loader)
        print(f"Test Accuracy: {test_acc:.4f}, Val Loss: {avg_val_loss:.4f}")

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
        macro_recall = report.get("macro avg", {}).get("recall", 0.0)
        macro_f1 = report.get("macro avg", {}).get("f1-score", 0.0)
        print(f"Macro Recall: {macro_recall:.4f}")
        print(f"Macro F1: {macro_f1:.4f}")
        print("Per-class recall:")
        for cname in class_names:
            crecall = report.get(cname, {}).get("recall", 0.0)
            print(f"  {cname}: {crecall:.4f}")

        # Learning rate scheduling
        scheduler.step(macro_f1)

        # Save best model by macro F1 (more robust with imbalance).
        improved = macro_f1 > best_macro_f1
        if improved:
            torch.save(model.state_dict(), model_path)
            best_acc = test_acc
            best_macro_f1 = macro_f1
            best_conf = conf
            best_report = report
            best_epoch = epoch + 1
            best_val_loss = avg_val_loss
            epochs_without_improvement = 0
            print(f"New best model saved! Macro F1: {best_macro_f1:.4f}, Accuracy: {best_acc:.4f}")
        else:
            epochs_without_improvement += 1

        if epochs_without_improvement >= early_stopping_patience:
            print(
                "Early stopping triggered "
                f"(no macro-F1 improvement for {early_stopping_patience} epochs)."
            )
            break

    if best_conf is not None and best_report is not None:
        _save_evaluation_artifacts(best_conf, best_report, class_names, model_path=model_path)
        _save_training_summary(
            run_name=run_name,
            best_epoch=best_epoch,
            best_acc=best_acc,
            best_macro_f1=best_macro_f1,
            best_val_loss=best_val_loss,
            use_focal_loss=use_focal_loss,
            focal_gamma=focal_gamma,
            learning_rate=learning_rate,
            epochs=epochs,
            model_path=model_path,
        )

    print(
        "Training completed! "
        f"Best epoch: {best_epoch}, Best macro F1: {best_macro_f1:.4f}, "
        f"Best test accuracy: {best_acc:.4f}"
    )


def _save_evaluation_artifacts(conf_mat, report, class_names, model_path=MODEL_PATH):
    model_dir = Path(model_path).resolve().parent
    metrics_dir = model_dir / "metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)

    np.savetxt(metrics_dir / "confusion_matrix.csv", conf_mat, fmt="%d", delimiter=",")
    conf_norm = conf_mat.astype(np.float32) / np.clip(conf_mat.sum(axis=1, keepdims=True), 1, None)
    np.savetxt(metrics_dir / "confusion_matrix_normalized.csv", conf_norm, fmt="%.6f", delimiter=",")

    metrics_payload = {
        "labels": class_names,
        "classification_report": report,
    }
    with open(metrics_dir / "classification_report.json", "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    print(f"Saved metrics to: {metrics_dir}")


def _save_training_summary(
    run_name,
    best_epoch,
    best_acc,
    best_macro_f1,
    best_val_loss,
    use_focal_loss,
    focal_gamma,
    learning_rate,
    epochs,
    model_path,
):
    model_dir = Path(model_path).resolve().parent
    metrics_dir = model_dir / "metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    summary_path = metrics_dir / "training_summary.json"
    payload = {
        "run_name": run_name,
        "best_epoch": best_epoch,
        "best_accuracy": best_acc,
        "best_macro_f1": best_macro_f1,
        "best_val_loss": best_val_loss,
        "use_focal_loss": use_focal_loss,
        "focal_gamma": focal_gamma,
        "learning_rate": learning_rate,
        "epochs_requested": epochs,
        "model_path": str(Path(model_path).resolve()),
    }
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"Saved training summary to: {summary_path}")


def _parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=NUM_EPOCHS)
    parser.add_argument("--lr", type=float, default=LEARNING_RATE)
    parser.add_argument("--use-focal-loss", action="store_true")
    parser.add_argument("--focal-gamma", type=float, default=2.0)
    parser.add_argument("--early-stop-patience", type=int, default=EARLY_STOPPING_PATIENCE)
    parser.add_argument("--run-name", type=str, default="default")
    parser.add_argument("--model-path", type=str, default=MODEL_PATH)
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    train(
        epochs=args.epochs,
        learning_rate=args.lr,
        use_focal_loss=args.use_focal_loss,
        focal_gamma=args.focal_gamma,
        early_stopping_patience=args.early_stop_patience,
        run_name=args.run_name,
        model_path=args.model_path,
    )
