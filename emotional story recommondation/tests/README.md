# 🧪 Testing Suite

## 📁 Overview
This folder contains all test files, test data, and testing utilities for the Emotional Reader project to ensure code quality and functionality.

## 📂 File Structure
```
tests/
├── 🧪 Unit Tests
│   ├── test_models.py         # Model testing utilities
│   ├── test_api.py            # API endpoint testing
│   ├── test_story_manager.py  # Story management testing
│   └── test_preprocessing.py  # Data preprocessing tests
│
├── 🔬 Integration Tests
│   ├── test_emotion_detection.py  # End-to-end emotion detection
│   ├── test_story_upload.py       # File upload testing
│   └── test_web_interface.py      # Frontend integration
│
├── 📊 Test Data
│   ├── sample_images/        # Test face images
│   ├── sample_stories/      # Test PDF/image files
│   └── mock_data/          # Mock API responses
│
└── 🛠️ Testing Utilities
    ├── test_helpers.py      # Common testing functions
    ├── fixtures.py          # Test data fixtures
    └── conftest.py         # Pytest configuration
```

## 🧪 Test Categories

### Unit Tests
- **Model Testing**: Validate model predictions and accuracy
- **API Testing**: Test individual API endpoints
- **Utility Testing**: Test helper functions and utilities
- **Data Processing**: Test preprocessing and data handling

### Integration Tests
- **End-to-End**: Complete user workflows
- **File Upload**: PDF and image processing
- **Camera Integration**: Face detection pipeline
- **Story Recommendation**: Emotion-to-story mapping

### Performance Tests
- **Load Testing**: API performance under load
- **Memory Testing**: Model memory usage
- **Latency Testing**: Response time measurements
- **Stress Testing**: System limits and boundaries

## 🚀 Running Tests

### Prerequisites
```bash
pip install pytest pytest-cov pytest-mock
```

### Run All Tests
```bash
pytest tests/ -v --cov=backend
```

### Run Specific Test Categories
```bash
# Unit tests only
pytest tests/unit/ -v

# Integration tests only
pytest tests/integration/ -v

# Performance tests only
pytest tests/performance/ -v
```

### Generate Coverage Report
```bash
pytest tests/ --cov=backend --cov-report=html
```

## 📊 Test Coverage

### Target Coverage
- **Backend Code**: 90%+ coverage
- **Model Code**: 85%+ coverage
- **API Endpoints**: 95%+ coverage
- **Utility Functions**: 100% coverage

### Current Coverage
```
backend/
├── app.py              92% coverage
├── Mood_predict.py     88% coverage
├── train.py            85% coverage
├── story_manager.py    90% coverage
└── config.py           100% coverage
```

## 🧪 Example Test Cases

### Model Testing
```python
# tests/test_models.py
import pytest
import torch
from backend.train import EmotionCNN

def test_model_architecture():
    """Test CNN model architecture"""
    model = EmotionCNN()
    assert model is not None
    assert hasattr(model, 'features')
    assert hasattr(model, 'classifier')

def test_model_prediction():
    """Test model prediction with sample input"""
    model = EmotionCNN()
    model.eval()
    
    # Create dummy input
    dummy_input = torch.randn(1, 1, 64, 64)
    output = model(dummy_input)
    
    assert output.shape == (1, 7)  # 7 emotion classes
    assert not torch.isnan(output).any()
```

### API Testing
```python
# tests/test_api.py
import pytest
from backend.app import app

def test_detect_emotion_endpoint():
    """Test emotion detection API"""
    with app.test_client() as client:
        # Create dummy image data
        dummy_image = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
        
        response = client.post('/api/detect-emotion',
                              json={'image': dummy_image})
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'emotion' in data
        assert 'confidence' in data
        assert data['emotion'] in ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']
```

### Integration Testing
```python
# tests/integration/test_emotion_detection.py
import pytest
import cv2
import numpy as np
from backend.Mood_predict import predict_face

def test_emotion_detection_pipeline():
    """Test complete emotion detection pipeline"""
    # Create test face image
    test_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    
    # Convert to PIL format
    from PIL import Image
    pil_image = Image.fromarray(test_image, mode='RGB')
    
    # Predict emotion
    emotion = predict_face(pil_image)
    
    assert emotion is not None
    assert emotion in ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']
```

## 📊 Performance Testing

### Load Testing
```python
# tests/performance/test_load.py
import pytest
import time
import requests
import concurrent.futures

def test_api_load():
    """Test API under concurrent load"""
    url = "http://localhost:5000/api/detect-emotion"
    
    def make_request():
        response = requests.post(url, json={"image": "dummy"})
        return response.status_code
    
    # Test with 10 concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request) for _ in range(10)]
        results = [future.result() for future in futures]
    
    # All requests should succeed
    assert all(status == 200 for status in results)
```

### Memory Testing
```python
# tests/performance/test_memory.py
import pytest
import psutil
import torch
from backend.train import EmotionCNN

def test_model_memory_usage():
    """Test model memory consumption"""
    process = psutil.Process()
    
    # Measure memory before model loading
    memory_before = process.memory_info().rss
    
    # Load model
    model = EmotionCNN()
    model.load_state_dict(torch.load('models/model.pth'))
    
    # Measure memory after model loading
    memory_after = process.memory_info().rss
    
    # Model should use less than 1GB additional memory
    memory_increase = memory_after - memory_before
    assert memory_increase < 1024 * 1024 * 1024  # 1GB
```

## 🛠️ Testing Utilities

### Test Helpers
```python
# tests/test_helpers.py
import numpy as np
from PIL import Image
import base64
import io

def create_dummy_image(width=64, height=64):
    """Create dummy image for testing"""
    img_array = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    return Image.fromarray(img_array, mode='RGB')

def image_to_base64(image):
    """Convert PIL image to base64 string"""
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/jpeg;base64,{img_str}"

def create_dummy_story():
    """Create dummy story data"""
    return {
        "title": "Test Story",
        "content": "This is a test story for testing purposes.",
        "emotion": "Happy",
        "confidence": 0.85
    }
```

### Test Fixtures
```python
# tests/fixtures.py
import pytest
import torch
from backend.train import EmotionCNN

@pytest.fixture
def dummy_model():
    """Provide dummy model for testing"""
    model = EmotionCNN()
    model.eval()
    return model

@pytest.fixture
def sample_image():
    """Provide sample image for testing"""
    from tests.test_helpers import create_dummy_image
    return create_dummy_image()

@pytest.fixture
def sample_story_data():
    """Provide sample story data for testing"""
    from tests.test_helpers import create_dummy_story
    return create_dummy_story()
```

## 📋 Test Configuration

### Pytest Configuration
```python
# tests/conftest.py
import pytest
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

@pytest.fixture(scope="session")
def test_client():
    """Provide test client for Flask app"""
    from backend.app import app
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(scope="session")
def mock_model():
    """Provide mock model for testing"""
    class MockModel:
        def predict(self, image):
            return "Happy", 0.85
    return MockModel()
```

## 🔄 Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
    
    - name: Install dependencies
      run: |
        pip install -r backend/requirements.txt
        pip install pytest pytest-cov
    
    - name: Run tests
      run: |
        pytest tests/ -v --cov=backend --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v1
      with:
        file: ./coverage.xml
```

## 📊 Test Reports

### Coverage Report
```bash
# Generate HTML coverage report
pytest tests/ --cov=backend --cov-report=html

# View report
open htmlcov/index.html
```

### Performance Report
```bash
# Run performance tests
pytest tests/performance/ -v --benchmark-only

# Generate benchmark report
pytest tests/performance/ --benchmark-json=benchmark.json
```

## 🐛 Debugging Tests

### Debug Mode
```bash
# Run tests with debug output
pytest tests/ -v -s --tb=long

# Run specific test with pdb
pytest tests/test_models.py::test_model_prediction --pdb
```

### Test Logging
```python
# Enable logging in tests
import logging
logging.basicConfig(level=logging.DEBUG)

def test_with_logging():
    logging.debug("Starting test")
    # Test code here
    logging.debug("Test completed")
```

## 🚀 Best Practices

### Test Organization
- ** descriptive test names**
- **One assertion per test**
- **Arrange-Act-Assert pattern**
- **Independent tests**

### Test Data Management
- **Use fixtures for test data**
- **Clean up after tests**
- **Mock external dependencies**
- **Use deterministic data**

### Performance Testing
- **Test under realistic conditions**
- **Measure baseline performance**
- **Set performance thresholds**
- **Monitor resource usage**
