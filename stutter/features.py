import numpy as np
import librosa

def feature_chromagram(waveform, sample_rate):
    stft_spectrogram = np.abs(librosa.stft(waveform))
    chromagram = np.mean(librosa.feature.chroma_stft(S=stft_spectrogram, sr=sample_rate).T, axis=0)
    return chromagram

def feature_melspectrogram(waveform, sample_rate):
    melspectrogram = np.mean(librosa.feature.melspectrogram(
        y=waveform, sr=sample_rate, n_mels=128, fmax=8000).T, axis=0)
    return melspectrogram

def feature_mfcc(waveform, sample_rate):
    mfcc = np.mean(librosa.feature.mfcc(
        y=waveform, sr=sample_rate, n_mfcc=40).T, axis=0)
    return mfcc


def get_features(file):
    waveform, sample_rate = librosa.load(file, sr=None)
    chroma = feature_chromagram(waveform, sample_rate)
    mel = feature_melspectrogram(waveform, sample_rate)
    mfcc = feature_mfcc(waveform, sample_rate)

    feature_vector = np.hstack((chroma, mel, mfcc))
    return feature_vector
