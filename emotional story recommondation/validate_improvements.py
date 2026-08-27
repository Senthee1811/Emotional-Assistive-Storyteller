import torch
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt
from train import EmotionEnsemble
from config import DEVICE, EMOTION_CLASSES, MODEL_PATH
from preprocess import get_dataloader
import os


def load_model(model_path=MODEL_PATH):
    """Load the trained ensemble model"""
    model = EmotionEnsemble().to(DEVICE)
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=DEVICE))
        print(f"Loaded model from {model_path}")
    else:
        print(f"Warning: Model file {model_path} not found. Using untrained model.")
    model.eval()
    return model


def evaluate_model(model, test_loader):
    """Comprehensive model evaluation"""
    all_predictions = []
    all_labels = []
    all_confidences = []
    
    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            
            outputs = model(imgs)
            probabilities = torch.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)
            
            all_predictions.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_confidences.extend(confidence.cpu().numpy())
    
    return np.array(all_predictions), np.array(all_labels), np.array(all_confidences)


def generate_metrics(predictions, labels, confidences):
    """Generate comprehensive evaluation metrics"""
    # Classification report
    report = classification_report(
        labels, predictions, 
        target_names=EMOTION_CLASSES,
        output_dict=True
    )
    
    # Confusion matrix
    cm = confusion_matrix(labels, predictions)
    
    # Overall accuracy
    accuracy = np.mean(predictions == labels)
    
    # Average confidence
    avg_confidence = np.mean(confidences)
    
    # Confidence by class
    confidence_by_class = {}
    for i, emotion in enumerate(EMOTION_CLASSES):
        mask = labels == i
        if np.any(mask):
            confidence_by_class[emotion] = np.mean(confidences[mask])
    
    return {
        'accuracy': accuracy,
        'avg_confidence': avg_confidence,
        'confidence_by_class': confidence_by_class,
        'classification_report': report,
        'confusion_matrix': cm
    }


def plot_confusion_matrix(cm, save_path="confusion_matrix.png"):
    """Plot and save confusion matrix"""
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=EMOTION_CLASSES, yticklabels=EMOTION_CLASSES)
    plt.title('Confusion Matrix')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()
    print(f"Confusion matrix saved to {save_path}")


def compare_with_baseline():
    """Compare improved model with baseline (if available)"""
    print("=== Emotion Detection Model Validation ===\n")
    
    # Load test data
    try:
        test_loader = get_dataloader(os.path.join("Dataset", "test"), shuffle=False, train=False)
        print(f"Test dataset loaded with {len(test_loader.dataset)} samples")
    except Exception as e:
        print(f"Error loading test dataset: {e}")
        print("Please ensure the Dataset/test directory contains emotion-labeled images")
        return
    
    # Load model
    model = load_model()
    
    # Evaluate
    predictions, labels, confidences = evaluate_model(model, test_loader)
    metrics = generate_metrics(predictions, labels, confidences)
    
    # Print results
    print(f"Overall Accuracy: {metrics['accuracy']:.4f}")
    print(f"Average Confidence: {metrics['avg_confidence']:.4f}")
    
    print("\nConfidence by Emotion:")
    for emotion, conf in metrics['confidence_by_class'].items():
        print(f"  {emotion}: {conf:.4f}")
    
    print("\nDetailed Classification Report:")
    for emotion, scores in metrics['classification_report'].items():
        if isinstance(scores, dict):
            print(f"\n{emotion}:")
            print(f"  Precision: {scores['precision']:.4f}")
            print(f"  Recall: {scores['recall']:.4f}")
            print(f"  F1-Score: {scores['f1-score']:.4f}")
    
    # Plot confusion matrix
    plot_confusion_matrix(metrics['confusion_matrix'])
    
    # Save detailed report
    import json
    with open("validation_report.json", "w") as f:
        # Convert numpy arrays to lists for JSON serialization
        report_copy = metrics.copy()
        report_copy['confusion_matrix'] = report_copy['confusion_matrix'].tolist()
        json.dump(report_copy, f, indent=2)
    
    print("\nValidation complete! Report saved to validation_report.json")
    
    return metrics


if __name__ == "__main__":
    compare_with_baseline()
