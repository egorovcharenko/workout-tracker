"""Vercel serverless entrypoint.

Reuses the Handler + DB logic from workout_server.py at the project root.
Routing: vercel.json rewrites /api/* here; the Handler matches self.path.
Static workout.html is served directly by Vercel (see vercel.json).
"""
import sys
import os

# Make the project root importable so we can reuse workout_server.py
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from workout_server import Handler  # noqa: E402


class handler(Handler):
    """Vercel requires the class to be named `handler` (lowercase)."""
    pass
