aimport os
import numpy as np
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from config import DATA_DIR, BATCH_SIZE, IMG_SIZE, EMOTION_CLASSES

def debug_dataset():
    print("Debugging dataset structure...")
    
    # Check dataset directories
    train_dir = os.path.join(DATA_DIR, "train")
    test_dir = os.path.join(DATA_DIR, "test")
    
    print(f"Train directory: {train_dir}")
    print(f"Test directory: {test_dir}")
    
    # List emotion directories
    for split_dir, split_name in [(train_dir, "train"), (test_dir, "test")]:
        print(f"\n{split_name.upper()} split:")
        if os.path.exists(split_dir):
            for emotion in os.listdir(split_dir):
                emotion_path = os.path.join(split_dir, emotion)
                if os.path.isdir(emotion_path):
                    count = len([f for f in os.listdir(emotion_path) if f.endswith(('.png', '.jpg', '.jpeg'))])
                    print(f"  {emotion}: {count} images")
        else:
            print(f"  Directory {split_dir} does not exist")
    
    # Try loading dataset
    try:
        transform = transforms.Compose([
            transforms.Grayscale(num_output_channels=3),
            transforms.Resize((IMG_SIZE, IMG_SIZE)),
            transforms.ToTensor(),
        ])
        
        train_dataset = datasets.ImageFolder(root=train_dir, transform=transform)
        print(f"\nDataset loaded successfully!")
        print(f"Number of samples: {len(train_dataset)}")
        print(f"Number of classes: {len(train_dataset.classes)}")
        print(f"Classes: {train_dataset.classes}")
        
        # Check targets
        targets = np.array(train_dataset.targets)
        print(f"Targets shape: {targets.shape}")
        print(f"Unique targets: {np.unique(targets)}")
        print(f"Target range: {targets.min()} to {targets.max()}")
        
        # Class counts
        class_counts = np.bincount(targets, minlength=len(EMOTION_CLASSES))
        print(f"Class counts: {class_counts}")
        
        # Test dataloader
        train_loader = DataLoader(train_dataset, batch_size=2, shuffle=True)
        print(f"\nTesting dataloader...")
        for i, (imgs, labels) in enumerate(train_loader):
            print(f"Batch {i}: imgs shape {imgs.shape}, labels shape {labels.shape}")
            if i >= 2:  # Only test first few batches
                break
                
    except Exception as e:
        print(f"Error loading dataset: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_dataset()
