// Exercises page JavaScript
let currentExercise = null;
let practiceStartTime = null;
let timerInterval = null;
let userData = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadPersonalizedData();
});

// Load personalized data from backend
async function loadPersonalizedData() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            showError('Please login to access personalized exercises');
            return;
        }

        // Load user analytics data
        const response = await fetch('http://localhost:8001/analytics/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            userData = await response.json();
            displayPersonalizedStats();
            generatePersonalizedExercises();
        } else {
            showError('Failed to load personalized data');
        }
    } catch (error) {
        console.error('Error loading personalized data:', error);
        showError('Connection error. Please try again.');
    }
}

// Display personalized statistics
function displayPersonalizedStats() {
    const overview = userData.overview || {};
    const recentSessions = userData.recent_sessions || [];
    
    // Calculate stuttering percentage
    const totalDetections = overview.total_detections || 0;
    const stutteringDetections = overview.total_stuttering || 0;
    const stutteringPercentage = totalDetections > 0 ? 
        Math.round((stutteringDetections / totalDetections) * 100) : 0;
    
    // Calculate weekly improvement
    const weeklyImprovement = calculateWeeklyImprovement(recentSessions);
    
    // Determine recommended level
    const recommendedLevel = determineRecommendedLevel(stutteringPercentage, weeklyImprovement);
    
    // Count exercises today
    const exercisesToday = countExercisesToday(recentSessions);
    
    // Update UI
    document.getElementById('stutteringPercentage').textContent = `${stutteringPercentage}%`;
    document.getElementById('weeklyImprovement').textContent = `${weeklyImprovement > 0 ? '+' : ''}${weeklyImprovement}%`;
    document.getElementById('recommendedLevel').textContent = recommendedLevel;
    document.getElementById('exerciseCount').textContent = exercisesToday;
    
    // Generate personalized recommendation
    const recommendation = generateRecommendation(stutteringPercentage, weeklyImprovement, recommendedLevel);
    document.getElementById('personalizedRecommendation').textContent = recommendation;
    
    // Show stats, hide loading
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('statsDisplay').style.display = 'block';
}

// Calculate weekly improvement
function calculateWeeklyImprovement(sessions) {
    if (sessions.length < 2) return 0;
    
    const thisWeek = sessions.filter(s => {
        const sessionDate = new Date(s.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= weekAgo;
    });
    
    const lastWeek = sessions.filter(s => {
        const sessionDate = new Date(s.timestamp);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return sessionDate >= twoWeeksAgo && sessionDate < new Date().setDate(new Date().getDate() - 7);
    });
    
    if (thisWeek.length === 0 || lastWeek.length === 0) return 0;
    
    const thisWeekNormal = thisWeek.filter(s => s.prediction === 'Normal').length;
    const lastWeekNormal = lastWeek.filter(s => s.prediction === 'Normal').length;
    
    const thisWeekPercentage = thisWeekNormal / thisWeek.length;
    const lastWeekPercentage = lastWeekNormal / lastWeek.length;
    
    return Math.round((thisWeekPercentage - lastWeekPercentage) * 100);
}

// Determine recommended exercise level
function determineRecommendedLevel(stutteringPercentage, improvement) {
    if (stutteringPercentage > 60) {
        return 'Severe Focus';
    } else if (stutteringPercentage > 30) {
        return 'Moderate Focus';
    } else if (stutteringPercentage > 15) {
        return 'Mild Focus';
    } else {
        return improvement > 10 ? 'Advanced Practice' : 'Maintenance';
    }
}

// Generate personalized recommendation
function generateRecommendation(stutteringPercentage, improvement, level) {
    if (stutteringPercentage > 60) {
        return `Focus on relaxation techniques and gentle onset exercises. Your stuttering rate is high (${stutteringPercentage}%), so prioritize stress reduction and slow, controlled practice.`;
    } else if (stutteringPercentage > 30) {
        return `Your stuttering rate is moderate (${stutteringPercentage}%). Practice syllable repetition and breathing exercises. ${improvement > 0 ? 'Great improvement! Keep it up!' : 'Focus on consistency.'}`;
    } else if (stutteringPercentage > 15) {
        return `Good progress with ${stutteringPercentage}% stuttering rate. Work on speed and fluency exercises. ${improvement > 0 ? 'You\'re improving well!' : 'Try to practice more regularly.'}`;
    } else {
        return `Excellent control with only ${stutteringPercentage}% stuttering! Focus on advanced exercises and maintenance. ${improvement > 0 ? 'Outstanding improvement!' : 'Maintain your current practice routine.'}`;
    }
}

// Count exercises today
function countExercisesToday(sessions) {
    const today = new Date().toDateString();
    return sessions.filter(s => new Date(s.timestamp).toDateString() === today).length;
}

// Generate personalized exercises
function generatePersonalizedExercises() {
    const overview = userData.overview || {};
    const stutteringPercentage = overview.total_detections > 0 ? 
        Math.round((overview.total_stuttering / overview.total_detections) * 100) : 0;
    
    const weeklyImprovement = calculateWeeklyImprovement(userData.recent_sessions || []);
    const exercises = getPersonalizedExercises(stutteringPercentage, weeklyImprovement);
    
    // Display exercises
    const exerciseGrid = document.getElementById('exerciseGrid');
    exerciseGrid.innerHTML = exercises.map(exercise => createExerciseCard(exercise)).join('');
    
    // Show sections
    document.getElementById('exercisesSection').style.display = 'block';
    document.getElementById('progressSection').style.display = 'block';
}

// Get personalized exercises based on user data
function getPersonalizedExercises(stutteringPercentage, improvement) {
    if (stutteringPercentage > 60) {
        // Severe focus - relaxation and gentle techniques
        return [
            {
                title: 'Deep Relaxation Breathing',
                description: 'Focus on reducing anxiety and muscle tension with controlled breathing exercises.',
                instructions: [
                    'Sit comfortably with straight posture',
                    'Inhale slowly through nose for 6 counts',
                    'Hold breath for 4 counts',
                    'Exhale slowly through mouth for 8 counts',
                    'Repeat 15-20 times'
                ],
                severity: 'SEVERE',
                priority: 'HIGH PRIORITY',
                duration: '15 minutes'
            },
            {
                title: 'Gentle Sound Onset',
                description: 'Practice starting words with minimal physical effort and tension.',
                instructions: [
                    'Choose simple, one-syllable words',
                    'Start with a soft "h" sound before the word',
                    'Use minimal lip and tongue pressure',
                    'Practice for 10-15 minutes daily'
                ],
                severity: 'SEVERE',
                priority: 'HIGH PRIORITY',
                duration: '20 minutes'
            },
            {
                title: 'Progressive Muscle Relaxation',
                description: 'Systematically relax speech-related muscle groups.',
                instructions: [
                    'Start with forehead and scalp muscles',
                    'Move to jaw and neck muscles',
                    'Relax shoulders and chest',
                    'Finish with facial relaxation',
                    'Hold each position for 10 seconds'
                ],
                severity: 'SEVERE',
                priority: 'HIGH PRIORITY',
                duration: '10 minutes'
            }
        ];
    } else if (stutteringPercentage > 30) {
        // Moderate focus - syllable control and rhythm
        return [
            {
                title: 'Syllable Timing Practice',
                description: 'Improve control over multi-syllable words through deliberate practice.',
                instructions: [
                    'Choose 2-3 syllable words (e.g., "el-e-phant")',
                    'Say each syllable separately and slowly',
                    'Count 1-2 between syllables',
                    'Gradually reduce pause time',
                    'Practice for 15 minutes daily'
                ],
                severity: 'MODERATE',
                priority: 'RECOMMENDED',
                duration: '15 minutes'
            },
            {
                title: 'Rhythm and Pace Control',
                description: 'Develop steady speaking rhythm to reduce rushing and anxiety.',
                instructions: [
                    'Tap finger or foot while speaking',
                    'Use metronome at 60 BPM',
                    'Practice counting 1-20 with rhythm',
                    'Read short sentences with steady pace',
                    'Focus on consistent timing'
                ],
                severity: 'MODERATE',
                priority: 'RECOMMENDED',
                duration: '20 minutes'
            },
            {
                title: 'Light Articulation Drill',
                description: 'Practice clear pronunciation with minimal physical tension.',
                instructions: [
                    'Practice individual vowel sounds',
                    'Focus on relaxed jaw position',
                    'Use minimal tongue pressure',
                    'Combine vowels into simple words',
                    'Practice 10-15 minutes daily'
                ],
                severity: 'MODERATE',
                priority: 'RECOMMENDED',
                duration: '15 minutes'
            }
        ];
    } else if (stutteringPercentage > 15) {
        // Mild focus - speed and fluency
        return [
            {
                title: 'Controlled Speed Reading',
                description: 'Practice reading at controlled pace to improve fluency.',
                instructions: [
                    'Choose simple paragraphs or children\'s books',
                    'Read at 50% of normal speed',
                    'Focus on smooth transitions between words',
                    'Take brief pauses at punctuation',
                    'Practice for 10-15 minutes daily'
                ],
                severity: 'MILD',
                priority: 'GOOD FIT',
                duration: '20 minutes'
            },
            {
                title: 'Continuous Voice Practice',
                description: 'Maintain steady voice production for improved fluency.',
                instructions: [
                    'Practice sustained vowel sounds',
                    'Hold each sound for 5-10 seconds',
                    'Focus on consistent volume',
                    'Try different pitches and volumes',
                    'Practice 10 minutes daily'
                ],
                severity: 'MILD',
                priority: 'GOOD FIT',
                duration: '15 minutes'
            },
            {
                title: 'Conversation Simulation',
                description: 'Practice real-world speaking scenarios.',
                instructions: [
                    'Practice common greetings and questions',
                    'Role-play phone conversations',
                    'Practice ordering food or asking directions',
                    'Focus on natural speech patterns',
                    'Record and review your practice'
                ],
                severity: 'MILD',
                priority: 'GOOD FIT',
                duration: '25 minutes'
            }
        ];
    } else {
        // Advanced/Maintenance - challenging exercises
        return [
            {
                title: 'Advanced Fluency Drills',
                description: 'Challenge yourself with complex speaking tasks.',
                instructions: [
                    'Practice tongue twisters and complex phrases',
                    'Try speaking while distracted (background noise)',
                    'Practice public speaking scenarios',
                    'Work on rapid speech with clarity',
                    'Challenge yourself with time pressure'
                ],
                severity: 'ADVANCED',
                priority: 'MAINTENANCE',
                duration: '30 minutes'
            },
            {
                title: 'Professional Communication',
                description: 'Practice professional and social communication skills.',
                instructions: [
                    'Practice presentations and speeches',
                    'Work on interview scenarios',
                    'Practice debating and expressing opinions',
                    'Join speaking groups or clubs',
                    'Record and analyze professional speech'
                ],
                severity: 'ADVANCED',
                priority: 'MAINTENANCE',
                duration: '25 minutes'
            },
            {
                title: 'Speed and Complexity Training',
                description: 'Increase speaking speed while maintaining clarity.',
                instructions: [
                    'Practice reading increasingly complex texts',
                    'Time your reading speed',
                    'Practice speaking while walking',
                    'Try multitasking while speaking',
                    'Focus on maintaining clarity at speed'
                ],
                severity: 'ADVANCED',
                priority: 'MAINTENANCE',
                duration: '20 minutes'
            }
        ];
    }
}

// Create exercise card HTML
function createExerciseCard(exercise) {
    return `
        <div class="exercise-card">
            <div class="exercise-header">
                <div class="exercise-severity">${exercise.severity}</div>
                <div class="exercise-priority">${exercise.priority}</div>
                <h3 class="exercise-title">${exercise.title}</h3>
            </div>
            <div class="exercise-body">
                <p class="exercise-description">${exercise.description}</p>
                <div class="exercise-instructions">
                    <h6>Instructions:</h6>
                    <ol>
                        ${exercise.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
                    </ol>
                </div>
                <button class="practice-btn" onclick="startExercise('${exercise.title.replace(/[^a-zA-Z0-9]/g, '_')}', '${exercise.duration}')">
                    Start Practice (${exercise.duration})
                </button>
            </div>
        </div>
    `;
}

// Exercise functions
function startExercise(exerciseType, duration) {
    currentExercise = exerciseType;
    practiceStartTime = Date.now();
    
    // Update UI
    document.getElementById('currentExercise').textContent = exerciseType.replace(/_/g, ' ');
    
    // Start timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(updateTimer, 1000);
    
    console.log(`Starting personalized exercise: ${exerciseType} for ${duration}`);
}

function stopExercise() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const practiceTime = practiceStartTime ? Math.floor((Date.now() - practiceStartTime) / 1000) : 0;
    
    // Update UI
    document.getElementById('currentExercise').textContent = `Completed: ${currentExercise.replace(/_/g, ' ')}`;
    document.getElementById('practiceTimer').textContent = formatTime(practiceTime);
    
    // Notify gamification system
    if (typeof onExerciseCompleted === 'function') {
        onExerciseCompleted(currentExercise);
    }
    
    // Also notify as practice session
    if (typeof onPracticeCompleted === 'function') {
        onPracticeCompleted({
            exerciseType: currentExercise,
            duration: practiceTime,
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`Exercise completed. Practice time: ${practiceTime}s`);
    
    currentExercise = null;
    practiceStartTime = null;
}

function updateTimer() {
    if (practiceStartTime) {
        const elapsed = Math.floor((Date.now() - practiceStartTime) / 1000);
        document.getElementById('practiceTimer').textContent = formatTime(elapsed);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function goToDashboard() {
    window.location.href = 'dashboard.html';
}

function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorState').innerHTML = `
        <h5>⚠️ Error</h5>
        <p>${message}</p>
        <button class="practice-btn" onclick="window.location.reload()">Try Again</button>
    `;
}
