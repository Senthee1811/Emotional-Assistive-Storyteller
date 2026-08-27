import cv2
import mediapipe as mp
import csv
import time
import math
from collections import deque
import keyboard


SAVE_FILE = "sign_dataset.csv"
FPS = 15
COLLECTION_DELAY = 5
BUFFER_SECONDS = 5


mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands

pose = mp_pose.Pose()
hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.5, min_tracking_confidence=0.5)

# --- CSV HEADER ---
header = ["label", "frame"]
for i in range(33):
    header += [f"pose_x{i}", f"pose_y{i}", f"pose_z{i}", f"pose_v{i}"]
for h in ["L", "R"]:
    for i in range(21):
        header += [f"{h}_x{i}", f"{h}_y{i}", f"{h}_z{i}"]

csv_file = open(SAVE_FILE, "a", newline="")
writer = csv.writer(csv_file)
if csv_file.tell() == 0:
    writer.writerow(header)

# Data collection buffers
data_buffer = deque()
is_collecting = False
collection_start_time = 0
current_label = ""
frame_id = 0

# For circular buffer to store last N seconds of data
BUFFER_SIZE = FPS * BUFFER_SECONDS


# Utility function to extract features
def extract_features(pose_result, left_hand_data, right_hand_data, label, frame_num):
    row = [label, frame_num]

    # Pose features
    if pose_result and pose_result.pose_landmarks:
        for lm in pose_result.pose_landmarks.landmark:
            row += [lm.x, lm.y, lm.z, lm.visibility]
    else:
        row += [0] * (33 * 4)

    # Left hand features
    if left_hand_data:
        for lm in left_hand_data:
            row += [lm.x, lm.y, lm.z]
    else:
        row += [0] * 63

    # Right hand features
    if right_hand_data:
        for lm in right_hand_data:
            row += [lm.x, lm.y, lm.z]
    else:
        row += [0] * 63

    return row


def start_collection(label):

    global is_collecting, collection_start_time, current_label, data_buffer, frame_id
    print(f"\nStarting data collection for '{label}' in {COLLECTION_DELAY} seconds...")
    print("Get ready...")

    time.sleep(COLLECTION_DELAY)

    is_collecting = True
    current_label = label
    collection_start_time = time.time()
    data_buffer.clear()
    frame_id = 0
    print(f"Now collecting data for '{label}'... Press 'E' to stop.")


def stop_collection():

    global is_collecting, data_buffer

    if not is_collecting or len(data_buffer) == 0:
        print("No data to save!")
        return

    # Calculate how many frames to discard from the end
    frames_to_discard = min(BUFFER_SIZE, len(data_buffer))

    # Save all frames except the last BUFFER_SECONDS
    frames_to_save = len(data_buffer) - frames_to_discard

    if frames_to_save <= 0:
        print("Not enough data collected! Need more than 5 seconds of data.")
        is_collecting = False
        return

    # Save the frames
    saved_frames = 0
    for i in range(frames_to_save):
        writer.writerow(data_buffer[i])
        saved_frames += 1

    csv_file.flush()
    print(f"Saved {saved_frames} frames for '{current_label}' (excluding last {BUFFER_SECONDS} seconds)")

    # Ask for next label
    next_label = input("\nEnter next label (or press Enter to quit): ").strip()
    if next_label:
        start_collection(next_label)
    else:
        print("Data collection completed!")
        is_collecting = False



print("Sign Language Dataset Recorder")
print("=" * 50)
print("Instructions:")
print("1. Enter a label (e.g., 'Hello')")
print("2. Wait 5 seconds for collection to start")
print("3. Perform the gesture")
print("4. Press 'E' to stop collection")
print("5. Last 5 seconds of data will NOT be saved")
print("6. Enter next label or press Enter to quit")
print("=" * 50)

# Get first label
first_label = input("Enter first label: ").strip()
if first_label:
    start_collection(first_label)
else:
    print("No label entered. Exiting...")
    exit()

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Process pose and hands
    pose_result = pose.process(rgb)
    hand_result = hands.process(rgb)

    # Extract hand landmarks
    left_hand_data = None
    right_hand_data = None

    if hand_result.multi_hand_landmarks and hand_result.multi_handedness:
        for idx, handedness in enumerate(hand_result.multi_handedness):
            label_side = handedness.classification[0].label
            hand_landmarks = hand_result.multi_hand_landmarks[idx].landmark
            if label_side == "Left":
                left_hand_data = hand_landmarks
            else:
                right_hand_data = hand_landmarks

    # If collecting data, add to buffer
    if is_collecting and time.time() - collection_start_time >= 0:  # Always true after start
        # Throttle by FPS
        current_time = time.time()
        if hasattr(start_collection, 'last_capture_time'):
            if current_time - start_collection.last_capture_time < 1 / FPS:
                continue
        start_collection.last_capture_time = current_time

        # Extract features and add to buffer
        row = extract_features(
            pose_result,
            left_hand_data,
            right_hand_data,
            current_label,
            frame_id
        )

        data_buffer.append(row)
        frame_id += 1

        # Update display
        cv2.putText(frame, f"Collecting: {current_label}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(frame, f"Frames: {len(data_buffer)}", (10, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, "Press 'E' to stop", (10, 110),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
    else:
        cv2.putText(frame, "Not collecting", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

    # Draw landmarks
    if pose_result and pose_result.pose_landmarks:
        mp.solutions.drawing_utils.draw_landmarks(frame, pose_result.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    if hand_result and hand_result.multi_hand_landmarks:
        for hand_landmarks in hand_result.multi_hand_landmarks:
            mp.solutions.drawing_utils.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

    cv2.imshow("Sign Dataset Recorder", frame)

    # Check for 'E' key press to stop collection
    if cv2.waitKey(1) & 0xFF == ord('e'):
        if is_collecting:
            stop_collection()
        else:
            print("Not currently collecting data.")

    # Check for 'q' to quit completely
    if cv2.waitKey(1) & 0xFF == ord('q'):
        if is_collecting:
            print("\nStopping collection and saving current data...")
            stop_collection()
        break

# Cleanup
cap.release()
cv2.destroyAllWindows()
csv_file.close()
print(f"\nData saved to: {SAVE_FILE}")
