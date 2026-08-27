// AI Coaching Assistant JavaScript
class AICoachingAssistant {
    constructor() {
        this.isActive = false;
        this.mode = 'guided'; // guided, independent, assessment
        this.coachingInterval = null;
        this.feedbackHistory = [];
        this.sessionMetrics = {
            pace: [],
            volume: [],
            tension: [],
            confidence: [],
            feedbackCount: 0,
            startTime: null
        };
        this.audioContext = null;
        this.microphone = null;
        this.analyser = null;
        this.dataArray = null;
    }

    // Initialize audio context for real-time analysis
    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.microphone.connect(this.analyser);
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            return true;
        } catch (error) {
            console.error('Error initializing audio:', error);
            return false;
        }
    }

    // Start AI coaching session
    async startCoaching() {
        if (this.isActive) return;
        
        const audioInitialized = await this.initializeAudio();
        if (!audioInitialized) {
            this.showFeedback('Error: Could not access microphone. Please check permissions.', 'danger');
            return;
        }

        this.isActive = true;
        this.sessionMetrics.startTime = Date.now();
        this.updateUI();
        
        // Start real-time analysis
        this.startRealTimeAnalysis();
        
        // Show initial coaching message
        this.showFeedback('AI Coach is listening! Start speaking to receive real-time feedback.', 'info');
        this.addFeedbackToHistory('Session Started', 'AI Coaching activated', 'success');
        
        // Update status
        this.updateStatus('Active', 'success');
    }

    // Stop AI coaching session
    stopCoaching() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Clear intervals
        if (this.coachingInterval) {
            clearInterval(this.coachingInterval);
        }
        
        // Stop audio
        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        // Calculate session duration
        const sessionDuration = this.sessionMetrics.startTime ? 
            Math.round((Date.now() - this.sessionMetrics.startTime) / 1000) : 0;
        
        // Generate session summary
        this.generateSessionInsights();
        
        // Update UI
        this.updateUI();
        this.showFeedback('Coaching session ended. Check insights below for your performance summary.', 'info');
        this.addFeedbackToHistory('Session Ended', 'AI Coaching completed', 'warning');
        
        // Update status
        this.updateStatus('Ready', 'primary');
        
        // Notify gamification system
        if (typeof onAICoachingCompleted === 'function') {
            onAICoachingCompleted(sessionDuration);
        }
        
        // Also notify as practice session
        if (typeof onPracticeCompleted === 'function') {
            onPracticeCompleted({
                type: 'ai_coaching',
                duration: sessionDuration,
                metrics: {
                    avgPace: this.calculateAverage(this.sessionMetrics.pace),
                    avgVolume: this.calculateAverage(this.sessionMetrics.volume),
                    avgTension: this.calculateAverage(this.sessionMetrics.tension),
                    avgConfidence: this.calculateAverage(this.sessionMetrics.confidence)
                },
                timestamp: new Date().toISOString()
            });
        }
    }

    // Toggle coaching mode
    toggleMode() {
        const modes = ['guided', 'independent', 'assessment'];
        const currentIndex = modes.indexOf(this.mode);
        this.mode = modes[(currentIndex + 1) % modes.length];
        
        document.getElementById('coachingMode').textContent = this.mode.charAt(0).toUpperCase() + this.mode.slice(1);
        
        const modeDescriptions = {
            'guided': 'AI provides step-by-step guidance',
            'independent': 'AI provides minimal feedback',
            'assessment': 'AI analyzes without interrupting'
        };
        
        this.showFeedback(`Mode changed to: ${modeDescriptions[this.mode]}`, 'info');
    }

    // Start real-time audio analysis
    startRealTimeAnalysis() {
        this.coachingInterval = setInterval(() => {
            if (!this.isActive) return;
            
            this.analyzeAudio();
        }, 1000); // Analyze every second
    }

    // Analyze audio and generate feedback
    analyzeAudio() {
        if (!this.analyser || !this.dataArray) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate metrics (simplified for demo)
        const volume = this.calculateVolume();
        const pace = this.calculatePace();
        const tension = this.calculateTension();
        const confidence = this.calculateConfidence();
        
        // Update metrics display
        this.updateMetrics(volume, pace, tension, confidence);
        
        // Store metrics for session analysis
        this.sessionMetrics.pace.push(pace);
        this.sessionMetrics.volume.push(volume);
        this.sessionMetrics.tension.push(tension);
        this.sessionMetrics.confidence.push(confidence);
        
        // Generate AI feedback based on metrics
        this.generateFeedback(volume, pace, tension, confidence);
    }

    // Calculate speaking volume
    calculateVolume() {
        if (!this.dataArray) return 0;
        
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        
        const average = sum / this.dataArray.length;
        return Math.min(100, (average / 128) * 100);
    }

    // Calculate speaking pace (simplified)
    calculatePace() {
        // In a real implementation, this would analyze speech patterns
        // For demo, we'll simulate with some variation
        const basePace = 50;
        const variation = Math.random() * 40 - 20;
        return Math.max(0, Math.min(100, basePace + variation));
    }

    // Calculate tension level (simplified)
    calculateTension() {
        // In a real implementation, this would analyze voice characteristics
        // For demo, we'll simulate based on volume and pace
        const volume = this.sessionMetrics.volume[this.sessionMetrics.volume.length - 1] || 50;
        const pace = this.sessionMetrics.pace[this.sessionMetrics.pace.length - 1] || 50;
        
        // Higher volume and faster pace might indicate tension
        const tensionScore = (volume + pace) / 2;
        return Math.max(0, Math.min(100, tensionScore - 30));
    }

    // Calculate confidence level
    calculateConfidence() {
        // In a real implementation, this would analyze voice stability
        // For demo, we'll simulate based on consistency
        const recentVolumes = this.sessionMetrics.volume.slice(-5);
        if (recentVolumes.length < 2) return 50;
        
        const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
        const variance = recentVolumes.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) / recentVolumes.length;
        
        // Lower variance = higher confidence
        const confidence = Math.max(0, 100 - variance);
        return Math.min(100, confidence);
    }

    // Update metrics display
    updateMetrics(volume, pace, tension, confidence) {
        document.getElementById('paceMetric').textContent = `${Math.round(pace)}%`;
        document.getElementById('volumeMetric').textContent = `${Math.round(volume)}%`;
        document.getElementById('tensionMetric').textContent = `${Math.round(tension)}%`;
        document.getElementById('confidenceMetric').textContent = `${Math.round(confidence)}%`;
        
        // Add color coding based on values
        this.updateMetricColor('paceMetric', pace, 40, 70);
        this.updateMetricColor('volumeMetric', volume, 30, 80);
        this.updateMetricColor('tensionMetric', tension, 0, 30);
        this.updateMetricColor('confidenceMetric', confidence, 60, 80);
    }

    // Update metric color based on value
    updateMetricColor(elementId, value, goodMin, goodMax) {
        const element = document.getElementById(elementId);
        element.className = 'h4 ';
        
        if (value >= goodMin && value <= goodMax) {
            element.className += 'text-success';
        } else if (value < goodMin - 10 || value > goodMax + 10) {
            element.className += 'text-danger';
        } else {
            element.className += 'text-warning';
        }
    }

    // Generate AI feedback based on metrics
    generateFeedback(volume, pace, tension, confidence) {
        if (this.mode === 'assessment') return; // Don't provide feedback in assessment mode
        
        const feedback = this.analyzeMetricsAndGenerateFeedback(volume, pace, tension, confidence);
        
        if (feedback && this.sessionMetrics.feedbackCount % 5 === 0) { // Provide feedback every 5 analyses
            this.showFeedback(feedback.message, feedback.type);
            this.addFeedbackToHistory('AI Feedback', feedback.message, feedback.type);
        }
        
        this.sessionMetrics.feedbackCount++;
    }

    // Analyze metrics and generate appropriate feedback
    analyzeMetricsAndGenerateFeedback(volume, pace, tension, confidence) {
        const feedbacks = [];
        
        // Volume feedback
        if (volume < 30) {
            feedbacks.push({
                message: "🔊 Speak a bit louder. Your voice is too quiet.",
                type: 'warning'
            });
        } else if (volume > 80) {
            feedbacks.push({
                message: "🔉 Lower your volume slightly. You're speaking too loudly.",
                type: 'warning'
            });
        }
        
        // Pace feedback
        if (pace < 40) {
            feedbacks.push({
                message: "🐌 Try to speak a bit faster. Your pace is too slow.",
                type: 'info'
            });
        } else if (pace > 70) {
            feedbacks.push({
                message: "🏃 Slow down! You're speaking too quickly.",
                type: 'warning'
            });
        }
        
        // Tension feedback
        if (tension > 30) {
            feedbacks.push({
                message: "😌 Relax your jaw and shoulders. You seem tense.",
                type: 'warning'
            });
        }
        
        // Confidence feedback
        if (confidence > 80) {
            feedbacks.push({
                message: "💪 Great confidence! Your voice sounds steady and strong.",
                type: 'success'
            });
        } else if (confidence < 40) {
            feedbacks.push({
                message: "🎯 Take a deep breath. You can do this!",
                type: 'info'
            });
        }
        
        // Positive reinforcement for good overall performance
        if (volume >= 40 && volume <= 70 && pace >= 40 && pace <= 70 && tension <= 20) {
            feedbacks.push({
                message: "🌟 Excellent! Your pace, volume, and relaxation are perfect.",
                type: 'success'
            });
        }
        
        // Return random feedback from available options
        if (feedbacks.length > 0) {
            return feedbacks[Math.floor(Math.random() * feedbacks.length)];
        }
        
        return null;
    }

    // Show feedback message
    showFeedback(message, type = 'info') {
        const feedbackElement = document.getElementById('currentFeedback');
        const alertClass = `alert-${type}`;
        
        document.getElementById('realTimeFeedback').innerHTML = `
            <div class="alert ${alertClass}">
                <i class="fas fa-${this.getIconForType(type)} me-2"></i>
                <span>${message}</span>
            </div>
        `;
    }

    // Get icon for feedback type
    getIconForType(type) {
        const icons = {
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'danger': 'times-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Add feedback to history
    addFeedbackToHistory(title, message, type) {
        const timestamp = new Date().toLocaleTimeString();
        const historyItem = {
            title,
            message,
            type,
            timestamp
        };
        
        this.feedbackHistory.unshift(historyItem);
        
        // Keep only last 20 items
        if (this.feedbackHistory.length > 20) {
            this.feedbackHistory = this.feedbackHistory.slice(0, 20);
        }
        
        this.updateFeedbackHistory();
    }

    // Update feedback history display
    updateFeedbackHistory() {
        const historyContainer = document.getElementById('feedbackHistory');
        
        historyContainer.innerHTML = this.feedbackHistory.map(item => `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${item.title}</h6>
                        <p class="mb-1">${item.message}</p>
                    </div>
                    <small class="text-muted">${item.timestamp}</small>
                </div>
            </div>
        `).join('');
    }

    // Generate session insights
    generateSessionInsights() {
        const sessionDuration = this.sessionMetrics.startTime ? 
            Math.round((Date.now() - this.sessionMetrics.startTime) / 1000) : 0;
        
        const avgPace = this.calculateAverage(this.sessionMetrics.pace);
        const avgVolume = this.calculateAverage(this.sessionMetrics.volume);
        const avgTension = this.calculateAverage(this.sessionMetrics.tension);
        const avgConfidence = this.calculateAverage(this.sessionMetrics.confidence);
        
        // Generate insights
        const insights = this.generateInsights(avgPace, avgVolume, avgTension, avgConfidence, sessionDuration);
        const progress = this.generateProgressTracking(avgPace, avgVolume, avgTension, avgConfidence);
        
        // Update UI
        document.getElementById('insightsContent').innerHTML = insights;
        document.getElementById('progressContent').innerHTML = progress;
        
        // Show insights section
        document.getElementById('aiInsights').style.display = 'flex';
    }

    // Calculate average of array
    calculateAverage(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }

    // Generate insights content
    generateInsights(avgPace, avgVolume, avgTension, avgConfidence, duration) {
        const insights = [];
        
        if (avgConfidence > 70) {
            insights.push("✅ Your voice confidence is excellent!");
        } else if (avgConfidence < 40) {
            insights.push("💡 Focus on breathing exercises to improve confidence.");
        }
        
        if (avgTension < 20) {
            insights.push("✅ Great relaxation during speech!");
        } else if (avgTension > 40) {
            insights.push("🎯 Practice muscle relaxation techniques.");
        }
        
        if (avgPace >= 40 && avgPace <= 70) {
            insights.push("✅ Your speaking pace is well-controlled.");
        } else {
            insights.push("⏱️ Work on finding your optimal speaking pace.");
        }
        
        if (duration > 60) {
            insights.push("⏰ Great practice duration! Consistency is key.");
        }
        
        return `
            <div class="mb-3">
                <strong>Session Duration:</strong> ${Math.round(duration / 60)} minutes
            </div>
            <div class="mb-3">
                <strong>Key Insights:</strong>
                <ul class="mt-2">
                    ${insights.map(insight => `<li>${insight}</li>`).join('')}
                </ul>
            </div>
            <div>
                <strong>Recommendations:</strong>
                <p class="mt-2 text-muted">
                    ${avgTension > 30 ? 'Focus on relaxation exercises before speaking.' : 
                      avgConfidence < 50 ? 'Practice positive self-talk and breathing.' :
                      'Continue your current practice routine!'}
                </p>
            </div>
        `;
    }

    // Generate progress tracking content
    generateProgressTracking(avgPace, avgVolume, avgTension, avgConfidence) {
        const overallScore = Math.round((avgConfidence + (100 - avgTension) + 
            (avgPace >= 40 && avgPace <= 70 ? 100 : 50) + 
            (avgVolume >= 40 && avgVolume <= 70 ? 100 : 50)) / 4);
        
        return `
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <span>Overall Performance</span>
                    <span class="badge bg-${overallScore > 70 ? 'success' : overallScore > 50 ? 'warning' : 'danger'}">
                        ${overallScore}%
                    </span>
                </div>
                <div class="progress mt-2">
                    <div class="progress-bar bg-${overallScore > 70 ? 'success' : overallScore > 50 ? 'warning' : 'danger'}" 
                         style="width: ${overallScore}%"></div>
                </div>
            </div>
            <div class="row text-center">
                <div class="col-6">
                    <small class="text-muted">Avg Pace</small>
                    <div class="h6">${Math.round(avgPace)}%</div>
                </div>
                <div class="col-6">
                    <small class="text-muted">Avg Confidence</small>
                    <div class="h6">${Math.round(avgConfidence)}%</div>
                </div>
            </div>
        `;
    }

    // Update UI elements
    updateUI() {
        document.getElementById('startCoachingBtn').disabled = this.isActive;
        document.getElementById('stopCoachingBtn').disabled = !this.isActive;
        document.getElementById('aiFeedbackPanel').style.display = this.isActive ? 'block' : 'none';
        document.getElementById('coachingHistory').style.display = this.isActive ? 'block' : 'none';
    }

    // Update status badge
    updateStatus(status, type) {
        const statusElement = document.getElementById('coachingStatus');
        const colorClass = `bg-${type}`;
        statusElement.className = `badge ${colorClass}`;
        statusElement.innerHTML = `<i class="fas fa-circle me-1"></i>${status}`;
    }
}

// Global AI Coaching instance
let aiCoach = null;

// Initialize AI coaching when page loads
document.addEventListener('DOMContentLoaded', () => {
    aiCoach = new AICoachingAssistant();
});

// Global functions for button clicks
function startAICoaching() {
    if (aiCoach) {
        aiCoach.startCoaching();
    }
}

function stopAICoaching() {
    if (aiCoach) {
        aiCoach.stopCoaching();
    }
}

function toggleCoachingMode() {
    if (aiCoach) {
        aiCoach.toggleMode();
    }
}
