#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import app
    print("Flask app imported successfully")
    
    # Print all routes
    for rule in app.url_map.iter_rules():
        print(f"Route: {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")
    
    print("\nTesting app creation...")
    with app.test_client() as client:
        response = client.get('/api/pdfs')
        print(f"GET /api/pdfs: {response.status_code}")
        
        response = client.post('/api/detect-emotion', 
                              json={'image': 'test'}, 
                              content_type='application/json')
        print(f"POST /api/detect-emotion: {response.status_code}")
        
        response = client.get('/api/recommend-with-sign?emotion=neutral')
        print(f"GET /api/recommend-with-sign: {response.status_code}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
