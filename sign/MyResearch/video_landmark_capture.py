import cv2
import mediapipe as mp
import csv
from collections import deque
import argparse
import os

# --- ARGUMENT PARSER ---
parser = argparse.ArgumentParser(description="Process video and save sign language landmarks.")
parser.add_argument("--video", required=True, help="Path to the video file")
parser.add_argument("--label", required=True, help="Gesture label for this video")
parser.add_argument("--csv", default="sign_dataset.csv", help="CSV file to save data (default: sign_dataset.csv)")
parser.add_argument("--fps", type=int, default=15, help="FPS to sample from the video (default: 15)")
args = parser.parse_args()

VIDEO_PATH = args.video
LABEL = args.label
SAVE_FILE = args.csv
FPS = args.fps

# --- CHECK VIDEO EXISTS ---
if not os.path.exists(VIDEO_PATH):
    print(f"Error: Could not open video file {VIDEO_PATH}")
    exit()

# --- MEDIA PIPE SETUP ---
mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands

pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)
hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.5, min_tracking_confidence=0.5)

# --- CSV SETUP ---
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

# --- BUFFER & FRAME ID ---
frame_id = 0
data_buffer = deque()

# --- UTILITY FUNCTION ---
def extract_features(pose_result, left_hand_data, right_hand_data, label, frame_num):
    row = [label, frame_num]

    # Pose landmarks
    if pose_result and pose_result.pose_landmarks:
        for lm in pose_result.pose_landmarks.landmark:
            row += [lm.x, lm.y, lm.z, lm.visibility]
    else:
        row += [0] * (33 * 4)

    # Left hand
    if left_hand_data:
        for lm in left_hand_data:
            row += [lm.x, lm.y, lm.z]
    else:
        row += [0] * 63

    # Right hand
    if right_hand_data:
        for lm in right_hand_data:
            row += [lm.x, lm.y, lm.z]
    else:
        row += [0] * 63

    return row

# --- OPEN VIDEO ---
cap = cv2.VideoCapture(VIDEO_PATH)
if not cap.isOpened():
    print(f"Error: Could not open video file {VIDEO_PATH}")
    exit()

video_fps = cap.get(cv2.CAP_PROP_FPS)
frame_interval = int(video_fps / FPS) if video_fps > FPS else 1

print(f"Processing video '{VIDEO_PATH}' at {FPS} FPS with label '{LABEL}'...")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    if frame_id % frame_interval != 0:
        frame_id += 1
        continue

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # --- PROCESS POSE & HANDS ---
    pose_result = pose.process(rgb)
    hand_result = hands.process(rgb)

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

    # --- EXTRACT FEATURES & ADD TO CSV ---
    row = extract_features(
        pose_result,
        left_hand_data,
        right_hand_data,
        LABEL,
        frame_id
    )
    writer.writerow(row)

    # --- OPTIONAL: DRAW LANDMARKS ---
    if pose_result and pose_result.pose_landmarks:
        mp.solutions.drawing_utils.draw_landmarks(frame, pose_result.pose_landmarks, mp_pose.POSE_CONNECTIONS)
    if hand_result and hand_result.multi_hand_landmarks:
        for hand_landmarks in hand_result.multi_hand_landmarks:
            mp.solutions.drawing_utils.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

    # --- SHOW VIDEO (optional) ---
    cv2.putText(frame, f"Processing: {LABEL}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    cv2.imshow("Video Landmark Capture", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        print("Interrupted by user.")
        break

    frame_id += 1

# --- CLEANUP ---
cap.release()
cv2.destroyAllWindows()
csv_file.close()
print(f"Data saved to {SAVE_FILE}")
print("Processing completed!")
