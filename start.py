"""Launch the standalone MeetSpace prototype using only the Python standard library."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from threading import Timer
import webbrowser


class PreviewHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        if len(args) > 1 and str(args[1]).startswith(("4", "5")):
            super().log_message(format, *args)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Open the MeetSpace desktop prototype.")
    parser.add_argument("--port", type=int, default=8767, help="Local port (default: 8767)")
    parser.add_argument("--no-browser", action="store_true", help="Start the server only")
    args = parser.parse_args(argv)
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")

    directory = Path(__file__).resolve().parent / "meetspace-refresh-20261016"
    if not (directory / "index.html").is_file():
        print("MeetSpace: index.html is missing. Keep the project files together.", file=sys.stderr)
        return 1

    handler = partial(PreviewHandler, directory=str(directory))
    # Bind first: never open an unrelated service when the selected port is occupied.
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError as error:
        print(f"MeetSpace: cannot start on port {args.port}: {error}", file=sys.stderr)
        print("Try: python start.py --port 8768", file=sys.stderr)
        return 1

    url = f"http://127.0.0.1:{server.server_port}/index.html"
    print(f"MeetSpace for Windows: {url}", flush=True)
    print("Keep this terminal open. Press Ctrl+C to stop.", flush=True)
    opener = None
    if not args.no_browser:
        opener = Timer(0.25, webbrowser.open, args=(url,))
        opener.daemon = True
        opener.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nMeetSpace stopped.")
    finally:
        if opener is not None:
            opener.cancel()
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
