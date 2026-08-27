import urllib.request, urllib.error 
def check(name, url): 
    try: 
        with urllib.request.urlopen(url, timeout=5) as r: 
            body = r.read(200).decode('utf-8', 'ignore').replace('\n', ' ') 
            print(f'{name}: UP ({r.status})') 
            print(f'  URL: {url}') 
            print(f'  Body: {body[:160]}') 
    except Exception as e: 
        print(f'{name}: DOWN') 
        print(f'  URL: {url}') 
        print(f'  Error: {e}') 
check('Emotion root', 'http://localhost:5000/') 
check('Emotion PDFs', 'http://localhost:5000/api/pdfs') 
check('Stutter root', 'http://localhost:8000/') 
check('Stutter docs', 'http://localhost:8000/docs') 
check('Sign root', 'http://localhost:5001/') 
check('Sign labels', 'http://localhost:5001/api/sign/labels') 
