import os
import re
import tempfile
from pathlib import Path
from typing import Dict, List

# PyAutoGUI configuration
FAILSAFE: bool = True
ACTION_DELAY: float = 0.1
TYPING_INTERVAL: float = 0.0

# Execution defaults
DEFAULT_TIMEOUT: int = 30

# Dangerous command patterns for terminal safety checks
DANGEROUS_PATTERNS: List[str] = [
    r"\brm\s+-[rf]*",
    r"\bformat\b",
    r"\bdel\s+/[sS]\b",
    r"\brd\s+/[sS]\b",
    r"\bdiskpart\b",
    r"\bmkfs\b",
    r"\bdrop\s+database\b",
    r"Remove-Item.*-Recurse",
    r"powershell.*-EncodedCommand",
    r"\bshutdown\b",
    r"\breboot\b",
    r"\bicacls\b",
    r"\bchmod\s+777\b",
    r"\bdd\s+if=",
]

# Permissions dictionary - all default to False (must be explicitly enabled)
PERMISSIONS: Dict[str, bool] = {
    "mouse": False,
    "keyboard": False,
    "screen": False,
    "applications": False,
    "filesystem": False,
    "terminal": False,
}

def get_default_allowed_roots() -> List[Path]:
    """Return default allowed filesystem root paths."""
    home = Path.home().resolve()
    roots = [
        home,
        home / "Desktop",
        home / "Documents",
        home / "Downloads",
        Path(tempfile.gettempdir()).resolve(),
        Path.cwd().resolve(),
    ]
    # On Windows, allow user drive home if present
    if os.name == "nt" and "USERPROFILE" in os.environ:
        roots.append(Path(os.environ["USERPROFILE"]).resolve())
    
    # Return unique, existing paths
    unique_roots: List[Path] = []
    for r in roots:
        try:
            resolved = r.resolve()
            if resolved not in unique_roots:
                unique_roots.append(resolved)
        except Exception:
            continue
    return unique_roots

ALLOWED_FILE_ROOTS: List[Path] = get_default_allowed_roots()

def set_permission(module: str, enabled: bool) -> None:
    """Dynamically set permission for a given module."""
    if module in PERMISSIONS:
        PERMISSIONS[module] = bool(enabled)

def set_all_permissions(enabled: bool) -> None:
    """Enable or disable all permissions."""
    for key in PERMISSIONS:
        PERMISSIONS[key] = bool(enabled)

def add_allowed_root(path_str: str) -> None:
    """Add a directory to the allowed filesystem roots."""
    try:
        p = Path(path_str).expanduser().resolve()
        if p.exists() and p not in ALLOWED_FILE_ROOTS:
            ALLOWED_FILE_ROOTS.append(p)
    except Exception:
        pass
