import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models
from config import DATA_DIR, DEVICE, NUM_EPOCHS, LEARNING_RATE, MODEL_PATH, EMOTION_CLASSES
from preprocess import get_dataloader
import numpy as np
from train import EmotionEnsemble


def quick_train():
    """Quick training demonstration with 3 epochs"""
    print("=== Quick Training Demo ===")
    
    # Load data
    train_loader = get_dataloader(os.path.join(DATA_DIR, "train"), train=True, batch_size=16)
    test_loader = get_dataloader(os.path.join(DATA_DIR, "test"), shuffle=False, train=False, batch_size=16)
    
    print(f"Training samples: {len(train_loader.dataset)}")
    print(f"Test samples: {len(test_loader.dataset)}")
    print(f"Number of classes: {len(EMOTION_CLASSES)}")
    
    # Create model
    model = EmotionEnsemble().to(DEVICE)
    print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-4)
    
    # Quick training for 3 epochs
    for epoch in range(3):
        model.train()
        total_loss = 0
        correct = 0
        total = 0
        
        for batch_idx, (imgs, labels) in enumerate(train_loader):
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            correct += (predicted == labels).sum().item()
            total += labels.size(0)
            
            # Print progress every 100 batches
            if batch_idx % 100 == 0:
                print(f"Epoch {epoch+1}, Batch {batch_idx}/{len(train_loader)}, Loss: {loss.item():.4f}")
        
        train_acc = correct / total
        print(f"Epoch [{epoch+1}/3] Loss: {total_loss/len(train_loader):.4f}, Train Acc: {train_acc:.4f}")
        
        # Quick validation
        model.eval()
        correct_test = 0
        total_test = 0
        
        with torch.no_grad():
            for imgs, labels in test_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                outputs = model(imgs)
                _, predicted = torch.max(outputs, 1)
                correct_test += (predicted == labels).sum().item()
                total_test += labels.size(0)
        
        test_acc = correct_test / total_test
        print(f"Test Accuracy: {test_acc:.4f}")
        
        # Save model
        torch.save(model.state_dict(), MODEL_PATH)
        print("Model saved!\n")
    
    print("✅ Quick training completed!")
    print(f"Model saved to: {MODEL_PATH}")
    
    return model


if __name__ == "__main__":
    quick_train()
