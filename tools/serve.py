"""Local dev server with caching turned off, so the browser always loads the
latest JS modules after you edit them.

    python tools/serve.py          # http://localhost:8000
    python tools/serve.py 8080     # another port

Listens on all interfaces so phones on your Wi-Fi can connect.
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(('0.0.0.0', port), handler) as httpd:
        print(f'Serving {ROOT} at http://localhost:{port} (no caching)')
        httpd.serve_forever()
