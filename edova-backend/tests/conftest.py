import sys
from pathlib import Path

_SERVICE_ROOT = str(Path(__file__).resolve().parent.parent)
# Prepend (not append) and drop any same-named modules other suites may have
# registered — ncert_rag also ships a top-level main.py.
sys.path.insert(0, _SERVICE_ROOT)
for _name in ("main", "settings"):
    mod = sys.modules.get(_name)
    if mod is not None and not getattr(mod, "__file__", "").startswith(_SERVICE_ROOT):
        del sys.modules[_name]
