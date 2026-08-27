import sys
import os
import time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def _add_local_venv_site_packages():
    # Fallback to locally vendored packages (e.g., glfw/OpenGL) if not installed globally.
    base_dir = os.path.dirname(os.path.abspath(__file__))
    venv_site = os.path.join(base_dir, ".venv", "Lib", "site-packages")
    if os.path.isdir(venv_site) and venv_site not in sys.path:
        sys.path.append(venv_site)


_add_local_venv_site_packages()

import numpy as np
from config import MODEL_FILE
from data_loader import DataLoader
from model import SignLanguageModel
from predictor import SignPredictor
from animation_opengl import SignAnimatorOpenGL


# ================= TRAIN MODEL =================
def train_model():
    print("Training mode")
    print("="*50)

    loader = DataLoader()
    if not loader.load_dataset():
        return

    X_train, X_val, y_train, y_val = loader.prepare_data()
    if X_train is None:
        return

    model = SignLanguageModel(input_shape=(loader.max_len, 1),
                              num_classes=len(loader.label_encoder.classes_))
    model.build_model()
    model.train(X_train, y_train, X_val, y_val)
    model.save(MODEL_FILE)

    if X_val is not None and y_val is not None:
        loss, acc = model.model.evaluate(X_val, y_val, verbose=0)
        print(f"Final validation accuracy: {acc:.2%}")

    print("Training completed!")


# ================= PLAY ANIMATION =================
def play_animation():
    print("-- Prediction mode")
    print("="*50)

    # Load model
    model_wrapper = SignLanguageModel(input_shape=(None, 1), num_classes=1)
    if not model_wrapper.load(MODEL_FILE):
        print("Please train the model first!")
        return

    loader = DataLoader()
    label_encoder = loader.load_label_encoder()
    if label_encoder is None:
        print("Please train the model first!")
        return

    predictor = SignPredictor(model_wrapper.model, label_encoder)
    animator = SignAnimatorOpenGL(width=800, height=600)

    print("\nAvailable signs:")
    available_labels = predictor.list_available_labels()
    if available_labels:
        print(f"  {', '.join(available_labels)}")

    print("\nControls while animating:")
    print("  q or ESC = quit, p = pause/resume, r = restart, n = next sign")
    print("="*50)

    try:
        while not animator.should_close():
            user_input = input("\nEnter sign label(s) or text: ").strip()
            if user_input.lower() in ["exit", "quit", "q"]:
                break
            if user_input.lower() == "list":
                available_labels = predictor.list_available_labels()
                if available_labels:
                    print(f"Available signs: {', '.join(available_labels)}")
                continue
            if not user_input:
                print("Please enter some text.")
                continue

            # Multiple signs
            if ',' in user_input:
                labels = [lbl.strip() for lbl in user_input.split(',') if lbl.strip()]
                valid_labels = []
                for label in labels:
                    frames, _ = predictor.load_sign_frames(label)
                    if frames:
                        valid_labels.append(label)
                    else:
                        predicted, confidence = predictor.predict(label)
                        if predicted:
                            print(f"   → Predicted '{label}' as '{predicted}' ({confidence:.2%})")
                            valid_labels.append(predicted)

                if valid_labels:
                    play_multiple_animations(valid_labels, predictor, animator)
                else:
                    print("No valid signs found.")
            else:
                # Single sign
                predicted_label, confidence = predictor.predict(user_input)
                if predicted_label:
                    print(f"Predicted sign: '{predicted_label}' ({confidence:.2%})")
                    play_single_animation(predicted_label, predictor, animator)
                else:
                    frames, _ = predictor.load_sign_frames(user_input)
                    if frames:
                        play_single_animation(user_input, predictor, animator)
                    else:
                        print("Could not find or predict a sign for the input.")

    except KeyboardInterrupt:
        print("\nInterrupted by user.")
    finally:
        animator.terminate()


# ================= PLAY SINGLE SIGN =================
def play_single_animation(label, predictor, animator, target_fps=15):
    frames, _ = predictor.load_sign_frames(label)
    if not frames:
        print(f"No animation found for '{label}'")
        return

    frame_delay = 1.0 / max(1, target_fps)

    print(f"\nPlaying animation for: {label} (target {target_fps} FPS)")
    frame_idx = 0
    animator.paused = False
    animator.restart = False
    animator.next_sign = False
    animator.quit = False

    while not animator.should_close():
        animator.draw_frame(frames[frame_idx])

        # Check flags
        if animator.quit or animator.should_close():
            break
        if animator.restart:
            frame_idx = 0
            animator.restart = False
        if animator.next_sign:
            break
        if not animator.paused:
            frame_idx = (frame_idx + 1) % len(frames)

        time.sleep(frame_delay)


# ================= PLAY MULTIPLE SIGNS =================
def play_multiple_animations(labels, predictor, animator, target_fps=15):
    animations = []
    for label in labels:
        frames, _ = predictor.load_sign_frames(label)
        if frames:
            animations.append((label, frames))

    if not animations:
        print("No valid signs found.")
        return

    frame_delay = 1.0 / max(1, target_fps)

    current_sign = 0
    animator.paused = False
    animator.restart = False
    animator.next_sign = False
    animator.quit = False

    while not animator.should_close():
        label, frames = animations[current_sign]
        print(f"\nAnimating '{label}' (target {target_fps} FPS)")
        frame_idx = 0

        while not animator.should_close() and frame_idx < len(frames):
            animator.draw_frame(frames[frame_idx])

            if animator.quit or animator.should_close():
                return
            if animator.restart:
                frame_idx = 0
                animator.restart = False
            if animator.next_sign:
                animator.next_sign = False
                break
            if not animator.paused:
                frame_idx += 1

            time.sleep(frame_delay)

        current_sign = (current_sign + 1) % len(animations)


# ================= MAIN MENU =================
def main():
    print("="*50)
    print("   SIGN LANGUAGE  (Test -> Sign)")
    print("="*50)
    print("1. Train Sign model")
    print("2. Predict Sign")
    print("3. Exit")
    print("="*50)

    while True:
        choice = input("\nSelect option (1-3): ").strip()
        if choice == "1":
            train_model()
        elif choice == "2":
            play_animation()
        elif choice == "3":
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Please select 1, 2, or 3.")


if __name__ == "__main__":
    main()
