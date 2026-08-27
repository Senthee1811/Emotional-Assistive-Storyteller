#!/usr/bin/env python3
"""
Simple HTTP server for the Emotional Reader frontend
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Set preferred port
PORT = int(os.environ.get("FRONTEND_PORT", "8080"))

# Change to frontend directory
frontend_dir = Path(__file__).parent
os.chdir(frontend_dir)

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    try:
        bound_port = None
        httpd = None
        for candidate in range(PORT, PORT + 10):
            try:
                httpd = socketserver.TCPServer(("", candidate), MyHTTPRequestHandler)
                bound_port = candidate
                break
            except OSError as e:
                if e.errno not in (48, 10048):  # POSIX and Windows address-in-use
                    raise

        if httpd is None or bound_port is None:
            print(f"No free port found in range {PORT}-{PORT + 9}.")
            sys.exit(1)

        with httpd:
            if bound_port != PORT:
                print(f"Port {PORT} is already in use. Using port {bound_port} instead.")
            print(f"Frontend server running at http://localhost:{bound_port}")
            print(f"Serving files from: {frontend_dir}")
            print(f"Main page: http://localhost:{bound_port}/index.html")
            print("\nAvailable pages:")
            print("  - index.html - Main emotion detection interface")
            print("  - recommend.html - Story recommendations")
            print("  - upload.html - File upload interface")
            print("  - pdfs.html - PDF library")
            print("  - simulate.html - Emotion simulation")
            print("\nPress Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        sys.exit(0)
    except OSError as e:
        if e.errno in (48, 10048):  # POSIX and Windows address-in-use
            print(f"Port {PORT} is already in use. Please try a different port.")
            sys.exit(1)
        else:
            raise
