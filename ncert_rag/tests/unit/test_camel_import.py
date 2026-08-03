"""
edova-camel dependency-inversion pin, subprocess-level: importing
camel_society.agents (and api.py) must NOT require GEMINI_API_KEY anymore —
only build_model() does, with the same fail-fast RuntimeError as before.

The subprocess blocks dotenv loading so the repo-root .env can't leak a key
in; what you see is what a bare environment gets.
"""

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

_SCRIPT = r'''
import os
import sys

import dotenv

os.environ.pop("GEMINI_API_KEY", None)
dotenv.load_dotenv = lambda *a, **k: False  # block the repo-root .env

sys.path.insert(0, "{camel_dir}")

# 1. Import works with no key anywhere (previously raised RuntimeError here).
from camel_society import agents
import api  # the FastAPI wrapper must import key-free too
assert "GEMINI_API_KEY" not in os.environ

# 2. The fail-fast guard moved into the factory, message unchanged.
try:
    agents.build_model()
except RuntimeError as e:
    assert "GEMINI_API_KEY is not set" in str(e)
else:
    raise SystemExit("build_model() must fail fast without GEMINI_API_KEY")

# 3. With a key, the factory builds the hardcoded-default model, cached.
os.environ["GEMINI_API_KEY"] = "dummy-key-for-construction"
model = agents.build_model()
assert agents.build_model() is model  # cached singleton

# 4. Both society factories wire the four agents on the shared model.
ctx = agents.LessonContext(
    topic="Fractions", duration=40, board="CBSE",
    class_label="Class 6", subject="Mathematics",
)
assert ctx.curriculum_label() == "CBSE Class 6 Mathematics"
for factory in (agents.build_society, agents.get_agents):
    society = factory(ctx)
    assert sorted(society.keys()) == ["assessment", "critique", "curriculum", "pedagogy"]

print("camel import DI ok")
'''


def test_agents_import_without_gemini_api_key():
    camel_dir = str(REPO_ROOT / "edova-camel").replace("\\", "/")
    proc = subprocess.run(
        [sys.executable, "-c", _SCRIPT.format(camel_dir=camel_dir)],
        capture_output=True,
        text=True,
        timeout=180,
        cwd=str(REPO_ROOT),
    )
    assert proc.returncode == 0, proc.stderr
    assert "camel import DI ok" in proc.stdout
