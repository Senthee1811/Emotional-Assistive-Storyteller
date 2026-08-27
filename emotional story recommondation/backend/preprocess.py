import os
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from config import DATA_DIR, BATCH_SIZE, IMG_SIZE

# Stronger train-time augmentation to improve robustness on subtle classes (e.g. Fear/Sad).
transform = transforms.Compose([
    transforms.Grayscale(),
    transforms.RandomResizedCrop(IMG_SIZE, scale=(0.8, 1.0), ratio=(0.9, 1.1)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomApply(
        [transforms.ColorJitter(brightness=0.25, contrast=0.25)],
        p=0.5
    ),
    transforms.RandomAffine(
        degrees=18,
        translate=(0.08, 0.08),
        scale=(0.92, 1.08),
        shear=8,
    ),
    transforms.RandomApply([transforms.GaussianBlur(kernel_size=3)], p=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5], std=[0.5]),
    transforms.RandomErasing(p=0.15, scale=(0.02, 0.12), ratio=(0.3, 3.3), value=0),
])

# Validation transforms (no augmentation)
val_transform = transforms.Compose([
    transforms.Grayscale(),
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5], std=[0.5])
])

def get_dataloader(data_dir, batch_size=BATCH_SIZE, shuffle=True, is_training=True):
    if is_training:
        dataset = datasets.ImageFolder(root=data_dir, transform=transform)
    else:
        dataset = datasets.ImageFolder(root=data_dir, transform=val_transform)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=shuffle)
    return dataloader

if __name__ == "__main__":
    train_loader = get_dataloader(os.path.join(DATA_DIR, "train"))
    for imgs, labels in train_loader:
        print("Batch imgs:", imgs.shape, "Batch labels:", labels.shape)
        break
