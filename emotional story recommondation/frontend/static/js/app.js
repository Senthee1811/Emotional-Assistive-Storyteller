// Emotional Reader Frontend JavaScript

class EmotionalReader {
    constructor() {
        // Configure API base based on deployment scenario
        if (window.location.port === "8081") {
            this.apiBase = "http://localhost:5005";
        } else if (window.location.port === "5003") {
            this.apiBase = ""; // Use same host for unified service
        } else {
            this.apiBase = "http://localhost:5005"; // Default
        }
        
        this.video = document.getElementById('videoElement');
        this.canvas = document.getElementById('canvasElement');
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.isDetecting = false;
        this.detectionInterval = null;
        this.emotionBuffer = [];
        this.emotionHistory = [];
        this.currentEmotion = null;
        this.settings = {
            detectionInterval: 2000,
            bufferDuration: 15000,
            storyTheme: 'all'
        };
        this.stats = {
            sessionsToday: 0,
            storiesRead: 0,
            savedStories: [],
            emotionCounts: {}
        };
        
        this.initializeEventListeners();
        this.loadSettings();
        this.loadStats();
    }

    initializeEventListeners() {
        // Camera controls
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('stopCamera').addEventListener('click', () => this.stopCamera());
        
        // Story controls
        document.getElementById('refreshStory').addEventListener('click', () => this.refreshStory());
        document.getElementById('likeStory').addEventListener('click', () => this.rateStory('like'));
        document.getElementById('dislikeStory').addEventListener('click', () => this.rateStory('dislike'));
        document.getElementById('saveStory').addEventListener('click', () => this.saveStory());
        
        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettings').addEventListener('click', () => this.resetSettings());
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                } 
            });
            
            this.video.srcObject = this.stream;
            this.canvas.width = this.video.videoWidth || 640;
            this.canvas.height = this.video.videoHeight || 480;
            
            // Hide overlay and update UI
            document.getElementById('cameraOverlay').classList.add('hidden');
            document.getElementById('startCamera').disabled = true;
            document.getElementById('stopCamera').disabled = false;
            this.updateStatus('Active', true);
            
            // Start emotion detection
            this.startEmotionDetection();
            
            // Update stats
            this.stats.sessionsToday++;
            this.updateStats();
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showNotification('Unable to access camera. Please check permissions.', 'error');
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        this.stopEmotionDetection();
        
        // Show overlay and update UI
        document.getElementById('cameraOverlay').classList.remove('hidden');
        document.getElementById('startCamera').disabled = false;
        document.getElementById('stopCamera').disabled = true;
        this.updateStatus('Inactive', false);
    }

    startEmotionDetection() {
        this.isDetecting = true;
        this.emotionBuffer = [];
        
        this.detectionInterval = setInterval(async () => {
            if (this.isDetecting && this.video.readyState === 4) {
                await this.captureAndDetect();
            }
        }, this.settings.detectionInterval);
    }

    stopEmotionDetection() {
        this.isDetecting = false;
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
    }

    async captureAndDetect() {
        // Draw video frame to canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Get image data for emotion detection
        const imageData = this.canvas.toDataURL('image/jpeg', 0.8);
        
        try {
            // Send to backend for emotion detection
            const response = await fetch(`${this.apiBase}/api/detect-emotion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageData })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.processEmotionResult(result);
            }
        } catch (error) {
            console.error('Error detecting emotion:', error);
        }
    }

    processEmotionResult(result) {
        const { emotion, confidence, timestamp } = result;
        
        // Update current emotion display
        this.currentEmotion = emotion;
        document.getElementById('currentEmotion').textContent = emotion;
        document.getElementById('emotionConfidence').textContent = `Confidence: ${Math.round(confidence * 100)}%`;
        
        // Add to emotion buffer
        this.emotionBuffer.push({ emotion, confidence, timestamp });
        
        // Keep buffer within time limit
        const cutoffTime = Date.now() - this.settings.bufferDuration;
        this.emotionBuffer = this.emotionBuffer.filter(item => item.timestamp > cutoffTime);
        
        // Update emotion history for visualization
        this.updateEmotionHistory();
        
        // Check if we should recommend a story
        if (this.emotionBuffer.length >= 5) { // At least 5 detections
            const dominantEmotion = this.getDominantEmotion();
            if (dominantEmotion && dominantEmotion !== 'Neutral') {
                this.recommendStory(dominantEmotion);
            }
        }
        
        // Update emotion counts for stats
        this.stats.emotionCounts[emotion] = (this.stats.emotionCounts[emotion] || 0) + 1;
        this.updateStats();
    }

    getDominantEmotion() {
        if (this.emotionBuffer.length === 0) return null;
        
        // Count emotions in buffer
        const emotionCounts = {};
        this.emotionBuffer.forEach(item => {
            emotionCounts[item.emotion] = (emotionCounts[item.emotion] || 0) + 1;
        });
        
        // Find most frequent emotion
        let maxCount = 0;
        let dominantEmotion = null;
        
        for (const [emotion, count] of Object.entries(emotionCounts)) {
            if (count > maxCount) {
                maxCount = count;
                dominantEmotion = emotion;
            }
        }
        
        return dominantEmotion;
    }

    async recommendStory(emotion) {
        try {
            const response = await fetch(`${this.apiBase}/api/recommend-story`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    emotion: emotion,
                    theme: this.settings.storyTheme,
                    strategy: 'therapeutic'  // Always use therapeutic mode
                })
            });
            
            if (response.ok) {
                const story = await response.json();
                this.displayStory(story);
            }
        } catch (error) {
            console.error('Error getting story recommendation:', error);
        }
    }

    displayStory(story) {
        const { title, emotion: storyEmotion, content, detected_emotion, strategy, purpose } = story;
        
        // Hide placeholder and show story content
        document.getElementById('storyPlaceholder').classList.add('hidden');
        document.getElementById('storyContent').classList.remove('hidden');
        
        // Update story details
        document.getElementById('storyTitle').textContent = title;
        document.getElementById('storyEmotion').textContent = storyEmotion;
        document.getElementById('storyText').textContent = content;
        
        // Add therapeutic information if available
        const therapeuticInfo = document.getElementById('therapeuticInfo');
        if (detected_emotion && strategy === 'therapeutic' && detected_emotion !== storyEmotion) {
            if (!therapeuticInfo) {
                const infoDiv = document.createElement('div');
                infoDiv.id = 'therapeuticInfo';
                infoDiv.className = 'mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200';
                document.getElementById('storyContent').insertBefore(infoDiv, document.getElementById('storyText'));
            }
            
            therapeuticInfo.innerHTML = `
                <div class="flex items-center justify-center space-x-2 text-sm">
                    <span class="text-gray-600">You're feeling:</span>
                    <span class="font-semibold text-gray-800">${detected_emotion}</span>
                    <span class="text-purple-600">→</span>
                    <span class="font-semibold text-purple-600">${storyEmotion}</span>
                    <span class="text-gray-600">story to help you feel better</span>
                </div>
            `;
        } else if (therapeuticInfo) {
            therapeuticInfo.remove();
        }
        
        // Enable story action buttons
        document.getElementById('likeStory').disabled = false;
        document.getElementById('dislikeStory').disabled = false;
        document.getElementById('saveStory').disabled = false;
        
        // Update stats
        this.stats.storiesRead++;
        this.updateStats();
        
        // Add animation
        document.getElementById('storyContent').classList.add('story-recommendation');
        setTimeout(() => {
            document.getElementById('storyContent').classList.remove('story-recommendation');
        }, 800);
    }

    refreshStory() {
        if (this.currentEmotion) {
            this.recommendStory(this.currentEmotion);
        } else {
            this.showNotification('Please start emotion detection first', 'info');
        }
    }

    async rateStory(rating) {
        const storyTitle = document.getElementById('storyTitle').textContent;
        
        try {
            await fetch('/api/rate-story', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: storyTitle,
                    rating: rating,
                    emotion: this.currentEmotion
                })
            });
            
            // Disable buttons after rating
            document.getElementById('likeStory').disabled = true;
            document.getElementById('dislikeStory').disabled = true;
            
            this.showNotification(`Story ${rating}d!`, 'success');
        } catch (error) {
            console.error('Error rating story:', error);
        }
    }

    saveStory() {
        const storyTitle = document.getElementById('storyTitle').textContent;
        const storyContent = document.getElementById('storyText').textContent;
        const storyEmotion = document.getElementById('storyEmotion').textContent;
        
        const savedStory = {
            title: storyTitle,
            content: storyContent,
            emotion: storyEmotion,
            timestamp: Date.now()
        };
        
        this.stats.savedStories.push(savedStory);
        this.updateSavedStories();
        this.updateStats();
        
        // Disable save button
        document.getElementById('saveStory').disabled = true;
        
        this.showNotification('Story saved!', 'success');
    }

    updateSavedStories() {
        const container = document.getElementById('savedStories');
        
        if (this.stats.savedStories.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-sm">No saved stories yet</p>';
            return;
        }
        
        container.innerHTML = this.stats.savedStories.map((story, index) => `
            <div class="saved-story-item" onclick="app.loadSavedStory(${index})">
                <div class="font-medium">${story.title}</div>
                <div class="text-xs opacity-75">${story.emotion}</div>
            </div>
        `).join('');
    }

    loadSavedStory(index) {
        const story = this.stats.savedStories[index];
        this.displayStory(story);
    }

    updateEmotionHistory() {
        const chart = document.getElementById('emotionChart');
        const emotions = ['Happy', 'Sad', 'Angry', 'Surprise', 'Fear', 'Disgust', 'Neutral'];
        const colors = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#84cc16', '#6b7280'];
        
        // Count recent emotions (last 15 seconds)
        const recentEmotions = emotions.map(emotion => {
            const count = this.emotionBuffer.filter(item => item.emotion === emotion).length;
            return count;
        });
        
        const maxCount = Math.max(...recentEmotions, 1);
        
        chart.innerHTML = recentEmotions.map((count, index) => `
            <div class="emotion-bar" 
                 style="height: ${(count / maxCount) * 100}%; background-color: ${colors[index]}"
                 data-emotion="${emotions[index]}">
            </div>
        `).join('');
    }

    updateStatus(text, isActive) {
        const indicator = document.getElementById('statusIndicator');
        const dot = indicator.querySelector('span:first-child');
        const label = indicator.querySelector('span:last-child');
        
        label.textContent = text;
        
        if (isActive) {
            dot.classList.remove('bg-red-500');
            dot.classList.add('bg-green-500', 'status-active');
        } else {
            dot.classList.remove('bg-green-500', 'status-active');
            dot.classList.add('bg-red-500');
        }
    }

    updateStats() {
        document.getElementById('sessionsToday').textContent = this.stats.sessionsToday;
        document.getElementById('storiesRead').textContent = this.stats.storiesRead;
        document.getElementById('savedCount').textContent = this.stats.savedStories.length;
        
        // Find favorite emotion
        let favoriteEmotion = '-';
        let maxCount = 0;
        for (const [emotion, count] of Object.entries(this.stats.emotionCounts)) {
            if (count > maxCount) {
                maxCount = count;
                favoriteEmotion = emotion;
            }
        }
        document.getElementById('favoriteEmotion').textContent = favoriteEmotion;
        
        // Save to localStorage
        localStorage.setItem('emotionalReaderStats', JSON.stringify(this.stats));
    }

    loadStats() {
        const saved = localStorage.getItem('emotionalReaderStats');
        if (saved) {
            this.stats = JSON.parse(saved);
            this.updateStats();
            this.updateSavedStories();
        }
    }

    openSettings() {
        document.getElementById('settingsModal').classList.remove('hidden');
        document.getElementById('detectionInterval').value = this.settings.detectionInterval;
        document.getElementById('bufferDuration').value = this.settings.bufferDuration / 1000;
        document.getElementById('storyTheme').value = this.settings.storyTheme;
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
    }

    saveSettings() {
        this.settings.detectionInterval = parseInt(document.getElementById('detectionInterval').value);
        this.settings.bufferDuration = parseInt(document.getElementById('bufferDuration').value) * 1000;
        this.settings.storyTheme = document.getElementById('storyTheme').value;
        
        localStorage.setItem('emotionalReaderSettings', JSON.stringify(this.settings));
        
        // Restart detection with new settings if active
        if (this.isDetecting) {
            this.stopEmotionDetection();
            this.startEmotionDetection();
        }
        
        this.closeSettings();
        this.showNotification('Settings saved!', 'success');
    }

    resetSettings() {
        this.settings = {
            detectionInterval: 2000,
            bufferDuration: 15000,
            storyTheme: 'all'
        };
        
        document.getElementById('detectionInterval').value = this.settings.detectionInterval;
        document.getElementById('bufferDuration').value = this.settings.bufferDuration / 1000;
        document.getElementById('storyTheme').value = this.settings.storyTheme;
        
        localStorage.removeItem('emotionalReaderSettings');
        this.showNotification('Settings reset to defaults', 'info');
    }

    loadSettings() {
        const saved = localStorage.getItem('emotionalReaderSettings');
        if (saved) {
            this.settings = JSON.parse(saved);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
        }, 3000);
        
        // Remove after animation
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3500);
    }
}

// Initialize the application
const app = new EmotionalReader();

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        app.stopCamera();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (app.video && app.video.readyState === 4) {
        app.canvas.width = app.video.videoWidth;
        app.canvas.height = app.video.videoHeight;
    }
});
