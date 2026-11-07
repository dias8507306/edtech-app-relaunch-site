"""Локальный просмотр dist/ без «застрявших» страниц.

То же, что `python -m http.server 8000`, но каждый ответ идёт с `Cache-Control: no-cache`:
браузер перепроверяет файлы (если файл не менялся, сервер быстро отвечает 304),
поэтому после пересборки новая версия видна по обычному F5, а не только по Ctrl+Shift+R.
"""
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist"))
    print(f"Serving dist/ at http://localhost:{port}/ (no-cache)")
    http.server.ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
