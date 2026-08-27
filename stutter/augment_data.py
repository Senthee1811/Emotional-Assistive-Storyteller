import os
import glob
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample
import random
import shutil

def augment_audio(input_file, output_file, augmentation_type):
    """Apply audio augmentation and save to output file"""
    try:
        # Read audio file
        sample_rate, audio_data = wavfile.read(input_file)
        
        if augmentation_type == 'noise':
            # Add small amount of noise
            noise = np.random.normal(0, 0.01, audio_data.shape)
            augmented_audio = audio_data + noise.astype(np.int16)
            
        elif augmentation_type == 'speed':
            # Slightly change speed (0.9x to 1.1x)
            speed_factor = random.uniform(0.9, 1.1)
            new_length = int(len(audio_data) / speed_factor)
            augmented_audio = resample(audio_data, new_length).astype(np.int16)
            
        elif augmentation_type == 'pitch':
            # Simulate pitch change by slight speed modification
            pitch_factor = random.uniform(0.95, 1.05)
            new_length = int(len(audio_data) / pitch_factor)
            augmented_audio = resample(audio_data, new_length).astype(np.int16)
        
        elif augmentation_type == 'volume':
            # Change volume
            volume_factor = random.uniform(0.8, 1.2)
            augmented_audio = (audio_data * volume_factor).astype(np.int16)
            
        elif augmentation_type == 'noise_speed':
            # Combine noise and speed changes
            noise = np.random.normal(0, 0.01, audio_data.shape)
            audio_with_noise = audio_data + noise.astype(np.int16)
            speed_factor = random.uniform(0.9, 1.1)
            new_length = int(len(audio_with_noise) / speed_factor)
            augmented_audio = resample(audio_with_noise, new_length).astype(np.int16)
            
        elif augmentation_type == 'pitch_volume':
            # Combine pitch and volume changes
            pitch_factor = random.uniform(0.95, 1.05)
            new_length = int(len(audio_data) / pitch_factor)
            pitch_audio = resample(audio_data, new_length).astype(np.int16)
            volume_factor = random.uniform(0.8, 1.2)
            augmented_audio = (pitch_audio * volume_factor).astype(np.int16)
            
        elif augmentation_type == 'speed_volume':
            # Combine speed and volume changes
            speed_factor = random.uniform(0.9, 1.1)
            new_length = int(len(audio_data) / speed_factor)
            speed_audio = resample(audio_data, new_length).astype(np.int16)
            volume_factor = random.uniform(0.8, 1.2)
            augmented_audio = (speed_audio * volume_factor).astype(np.int16)
        
        else:
            # Just copy the original
            augmented_audio = audio_data
        
        # Ensure audio data is in valid range
        augmented_audio = np.clip(augmented_audio, -32768, 32767)
        
        # Save augmented audio
        wavfile.write(output_file, sample_rate, augmented_audio)
        return True
        
    except Exception as e:
        print(f"Error processing {input_file}: {e}")
        return False

def create_augmented_dataset():
    """Create augmented dataset to reach 1000 samples per class"""
    
    # Current dataset paths
    data_01_path = "DataSet/Data_01"
    data_02_path = "DataSet/Data_02"
    
    # Get existing files
    normal_files = glob.glob(f"{data_01_path}/*.wav")
    stuttering_files = glob.glob(f"{data_02_path}/*.wav")
    
    print(f"Current dataset:")
    print(f"Normal: {len(normal_files)} files")
    print(f"Stuttering: {len(stuttering_files)} files")
    
    # Target: 1000 Normal, 1000 Stuttering (total 2000)
    target_normal = 1000
    target_stuttering = 1000
    
    # Calculate how many augmented files we need
    normal_needed = target_normal - len(normal_files)
    stuttering_needed = target_stuttering - len(stuttering_files)
    
    print(f"\nNeed to generate:")
    print(f"Normal: {normal_needed} augmented files")
    print(f"Stuttering: {stuttering_needed} augmented files")
    
    # Augmentation types (expanded for more variety)
    augmentation_types = ['noise', 'speed', 'pitch', 'volume', 'noise_speed', 'pitch_volume', 'speed_volume']
    
    # Generate augmented Normal files
    normal_count = len(normal_files)
    for i in range(normal_needed):
        if i % 100 == 0:
            print(f"Progress: {i}/{normal_needed} Normal files generated")
        
        # Select random source file
        source_file = random.choice(normal_files)
        
        # Select random augmentation type
        aug_type = random.choice(augmentation_types)
        
        # Generate new filename
        normal_count += 1
        new_filename = f"01-{normal_count:02d}.wav"
        output_path = os.path.join(data_01_path, new_filename)
        
        # Apply augmentation
        if augment_audio(source_file, output_path, aug_type):
            if i % 50 == 0:
                print(f"Created {new_filename} from {os.path.basename(source_file)} ({aug_type})")
    
    # Generate augmented Stuttering files
    stuttering_count = len(stuttering_files)
    for i in range(stuttering_needed):
        if i % 100 == 0:
            print(f"Progress: {i}/{stuttering_needed} Stuttering files generated")
        
        # Select random source file
        source_file = random.choice(stuttering_files)
        
        # Select random augmentation type
        aug_type = random.choice(augmentation_types)
        
        # Generate new filename
        stuttering_count += 1
        new_filename = f"02-{stuttering_count:02d}.wav"
        output_path = os.path.join(data_02_path, new_filename)
        
        # Apply augmentation
        if augment_audio(source_file, output_path, aug_type):
            if i % 50 == 0:
                print(f"Created {new_filename} from {os.path.basename(source_file)} ({aug_type})")
    
    # Verify final counts
    final_normal = len(glob.glob(f"{data_01_path}/*.wav"))
    final_stuttering = len(glob.glob(f"{data_02_path}/*.wav"))
    
    print(f"\nFinal dataset:")
    print(f"Normal: {final_normal} files")
    print(f"Stuttering: {final_stuttering} files")
    print(f"Total: {final_normal + final_stuttering} files")

if __name__ == "__main__":
    create_augmented_dataset()
