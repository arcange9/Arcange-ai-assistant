import base64
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import config


def log(message: str, level: str = "INFO") -> None:
    """Log formatted message to stderr to preserve stdout for JSON-RPC messages."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    sys.stderr.write(f"[{timestamp}] [{level.upper()}] {message}\n")
    sys.stderr.flush()


def to_base64(data: bytes) -> str:
    """Encode bytes to base64 UTF-8 string."""
    return base64.b64encode(data).decode("utf-8")


def from_base64(s: str) -> bytes:
    """Decode base64 string to bytes."""
    return base64.b64decode(s.encode("utf-8"))


def validate_path(
    path: Union[str, Path], allowed_roots: Optional[List[Path]] = None
) -> Path:
    """
    Validate that a given path resides inside one of the allowed file roots.
    Raises ValueError if path is invalid or outside allowed roots.
    """
    if allowed_roots is None:
        allowed_roots = config.ALLOWED_FILE_ROOTS

    try:
        candidate = Path(path).expanduser().resolve()
    except Exception as e:
        raise ValueError(f"Invalid path format '{path}': {e}")

    # If file doesn't exist yet, check its parent directory
    check_target = candidate if candidate.exists() else candidate.parent.resolve()

    is_allowed = False
    for root in allowed_roots:
        try:
            resolved_root = root.resolve()
            # Check relative_to
            check_target.relative_to(resolved_root)
            is_allowed = True
            break
        except ValueError:
            continue

    if not is_allowed:
        raise ValueError(
            f"Access denied: path '{candidate}' is outside allowed file roots."
        )

    return candidate


def success_response(request_id: Any, result: Any) -> Dict[str, Any]:
    """Format standard JSON-RPC 2.0 success response."""
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": result,
    }


def error_response(
    request_id: Any,
    message: str,
    code: int = -32603,
    data: Optional[Any] = None,
) -> Dict[str, Any]:
    """Format standard JSON-RPC 2.0 error response."""
    err_obj: Dict[str, Any] = {
        "code": code,
        "message": message,
    }
    if data is not None:
        err_obj["data"] = data

    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": err_obj,
    }


def format_size(size_in_bytes: int) -> str:
    """Convert file size in bytes to human-readable string."""
    if size_in_bytes < 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB", "PB"]
    size = float(size_in_bytes)
    for unit in units:
        if size < 1024.0 or unit == units[-1]:
            if unit == "B":
                return f"{int(size)} B"
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} PB"
