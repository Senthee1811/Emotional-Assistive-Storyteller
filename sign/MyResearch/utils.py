# utils.py
import csv
import numpy as np
from tensorflow.keras.utils import to_categorical


def load_csv_data(filepath):

    data = []
    labels = []

    try:
        with open(filepath, 'r') as f:
            reader = csv.reader(f)
            header = next(reader)

            for row in reader:
                if row:
                    labels.append(row[0])
                    features = [float(x) if x.strip() else 0.0 for x in row[2:]]
                    data.append(features)

        return data, labels, header
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return [], [], None


def pad_sequences(sequences, max_len=None):
    """Pad sequences to equal length"""
    if not sequences:
        return np.array([]), 0

    if max_len is None:
        max_len = max(len(seq) for seq in sequences)

    padded = []
    for seq in sequences:
        if len(seq) < max_len:
            padded_seq = seq + [0.0] * (max_len - len(seq))
        else:
            padded_seq = seq[:max_len]
        padded.append(padded_seq)

    return np.array(padded), max_len


def prepare_sequences_for_prediction(sequences, max_len):
    padded_sequences = []

    for seq in sequences:
        if len(seq) < max_len:
            padded_seq = seq + [0.0] * (max_len - len(seq))
        else:
            padded_seq = seq[:max_len]
        padded_sequences.append(padded_seq)

    return np.array(padded_sequences).reshape((len(padded_sequences), max_len, 1))


def calculate_sequence_length(data_config):

    total_points = (data_config['pose_points'] * data_config['pose_values_per_point'] +
                    data_config['hand_points'] * data_config['hand_values_per_point'] * 2)
    return total_points