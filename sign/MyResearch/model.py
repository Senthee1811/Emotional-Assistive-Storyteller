import tensorflow as tf
import json
import h5py
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Masking, Dropout
from tensorflow.keras.callbacks import EarlyStopping

from config import MODEL_CONFIG

class SignLanguageModel:
    def __init__(self, input_shape, num_classes):
        self.input_shape = input_shape
        self.num_classes = num_classes
        self.model = None
        
    def build_model(self):
        self.model = Sequential([
            Masking(mask_value=0.0, input_shape=self.input_shape),
            LSTM(MODEL_CONFIG['lstm_units'][0], return_sequences=True),
            Dropout(MODEL_CONFIG['dropout_rate']),
            LSTM(MODEL_CONFIG['lstm_units'][1], return_sequences=False),
            Dropout(MODEL_CONFIG['dropout_rate']),
            Dense(MODEL_CONFIG['dense_units'], activation='relu'),
            Dense(self.num_classes, activation='softmax')
        ])
        
        self.model.compile(
            loss="categorical_crossentropy",
            optimizer=tf.keras.optimizers.Adam(learning_rate=MODEL_CONFIG['learning_rate']),
            metrics=["accuracy"]
        )
        
        print(" Model built successfully")
        self.model.summary()
        return self.model
    
    def train(self, X_train, y_train, X_val=None, y_val=None):

        if self.model is None:
            print(" Model not built yet!")
            return None
        
        callbacks = []
        if X_val is not None and y_val is not None:
            callbacks.append(
                EarlyStopping(
                    monitor='val_loss',
                    patience=MODEL_CONFIG['patience'],
                    restore_best_weights=True
                )
            )
        
        history = self.model.fit(
            X_train, y_train,
            epochs=MODEL_CONFIG['epochs'],
            batch_size=MODEL_CONFIG['batch_size'],
            validation_data=(X_val, y_val) if X_val is not None else None,
            callbacks=callbacks,
            verbose=1
        )
        
        return history
    
    def save(self, filepath):
        if self.model:
            self.model.save(filepath)
            print(f" Model saved to {filepath}")
    
    def load(self, filepath):
        def _strip_unsupported_keys(obj):
            if isinstance(obj, dict):
                obj.pop("quantization_config", None)
                for key in list(obj.keys()):
                    _strip_unsupported_keys(obj[key])
            elif isinstance(obj, list):
                for item in obj:
                    _strip_unsupported_keys(item)

        try:
            self.model = tf.keras.models.load_model(filepath)
            print(f" Model loaded from {filepath}")
            return True
        except Exception as e:
            if "quantization_config" not in str(e):
                print(f" Error loading model: {e}")
                return False

            # Compatibility fallback for older/newer Keras config mismatches in H5 files.
            try:
                with h5py.File(filepath, "r") as h5_file:
                    raw_config = h5_file.attrs.get("model_config")
                    if raw_config is None:
                        print(f" Error loading model: {e}")
                        return False
                    if isinstance(raw_config, bytes):
                        raw_config = raw_config.decode("utf-8")
                    config = json.loads(raw_config)

                _strip_unsupported_keys(config)
                cleaned_config = json.dumps(config)
                self.model = tf.keras.models.model_from_json(
                    cleaned_config,
                    custom_objects={
                        "Sequential": tf.keras.models.Sequential,
                        "InputLayer": tf.keras.layers.InputLayer,
                        "Masking": tf.keras.layers.Masking,
                        "LSTM": tf.keras.layers.LSTM,
                        "Dropout": tf.keras.layers.Dropout,
                        "Dense": tf.keras.layers.Dense,
                    },
                )
                self.model.load_weights(filepath)
                self.model.compile(
                    loss="categorical_crossentropy",
                    optimizer=tf.keras.optimizers.Adam(learning_rate=MODEL_CONFIG['learning_rate']),
                    metrics=["accuracy"]
                )
                print(f" Model loaded from {filepath} (compat mode)")
                return True
            except Exception as compat_err:
                print(f" Error loading model: {e}")
                print(f" Compatibility load failed: {compat_err}")
                return False
    
    def predict(self, sequence):
        if self.model is None:
            return None
        
        try:
            predictions = self.model.predict(sequence, verbose=0)
            return predictions
        except Exception as e:
            print(f" Prediction error: {e}")
            return None
