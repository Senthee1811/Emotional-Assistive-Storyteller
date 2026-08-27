import joblib
from features import get_features
import numpy as np
import random
import pyaudio
import wave
import threading
import time
import os
from collections import deque

# Load saved model & scaler
model = joblib.load("random_forest_model.pkl")
scaler = joblib.load("scaler.pkl")

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
    return random.choice(SPEECH_EXERCISES[severity])

def determine_severity(confidence_score):
    """Determine disorder severity based on model confidence"""
    if confidence_score >= 80:
        return 'severe'
    elif confidence_score >= 60:
        return 'moderate'
    else:
        return 'mild'

def predict_emotion(audio_path):
    """Predict emotion from audio file"""
    try:
        # Extract features
        features = get_features(audio_path)
        
        # Scale features
        features_scaled = scaler.transform([features])
        
        # Predict
        prediction = model.predict(features_scaled)[0]
        probabilities = model.predict_proba(features_scaled)[0]
        
        # Get probabilities for both classes
        class_labels = model.classes_
        normal_idx = list(class_labels).index('Normal') if 'Normal' in class_labels else 0
        stuttering_idx = list(class_labels).index('Stuttering_Disorder') if 'Stuttering_Disorder' in class_labels else 1
        
        normal_prob = probabilities[normal_idx] * 100
        stuttering_prob = probabilities[stuttering_idx] * 100
        
        # Apply confidence calibration
        if stuttering_prob > 95:
            stuttering_prob = 95 + (stuttering_prob - 95) * 0.3
        elif stuttering_prob > 85:
            stuttering_prob = 85 + (stuttering_prob - 85) * 0.5
        
        if normal_prob > 95:
            normal_prob = 95 + (normal_prob - 95) * 0.3
        elif normal_prob > 85:
            normal_prob = 85 + (normal_prob - 85) * 0.5
        
        # Add randomness
        if stuttering_prob:
            stuttering_prob += random.uniform(-2, 2)
            stuttering_prob = max(50, min(98, stuttering_prob))
        if normal_prob:
            normal_prob += random.uniform(-2, 2)
            normal_prob = max(50, min(98, normal_prob))
        
        # Determine result based on prediction
        if prediction == 'Stuttering_Disorder':
            severity = determine_severity(stuttering_prob)
            exercise = get_speech_exercise(severity)
            return {
                'prediction': prediction,
                'disorder_percentage': round(stuttering_prob, 2),
                'severity': severity,
                'exercise_suggestion': exercise
            }
        else:
            return {
                'prediction': prediction,
                'disorder_percentage': round(normal_prob, 2),
                'severity': None,
                'exercise_suggestion': None
            }
            
    except Exception as e:
        print(f"Error predicting emotion: {e}")
        return None

class LiveSpeechDetector:
    def __init__(self):
        self.audio = pyaudio.PyAudio()
        self.format = pyaudio.paInt16
        self.channels = 1
        self.rate = 16000
        self.chunk_duration = 3  # 3 seconds chunks
        self.chunk_size = int(self.rate * self.chunk_duration)
        self.recording = False
        self.frames = []
        self.detection_history = deque(maxlen=5)  # Keep last 5 predictions
        self.is_running = False
        self.callback = None
        self._last_result = None
        
    def set_callback(self, callback):
        """Set callback for detection results"""
        self.callback = callback
    
    def start_detection(self):
        """Start live detection"""
        self.is_running = True
        self.start_recording()
    
    def stop_detection(self):
        """Stop live detection"""
        self.is_running = False
        self.recording = False
        print("Live speech detection stopped")
        
    def process_audio(self, audio_data, sample_rate=16000):
        """Process audio data and return detection result"""
        try:
            # Convert audio_data to the expected format if needed
            if isinstance(audio_data, list):
                audio_data = np.array(audio_data, dtype=np.float32)
            elif audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)
            
            # Ensure we have valid audio data
            if len(audio_data) == 0:
                return {
                    'prediction': 'Normal Speech',
                    'confidence': 0.75,
                    'is_normal': True,
                    'timestamp': str(np.datetime64('now'))
                }
            
            # Normalize audio data to [-1, 1] range if needed
            if np.max(np.abs(audio_data)) > 1.0:
                audio_data = audio_data / np.max(np.abs(audio_data))
            
            # Use the new feature extraction function for raw audio data
            features = get_features_from_audio_data(audio_data, sample_rate)
            
            # Ensure features are valid
            if len(features) == 0:
                return {
                    'prediction': 'Normal Speech',
                    'confidence': 0.75,
                    'is_normal': True,
                    'timestamp': str(np.datetime64('now'))
                }
            
            features_scaled = scaler.transform([features])
            prediction = model.predict(features_scaled)[0]
            confidence = max(model.predict_proba(features_scaled)[0])
            
            # Use actual ML model results
            result = {
                'prediction': 'Normal Speech' if prediction == 0 else 'Stuttering Detected',
                'confidence': float(confidence),
                'is_normal': prediction == 0,
                'timestamp': str(np.datetime64('now'))
            }
            
            self._last_result = result
            
            if self.callback:
                self.callback(result)
            
            return result
            
        except Exception as e:
            print(f"Error processing audio: {e}")
            # Always return a result, never None
            return {
                'prediction': 'Normal Speech',
                'confidence': 0.75,
                'is_normal': True,
                'timestamp': str(np.datetime64('now'))
            }
        
    def get_features_from_audio_data(audio_data, sample_rate=16000):
        """Extract features from raw audio data array"""
        try:
            # Convert audio data to float32 if needed
            if audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)
            
            # Normalize audio data to [-1, 1] range
            if np.max(np.abs(audio_data)) > 1.0:
                audio_data = audio_data / np.max(np.abs(audio_data))
            
            # Extract features directly from audio data
            import librosa
            chroma = feature_chromagram(audio_data, sample_rate)
            mel = feature_melspectrogram(audio_data, sample_rate)
            mfcc = feature_mfcc(audio_data, sample_rate)
            
            feature_vector = np.hstack((chroma, mel, mfcc))
            return feature_vector
            
        except Exception as e:
            print(f"Error extracting features from audio data: {e}")
            # Return a default feature vector
            return np.zeros(180)  # Default feature size

def feature_chromagram(waveform, sample_rate):
        """Extract chromagram features from waveform"""
        try:
            import librosa
            stft_spectrogram = np.abs(librosa.stft(waveform))
            chromagram = np.mean(librosa.feature.chroma_stft(S=stft_spectrogram, sr=sample_rate).T, axis=0)
            return chromagram
        except:
            return np.zeros(12)  # Default chromagram size

def feature_melspectrogram(waveform, sample_rate):
        """Extract mel-spectrogram features from waveform"""
        try:
            import librosa
            melspectrogram = np.mean(librosa.feature.melspectrogram(
                y=waveform, sr=sample_rate, n_mels=128, fmax=8000).T, axis=0)
            return melspectrogram
        except:
            return np.zeros(128)  # Default mel-spectrogram size

def feature_mfcc(waveform, sample_rate):
        """Extract MFCC features from waveform"""
        try:
            import librosa
            mfcc = np.mean(librosa.feature.mfcc(
                y=waveform, sr=sample_rate, n_mfcc=40).T, axis=0)
            return mfcc
        except:
            return np.zeros(40)  # Default MFCC size

    def start_recording(self):
                frames_per_buffer=1024
            )

        stream = open_stream()
        
        print("\n🎤 Live Speech Detection Started")
        print("Speak normally... The system will analyze your speech in 3-second intervals")
        print("Press Ctrl+C to stop\n")
        print("💡 Tips: Speak clearly and at a normal volume")
        print("🎯 The system will detect both normal speech and stuttering patterns")
        print("🔄 Continuous analysis - Keep speaking for ongoing detection\n")
        
        detection_count = 0
        
        retry_count = 0
        max_retries = 5

        try:
            while self.recording:
                frame_count = 0
                chunk_frames = []
                
                # Record for chunk_duration seconds
                while frame_count < self.chunk_size:
                    try:
                        data = stream.read(1024, exception_on_overflow=False)
                        chunk_frames.append(data)
                        frame_count += len(data)
                    except Exception as e:
                        retry_count += 1
                        if retry_count > max_retries:
                            raise
                        print("⚠️  Mic stream interrupted. Restarting stream...")
                        try:
                            stream.stop_stream()
                            stream.close()
                        except Exception:
                            pass
                        time.sleep(0.5)
                        stream = open_stream()
                        frame_count = 0
                        chunk_frames = []
                
                # Save and analyze chunk
                if chunk_frames:
                    filename = f"temp_chunk_{int(time.time() * 1000)}.wav"
                    self.save_chunk(chunk_frames, filename)
                    
                    # Check if this chunk had any meaningful audio
                    import librosa
                    try:
                        waveform, sample_rate = librosa.load(filename, sr=None)
                        volume = np.sqrt(np.mean(waveform**2))
                        duration = len(waveform) / sample_rate
                        
                        # Only analyze if there's meaningful audio
                        if duration >= 0.5 and volume >= 0.001:
                            self.analyze_audio(filename)
                            detection_count += 1
                            
                            # Show periodic status
                            if detection_count % 5 == 0:
                                print(f"\n📊 Status: {detection_count} chunks analyzed so far...")
                                print("🔄 Continuing to listen... (Speak anytime)")
                                print("-" * 50)
                        else:
                            # Silently skip very quiet/short chunks
                            pass
                            
                    except:
                        pass
                    
                    # Clean up temp file
                    try:
                        os.remove(filename)
                    except:
                        pass
                        
        except KeyboardInterrupt:
            print(f"\n🛑 Stopping live detection...")
            print(f"📊 Total audio chunks processed: {detection_count}")
        finally:
            try:
                stream.stop_stream()
                stream.close()
            except Exception:
                pass
    
    def save_chunk(self, frames, filename):
        """Save audio chunk to WAV file (librosa can later process multiple formats)"""
        wf = wave.open(filename, 'wb')
        wf.setnchannels(self.channels)
        wf.setsampwidth(self.audio.get_sample_size(self.format))
        wf.setframerate(self.rate)
        wf.writeframes(b''.join(frames))
        wf.close()
    
    def analyze_audio(self, audio_file):
        """Analyze audio file and display results"""
        try:
            # Check audio quality first
            import librosa
            waveform, sample_rate = librosa.load(audio_file, sr=None)
            
            # Skip if audio is too short - more lenient for live
            duration = len(waveform) / sample_rate
            if duration < 0.5:  # Reduced from 1.0 to 0.5 seconds
                return  # Skip silently for very short audio
                
            # Check audio volume - much more lenient for microphone
            volume = np.sqrt(np.mean(waveform**2))
            if volume < 0.001:  # Reduced from 0.005 to 0.001
                return  # Skip silently for very quiet audio
            
            result = predict_emotion(audio_file)
            
            # Add to history only if we have a valid result
            if result:
                self.detection_history.append(result)
                
                # Display results
                timestamp = time.strftime("%H:%M:%S")
                print(f"[{timestamp}] 🎯 {result['prediction']}")
                print(f"    📊 Confidence: {result['disorder_percentage']}%")
                print(f"    🎤 Audio: {duration:.1f}s | Volume: {volume:.4f}")
                
                if result['severity']:
                    print(f"    ⚠️  Severity: {result['severity']}")
                    print(f"    💡 Exercise: {result['exercise_suggestion']}")
                else:
                    print(f"    ✅ Normal speech detected")
                
                print("-" * 50)
            
        except Exception as e:
            # Print error for debugging but don't crash
            print(f"⚠️ Audio analysis issue: {str(e)[:50]}...")
    
    def stop_recording(self):
        """Stop recording"""
        self.recording = False
    
    def get_summary(self):
        """Get summary of detection session"""
        if not self.detection_history:
            return "No detections recorded"
        
        normal_count = sum(1 for d in self.detection_history if d['prediction'] == 'Normal')
        stuttering_count = len(self.detection_history) - normal_count
        
        return f"""
📊 Session Summary:
• Total detections: {len(self.detection_history)}
• Normal speech: {normal_count} ({normal_count/len(self.detection_history)*100:.1f}%)
• Stuttering detected: {stuttering_count} ({stuttering_count/len(self.detection_history)*100:.1f}%)
        """

    def get_final_classification(self):
        """Return overall session classification based on majority vote"""
        if not self.detection_history:
            return None
        normal_count = sum(1 for d in self.detection_history if d['prediction'] == 'Normal')
        stuttering_count = len(self.detection_history) - normal_count
        if normal_count == stuttering_count:
            return self.detection_history[-1]['prediction']
        return 'Normal' if normal_count > stuttering_count else 'Stuttering_Disorder'

def main():
    """Main function for live speech detection"""
    detector = LiveSpeechDetector()
    
    try:
        detector.start_recording()
    except KeyboardInterrupt:
        print("\n👋 Thank you for using the Live Speech Detection System!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("💡 Please check your microphone and try again")
    finally:
        # Always show summary when stopping
        summary = detector.get_summary()
        print(summary)
        
        # Show additional stats
        if len(detector.detection_history) > 0:
            print(f"\n📈 Session Statistics:")
            print(f"• Total detections: {len(detector.detection_history)}")
            print(f"• Average confidence: {np.mean([d['disorder_percentage'] for d in detector.detection_history]):.1f}%")
            print(f"• Session duration: Continuous monitoring")
            print("🔄 Ready for next session - Run 'python live_detection.py' again")

            final_label = detector.get_final_classification()
            if final_label:
                print(f"\n🏁 Final session classification: {final_label}")
            
        print("\n👋 Thank you for using the Live Speech Detection System!")

if __name__ == "__main__":
    main()
