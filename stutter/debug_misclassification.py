import os
import glob
from features import get_features
import numpy as np
import joblib

def analyze_misclassification():
    """Analyze why 01-a.wav is being misclassified"""
    
    print("🔍 Analyzing Misclassification Issue")
    print("=" * 50)
    
    # Load model and scaler
    model = joblib.load("random_forest_model.pkl")
    scaler = joblib.load("scaler.pkl")
    
    # Test files
    test_files = ["01-a.wav", "02-26.wav"]
    
    for file in test_files:
        if os.path.exists(file):
            print(f"\n📁 Analyzing: {file}")
            
            # Extract features
            features = get_features(file)
            print(f"   🔧 Features extracted: {len(features)} dimensions")
            
            # Scale features
            features_scaled = scaler.transform([features])
            
            # Get prediction and probabilities
            prediction = model.predict(features_scaled)[0]
            probabilities = model.predict_proba(features_scaled)[0]
            
            print(f"   🎯 Prediction: {prediction}")
            print(f"   📊 Probabilities:")
            
            for i, class_name in enumerate(model.classes_):
                prob = probabilities[i] * 100
                print(f"      {class_name}: {prob:.2f}%")
            
            # Check feature statistics
            print(f"   📈 Feature Stats:")
            print(f"      Mean: {np.mean(features):.4f}")
            print(f"      Std: {np.std(features):.4f}")
            print(f"      Min: {np.min(features):.4f}")
            print(f"      Max: {np.max(features):.4f}")
            
        else:
            print(f"⚠️ File not found: {file}")
    
    print("\n" + "=" * 50)
    print("🔧 Potential Solutions:")
    print("1. Retrain with more balanced data")
    print("2. Adjust model parameters to reduce false positives")
    print("3. Add confidence threshold for normal predictions")
    print("4. Check audio quality of training vs test files")

if __name__ == "__main__":
    analyze_misclassification()
