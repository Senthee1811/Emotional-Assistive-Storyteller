// Story Library JavaScript

class StoryLibrary {
    constructor() {
        this.stories = [];
        this.filteredStories = [];
        this.currentStory = null;
        
        this.initializeEventListeners();
        this.loadStories();
        this.loadStatistics();
    }

    initializeEventListeners() {
        // Upload form
        document.getElementById('uploadForm').addEventListener('submit', (e) => this.handleUpload(e));
        document.getElementById('clearBtn').addEventListener('click', () => this.clearForm());
        document.getElementById('storyFile').addEventListener('change', (e) => this.updateFileInfo(e));
        
        // Search and filter
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('emotionFilter').addEventListener('change', (e) => this.handleFilter(e));
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadStories());
        
        // Modal
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('storyModal').addEventListener('click', (e) => {
            if (e.target.id === 'storyModal') this.closeModal();
        });
    }

    async handleUpload(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('storyFile');
        const titleInput = document.getElementById('storyTitle');
        const uploadBtn = document.getElementById('uploadBtn');
        const progressDiv = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        if (!fileInput.files[0]) {
            this.showNotification('Please select a file', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('title', titleInput.value);
        
        // Show progress
        uploadBtn.disabled = true;
        progressDiv.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = 'Uploading...';
        
        try {
            // Simulate progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 30;
                if (progress > 90) progress = 90;
                progressBar.style.width = progress + '%';
                progressText.textContent = `Analyzing emotion... ${Math.round(progress)}%`;
            }, 500);
            
            const response = await fetch('/api/upload-story', {
                method: 'POST',
                body: formData
            });
            
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressText.textContent = 'Complete!';
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success) {
                    this.showNotification('Story uploaded and analyzed successfully!', 'success');
                    this.clearForm();
                    this.loadStories();
                    this.loadStatistics();
                    
                    // Show the uploaded story
                    setTimeout(() => {
                        this.showStoryDetail(result.story);
                    }, 1000);
                } else {
                    this.showNotification(result.error || 'Upload failed', 'error');
                }
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Upload failed', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Upload failed. Please try again.', 'error');
        } finally {
            uploadBtn.disabled = false;
            setTimeout(() => {
                progressDiv.classList.add('hidden');
            }, 2000);
        }
    }

    clearForm() {
        document.getElementById('uploadForm').reset();
        document.getElementById('fileInfo').textContent = '';
        document.getElementById('uploadProgress').classList.add('hidden');
    }

    updateFileInfo(e) {
        const file = e.target.files[0];
        const fileInfo = document.getElementById('fileInfo');
        
        if (file) {
            const size = (file.size / 1024 / 1024).toFixed(2);
            fileInfo.textContent = `Selected: ${file.name} (${size} MB)`;
        } else {
            fileInfo.textContent = '';
        }
    }

    async loadStories() {
        this.showLoading(true, 'Loading stories...');
        
        try {
            const response = await fetch('/api/stories');
            
            if (response.ok) {
                const result = await response.json();
                this.stories = result.stories || [];
                this.filteredStories = [...this.stories];
                this.renderStories();
                this.updateStoryCount();
            } else {
                this.showNotification('Failed to load stories', 'error');
            }
        } catch (error) {
            console.error('Load stories error:', error);
            this.showNotification('Failed to load stories', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/library-stats');
            
            if (response.ok) {
                const stats = await response.json();
                this.updateStatistics(stats);
            }
        } catch (error) {
            console.error('Load stats error:', error);
        }
    }

    updateStatistics(stats) {
        document.getElementById('totalStories').textContent = stats.total_stories || 0;
        document.getElementById('totalWords').textContent = (stats.total_words || 0).toLocaleString();
        document.getElementById('avgConfidence').textContent = Math.round((stats.avg_confidence || 0) * 100) + '%';
        document.getElementById('fileTypes').textContent = Object.keys(stats.file_types || {}).length;
    }

    handleSearch(e) {
        const query = e.target.value.toLowerCase();
        this.applyFilters(query, document.getElementById('emotionFilter').value);
    }

    handleFilter(e) {
        const emotion = e.target.value;
        this.applyFilters(document.getElementById('searchInput').value.toLowerCase(), emotion);
    }

    applyFilters(searchQuery, emotionFilter) {
        this.filteredStories = this.stories.filter(story => {
            const matchesSearch = !searchQuery || 
                story.title.toLowerCase().includes(searchQuery) || 
                story.text.toLowerCase().includes(searchQuery);
            
            const matchesEmotion = !emotionFilter || 
                story.emotion.toLowerCase() === emotionFilter.toLowerCase();
            
            return matchesSearch && matchesEmotion;
        });
        
        this.renderStories();
        this.updateStoryCount();
    }

    renderStories() {
        const grid = document.getElementById('storiesGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredStories.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        grid.innerHTML = this.filteredStories.map(story => `
            <div class="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer story-card"
                 onclick="library.showStoryDetail('${story.id}')">
                <div class="flex items-start justify-between mb-3">
                    <h3 class="text-lg font-semibold text-gray-800 line-clamp-2">${story.title}</h3>
                    <span class="emotion-${story.emotion.toLowerCase()} px-2 py-1 rounded-full text-xs font-medium">
                        ${story.emotion}
                    </span>
                </div>
                
                <div class="text-sm text-gray-600 mb-3">
                    <p><i class="fas fa-file-alt mr-1"></i> ${story.file_type.toUpperCase()}</p>
                    <p><i class="fas fa-word mr-1"></i> ${story.word_count} words</p>
                    <p><i class="fas fa-chart-line mr-1"></i> ${Math.round(story.emotion_confidence * 100)}% confidence</p>
                </div>
                
                <p class="text-gray-700 line-clamp-3 mb-3">
                    ${story.text.substring(0, 150)}${story.text.length > 150 ? '...' : ''}
                </p>
                
                <div class="flex items-center justify-between text-xs text-gray-500">
                    <span><i class="fas fa-calendar mr-1"></i> ${new Date(story.upload_date).toLocaleDateString()}</span>
                    <div class="flex space-x-2">
                        <button onclick="event.stopPropagation(); library.editStory('${story.id}')" 
                                class="text-blue-600 hover:text-blue-700">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="event.stopPropagation(); library.deleteStory('${story.id}')" 
                                class="text-red-600 hover:text-red-700">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateStoryCount() {
        const count = this.filteredStories.length;
        const total = this.stories.length;
        document.getElementById('storyCount').textContent = 
            count === total ? `${count} stories` : `${count} of ${total} stories`;
    }

    async showStoryDetail(storyId) {
        if (typeof storyId === 'object') {
            // Story object passed directly
            this.currentStory = storyId;
        } else {
            // Load story by ID
            this.showLoading(true, 'Loading story...');
            
            try {
                const response = await fetch(`/api/stories/${storyId}`);
                
                if (response.ok) {
                    this.currentStory = await response.json();
                } else {
                    this.showNotification('Failed to load story', 'error');
                    this.showLoading(false);
                    return;
                }
            } catch (error) {
                console.error('Load story error:', error);
                this.showNotification('Failed to load story', 'error');
                this.showLoading(false);
                return;
            }
        }
        
        this.renderStoryModal();
        this.showLoading(false);
    }

    renderStoryModal() {
        const modal = document.getElementById('storyModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        
        modalTitle.textContent = this.currentStory.title;
        
        const emotionColors = {
            'happy': 'bg-green-100 text-green-800',
            'sad': 'bg-blue-100 text-blue-800',
            'angry': 'bg-red-100 text-red-800',
            'fearful': 'bg-purple-100 text-purple-800',
            'love': 'bg-pink-100 text-pink-800'
        };
        
        const emotionColor = emotionColors[this.currentStory.emotion.toLowerCase()] || 'bg-gray-100 text-gray-800';
        
        modalContent.innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <span class="${emotionColor} px-3 py-1 rounded-full text-sm font-medium">
                        ${this.currentStory.emotion}
                    </span>
                    <div class="text-sm text-gray-600">
                        Confidence: ${Math.round(this.currentStory.emotion_confidence * 100)}%
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div class="bg-gray-50 p-3 rounded">
                        <p class="text-gray-600">File Type</p>
                        <p class="font-semibold">${this.currentStory.file_type.toUpperCase()}</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded">
                        <p class="text-gray-600">Word Count</p>
                        <p class="font-semibold">${this.currentStory.word_count}</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded">
                        <p class="text-gray-600">Sentences</p>
                        <p class="font-semibold">${this.currentStory.sentence_count}</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded">
                        <p class="text-gray-600">Uploaded</p>
                        <p class="font-semibold">${new Date(this.currentStory.upload_date).toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-800 mb-2">Story Content</h4>
                    <div class="text-gray-700 leading-relaxed max-h-96 overflow-y-auto">
                        ${this.currentStory.text.split('\n').map(paragraph => 
                            `<p class="mb-3">${paragraph}</p>`
                        ).join('')}
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3">
                    <button onclick="library.editStory('${this.currentStory.id}')" 
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-edit mr-2"></i>Edit Title
                    </button>
                    <button onclick="library.deleteStory('${this.currentStory.id}')" 
                            class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">
                        <i class="fas fa-trash mr-2"></i>Delete
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('storyModal').classList.add('hidden');
        this.currentStory = null;
    }

    async editStory(storyId) {
        const story = this.stories.find(s => s.id === storyId);
        if (!story) return;
        
        const newTitle = prompt('Enter new title:', story.title);
        if (!newTitle || newTitle.trim() === '') return;
        
        try {
            const response = await fetch(`/api/stories/${storyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: newTitle.trim() })
            });
            
            if (response.ok) {
                this.showNotification('Story updated successfully', 'success');
                this.loadStories();
                if (this.currentStory && this.currentStory.id === storyId) {
                    this.currentStory.title = newTitle.trim();
                    this.renderStoryModal();
                }
            } else {
                this.showNotification('Failed to update story', 'error');
            }
        } catch (error) {
            console.error('Edit story error:', error);
            this.showNotification('Failed to update story', 'error');
        }
    }

    async deleteStory(storyId) {
        const story = this.stories.find(s => s.id === storyId);
        if (!story) return;
        
        if (!confirm(`Are you sure you want to delete "${story.title}"?`)) return;
        
        try {
            const response = await fetch(`/api/stories/${storyId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showNotification('Story deleted successfully', 'success');
                this.loadStories();
                this.loadStatistics();
                if (this.currentStory && this.currentStory.id === storyId) {
                    this.closeModal();
                }
            } else {
                this.showNotification('Failed to delete story', 'error');
            }
        } catch (error) {
            console.error('Delete story error:', error);
            this.showNotification('Failed to delete story', 'error');
        }
    }

    showLoading(show, text = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (show) {
            loadingText.textContent = text;
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
        }, 3000);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3500);
    }
}

// Initialize the library
const library = new StoryLibrary();
