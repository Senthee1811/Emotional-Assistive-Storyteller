# predict.py

import os
import joblib
import numpy as np
import random
import librosa
from features import get_features

# Load saved model & scaler
model_path = os.path.join(os.path.dirname(__file__), "random_forest_model.pkl")
scaler_path = os.path.join(os.path.dirname(__file__), "scaler.pkl")

model = joblib.load(model_path)
scaler = joblib.load(scaler_path)

# Patch scikit-learn compatibility for newer versions
if hasattr(model, 'estimators_'):
    for dt in model.estimators_:
        if not hasattr(dt, 'monotonic_cst'):
            dt.monotonic_cst = None

# Speech therapy exercises categorized by disorder severity
SPEECH_EXERCISES = {
    'mild': [
        "Practice slow reading: Read a paragraph at half your normal speed, focusing on each word.",
        "Breathing exercise: Take deep breaths before speaking. Inhale for 4 counts, hold for 2, exhale for 6.",
        "Gentle onset: Start words with a soft, gentle sound instead of forcing them out.",
        "Pausing technique: Insert brief pauses between phrases to reduce rushing and anxiety.",
        "Mirror practice: Watch yourself speak in a mirror to identify tension in facial muscles."
    ],
    'moderate': [
        "Syllable repetition: Practice saying multi-syllable words slowly, breaking them into parts (e.g., 'el-e-phant').",
        "Light articulation: Use minimal tongue and lip pressure when forming sounds.",
        "Continuous phonation: Practice maintaining a steady voice sound while saying vowels.",
        "Counting exercise: Count from 1 to 20 slowly and steadily, focusing on smooth transitions.",
        "Sentence completion: Finish common phrases like 'The weather today is...' to build confidence.",
        "Reading aloud: Read children's books or simple texts for 10 minutes daily."
    ],
    'severe': [
        "Vowel stretching: Practice holding vowel sounds (ah, ee, oh) for 3-5 seconds each.",
        "Relaxation technique: Loosen jaw and shoulder muscles before speaking exercises.",
        "Rhythm practice: Tap your finger while speaking to maintain a steady pace.",
        "Word association: Practice saying related word pairs smoothly (e.g., 'cat-dog', 'sun-moon').",
        "Progressive muscle relaxation: Systematically tense and relax muscle groups from head to toe.",
        "Diaphragmatic breathing: Place hand on stomach and feel it rise/fall while breathing deeply.",
        "Voiceless practice: Practice mouth movements for words without making sound first.",
        "Short phrase practice: Start with 2-3 word phrases and gradually increase length."
    ]
}

def get_speech_exercise(severity):
    """Return a random speech therapy exercise based on disorder severity"""
    sev = severity if severity in SPEECH_EXERCISES else 'mild'
    return random.choice(SPEECH_EXERCISES[sev])

def determine_severity(confidence_score):
    """Determine disorder severity based on model confidence"""
    if confidence_score >= 80:
        return 'severe'
    elif confidence_score >= 60:
        return 'moderate'
    else:
        return 'mild'

def analyze_acoustic_disfluencies(audio_file):
    """
    Perform acoustic rhythm analysis to detect repetitions, blocks, and prolongations.
    """
    try:
        y, sr = librosa.load(audio_file, sr=16000)
        duration = len(y) / sr
        if duration < 0.3:
            return {"repetitions": 0, "blocks": 0, "prolongations": 0, "wpm": 120}

        # 1. RMS Energy Envelope
        hop_length = 512
        rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
        frames_per_sec = sr / hop_length
        mean_rms = np.mean(rms) if len(rms) > 0 else 0.01

        # 2. Syllable onsets & Repetition Detection
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
        onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=hop_length)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=hop_length)

        # Detect rapid successive onsets (burst repetitions < 180ms apart)
        repetitions = 0
        if len(onset_times) >= 2:
            diffs = np.diff(onset_times)
            rapid_bursts = np.where((diffs > 0.04) & (diffs < 0.19))[0]
            repetitions = len(rapid_bursts)

        # 3. Block detection (speech gaps with silence in the middle of active speech)
        speech_active = rms > (mean_rms * 0.25)
        # Find silent runs longer than 450ms within the recording
        min_silent_frames = int(0.45 * frames_per_sec)
        blocks = 0
        current_silent_run = 0
        for is_active in speech_active:
            if not is_active:
                current_silent_run += 1
            else:
                if current_silent_run >= min_silent_frames:
                    blocks += 1
                current_silent_run = 0

        # 4. Prolongation detection (sustained high energy with low spectral flux)
        spectral_flux = np.abs(np.diff(onset_env))
        prolongations = 0
        for i in range(len(spectral_flux) - 10):
            window_flux = np.mean(spectral_flux[i:i+10])
            window_rms = np.mean(rms[i:i+10]) if (i+10) <= len(rms) else 0
            if window_rms > (mean_rms * 0.9) and window_flux < 0.05:
                prolongations += 1
                i += 10

        # Estimate reading words per minute (typical child speech is 90-130 wpm)
        syllable_count = max(1, len(onset_frames))
        estimated_words = max(1, int(syllable_count / 1.4))
        wpm = max(50, min(180, int((estimated_words / max(0.5, duration)) * 60)))

        return {
            "repetitions": min(5, repetitions),
            "blocks": min(4, blocks),
            "prolongations": min(4, prolongations),
            "wpm": wpm,
            "duration": round(duration, 2)
        }
    except Exception as e:
        print(f"[predict.py] Acoustic analysis notice: {e}")
        return {"repetitions": 0, "blocks": 0, "prolongations": 0, "wpm": 115}

def predict_emotion(audio_file):
    features = get_features(audio_file)
    features_scaled = scaler.transform([features])

    prediction = str(model.predict(features_scaled)[0])
    probabilities = model.predict_proba(features_scaled)[0]
    
    # Get probability scores for classes
    stuttering_prob = 50.0
    normal_prob = 50.0
    for i, class_name in enumerate(model.classes_):
        if class_name == 'Stuttering_Disorder':
            stuttering_prob = float(probabilities[i] * 100)
        elif class_name == 'Normal':
            normal_prob = float(probabilities[i] * 100)

    # Perform acoustic rhythm analysis
    acoustic_data = analyze_acoustic_disfluencies(audio_file)
    total_disfluencies = acoustic_data["repetitions"] + acoustic_data["blocks"] + acoustic_data["prolongations"]

    # If ML model predicts stuttering OR acoustic features show significant disfluencies
    is_disorder = (prediction == 'Stuttering_Disorder') or (total_disfluencies >= 2) or (stuttering_prob > 55.0)

    if is_disorder:
        effective_prob = max(stuttering_prob, 60.0 + min(35.0, total_disfluencies * 10.0))
        severity = determine_severity(effective_prob)
        exercise = get_speech_exercise(severity)
        return {
            'prediction': 'Stuttering_Disorder',
            'is_stutter': True,
            'disorder_percentage': round(effective_prob, 2),
            'severity': severity,
            'exercise_suggestion': exercise,
            'details': acoustic_data
        }
    else:
        return {
            'prediction': 'Normal',
            'is_stutter': False,
            'disorder_percentage': round(normal_prob, 2),
            'severity': None,
            'exercise_suggestion': "Great fluent flow! Continue your smooth reading pace.",
            'details': acoustic_data
        }

if __name__ == "__main__":
    test_file = "02-02.wav"
    if os.path.exists(test_file):
        res = predict_emotion(test_file)
        print(f"Result for {test_file}:", res)
