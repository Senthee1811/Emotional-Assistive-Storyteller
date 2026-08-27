
import os
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from config import DATA_DIR, BATCH_SIZE, IMG_SIZE

# Enhanced training/augmentation transforms
train_transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomResizedCrop(IMG_SIZE, scale=(0.8, 1.0)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(15),
    transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 2.0)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.2, scale=(0.02, 0.1), value='random')
])

# Evaluation transforms (no augmentation)
eval_transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def get_dataloader(data_dir, batch_size=BATCH_SIZE, shuffle=True, train=True):
    dataset = datasets.ImageFolder(root=data_dir, transform=train_transform if train else eval_transform)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=shuffle)
    return dataloader

if __name__ == "__main__":
    train_loader = get_dataloader(os.path.join(DATA_DIR, "train"))
    for imgs, labels in train_loader:
        print("Batch imgs:", imgs.shape, "Batch labels:", labels.shape)
        break
