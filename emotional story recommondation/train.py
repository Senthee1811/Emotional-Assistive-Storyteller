import os
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from torchvision import models
from config import DATA_DIR, DEVICE, NUM_EPOCHS, LEARNING_RATE, MODEL_PATH, EMOTION_CLASSES
from preprocess import get_dataloader
import numpy as np


class EmotionEnsemble(nn.Module):
    def __init__(self, num_classes=len(EMOTION_CLASSES)):
        super(EmotionEnsemble, self).__init__()
        
        # ResNet18 backbone
        self.resnet = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        self.resnet.conv1 = nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3, bias=False)
        self.resnet.fc = nn.Identity()  # Remove final classification layer
        
        # EfficientNet backbone
        self.efficientnet = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        self.efficientnet.features[0][0] = nn.Conv2d(3, 32, kernel_size=3, stride=2, padding=1, bias=False)
        self.efficientnet.classifier = nn.Identity()  # Remove final classification layer
        
        # Feature fusion layers
        self.resnet_dim = 512  # ResNet18 feature dimension
        self.efficientnet_dim = 1280  # EfficientNet-B0 feature dimension
        
        self.fusion = nn.Sequential(
            nn.Linear(self.resnet_dim + self.efficientnet_dim, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes)
        )
        
    def forward(self, x):
        # Extract ResNet features
        resnet_features = self.resnet(x)  # Shape: [batch_size, 512]
        
        # Extract EfficientNet features
        efficientnet_features = self.efficientnet(x)  # Shape: [batch_size, 1280]
        
        # Ensure both features are 2D tensors
        if len(resnet_features.shape) > 2:
            resnet_features = torch.flatten(resnet_features, 1)
        if len(efficientnet_features.shape) > 2:
            efficientnet_features = torch.flatten(efficientnet_features, 1)
        
        # Combine features
        combined = torch.cat([resnet_features, efficientnet_features], dim=1)
        return self.fusion(combined)


def build_model(num_classes=len(EMOTION_CLASSES)):
    return EmotionEnsemble(num_classes)


# Training Function
def train():
    train_loader = get_dataloader(os.path.join(DATA_DIR, "train"), train=True)
    test_loader = get_dataloader(os.path.join(DATA_DIR, "test"), shuffle=False, train=False)

    model = build_model().to(DEVICE)

    # Compute class weights to handle imbalance
    try:
        targets = np.array(train_loader.dataset.targets)
        class_counts = np.bincount(targets, minlength=len(EMOTION_CLASSES)).astype(np.float32)
        # Avoid division by zero
        class_counts[class_counts == 0] = 1
        class_weights = len(EMOTION_CLASSES) / (class_counts + 1e-6)
        class_weights = class_weights / class_weights.sum() * len(EMOTION_CLASSES)
        class_weights_tensor = torch.tensor(class_weights, dtype=torch.float32, device=DEVICE)
    except Exception as e:
        print(f"Warning: Could not compute class weights ({e}). Using uniform weights.")
        class_weights_tensor = None

    criterion = nn.CrossEntropyLoss(weight=class_weights_tensor, label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-3)
    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=5, T_mult=2)

    best_acc = 0

    for epoch in range(NUM_EPOCHS):
        model.train()
        total_loss = 0
        correct = 0
        total = 0

        for imgs, labels in train_loader:
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

        train_acc = correct / total
        print(f"Epoch [{epoch+1}/{NUM_EPOCHS}] "
              f"Loss: {total_loss/len(train_loader):.4f}, Train Acc: {train_acc:.4f}")


        # Validation
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

        # Save
        if test_acc > best_acc:
            torch.save(model.state_dict(), MODEL_PATH)
            best_acc = test_acc
            print("Model saved!")
        scheduler.step()


if __name__ == "__main__":
    train()
