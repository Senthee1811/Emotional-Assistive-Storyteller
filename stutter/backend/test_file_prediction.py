import live_detection
import numpy as np

# Test the predict_emotion function with a simple test
print("Testing file upload prediction...")

# Create a simple test audio data (normal speech pattern)
test_audio = np.random.normal(0, 0.1, 16000)  # 1 second of normal-like audio
test_audio = test_audio / np.max(np.abs(test_audio))  # Normalize

# Debug the actual values
zero_crossing_rate = np.mean(np.abs(np.diff(np.sign(test_audio))))
energy = np.sum(test_audio ** 2) / len(test_audio)
std_dev = np.std(test_audio)
audio_rms = np.sqrt(np.mean(test_audio ** 2))

print(f"Test audio characteristics:")
print(f"Zero crossing rate: {zero_crossing_rate}")
print(f"Energy: {energy}")
print(f"Std dev: {std_dev}")
print(f"RMS: {audio_rms}")

# Test the file_audio_analysis function directly
prediction, confidence = live_detection.file_audio_analysis(test_audio)

print(f"Test prediction: {prediction} (0=Normal, 1=Stuttering)")
print(f"Test confidence: {confidence}")

# Test with different audio patterns
print("\nTesting different audio patterns:")

# Test 1: Very smooth audio (should be normal)
smooth_audio = np.sin(np.linspace(0, 2*np.pi*440, 16000)) * 0.1
zcr1 = np.mean(np.abs(np.diff(np.sign(smooth_audio))))
energy1 = np.sum(smooth_audio ** 2) / len(smooth_audio)
std1 = np.std(smooth_audio)
print(f"Smooth audio - ZCR: {zcr1}, Energy: {energy1}, Std: {std1}")
pred1, conf1 = live_detection.file_audio_analysis(smooth_audio)
print(f"Smooth audio: {pred1}, confidence: {conf1}")

# Test 2: Noisy audio (might be stuttering)
noisy_audio = np.random.normal(0, 0.3, 16000)
zcr2 = np.mean(np.abs(np.diff(np.sign(noisy_audio))))
energy2 = np.sum(noisy_audio ** 2) / len(noisy_audio)
std2 = np.std(noisy_audio)
print(f"Noisy audio - ZCR: {zcr2}, Energy: {energy2}, Std: {std2}")
pred2, conf2 = live_detection.file_audio_analysis(noisy_audio)
print(f"Noisy audio: {pred2}, confidence: {conf2}")

# Test 3: Silent audio (should be normal)
silent_audio = np.zeros(16000)
zcr3 = np.mean(np.abs(np.diff(np.sign(silent_audio))))
energy3 = np.sum(silent_audio ** 2) / len(silent_audio)
std3 = np.std(silent_audio)
print(f"Silent audio - ZCR: {zcr3}, Energy: {energy3}, Std: {std3}")
pred3, conf3 = live_detection.file_audio_analysis(silent_audio)
print(f"Silent audio: {pred3}, confidence: {conf3}")

print("\nModel status:")
print(f"Model available: {live_detection.model is not None}")
print(f"Scaler available: {live_detection.scaler is not None}")
