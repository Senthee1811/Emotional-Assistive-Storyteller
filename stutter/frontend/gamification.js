// Gamification System JavaScript
class GamificationSystem {
    constructor() {
        this.userData = null;
        this.achievements = this.initializeAchievements();
        this.dailyChallenges = this.initializeDailyChallenges();
        this.skills = this.initializeSkills();
        this.notifications = [];
        this.isInitialized = false;
    }

    // Initialize the gamification system
    async initialize() {
        try {
            await this.loadUserData();
            this.updateUI();
            this.startPeriodicUpdates();
            this.isInitialized = true;
            console.log('Gamification system initialized');
        } catch (error) {
            console.error('Error initializing gamification:', error);
        }
    }

    // Load user data from localStorage or API
    async loadUserData() {
        // Try to load from localStorage first
        const savedData = localStorage.getItem('gamificationData');
        if (savedData) {
            this.userData = JSON.parse(savedData);
        } else {
            // Initialize with default values
            this.userData = {
                level: 1,
                currentXP: 0,
                totalXP: 100,
                title: 'Speech Explorer',
                streak: 0,
                lastPracticeDate: null,
                unlockedAchievements: [],
                completedChallenges: [],
                skillProgress: {
                    voiceControl: 0,
                    relaxation: 0,
                    fluency: 0,
                    confidence: 0
                },
                practiceStats: {
                    totalSessions: 0,
                    totalMinutes: 0,
                    averagePerformance: 0
                }
            };
        }
        
        // Load from API if available
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                const response = await fetch('http://localhost:8001/analytics/dashboard', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const apiData = await response.json();
                    this.syncWithAPIData(apiData);
                }
            }
        } catch (error) {
            console.log('Could not sync with API, using local data');
        }
    }

    // Sync with API data
    syncWithAPIData(apiData) {
        if (apiData.overview) {
            this.userData.practiceStats.totalSessions = apiData.overview.total_sessions || 0;
            this.updateStreak(apiData.recent_sessions || []);
            this.calculateSkillProgress(apiData);
        }
    }

    // Update practice streak
    updateStreak(recentSessions) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        const practicedToday = recentSessions.some(s => 
            new Date(s.timestamp).toDateString() === today
        );
        const practicedYesterday = recentSessions.some(s => 
            new Date(s.timestamp).toDateString() === yesterday
        );
        
        if (practicedToday) {
            if (this.userData.lastPracticeDate === yesterday) {
                this.userData.streak++;
            } else if (this.userData.lastPracticeDate !== today) {
                this.userData.streak = 1;
            }
        } else if (!practicedYesterday && this.userData.lastPracticeDate !== yesterday) {
            this.userData.streak = 0;
        }
        
        this.userData.lastPracticeDate = practicedToday ? today : this.userData.lastPracticeDate;
    }

    // Calculate skill progress based on session data
    calculateSkillProgress(apiData) {
        const recentSessions = apiData.recent_sessions || [];
        if (recentSessions.length === 0) return;
        
        // Calculate skill progress based on recent performance
        const normalSessions = recentSessions.filter(s => s.prediction === 'Normal').length;
        const totalSessions = recentSessions.length;
        const normalPercentage = (normalSessions / totalSessions) * 100;
        
        // Update skills based on performance
        this.userData.skillProgress.fluency = Math.min(100, normalPercentage);
        this.userData.skillProgress.confidence = Math.min(100, normalPercentage * 1.2);
        
        // Simulate other skill progress (in real implementation, would use specific metrics)
        this.userData.skillProgress.voiceControl = Math.min(100, normalPercentage * 0.9);
        this.userData.skillProgress.relaxation = Math.min(100, normalPercentage * 0.8);
        
        // Award XP for progress
        this.awardXP(Math.round(normalPercentage / 10));
    }

    // Initialize achievements
    initializeAchievements() {
        return [
            {
                id: 'first_session',
                name: 'First Steps',
                description: 'Complete your first practice session',
                icon: '🎯',
                xp: 50,
                unlocked: false
            },
            {
                id: 'week_warrior',
                name: 'Week Warrior',
                description: 'Practice for 7 consecutive days',
                icon: '🔥',
                xp: 200,
                unlocked: false
            },
            {
                id: 'voice_master',
                name: 'Voice Master',
                description: 'Achieve 90% normal speech rate',
                icon: '🎤',
                xp: 300,
                unlocked: false
            },
            {
                id: 'consistency_champion',
                name: 'Consistency Champion',
                description: 'Practice 5 days in a row',
                icon: '📅',
                xp: 150,
                unlocked: false
            },
            {
                id: 'ai_coach_pro',
                name: 'AI Coach Pro',
                description: 'Complete 50 AI coaching sessions',
                icon: '🤖',
                xp: 250,
                unlocked: false
            },
            {
                id: 'fluency_fighter',
                name: 'Fluency Fighter',
                description: 'Reduce stuttering by 50%',
                icon: '⚡',
                xp: 400,
                unlocked: false
            },
            {
                id: 'monthly_master',
                name: 'Monthly Master',
                description: 'Complete 30-day challenge',
                icon: '🏆',
                xp: 500,
                unlocked: false
            },
            {
                id: 'confidence_builder',
                name: 'Confidence Builder',
                description: 'Achieve 80% confidence score',
                icon: '💪',
                xp: 350,
                unlocked: false
            }
        ];
    }

    // Initialize daily challenges
    initializeDailyChallenges() {
        const today = new Date().toDateString();
        const savedChallenges = localStorage.getItem(`dailyChallenges_${today}`);
        
        if (savedChallenges) {
            return JSON.parse(savedChallenges);
        }
        
        // Generate new daily challenges
        const challenges = [
            {
                id: 'daily_practice',
                title: 'Practice Session',
                description: 'Complete one practice session',
                icon: '🎯',
                target: 1,
                current: 0,
                xp: 25,
                completed: false
            },
            {
                id: 'ai_coaching',
                title: 'AI Coaching',
                description: 'Use AI coaching for 5 minutes',
                icon: '🤖',
                target: 5,
                current: 0,
                xp: 30,
                completed: false
            },
            {
                id: 'voice_exercise',
                title: 'Voice Exercise',
                description: 'Complete 3 voice exercises',
                icon: '🎤',
                target: 3,
                current: 0,
                xp: 40,
                completed: false
            }
        ];
        
        localStorage.setItem(`dailyChallenges_${today}`, JSON.stringify(challenges));
        return challenges;
    }

    // Initialize skills
    initializeSkills() {
        return {
            voiceControl: {
                name: 'Voice Control',
                icon: '🎤',
                level: 'Beginner',
                progress: 0,
                maxProgress: 100
            },
            relaxation: {
                name: 'Relaxation',
                icon: '🧘',
                level: 'Beginner',
                progress: 0,
                maxProgress: 100
            },
            fluency: {
                name: 'Fluency',
                icon: '⚡',
                level: 'Beginner',
                progress: 0,
                maxProgress: 100
            },
            confidence: {
                name: 'Confidence',
                icon: '💪',
                level: 'Beginner',
                progress: 0,
                maxProgress: 100
            }
        };
    }

    // Award XP to user
    awardXP(amount) {
        this.userData.currentXP += amount;
        
        // Check for level up
        while (this.userData.currentXP >= this.userData.totalXP) {
            this.userData.currentXP -= this.userData.totalXP;
            this.userData.level++;
            this.userData.totalXP = this.calculateXPForNextLevel(this.userData.level);
            this.userData.title = this.getTitleForLevel(this.userData.level);
            this.showLevelUpNotification();
        }
        
        this.saveUserData();
        this.updateUI();
    }

    // Calculate XP needed for next level
    calculateXPForNextLevel(level) {
        return Math.round(100 * Math.pow(1.2, level - 1));
    }

    // Get title for level
    getTitleForLevel(level) {
        const titles = [
            'Speech Explorer', 'Voice Apprentice', 'Fluency Fighter',
            'Confidence Builder', 'Voice Master', 'Speech Virtuoso',
            'Fluency Champion', 'Voice Expert', 'Speech Guru',
            'Master Communicator'
        ];
        return titles[Math.min(level - 1, titles.length - 1)];
    }

    // Check and unlock achievements
    checkAchievements() {
        this.achievements.forEach(achievement => {
            if (!achievement.unlocked && !this.userData.unlockedAchievements.includes(achievement.id)) {
                if (this.isAchievementUnlocked(achievement)) {
                    this.unlockAchievement(achievement);
                }
            }
        });
    }

    // Check if achievement is unlocked
    isAchievementUnlocked(achievement) {
        switch (achievement.id) {
            case 'first_session':
                return this.userData.practiceStats.totalSessions >= 1;
            case 'week_warrior':
                return this.userData.streak >= 7;
            case 'voice_master':
                return this.userData.skillProgress.fluency >= 90;
            case 'consistency_champion':
                return this.userData.streak >= 5;
            case 'ai_coach_pro':
                return this.userData.practiceStats.totalSessions >= 50;
            case 'fluency_fighter':
                return this.userData.skillProgress.fluency >= 50;
            case 'monthly_master':
                return this.userData.streak >= 30;
            case 'confidence_builder':
                return this.userData.skillProgress.confidence >= 80;
            default:
                return false;
        }
    }

    // Unlock achievement
    unlockAchievement(achievement) {
        achievement.unlocked = true;
        this.userData.unlockedAchievements.push(achievement.id);
        this.awardXP(achievement.xp);
        this.showAchievementNotification(achievement);
        this.saveUserData();
    }

    // Show achievement notification
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-header">
                <div class="achievement-icon-large">${achievement.icon}</div>
                <div>
                    <div class="achievement-title">Achievement Unlocked!</div>
                    <div class="achievement-description">${achievement.name}</div>
                </div>
            </div>
            <div class="achievement-description">${achievement.description}</div>
            <div class="achievement-reward">
                <i class="fas fa-star"></i>
                <span class="xp-reward">+${achievement.xp} XP</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Show level up notification
    showLevelUpNotification() {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-header">
                <div class="achievement-icon-large">🎉</div>
                <div>
                    <div class="achievement-title">Level Up!</div>
                    <div class="achievement-description">You're now level ${this.userData.level}</div>
                </div>
            </div>
            <div class="achievement-description">New title: ${this.userData.title}</div>
            <div class="achievement-reward">
                <i class="fas fa-level-up-alt"></i>
                <span class="xp-reward">Level ${this.userData.level}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Update challenge progress
    updateChallengeProgress(challengeId, progress) {
        const challenge = this.dailyChallenges.find(c => c.id === challengeId);
        if (challenge && !challenge.completed) {
            challenge.current = Math.min(challenge.target, challenge.current + progress);
            
            if (challenge.current >= challenge.target) {
                challenge.completed = true;
                this.awardXP(challenge.xp);
                this.showChallengeCompleteNotification(challenge);
            }
            
            this.saveDailyChallenges();
            this.updateUI();
        }
    }

    // Show challenge complete notification
    showChallengeCompleteNotification(challenge) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-header">
                <div class="achievement-icon-large">${challenge.icon}</div>
                <div>
                    <div class="achievement-title">Challenge Complete!</div>
                    <div class="achievement-description">${challenge.title}</div>
                </div>
            </div>
            <div class="achievement-description">${challenge.description}</div>
            <div class="achievement-reward">
                <i class="fas fa-check-circle"></i>
                <span class="xp-reward">+${challenge.xp} XP</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Update UI elements
    updateUI() {
        if (!this.userData) return;
        
        // Update level and XP
        document.getElementById('userLevel').textContent = this.userData.level;
        document.getElementById('userTitle').textContent = this.userData.title;
        document.getElementById('currentXP').textContent = this.userData.currentXP;
        document.getElementById('totalXP').textContent = this.userData.totalXP;
        document.getElementById('xpProgress').style.width = `${(this.userData.currentXP / this.userData.totalXP) * 100}%`;
        
        // Update streak
        document.getElementById('streakCount').textContent = this.userData.streak;
        
        // Update daily challenges
        this.updateDailyChallengesUI();
        
        // Update achievements
        this.updateAchievementsUI();
        
        // Update skills
        this.updateSkillsUI();
    }

    // Update daily challenges UI
    updateDailyChallengesUI() {
        const container = document.getElementById('dailyChallenges');
        if (!container) return;
        
        container.innerHTML = this.dailyChallenges.map(challenge => `
            <div class="challenge-item ${challenge.completed ? 'completed' : ''}">
                <div class="challenge-icon">${challenge.icon}</div>
                <div class="challenge-content">
                    <div class="challenge-title">${challenge.title}</div>
                    <div class="challenge-progress">
                        <div class="progress">
                            <div class="progress-bar ${challenge.completed ? 'bg-success' : 'bg-primary'}" 
                                 style="width: ${(challenge.current / challenge.target) * 100}%"></div>
                        </div>
                        <small>${challenge.current}/${challenge.target}</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Update achievements UI
    updateAchievementsUI() {
        const container = document.getElementById('recentAchievements');
        if (!container) return;
        
        const unlockedAchievements = this.achievements.filter(a => 
            this.userData.unlockedAchievements.includes(a.id)
        );
        
        container.innerHTML = unlockedAchievements.slice(0, 6).map(achievement => `
            <div class="achievement-badge" title="${achievement.name}">
                ${achievement.icon}
            </div>
        `).join('');
    }

    // Update skills UI
    updateSkillsUI() {
        const skills = ['voiceControl', 'relaxation', 'fluency', 'confidence'];
        
        skills.forEach(skill => {
            const progress = this.userData.skillProgress[skill];
            const level = this.getSkillLevel(progress);
            
            // Update progress bar
            const progressBar = document.getElementById(`${skill}Progress`);
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            
            // Update level text
            const levelText = document.getElementById(`${skill}Level`);
            if (levelText) {
                levelText.textContent = level;
            }
        });
    }

    // Get skill level based on progress
    getSkillLevel(progress) {
        if (progress >= 80) return 'Expert';
        if (progress >= 60) return 'Advanced';
        if (progress >= 40) return 'Intermediate';
        if (progress >= 20) return 'Novice';
        return 'Beginner';
    }

    // Save user data to localStorage
    saveUserData() {
        localStorage.setItem('gamificationData', JSON.stringify(this.userData));
    }

    // Save daily challenges
    saveDailyChallenges() {
        const today = new Date().toDateString();
        localStorage.setItem(`dailyChallenges_${today}`, JSON.stringify(this.dailyChallenges));
    }

    // Start periodic updates
    startPeriodicUpdates() {
        // Check for new achievements every 30 seconds
        setInterval(() => {
            this.checkAchievements();
        }, 30000);
        
        // Save data every minute
        setInterval(() => {
            this.saveUserData();
        }, 60000);
    }

    // Public methods for external integration
    onPracticeSessionCompleted(sessionData) {
        this.userData.practiceStats.totalSessions++;
        this.userData.practiceStats.totalMinutes += sessionData.duration || 0;
        
        // Update challenge progress
        this.updateChallengeProgress('daily_practice', 1);
        
        // Award XP for session
        const xpEarned = Math.round((sessionData.duration || 1) * 2);
        this.awardXP(xpEarned);
        
        // Check achievements
        this.checkAchievements();
    }

    onAICoachingSessionCompleted(duration) {
        this.updateChallengeProgress('ai_coaching', Math.round(duration / 60));
        this.awardXP(Math.round(duration / 30));
    }

    onExerciseCompleted(exerciseType) {
        this.updateChallengeProgress('voice_exercise', 1);
        this.awardXP(15);
    }
}

// Global gamification instance
let gamificationSystem = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    gamificationSystem = new GamificationSystem();
    
    // Initialize after a short delay to ensure other systems are loaded
    setTimeout(() => {
        gamificationSystem.initialize();
    }, 1000);
});

// Global functions for external integration
function onPracticeCompleted(sessionData) {
    if (gamificationSystem) {
        gamificationSystem.onPracticeSessionCompleted(sessionData);
    }
}

function onAICoachingCompleted(duration) {
    if (gamificationSystem) {
        gamificationSystem.onAICoachingSessionCompleted(duration);
    }
}

function onExerciseCompleted(exerciseType) {
    if (gamificationSystem) {
        gamificationSystem.onExerciseCompleted(exerciseType);
    }
}
