import os
import re
import subprocess
import sys
from typing import Any, Dict, List, Optional, Union

import config
from utils import log

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

try:
    import pywinauto
    PYWINAUTO_AVAILABLE = True
except ImportError:
    PYWINAUTO_AVAILABLE = False


class ApplicationsAgent:
    """Agent for managing applications, launching executables, listing and focusing windows."""

    def __init__(self) -> None:
        pass

    def _verify_permission(self, override: bool = False) -> None:
        """Check if application control permission is granted."""
        if not override and not config.PERMISSIONS.get("applications", False):
            raise PermissionError("Application action blocked: 'applications' permission is not enabled.")

    def open_application(
        self,
        name: str,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """
        Open application by name, path, or URL.
        Uses os.startfile on Windows or start command / subprocess.
        """
        self._verify_permission(permission_granted)
        target = name.strip()

        try:
            # Check if Windows os.startfile is available
            if hasattr(os, "startfile"):
                os.startfile(target)
                return {"status": "success", "action": "open_application", "target": target, "method": "os.startfile"}

            # Shell start fallback
            if sys.platform == "win32":
                subprocess.Popen(f'start "" "{target}"', shell=True)
            elif sys.platform == "darwin":
                subprocess.Popen(["open", target])
            else:
                subprocess.Popen(["xdg-open", target])

            return {"status": "success", "action": "open_application", "target": target, "method": "subprocess"}
        except Exception as e:
            log(f"Error opening application '{name}': {e}", level="ERROR")
            raise RuntimeError(f"Failed to open application '{name}': {e}")

    def launch_program(
        self,
        path: str,
        args: Optional[Union[List[str], str]] = None,
        cwd: Optional[str] = None,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Launch an executable program with optional command-line arguments."""
        self._verify_permission(permission_granted)

        cmd: List[str] = [path]
        if args:
            if isinstance(args, str):
                cmd.extend(args.split())
            elif isinstance(args, list):
                cmd.extend([str(a) for a in args])

        try:
            proc = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return {
                "status": "success",
                "action": "launch_program",
                "pid": proc.pid,
                "command": cmd,
                "cwd": cwd,
            }
        except Exception as e:
            log(f"Error launching program '{path}': {e}", level="ERROR")
            raise RuntimeError(f"Failed to launch program '{path}': {e}")

    def close_application(
        self,
        name: str,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """
        Close application by process name or PID.
        Uses taskkill on Windows or psutil terminate/kill.
        """
        self._verify_permission(permission_granted)
        target = name.strip()
        closed_count = 0

        # If name is digits, treat as PID
        if target.isdigit():
            pid = int(target)
            if PSUTIL_AVAILABLE:
                try:
                    p = psutil.Process(pid)
                    p.terminate()
                    closed_count += 1
                except Exception as e:
                    log(f"psutil terminate error for PID {pid}: {e}", level="WARNING")

            if closed_count == 0 and sys.platform == "win32":
                res = subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
                if res.returncode == 0:
                    closed_count += 1

            return {"status": "success", "action": "close_application", "pid": pid, "closed": closed_count}

        # Match by process name
        target_name = target.lower()
        if not target_name.endswith(".exe") and sys.platform == "win32":
            target_exe = target_name + ".exe"
        else:
            target_exe = target_name

        if PSUTIL_AVAILABLE:
            for proc in psutil.process_iter(["pid", "name"]):
                try:
                    p_name = (proc.info["name"] or "").lower()
                    if p_name in (target_name, target_exe) or target_name in p_name:
                        proc.terminate()
                        closed_count += 1
                except Exception:
                    continue

        if closed_count == 0 and sys.platform == "win32":
            res = subprocess.run(f'taskkill /F /IM "{target_exe}"', shell=True, capture_output=True)
            if res.returncode == 0:
                closed_count += 1

        return {
            "status": "success",
            "action": "close_application",
            "target": target,
            "closed_processes": closed_count,
        }

    def list_running_applications(self) -> List[Dict[str, Any]]:
        """List currently running applications and processes with GUI windows."""
        results: List[Dict[str, Any]] = []

        if PYWINAUTO_AVAILABLE and sys.platform == "win32":
            try:
                desktop = pywinauto.Desktop(backend="win32")
                for win in desktop.windows():
                    try:
                        title = win.window_text()
                        if title and win.is_visible():
                            pid = win.process_id()
                            results.append({
                                "title": title,
                                "pid": pid,
                                "handle": win.handle,
                                "is_visible": True,
                            })
                    except Exception:
                        continue
            except Exception as e:
                log(f"pywinauto window enumeration error: {e}", level="WARNING")

        if not results and PSUTIL_AVAILABLE:
            for proc in psutil.process_iter(["pid", "name", "status"]):
                try:
                    info = proc.info
                    results.append({
                        "pid": info["pid"],
                        "name": info["name"],
                        "status": info["status"],
                    })
                except Exception:
                    continue

        return results

    def focus_application(
        self,
        name: str,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Bring application window matching name or title to the foreground."""
        self._verify_permission(permission_granted)
        target = name.strip()

        if PYWINAUTO_AVAILABLE and sys.platform == "win32":
            try:
                desktop = pywinauto.Desktop(backend="win32")
                pattern = re.compile(f".*{re.escape(target)}.*", re.IGNORECASE)
                for win in desktop.windows():
                    try:
                        title = win.window_text()
                        if pattern.match(title):
                            win.set_focus()
                            return {
                                "status": "success",
                                "action": "focus_application",
                                "focused_title": title,
                                "pid": win.process_id(),
                            }
                    except Exception:
                        continue
            except Exception as e:
                log(f"pywinauto focus error: {e}", level="WARNING")

        return {
            "status": "partial",
            "message": f"Could not focus application window matching '{target}'.",
        }

    def get_active_window(self) -> Dict[str, Any]:
        """Return title, handle, and process ID of the currently active foreground window."""
        if PYWINAUTO_AVAILABLE and sys.platform == "win32":
            try:
                desktop = pywinauto.Desktop(backend="win32")
                active = desktop.active_window()
                title = active.window_text()
                pid = active.process_id()
                handle = active.handle

                p_name = ""
                if PSUTIL_AVAILABLE:
                    try:
                        p_name = psutil.Process(pid).name()
                    except Exception:
                        pass

                return {
                    "title": title,
                    "handle": handle,
                    "pid": pid,
                    "process_name": p_name,
                }
            except Exception as e:
                log(f"pywinauto active window error: {e}", level="WARNING")

        return {
            "title": "Unknown",
            "handle": 0,
            "pid": 0,
            "process_name": "Unknown",
        }
