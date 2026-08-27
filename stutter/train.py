import joblib
from data_loader import load_data
from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
import numpy as np

print("Loading dataset...")
features, labels = load_data()

print(f"\nDataset distribution:")
unique, counts = np.unique(labels, return_counts=True)
for label, count in zip(unique, counts):
    print(f"{label}: {count} samples")

print("\nScaling features...")
scaler = StandardScaler()
features_scaled = scaler.fit_transform(features)

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    features_scaled,
    labels,
    test_size=0.2,
    random_state=42
)

# Train model
print("Training Random Forest model...")
model = RandomForestClassifier(
    n_estimators=15,
    criterion='gini',
    max_depth=4,
    min_samples_split=20,
    min_samples_leaf=10,
    max_features=0.5,
    bootstrap=True,
    oob_score=False,
    random_state=42,
    class_weight={'Normal': 2.0, 'Stuttering_Disorder': 0.5}  # Strong bias toward Normal
)

model.fit(X_train, y_train)

accuracy = model.score(X_test, y_test) * 100
print(f"\nModel Accuracy: {accuracy:.2f}%")

# Perform k-fold cross validation
print("\n🔍 Performing K-Fold Cross Validation...")
kfold = KFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(model, features_scaled, labels, cv=kfold, scoring='accuracy')

print(f"Cross-Validation Scores: {[f'{score:.3f}' for score in cv_scores]}")
print(f"Mean CV Accuracy: {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*2:.2f}%)")
print(f"CV Accuracy Range: {cv_scores.min()*100:.2f}% - {cv_scores.max()*100:.2f}%")

# Test predictions on training set
train_predictions = model.predict(X_train)
test_predictions = model.predict(X_test)

print(f"\nTraining set predictions:")
unique_train, counts_train = np.unique(train_predictions, return_counts=True)
for label, count in zip(unique_train, counts_train):
    print(f"{label}: {count} predictions")

print(f"\nTest set predictions:")
unique_test, counts_test = np.unique(test_predictions, return_counts=True)
for label, count in zip(unique_test, counts_test):
    print(f"{label}: {count} predictions")

# Save model & scaler
joblib.dump(model, "random_forest_model.pkl")
joblib.dump(scaler, "scaler.pkl")

print("Model and scaler saved successfully!")



