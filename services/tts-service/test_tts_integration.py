import os
import sys
import time
import unittest
import urllib.request
import json

class TestTTSIntegration(unittest.TestCase):
    BASE_URL = os.environ.get("TTS_SERVICE_URL", "http://127.0.0.1:5006")

    def test_synthesis_end_to_end(self):
        url = f"{self.BASE_URL}/api/tts/synthesize"
        payload = json.dumps({
            "text": "Barnaby the little bear smiled happily in the meadow.",
            "emotion": "happy",
            "speaker": "child_voice"
        }).encode('utf-8')

        req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
        res = urllib.request.urlopen(req)
        self.assertIn(res.getcode(), [200, 202])

        data = json.loads(res.read().decode('utf-8'))
        job_id = data.get("job_id")
        self.assertIsNotNone(job_id)

        # Poll job status
        completed = False
        audio_url = None
        for _ in range(10):
            time.sleep(1)
            status_res = urllib.request.urlopen(f"{self.BASE_URL}/api/tts/jobs/{job_id}")
            status_data = json.loads(status_res.read().decode('utf-8'))
            if status_data.get("status") == "completed":
                completed = True
                audio_url = status_data.get("audio_url")
                break

        self.assertTrue(completed, "TTS Job failed to complete within polling window")
        self.assertIsNotNone(audio_url)

        # Download audio artifact and verify non-zero size
        audio_res = urllib.request.urlopen(f"{self.BASE_URL}{audio_url}")
        audio_bytes = audio_res.read()
        self.assertGreater(len(audio_bytes), 0, "TTS generated 0-byte audio artifact")
        print(f"[PASS] TTS Integration Test Passed: Generated {len(audio_bytes)} bytes audio file ({audio_url})")

if __name__ == '__main__':
    unittest.main()
