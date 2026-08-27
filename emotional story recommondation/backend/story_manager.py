import os
import json
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
import pdfplumber
import cv2
import pytesseract
from PIL import Image
import numpy as np
from Story_Classfication.multi_pdf import predict_pdf_emotion, clean_text
from nltk.tokenize import sent_tokenize

class StoryManager:
    def __init__(self, upload_folder='../data/uploaded_stories', metadata_file='../data/story_metadata.json'):
        self.upload_folder = upload_folder
        self.metadata_file = metadata_file
        self.allowed_extensions = {'pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp'}
        
        # Create folders if they don't exist
        os.makedirs(self.upload_folder, exist_ok=True)
        
        # Load existing metadata
        self.metadata = self.load_metadata()
    
    def load_metadata(self):
        """Load story metadata from JSON file"""
        if os.path.exists(self.metadata_file):
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_metadata(self):
        """Save story metadata to JSON file"""
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, indent=2, ensure_ascii=False)
    
    def allowed_file(self, filename):
        """Check if file extension is allowed"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in self.allowed_extensions
    
    def extract_text_from_pdf(self, pdf_path):
        """Extract text from PDF file"""
        text = ""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += "\n" + page_text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
        return text.strip()
    
    def extract_text_from_image(self, image_path):
        """Extract text from image using OCR"""
        try:
            # Read image
            image = cv2.imread(image_path)
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply threshold to get better OCR results
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Noise removal
            kernel = np.ones((1,1), np.uint8)
            opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
            
            # Extract text using Tesseract OCR
            text = pytesseract.image_to_string(opening, config='--psm 6')
            
            return text.strip()
        except Exception as e:
            print(f"Error extracting text from image: {e}")
            return ""
    
    def analyze_emotion(self, text):
        """Analyze emotion of text using story classification model"""
        try:
            # Import here to avoid circular imports
            from Story_Classfication.multi_pdf import predict_sentence, vectorizer, model, reverse_map
            import numpy as np
            
            if not text.strip():
                return None, None, None
            
            # Tokenize into sentences
            sentences = sent_tokenize(text)
            
            if not sentences:
                return None, None, None
            
            probabilities_list = []
            
            # Predict each sentence
            for sentence in sentences:
                sentence = sentence.strip()
                if len(sentence) > 0:
                    probs = predict_sentence(sentence)
                    probabilities_list.append(probs)
            
            if not probabilities_list:
                return None, None, None
            
            # Average probabilities
            avg_probs = np.mean(probabilities_list, axis=0)
            
            # Final prediction
            numeric_label = int(np.argmax(avg_probs))
            text_label = reverse_map[numeric_label]
            
            return numeric_label, text_label, avg_probs.tolist()
            
        except Exception as e:
            print(f"Error analyzing emotion: {e}")
            return None, None, None
    
    def save_uploaded_file(self, file, title=None):
        """Save uploaded file and analyze its emotion"""
        if file and self.allowed_file(file.filename):
            # Generate unique filename
            filename = secure_filename(file.filename)
            file_id = str(uuid.uuid4())
            file_extension = filename.rsplit('.', 1)[1].lower()
            saved_filename = f"{file_id}.{file_extension}"
            
            # Save file
            file_path = os.path.join(self.upload_folder, saved_filename)
            file.save(file_path)
            
            # Extract text based on file type
            if file_extension == 'pdf':
                text = self.extract_text_from_pdf(file_path)
            else:
                text = self.extract_text_from_image(file_path)
            
            if not text:
                return {"error": "Could not extract text from file"}
            
            # Analyze emotion
            emotion_num, emotion_label, emotion_scores = self.analyze_emotion(text)
            
            if emotion_label is None:
                return {"error": "Could not analyze emotion"}
            
            # Create story metadata
            story_data = {
                "id": file_id,
                "title": title or f"Story {file_id[:8]}",
                "filename": saved_filename,
                "original_filename": file.filename,
                "file_type": file_extension,
                "text": text,
                "emotion": emotion_label,
                "emotion_scores": emotion_scores,
                "emotion_confidence": max(emotion_scores) if emotion_scores else 0,
                "upload_date": datetime.now().isoformat(),
                "word_count": len(text.split()),
                "sentence_count": len(sent_tokenize(text))
            }
            
            # Save to metadata
            self.metadata[file_id] = story_data
            self.save_metadata()
            
            return story_data
        
        return {"error": "Invalid file type"}
    
    def get_all_stories(self):
        """Get all stored stories"""
        return list(self.metadata.values())
    
    def get_stories_by_emotion(self, emotion):
        """Get stories filtered by emotion"""
        return [story for story in self.metadata.values() 
                if story.get('emotion', '').lower() == emotion.lower()]
    
    def search_stories(self, query):
        """Search stories by title or content"""
        query_lower = query.lower()
        results = []
        
        for story in self.metadata.values():
            if (query_lower in story.get('title', '').lower() or 
                query_lower in story.get('text', '').lower()):
                results.append(story)
        
        return results
    
    def get_story_by_id(self, story_id):
        """Get a specific story by ID"""
        return self.metadata.get(story_id)
    
    def delete_story(self, story_id):
        """Delete a story"""
        if story_id in self.metadata:
            story = self.metadata[story_id]
            
            # Delete file
            file_path = os.path.join(self.upload_folder, story['filename'])
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Remove from metadata
            del self.metadata[story_id]
            self.save_metadata()
            
            return True
        return False
    
    def update_story_title(self, story_id, new_title):
        """Update story title"""
        if story_id in self.metadata:
            self.metadata[story_id]['title'] = new_title
            self.save_metadata()
            return True
        return False
    
    def get_statistics(self):
        """Get library statistics"""
        stories = list(self.metadata.values())
        
        if not stories:
            return {
                "total_stories": 0,
                "emotions": {},
                "file_types": {},
                "total_words": 0,
                "avg_confidence": 0
            }
        
        emotion_counts = {}
        file_type_counts = {}
        total_words = 0
        total_confidence = 0
        
        for story in stories:
            # Count emotions
            emotion = story.get('emotion', 'unknown')
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
            # Count file types
            file_type = story.get('file_type', 'unknown')
            file_type_counts[file_type] = file_type_counts.get(file_type, 0) + 1
            
            # Sum words and confidence
            total_words += story.get('word_count', 0)
            total_confidence += story.get('emotion_confidence', 0)
        
        return {
            "total_stories": len(stories),
            "emotions": emotion_counts,
            "file_types": file_type_counts,
            "total_words": total_words,
            "avg_confidence": total_confidence / len(stories) if stories else 0
        }
