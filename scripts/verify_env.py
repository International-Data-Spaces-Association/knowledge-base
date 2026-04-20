import sys
import importlib

print("PYTHON:", sys.executable)
print("VERSION:", sys.version)

def check(pkg):
    try:
        m = importlib.import_module(pkg)
        ver = getattr(m, "__version__", "unknown")
        print(f"{pkg} OK:", ver)
        return True
    except Exception as e:
        print(f"{pkg} IMPORT FAILED:", e)
        return False

ok = True
ok &= check("mkdocs")
ok &= check("mkdocs_literate_nav")

if not ok:
    sys.exit(1)