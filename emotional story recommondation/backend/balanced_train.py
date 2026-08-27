import os
from torch.utils.data import WeightedRandomSampler, DataLoader
from torchvision import datasets, transforms
import torch

# Import transforms from preprocess
from preprocess import transform, val_transform


def _class_counts(dataset):
    counts = torch.bincount(torch.tensor(dataset.targets), minlength=len(dataset.classes))
    return counts


def get_balanced_dataloader(data_dir, batch_size=32, shuffle=True, is_training=True):
    """Create a dataloader with weighted sampling on training split."""
    dataset = datasets.ImageFolder(root=data_dir, transform=transform if is_training else val_transform)

    if is_training:
        counts = _class_counts(dataset).float()
        print("Class distribution:")
        for idx, class_name in enumerate(dataset.classes):
            print(f"  {class_name}: {int(counts[idx].item())}")

        # Smoothed inverse-frequency weights avoid over-penalizing very rare classes.
        sample_class_weights = (counts.sum() / (counts + 1e-6)).sqrt()
        sample_weights = sample_class_weights[torch.tensor(dataset.targets)]

        sampler = WeightedRandomSampler(
            weights=sample_weights.double(),
            num_samples=len(sample_weights),
            replacement=True,
        )
        dataloader = DataLoader(dataset, batch_size=batch_size, sampler=sampler, shuffle=False)
    else:
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=shuffle)

    return dataloader


def get_class_weights_from_dir(data_dir):
    """Return normalized class weights (inverse-frequency) and class names."""
    dataset = datasets.ImageFolder(root=data_dir, transform=val_transform)
    counts = _class_counts(dataset).float()
    weights = counts.sum() / (counts + 1e-6)
    weights = weights / weights.sum() * len(dataset.classes)
    return weights, dataset.classes


if __name__ == "__main__":
    from config import DATA_DIR, BATCH_SIZE

    train_loader = get_balanced_dataloader(os.path.join(DATA_DIR, "train"), batch_size=BATCH_SIZE, is_training=True)

    # Check the distribution in a batch
    class_counts = {}
    for _, labels in train_loader:
        for label in labels:
            class_name = train_loader.dataset.classes[label.item()]
            class_counts[class_name] = class_counts.get(class_name, 0) + 1
        break  # Just check first batch
    
    print("\nBatch distribution (should be more balanced):")
    for class_name, count in class_counts.items():
        print(f"  {class_name}: {count}")
