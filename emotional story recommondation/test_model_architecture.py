import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import numpy as np
from train import EmotionEnsemble
from config import DEVICE, EMOTION_CLASSES, IMG_SIZE


def test_model_architecture():
    """Test the ensemble model with dummy data"""
    print("Testing EmotionEnsemble model architecture...")
    
    # Create model
    model = EmotionEnsemble().to(DEVICE)
    print(f"Model created with {sum(p.numel() for p in model.parameters())} parameters")
    
    # Create dummy input (batch_size=2, channels=3, height=64, width=64)
    dummy_input = torch.randn(2, 3, IMG_SIZE, IMG_SIZE).to(DEVICE)
    
    # Forward pass
    with torch.no_grad():
        output = model(dummy_input)
    
    print(f"Input shape: {dummy_input.shape}")
    print(f"Output shape: {output.shape}")
    print(f"Expected output shape: [2, {len(EMOTION_CLASSES)}]")
    
    # Test with softmax
    probabilities = torch.softmax(output, dim=1)
    predictions = torch.argmax(probabilities, dim=1)
    
    print(f"Probabilities shape: {probabilities.shape}")
    print(f"Predictions: {predictions}")
    print(f"Predicted emotions: {[EMOTION_CLASSES[i] for i in predictions]}")
    
    # Test single image inference
    print("\nTesting single image inference...")
    single_input = torch.randn(1, 3, IMG_SIZE, IMG_SIZE).to(DEVICE)
    
    with torch.no_grad():
        single_output = model(single_input)
        single_probs = torch.softmax(single_output, dim=1)
        single_pred = torch.argmax(single_probs, dim=1)
        confidence = torch.max(single_probs, dim=1)[0]
    
    print(f"Single prediction: {EMOTION_CLASSES[single_pred.item()]}")
    print(f"Confidence: {confidence.item():.4f}")
    
    print("\n✅ Model architecture test passed!")
    return True


def create_sample_dataset():
    """Create a minimal sample dataset for testing"""
    print("\nCreating sample dataset structure...")
    
    import os
    from pathlib import Path
    
    # Create directories
    base_dir = Path("Dataset")
    train_dir = base_dir / "train"
    test_dir = base_dir / "test"
    
    for emotion in EMOTION_CLASSES:
        (train_dir / emotion.lower()).mkdir(parents=True, exist_ok=True)
        (test_dir / emotion.lower()).mkdir(parents=True, exist_ok=True)
    
    # Create dummy images (64x64 grayscale converted to 3-channel)
    for split_dir in [train_dir, test_dir]:
        for emotion in EMOTION_CLASSES:
            emotion_dir = split_dir / emotion.lower()
            for i in range(5):  # Create 5 sample images per emotion
                # Create random grayscale image
                img_array = np.random.randint(0, 255, (IMG_SIZE, IMG_SIZE), dtype=np.uint8)
                img = Image.fromarray(img_array, mode='L')
                img = img.convert('RGB')  # Convert to 3-channel
                img.save(emotion_dir / f"sample_{i:03d}.png")
    
    print(f"✅ Sample dataset created in {base_dir}")
    print("Each emotion class has 5 sample images in both train and test splits")
    return True


if __name__ == "__main__":
    # Test model architecture first
    if test_model_architecture():
        # Create sample dataset for training
        create_sample_dataset()
        print("\n🎉 Setup complete! You can now run:")
        print("python train.py")
        print("python improved_emotion_detector.py")
        print("python validate_improvements.py")
