import os

os.environ.setdefault('VERCEL', '1')

from backend.main import app  # noqa: E402,F401
