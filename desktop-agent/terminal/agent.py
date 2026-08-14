import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

import config
from utils import log, validate_path


class SecurityError(Exception):
    """Exception raised when a command violates security or safety checks."""
    pass


class TerminalAgent:
    """Agent for executing shell commands, PowerShell, and Python snippets with security guards."""

    def __init__(self) -> None:
        pass

    def _verify_permission(self, override: bool = False) -> None:
        """Check if terminal permission is enabled."""
        if not override and not config.PERMISSIONS.get("terminal", False):
            raise PermissionError("Terminal action blocked: 'terminal' permission is not enabled.")

    def _check_dangerous_command(self, command: str, force_dangerous: bool = False) -> None:
        """Scan command string against dangerous patterns."""
        if force_dangerous:
            log(f"Warning: Executing potential dangerous command with force_dangerous=True: {command[:100]}", level="WARNING")
            return

        for pattern in config.DANGEROUS_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                raise SecurityError(
                    f"Execution blocked: command matches prohibited pattern '{pattern}'. "
                    "Set parameter 'force_dangerous=True' if explicitly approved."
                )

    def execute_command(
        self,
        command: str,
        cwd: Optional[str] = None,
        timeout: int = config.DEFAULT_TIMEOUT,
        shell: bool = True,
        force_dangerous: bool = False,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """
        Execute command via subprocess.
        Returns stdout, stderr, return_code, and execution_time.
        """
        self._verify_permission(permission_granted)
        self._check_dangerous_command(command, force_dangerous=force_dangerous)

        working_dir: Optional[str] = None
        if cwd:
            try:
                valid_cwd = validate_path(cwd)
                working_dir = str(valid_cwd)
            except Exception as e:
                log(f"CWD validation note: {e}", level="WARNING")
                working_dir = cwd

        start_time = time.time()

        try:
            res = subprocess.run(
                command,
                cwd=working_dir,
                timeout=timeout,
                shell=shell,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            elapsed_time = time.time() - start_time

            return {
                "stdout": res.stdout,
                "stderr": res.stderr,
                "return_code": res.returncode,
                "execution_time": round(elapsed_time, 4),
            }
        except subprocess.TimeoutExpired as te:
            elapsed_time = time.time() - start_time
            stdout_str = te.stdout.decode("utf-8", errors="replace") if te.stdout else ""
            stderr_str = te.stderr.decode("utf-8", errors="replace") if te.stderr else ""
            return {
                "stdout": stdout_str,
                "stderr": (stderr_str + f"\n[Error: Command timed out after {timeout} seconds]").strip(),
                "return_code": -1,
                "execution_time": round(elapsed_time, 4),
                "timed_out": True,
            }
        except Exception as e:
            elapsed_time = time.time() - start_time
            log(f"Error executing command: {e}", level="ERROR")
            return {
                "stdout": "",
                "stderr": str(e),
                "return_code": -1,
                "execution_time": round(elapsed_time, 4),
            }

    def execute_powershell(
        self,
        command: str,
        cwd: Optional[str] = None,
        timeout: int = config.DEFAULT_TIMEOUT,
        force_dangerous: bool = False,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Execute a PowerShell command specifically with non-interactive flags."""
        ps_cmd = f'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "{command}"'
        return self.execute_command(
            command=ps_cmd,
            cwd=cwd,
            timeout=timeout,
            shell=True,
            force_dangerous=force_dangerous,
            permission_granted=permission_granted,
        )

    def execute_python(
        self,
        code: str,
        timeout: int = config.DEFAULT_TIMEOUT,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Execute Python code string using current Python interpreter."""
        self._verify_permission(permission_granted)
        py_executable = sys.executable

        start_time = time.time()
        try:
            res = subprocess.run(
                [py_executable, "-c", code],
                timeout=timeout,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            elapsed_time = time.time() - start_time

            return {
                "stdout": res.stdout,
                "stderr": res.stderr,
                "return_code": res.returncode,
                "execution_time": round(elapsed_time, 4),
            }
        except subprocess.TimeoutExpired as te:
            elapsed_time = time.time() - start_time
            stdout_str = te.stdout.decode("utf-8", errors="replace") if te.stdout else ""
            stderr_str = te.stderr.decode("utf-8", errors="replace") if te.stderr else ""
            return {
                "stdout": stdout_str,
                "stderr": (stderr_str + f"\n[Error: Python execution timed out after {timeout} seconds]").strip(),
                "return_code": -1,
                "execution_time": round(elapsed_time, 4),
                "timed_out": True,
            }
        except Exception as e:
            elapsed_time = time.time() - start_time
            log(f"Error executing python snippet: {e}", level="ERROR")
            return {
                "stdout": "",
                "stderr": str(e),
                "return_code": -1,
                "execution_time": round(elapsed_time, 4),
            }
