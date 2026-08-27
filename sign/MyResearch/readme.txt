it22123954 - Brinthapan J

 Text-to-Sign Language Translation System
OpenGL-Based Sign Language Animation

This project is a Text-to-Sign Language Translation System designed to improve accessibility for hearing- and speech-impaired users.
It converts input text into sign language animations using OpenGL, supported by a dataset-based word-to-sign mapping and optional Text-to-Speech (TTS) output.

 Project Objective

Convert text input into sign language

Visually represent signs using OpenGL animations

Support accessibility-focused communication systems

Serve as a foundation for assistive and educational tools

 Features

🤟 Text-to-Sign Language Conversion

🎥 Real-time OpenGL-based hand animation

📊 Dataset-driven sign mapping

🔊 Optional Text-to-Speech (TTS) output

🧩 Modular Python architecture

🌐 Flask API support (optional integration)

🗂️ Project Structure
├── DataSet/                    # Collected text/sign related data
├── __pycache__/                # Python cache files
│
├── CollectData.py              # Text / sign data collection
├── data_loader.py              # Load and preprocess sign dataset
├── utils.py                    # Helper utility functions
│
├── sign_dataset.csv            # Text-to-sign mapping dataset
│
├── animation.py                # Basic sign animation logic
├── animation_opengl.py         # OpenGL-based sign language animation
├── main.py                     # Main runner for text-to-sign animation
│
├── tts_engine.py               # Optional Text-to-Speech module
├── flaskApi.py                 # Flask API for system integration
│
├── test.py                     # Testing script
├── config.py                   # Configuration settings
├── readme.txt / README.md      # Documentation
└── .gitignore

 How the System Works

User provides text input

Text is split into supported words/characters

Each word is matched using sign_dataset.csv

Corresponding sign animation is triggered

OpenGL renders animated hand gestures

(Optional) TTS narrates the text for dual-mode accessibility

 Text-to-Sign Language Module

Uses CSV-based dataset for word-to-sign mapping

Each sign is animated visually

Implemented using:

animation.py

animation_opengl.py

main.py

This enables visual communication for users who rely on sign language.

OpenGL Animation

Built using PyOpenGL

Displays animated sign gestures in a graphical window

Can be extended to:

Alphabets

Words

Full sentences

🔊 Text-to-Speech (Optional)

Converts the same input text into speech

Helps combine audio + visual accessibility

Implemented in tts_engine.py

🚀 How to Run
 Install Dependencies
pip install numpy pandas flask flask-cors pyopengl pygame pyttsx3

Run Text-to-Sign Animation
python main.py


Enter text when prompted

OpenGL window will display sign animations

 Run Flask API (Optional)
python flaskApi.py


Used for frontend or external system integration.

 Testing
python test.py


Used to verify dataset mapping and animation flow.

Use Cases

Assistive communication tools

Accessibility systems for hearing-impaired users

Educational platforms for learning sign language

Human–Computer Interaction (HCI) projects

Final year undergraduate projects

 Disclaimer

This system is developed for educational and assistive purposes only.
It does not replace certified sign language interpreters.

Contribution

Fork the repository

Create a feature branch

Commit your changes

Submit a Pull Request

License

MIT License

 Built for Accessibility & Inclusion

Text Processing • OpenGL • Assistive Technology