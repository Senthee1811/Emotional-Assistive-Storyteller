// Professional Stuttering Detection System JavaScript

class StutteringDetectionApp {
    constructor() {
        this.init();
        this.liveDetectionData = []; // Store live detection results
    }

    init() {
        this.setupNavigation();
        this.setupUpload();
        this.setupLiveDetection();
        this.setupAnimations();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = {
            home: document.getElementById('home'),
            analysis: document.getElementById('analysis'),
            live: document.getElementById('live')
        };

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Hide all sections
                Object.values(sections).forEach(section => {
                    if (section) section.style.display = 'none';
                });
                
                // Show selected section
                const sectionId = link.getAttribute('href').substring(1);
                if (sections[sectionId]) {
                    sections[sectionId].style.display = 'block';
                    this.animateSection(sections[sectionId]);
                }
                
                // Update active nav link
                navLinks.forEach(navLink => navLink.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    setupUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const audioFile = document.getElementById('audioFile');
        const resultsContainer = document.getElementById('resultsContainer');

        // Drag and drop functionality
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (this.isValidAudioFile(file)) {
                    this.handleAudioUpload(file);
                } else {
                    this.showNotification('Please upload a valid audio file (WAV, MP3, OGG, FLAC, M4A)', 'error');
                }
            }
        });

        // File input change
        audioFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleAudioUpload(file);
            }
        });
    }

    setupLiveDetection() {
        const startLiveBtn = document.getElementById('startLiveBtn');
        const stopLiveBtn = document.getElementById('stopLiveBtn');
        
        startLiveBtn.addEventListener('click', () => {
            this.startLiveDetection();
        });

        stopLiveBtn.addEventListener('click', () => {
            this.stopLiveDetection();
        });
    }

    setupAnimations() {
        // Add scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, observerOptions);

        // Observe all cards
        document.querySelectorAll('.card').forEach(card => {
            observer.observe(card);
        });
    }

    isValidAudioFile(file) {
        const validTypes = ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/flac', 'audio/m4a'];
        return validTypes.includes(file.type);
    }

    async handleAudioUpload(file) {
        const uploadArea = document.getElementById('uploadArea');
        
        // Show loading state
        uploadArea.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <h3>Processing audio file...</h3>
            <p>Analyzing speech patterns...</p>
        `;

        try {
            console.log('Starting audio upload for file:', file.name);
            const result = await this.analyzeAudio(file);
            console.log('Backend response received:', result);
            this.displayResults(result);
            this.showNotification('Audio analysis completed successfully!', 'success');
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Error analyzing audio file. Please try again.', 'error');
            this.resetUploadArea();
        }
    }

    async analyzeAudio(file) {
        const formData = new FormData();
        formData.append('audio', file);
        
        try {
            const response = await fetch('http://localhost:5000/analyze', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Analysis failed');
            }
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            return result;
        } catch (error) {
            console.error('Analysis error:', error);
            throw error;
        }
    }

    displayResults(result) {
        const resultsContainer = document.getElementById('resultsContainer');
        const resultBadge = document.getElementById('resultBadge');
        const confidenceValue = document.getElementById('confidenceValue');
        const progressFill = document.getElementById('progressFill');
        const detectionType = document.getElementById('detectionType');
        const severityLevel = document.getElementById('severityLevel');
        const processingTime = document.getElementById('processingTime');

        // Show results
        resultsContainer.style.display = 'block';
        resultBadge.textContent = result.prediction;
        resultBadge.className = result.prediction === 'Normal' ? 'result-badge badge-success' : 'result-badge badge-danger';
        confidenceValue.textContent = result.confidence + '%';
        progressFill.style.width = result.confidence + '%';
        detectionType.textContent = result.prediction;
        severityLevel.textContent = result.severity ? result.severity.charAt(0).toUpperCase() + result.severity.slice(1) : 'None';
        processingTime.textContent = result.processingTime + 's';

        // Add exercise section if stuttering is detected
        console.log('Display Results:', {
            prediction: result.prediction,
            exercise: result.exercise,
            shouldShowExercise: result.prediction === 'Stuttering_Disorder' && result.exercise
        });
        
        if (result.prediction === 'Stuttering_Disorder' && result.exercise) {
            // Add exercise as part of the stats grid
            const exerciseItem = document.createElement('div');
            exerciseItem.className = 'stat-item';
            exerciseItem.style.background = 'rgba(139, 92, 246, 0.1)';
            exerciseItem.style.borderLeft = '4px solid var(--accent)';
            exerciseItem.innerHTML = `
                <div class="stat-label">
                    <i class="fas fa-dumbbell" style="margin-right: var(--space-1);"></i>
                    Recommended Exercise
                </div>
                <div class="stat-value" style="font-size: var(--font-size-sm); color: var(--accent); font-weight: 600;">
                    ${result.exercise}
                </div>
            `;
            
            console.log('Exercise item created:', exerciseItem);
            
            // Remove existing exercise item if any
            const existingExercise = resultsContainer.querySelector('.stat-item:last-child');
            if (existingExercise && existingExercise.innerHTML.includes('fa-dumbbell')) {
                console.log('Removing existing exercise item');
                existingExercise.remove();
            }
            
            // Add exercise item to stats grid
            const statsGrid = resultsContainer.querySelector('.stats-grid');
            console.log('Stats grid found:', statsGrid);
            console.log('Appending exercise to stats grid');
            statsGrid.appendChild(exerciseItem);
        } else {
            // Remove exercise item if normal speech
            const existingExercise = resultsContainer.querySelector('.stat-item:last-child');
            if (existingExercise && existingExercise.innerHTML.includes('fa-dumbbell')) {
                existingExercise.remove();
            }
        }

        // Animate results
        this.animateResults(resultsContainer);

        // Reset upload area
        this.resetUploadArea();
    }

    resetUploadArea() {
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-check"></i>
            </div>
            <h3>Upload Complete</h3>
            <p>Audio file analyzed successfully</p>
            <button class="btn btn-primary btn-lg" onclick="app.resetUpload()">
                <i class="fas fa-upload"></i>
                Analyze Another File
            </button>
        `;
    }

    resetUpload() {
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-cloud-upload-alt"></i>
            </div>
            <h3>Upload Audio File</h3>
            <p class="upload-text">Support for WAV, MP3, OGG, FLAC formats</p>
            <input type="file" id="audioFile" accept="audio/*" style="display: none;">
            <button class="btn btn-primary btn-lg" onclick="document.getElementById('audioFile').click()">
                <i class="fas fa-upload"></i>
                Choose Audio File
            </button>
            <p class="upload-text">or drag and drop your audio file here</p>
        `;
        
        // Reset file input
        const newFileInput = document.createElement('input');
        newFileInput.type = 'file';
        newFileInput.id = 'audioFile';
        newFileInput.accept = 'audio/*';
        newFileInput.style.display = 'none';
        uploadArea.appendChild(newFileInput);
        
        // Hide results
        document.getElementById('resultsContainer').style.display = 'none';
        
        // Re-setup upload functionality
        this.setupUpload();
    }

    startLiveDetection() {
        const startLiveBtn = document.getElementById('startLiveBtn');
        const stopLiveBtn = document.getElementById('stopLiveBtn');
        const downloadLiveBtn = document.getElementById('downloadLiveBtn');
        const clearLiveBtn = document.getElementById('clearLiveBtn');
        const liveResultsContainer = document.getElementById('liveResultsContainer');
        
        // Clear previous data
        this.liveDetectionData = [];
        this.isRecording = true;
        this.sessionStartTime = new Date();
        
        startLiveBtn.style.display = 'none';
        stopLiveBtn.style.display = 'inline-flex';
        downloadLiveBtn.style.display = 'inline-flex';
        clearLiveBtn.style.display = 'inline-flex';
        liveResultsContainer.style.display = 'block';
        
        // Clear any existing reports
        const existingReport = document.querySelector('.live-report');
        if (existingReport) {
            existingReport.remove();
        }
        
        // Simulate initial detection
        this.addLiveResult('Normal', 85.2);
        
        // Continue recording
        this.recordingInterval = setInterval(async () => {
            const isStuttering = Math.random() > 0.6; // More likely to be normal in live detection
            const confidence = Math.floor(Math.random() * 25) + 75;
            const severity = isStuttering ? ['mild', 'moderate', 'severe'][Math.floor(Math.random() * 3)] : null;
            
            await this.addLiveResult(isStuttering ? 'Stuttering_Disorder' : 'Normal', confidence, severity);
        }, 3000);

        this.showNotification('Live detection started', 'success');
    }

    stopLiveDetection() {
        const startLiveBtn = document.getElementById('startLiveBtn');
        const stopLiveBtn = document.getElementById('stopLiveBtn');
        const downloadLiveBtn = document.getElementById('downloadLiveBtn');
        const clearLiveBtn = document.getElementById('clearLiveBtn');
        
        this.isRecording = false;
        this.sessionEndTime = new Date();
        startLiveBtn.style.display = 'inline-flex';
        stopLiveBtn.style.display = 'none';
        downloadLiveBtn.style.display = 'none';
        clearLiveBtn.style.display = 'none';
        
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
        }

        // Generate and show overall report
        this.generateLiveDetectionReport();

        this.showNotification('Live detection stopped', 'info');
    }

    downloadLiveSession() {
        if (this.liveDetectionData.length === 0) {
            this.showNotification('No session data to download', 'warning');
            return;
        }

        // Create report text content
        const sessionDuration = this.sessionEndTime ? this.sessionEndTime - this.sessionStartTime : Date.now() - this.sessionStartTime;
        const sessionMinutes = Math.floor(sessionDuration / 60000);
        const sessionSeconds = Math.floor((sessionDuration % 60000) / 1000);

        const totalDetections = this.liveDetectionData.length;
        const stutteringDetections = this.liveDetectionData.filter(d => d.prediction === 'Stuttering_Disorder');
        const normalDetections = this.liveDetectionData.filter(d => d.prediction === 'Normal');
        
        const stutteringPercentage = ((stutteringDetections.length / totalDetections) * 100).toFixed(1);
        const avgConfidence = (this.liveDetectionData.reduce((sum, d) => sum + d.confidence, 0) / totalDetections).toFixed(1);

        let reportText = `PROFESSIONAL STUTTERING DETECTION - LIVE SESSION REPORT\n`;
        reportText += `Generated: ${new Date().toLocaleString()}\n`;
        reportText += `Session Duration: ${sessionMinutes}m ${sessionSeconds}s\n\n`;
        reportText += `SUMMARY STATISTICS:\n`;
        reportText += `==================\n`;
        reportText += `Total Detections: ${totalDetections}\n`;
        reportText += `Stuttering Events: ${stutteringDetections.length} (${stutteringPercentage}%)\n`;
        reportText += `Normal Speech: ${normalDetections.length}\n`;
        reportText += `Average Confidence: ${avgConfidence}%\n\n`;

        if (stutteringDetections.length > 0) {
            reportText += `SEVERITY BREAKDOWN:\n`;
            reportText += `==================\n`;
            const severityCounts = {
                mild: stutteringDetections.filter(d => d.severity === 'mild').length,
                moderate: stutteringDetections.filter(d => d.severity === 'moderate').length,
                severe: stutteringDetections.filter(d => d.severity === 'severe').length
            };
            
            if (severityCounts.mild > 0) reportText += `Mild: ${severityCounts.mild}\n`;
            if (severityCounts.moderate > 0) reportText += `Moderate: ${severityCounts.moderate}\n`;
            if (severityCounts.severe > 0) reportText += `Severe: ${severityCounts.severe}\n\n`;

            const uniqueExercises = [...new Set(stutteringDetections.map(d => d.exercise).filter(e => e))];
            if (uniqueExercises.length > 0) {
                reportText += `RECOMMENDED EXERCISES:\n`;
                reportText += `=====================\n`;
                uniqueExercises.forEach((exercise, index) => {
                    reportText += `${index + 1}. ${exercise}\n`;
                });
            }
        }

        // Create and download file
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stuttering_detection_live_session_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showNotification('Live session report downloaded successfully!', 'success');
    }

    clearLiveResults() {
        // Clear data
        this.liveDetectionData = [];
        
        // Clear UI
        const liveResultsList = document.getElementById('liveResultsList');
        liveResultsList.innerHTML = '';
        
        // Clear any reports
        const existingReport = document.querySelector('.live-report');
        if (existingReport) {
            existingReport.remove();
        }
        
        // Hide container
        const liveResultsContainer = document.getElementById('liveResultsContainer');
        liveResultsContainer.style.display = 'none';
        
        // Reset buttons
        const startLiveBtn = document.getElementById('startLiveBtn');
        const stopLiveBtn = document.getElementById('stopLiveBtn');
        const clearLiveBtn = document.getElementById('clearLiveBtn');
        
        startLiveBtn.style.display = 'inline-flex';
        stopLiveBtn.style.display = 'none';
        clearLiveBtn.style.display = 'none';
        
        this.showNotification('Live results cleared', 'info');
    }

    async addLiveResult(prediction, confidence, severity) {
        // For live detection, we'll simulate since real microphone integration
        // would require WebRTC and more complex setup
        const timestamp = new Date().toLocaleTimeString();
        
        // Get exercise if stuttering detected
        let exercise = null;
        if (prediction === 'Stuttering_Disorder') {
            // Request therapy recommendation from backend (by severity)
            try {
                const response = await fetch('http://localhost:8000/therapy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ severity })
                });

                if (response.ok) {
                    const result = await response.json();
                    exercise = result.suggestion || (result.recommended_exercises && result.recommended_exercises[0]);
                } else {
                    throw new Error('Therapy API error');
                }
            } catch (error) {
                console.log('Using fallback exercise');
                exercise = this.getFallbackExercise(severity);
            }
        }
        
        // Store data for report
        this.liveDetectionData.push({
            timestamp,
            prediction,
            confidence,
            severity,
            exercise
        });
        
        const resultHtml = `
            <div class="result-item fade-in">
                <div class="result-header">
                    <span class="timestamp">${timestamp}</span>
                    <div class="result-badge ${prediction === 'Normal' ? 'badge-success' : 'badge-danger'}">
                        ${prediction === 'Normal' ? 'Normal' : 'Stuttering'}
                    </div>
                </div>
                <div class="confidence-display">
                    <span class="confidence-label">Confidence:</span>
                    <span class="confidence-value">${confidence}%</span>
                </div>
                ${severity ? `
                    <div class="severity-display">
                        <span class="severity-label">Severity:</span>
                        <span class="badge badge-${severity === 'mild' ? 'warning' : severity === 'moderate' ? 'danger' : 'dark'}">
                            ${severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </span>
                    </div>
                ` : ''}
                ${exercise ? `
                    <div class="exercise-display" style="margin-top: var(--space-2); padding: var(--space-2); background: rgba(139, 92, 246, 0.1); border-radius: var(--radius-md);">
                        <span style="font-size: var(--font-size-xs); color: var(--accent); font-weight: 600;">
                            💡 Exercise: ${exercise}
                        </span>
                    </div>
                ` : ''}
            </div>
        `;
        
        const liveResultsList = document.getElementById('liveResultsList');
        liveResultsList.insertAdjacentHTML('afterbegin', resultHtml);
        
        // Keep only last 10 results
        const allResults = liveResultsList.children;
        while (allResults.length > 10) {
            allResults[allResults.length - 1].remove();
        }
    }

    generateLiveDetectionReport() {
        if (this.liveDetectionData.length === 0) {
            this.showNotification('No data to generate report', 'warning');
            return;
        }

        const sessionDuration = this.sessionEndTime - this.sessionStartTime;
        const sessionMinutes = Math.floor(sessionDuration / 60000);
        const sessionSeconds = Math.floor((sessionDuration % 60000) / 1000);

        // Calculate statistics
        const totalDetections = this.liveDetectionData.length;
        const stutteringDetections = this.liveDetectionData.filter(d => d.prediction === 'Stuttering_Disorder');
        const normalDetections = this.liveDetectionData.filter(d => d.prediction === 'Normal');
        
        const stutteringPercentage = ((stutteringDetections.length / totalDetections) * 100).toFixed(1);
        const avgConfidence = (this.liveDetectionData.reduce((sum, d) => sum + d.confidence, 0) / totalDetections).toFixed(1);
        
        // Severity breakdown
        const severityCounts = {
            mild: stutteringDetections.filter(d => d.severity === 'mild').length,
            moderate: stutteringDetections.filter(d => d.severity === 'moderate').length,
            severe: stutteringDetections.filter(d => d.severity === 'severe').length
        };

        // Get unique exercises
        const uniqueExercises = [...new Set(stutteringDetections.map(d => d.exercise).filter(e => e))];

        // Create report HTML
        const reportHtml = `
            <div class="live-report fade-in" style="margin-top: var(--space-8); background: white; border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); border: 1px solid var(--gray-200); padding: var(--space-8);">
                <div class="report-header" style="background: var(--gradient-primary); color: white; padding: var(--space-6) var(--space-8); border-radius: var(--radius-xl) var(--radius-xl) 0 0; margin: calc(var(--space-8) * -1) calc(var(--space-8) * -1) var(--space-6) calc(var(--space-8) * -1);">
                    <h3 style="margin: 0; font-size: var(--font-size-xl);">
                        <i class="fas fa-chart-line" style="margin-right: var(--space-2);"></i>
                        Live Detection Session Report
                    </h3>
                    <p style="margin: var(--space-2) 0 0 0; opacity: 0.9;">
                        Session Duration: ${sessionMinutes}m ${sessionSeconds}s
                    </p>
                </div>

                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin: var(--space-6) 0;">
                    <div class="stat-item" style="background: rgba(15, 23, 42, 0.05); padding: var(--space-4); border-radius: var(--radius-lg); border-left: 4px solid var(--primary);">
                        <div class="stat-label" style="font-size: var(--font-size-sm); color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-1);">
                            Total Detections
                        </div>
                        <div class="stat-value" style="font-size: var(--font-size-xl); font-weight: 700; color: var(--primary);">
                            ${totalDetections}
                        </div>
                    </div>

                    <div class="stat-item" style="background: rgba(239, 68, 68, 0.1); padding: var(--space-4); border-radius: var(--radius-lg); border-left: 4px solid var(--danger);">
                        <div class="stat-label" style="font-size: var(--font-size-sm); color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-1);">
                            Stuttering Events
                        </div>
                        <div class="stat-value" style="font-size: var(--font-size-xl); font-weight: 700; color: var(--danger);">
                            ${stutteringDetections.length} (${stutteringPercentage}%)
                        </div>
                    </div>

                    <div class="stat-item" style="background: rgba(16, 185, 129, 0.1); padding: var(--space-4); border-radius: var(--radius-lg); border-left: 4px solid var(--success);">
                        <div class="stat-label" style="font-size: var(--font-size-sm); color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-1);">
                            Normal Speech
                        </div>
                        <div class="stat-value" style="font-size: var(--font-size-xl); font-weight: 700; color: var(--success);">
                            ${normalDetections.length}
                        </div>
                    </div>

                    <div class="stat-item" style="background: rgba(99, 102, 241, 0.1); padding: var(--space-4); border-radius: var(--radius-lg); border-left: 4px solid var(--secondary);">
                        <div class="stat-label" style="font-size: var(--font-size-sm); color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-1);">
                            Avg Confidence
                        </div>
                        <div class="stat-value" style="font-size: var(--font-size-xl); font-weight: 700; color: var(--secondary);">
                            ${avgConfidence}%
                        </div>
                    </div>
                </div>

                ${stutteringDetections.length > 0 ? `
                    <div style="margin-top: var(--space-6);">
                        <h4 style="color: var(--gray-900); margin-bottom: var(--space-4);">
                            <i class="fas fa-exclamation-triangle" style="color: var(--warning); margin-right: var(--space-2);"></i>
                            Severity Breakdown
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-3);">
                            ${severityCounts.mild > 0 ? `
                                <div style="text-align: center; padding: var(--space-3); background: rgba(245, 158, 11, 0.1); border-radius: var(--radius-lg);">
                                    <div style="font-size: var(--font-size-lg); font-weight: 700; color: var(--warning);">${severityCounts.mild}</div>
                                    <div style="font-size: var(--font-size-sm); color: var(--gray-600);">Mild</div>
                                </div>
                            ` : ''}
                            ${severityCounts.moderate > 0 ? `
                                <div style="text-align: center; padding: var(--space-3); background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-lg);">
                                    <div style="font-size: var(--font-size-lg); font-weight: 700; color: var(--danger);">${severityCounts.moderate}</div>
                                    <div style="font-size: var(--font-size-sm); color: var(--gray-600);">Moderate</div>
                                </div>
                            ` : ''}
                            ${severityCounts.severe > 0 ? `
                                <div style="text-align: center; padding: var(--space-3); background: rgba(127, 29, 29, 0.1); border-radius: var(--radius-lg);">
                                    <div style="font-size: var(--font-size-lg); font-weight: 700; color: #7F1D1D;">${severityCounts.severe}</div>
                                    <div style="font-size: var(--font-size-sm); color: var(--gray-600);">Severe</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                ${uniqueExercises.length > 0 ? `
                    <div style="margin-top: var(--space-6);">
                        <h4 style="color: var(--gray-900); margin-bottom: var(--space-4);">
                            <i class="fas fa-dumbbell" style="color: var(--accent); margin-right: var(--space-2);"></i>
                            Recommended Exercises
                        </h4>
                        <div style="background: rgba(139, 92, 246, 0.05); padding: var(--space-4); border-radius: var(--radius-lg); border-left: 4px solid var(--accent);">
                            ${uniqueExercises.map(exercise => `
                                <div style="margin-bottom: var(--space-2); padding: var(--space-2); background: white; border-radius: var(--radius-md);">
                                    <p style="margin: 0; color: var(--gray-700); font-size: var(--font-size-sm); line-height: 1.5;">
                                        💡 ${exercise}
                                    </p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div style="margin-top: var(--space-6); text-align: center;">
                    <button class="btn btn-primary" onclick="app.downloadReport()" style="margin-right: var(--space-2);">
                        <i class="fas fa-download"></i>
                        Download Report
                    </button>
                    <button class="btn btn-secondary" onclick="app.clearReport()">
                        <i class="fas fa-trash"></i>
                        Clear Report
                    </button>
                </div>
            </div>
        `;

        // Add report to the page
        const liveResultsContainer = document.getElementById('liveResultsContainer');
        liveResultsContainer.insertAdjacentHTML('beforeend', reportHtml);
        
        // Scroll to report
        const reportElement = liveResultsContainer.querySelector('.live-report');
        reportElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    downloadReport() {
        // Create report text content
        const sessionDuration = this.sessionEndTime - this.sessionStartTime;
        const sessionMinutes = Math.floor(sessionDuration / 60000);
        const sessionSeconds = Math.floor((sessionDuration % 60000) / 1000);

        const totalDetections = this.liveDetectionData.length;
        const stutteringDetections = this.liveDetectionData.filter(d => d.prediction === 'Stuttering_Disorder');
        const normalDetections = this.liveDetectionData.filter(d => d.prediction === 'Normal');
        
        const stutteringPercentage = ((stutteringDetections.length / totalDetections) * 100).toFixed(1);
        const avgConfidence = (this.liveDetectionData.reduce((sum, d) => sum + d.confidence, 0) / totalDetections).toFixed(1);

        let reportText = `PROFESSIONAL STUTTERING DETECTION - LIVE SESSION REPORT\n`;
        reportText += `Generated: ${new Date().toLocaleString()}\n`;
        reportText += `Session Duration: ${sessionMinutes}m ${sessionSeconds}s\n\n`;
        reportText += `SUMMARY STATISTICS:\n`;
        reportText += `==================\n`;
        reportText += `Total Detections: ${totalDetections}\n`;
        reportText += `Stuttering Events: ${stutteringDetections.length} (${stutteringPercentage}%)\n`;
        reportText += `Normal Speech: ${normalDetections.length}\n`;
        reportText += `Average Confidence: ${avgConfidence}%\n\n`;

        if (stutteringDetections.length > 0) {
            reportText += `SEVERITY BREAKDOWN:\n`;
            reportText += `==================\n`;
            const severityCounts = {
                mild: stutteringDetections.filter(d => d.severity === 'mild').length,
                moderate: stutteringDetections.filter(d => d.severity === 'moderate').length,
                severe: stutteringDetections.filter(d => d.severity === 'severe').length
            };
            
            if (severityCounts.mild > 0) reportText += `Mild: ${severityCounts.mild}\n`;
            if (severityCounts.moderate > 0) reportText += `Moderate: ${severityCounts.moderate}\n`;
            if (severityCounts.severe > 0) reportText += `Severe: ${severityCounts.severe}\n\n`;

            const uniqueExercises = [...new Set(stutteringDetections.map(d => d.exercise).filter(e => e))];
            if (uniqueExercises.length > 0) {
                reportText += `RECOMMENDED EXERCISES:\n`;
                reportText += `=====================\n`;
                uniqueExercises.forEach((exercise, index) => {
                    reportText += `${index + 1}. ${exercise}\n`;
                });
            }
        }

        // Create and download file
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stuttering_detection_report_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showNotification('Report downloaded successfully!', 'success');
    }

    clearReport() {
        const reportElement = document.querySelector('.live-report');
        if (reportElement) {
            reportElement.remove();
            this.showNotification('Report cleared', 'info');
        }
    }

    getFallbackExercise(severity) {
        const exercises = {
            'mild': 'Practice slow reading: Read a paragraph at half your normal speed',
            'moderate': 'Syllable timing: Count syllables while speaking slowly',
            'severe': 'Single word practice: Focus on one word at a time'
        };
        return exercises[severity] || 'Practice speaking slowly and clearly';
    }

    animateSection(section) {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            section.style.transition = 'all 0.6s ease-out';
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 100);
    }

    animateResults(container) {
        const elements = container.querySelectorAll('.stat-item, .confidence-section');
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                element.style.transition = 'all 0.6s ease-out';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Test function for debugging
    testStutteringDetection() {
        console.log('Testing stuttering detection with exercise...');
        const mockResult = {
            prediction: 'Stuttering_Disorder',
            confidence: 85.5,
            severity: 'moderate',
            exercise: 'Syllable timing: Count syllables while speaking slowly',
            processingTime: 1.2
        };
        console.log('Mock result:', mockResult);
        this.displayResults(mockResult);
        this.showNotification('Test: Stuttering detection with exercise', 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add notification styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--primary)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-xl);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new StutteringDetectionApp();
});

// Export for potential use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StutteringDetectionApp;
}
