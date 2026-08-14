import inspect
import json
import os
import signal
import sys
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import config
from applications import ApplicationsAgent
from filesystem import FilesystemAgent
from keyboard import KeyboardAgent
from mouse import MouseAgent
from screen import ScreenAgent
from terminal import TerminalAgent
from utils import error_response, log, success_response


class DesktopAgentDispatcher:
    """Main JSON-RPC Dispatcher managing sub-agents and method routing."""

    def __init__(self) -> None:
        log("Initializing Python Desktop Agent sub-agents...")
        self.mouse = MouseAgent()
        self.keyboard = KeyboardAgent()
        self.screen = ScreenAgent()
        self.applications = ApplicationsAgent()
        self.filesystem = FilesystemAgent()
        self.terminal = TerminalAgent()

        self._is_running = True
        self.routes: Dict[str, Callable[..., Any]] = self._build_route_map()
        log("All sub-agents initialized successfully.")

    def _build_route_map(self) -> Dict[str, Callable[..., Any]]:
        """Map JSON-RPC method strings to corresponding agent methods."""
        mapping: Dict[str, Callable[..., Any]] = {
            # Mouse operations
            "mouse.move": self.mouse.move_mouse,
            "mouse.move_mouse": self.mouse.move_mouse,
            "mouse.click": self.mouse.click,
            "mouse.double_click": self.mouse.double_click,
            "mouse.doubleClick": self.mouse.double_click,
            "mouse.right_click": self.mouse.right_click,
            "mouse.rightClick": self.mouse.right_click,
            "mouse.scroll": self.mouse.scroll,
            "mouse.get_position": self.mouse.get_position,
            "mouse.getPosition": self.mouse.get_position,
            "mouse.position": self.mouse.get_position,
            "mouse.drag": self.mouse.drag,

            # Keyboard operations
            "keyboard.type": self.keyboard.type_text,
            "keyboard.type_text": self.keyboard.type_text,
            "keyboard.typeText": self.keyboard.type_text,
            "keyboard.press": self.keyboard.press_key,
            "keyboard.press_key": self.keyboard.press_key,
            "keyboard.pressKey": self.keyboard.press_key,
            "keyboard.hotkey": self.keyboard.hotkey,
            "keyboard.key_down": self.keyboard.key_down,
            "keyboard.keyDown": self.keyboard.key_down,
            "keyboard.key_up": self.keyboard.key_up,
            "keyboard.keyUp": self.keyboard.key_up,

            # Screen operations
            "screen.capture": self.screen.take_screenshot,
            "screen.screenshot": self.screen.take_screenshot,
            "screen.take_screenshot": self.screen.take_screenshot,
            "screen.takeScreenshot": self.screen.take_screenshot,
            "screen.get_screen_size": self.screen.get_screen_size,
            "screen.get_size": self.screen.get_screen_size,
            "screen.getSize": self.screen.get_screen_size,
            "screen.getScreenSize": self.screen.get_screen_size,
            "screen.find_element": self.screen.find_ui_element,
            "screen.find_ui_element": self.screen.find_ui_element,
            "screen.findUiElement": self.screen.find_ui_element,
            "screen.find_text": self.screen.find_text,
            "screen.findText": self.screen.find_text,
            "screen.find_image": self.screen.find_image,
            "screen.findImage": self.screen.find_image,
            "screen.get_pixel_color": self.screen.get_pixel_color,
            "screen.getPixelColor": self.screen.get_pixel_color,

            # Applications operations
            "applications.open": self.applications.open_application,
            "applications.open_application": self.applications.open_application,
            "applications.openApplication": self.applications.open_application,
            "application.open": self.applications.open_application,
            "application.launch": self.applications.open_application,
            "applications.close": self.applications.close_application,
            "applications.close_application": self.applications.close_application,
            "applications.closeApplication": self.applications.close_application,
            "application.close": self.applications.close_application,
            "applications.launch": self.applications.launch_program,
            "applications.launch_program": self.applications.launch_program,
            "applications.launchProgram": self.applications.launch_program,
            "applications.list": self.applications.list_running_applications,
            "applications.list_running_applications": self.applications.list_running_applications,
            "applications.listRunningApplications": self.applications.list_running_applications,
            "application.list": self.applications.list_running_applications,
            "applications.focus": self.applications.focus_application,
            "applications.focus_application": self.applications.focus_application,
            "applications.focusApplication": self.applications.focus_application,
            "application.focus": self.applications.focus_application,
            "applications.get_active_window": self.applications.get_active_window,
            "applications.getActiveWindow": self.applications.get_active_window,
            "application.get_active_window": self.applications.get_active_window,
            "application.getActiveWindow": self.applications.get_active_window,

            # Filesystem operations
            "filesystem.create_file": self.filesystem.create_file,
            "filesystem.createFile": self.filesystem.create_file,
            "filesystem.read_file": self.filesystem.read_file,
            "filesystem.readFile": self.filesystem.read_file,
            "filesystem.write_file": self.filesystem.write_file,
            "filesystem.writeFile": self.filesystem.write_file,
            "filesystem.rename_file": self.filesystem.rename_file,
            "filesystem.rename": self.filesystem.rename_file,
            "filesystem.renameFile": self.filesystem.rename_file,
            "filesystem.move_file": self.filesystem.move_file,
            "filesystem.move": self.filesystem.move_file,
            "filesystem.moveFile": self.filesystem.move_file,
            "filesystem.copy_file": self.filesystem.copy_file,
            "filesystem.copy": self.filesystem.copy_file,
            "filesystem.copyFile": self.filesystem.copy_file,
            "filesystem.delete_file": self.filesystem.delete_file,
            "filesystem.deleteFile": self.filesystem.delete_file,
            "filesystem.delete": self.filesystem.delete_file,
            "filesystem.create_folder": self.filesystem.create_folder,
            "filesystem.createFolder": self.filesystem.create_folder,
            "filesystem.list_directory": self.filesystem.list_directory,
            "filesystem.listDirectory": self.filesystem.list_directory,
            "filesystem.list_dir": self.filesystem.list_directory,
            "filesystem.list": self.filesystem.list_directory,
            "filesystem.file_exists": self.filesystem.file_exists,
            "filesystem.fileExists": self.filesystem.file_exists,
            "filesystem.exists": self.filesystem.file_exists,
            "filesystem.get_file_info": self.filesystem.get_file_info,
            "filesystem.getFileInfo": self.filesystem.get_file_info,
            "filesystem.get_info": self.filesystem.get_file_info,
            "filesystem.info": self.filesystem.get_file_info,
            "filesystem.search_files": self.filesystem.search_files,
            "filesystem.searchFiles": self.filesystem.search_files,
            "filesystem.search": self.filesystem.search_files,

            # Terminal operations
            "terminal.execute": self.terminal.execute_command,
            "terminal.execute_command": self.terminal.execute_command,
            "terminal.executeCommand": self.terminal.execute_command,
            "terminal.execute_powershell": self.terminal.execute_powershell,
            "terminal.executePowershell": self.terminal.execute_powershell,
            "terminal.powershell": self.terminal.execute_powershell,
            "terminal.execute_python": self.terminal.execute_python,
            "terminal.executePython": self.terminal.execute_python,
            "terminal.python": self.terminal.execute_python,

            # Administrative / System operations
            "ping": lambda: "pong",
            "system.ping": lambda: "pong",
            "system.get_permissions": lambda: config.PERMISSIONS,
            "permissions.get": lambda: config.PERMISSIONS,
            "system.set_permissions": self._handle_set_permissions,
            "permissions.set": self._handle_set_permissions,
            "system.set_allowed_roots": self._handle_set_allowed_roots,
        }
        return mapping

    def _handle_set_permissions(self, **kwargs: Any) -> Dict[str, bool]:
        """Update active module permissions."""
        for key, value in kwargs.items():
            config.set_permission(key, value)
        return config.PERMISSIONS

    def _handle_set_allowed_roots(self, roots: Any = None) -> List[str]:
        """Add or set allowed filesystem root paths."""
        if isinstance(roots, list):
            for r in roots:
                config.add_allowed_root(str(r))
        elif isinstance(roots, str):
            config.add_allowed_root(roots)
        return [str(p) for p in config.ALLOWED_FILE_ROOTS]

    def _invoke_handler(self, handler: Callable[..., Any], params: Any) -> Any:
        """Invoke RPC handler with positional or keyword argument matching."""
        if params is None:
            return handler()

        if isinstance(params, dict):
            # Check signature parameters to only pass accepted kwargs or **kwargs
            sig = inspect.signature(handler)
            has_kwargs = any(
                p.kind == inspect.Parameter.VAR_KEYWORD
                for p in sig.parameters.values()
            )
            if has_kwargs:
                return handler(**params)
            
            valid_kwargs = {
                k: v for k, v in params.items() if k in sig.parameters
            }
            return handler(**valid_kwargs)

        if isinstance(params, list):
            return handler(*params)

        return handler(params)

    def dispatch(self, raw_line: str) -> Optional[Dict[str, Any]]:
        """Process incoming raw line, parse JSON-RPC request, and return response dict."""
        line = raw_line.strip()
        if not line:
            return None

        try:
            req = json.loads(line)
        except Exception as e:
            log(f"JSON Parse Error: {e}", level="ERROR")
            return error_response(None, f"Parse error: {e}", code=-32700)

        if not isinstance(req, dict):
            return error_response(None, "Invalid Request: payload must be a JSON object", code=-32600)

        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params")

        if not method or not isinstance(method, str):
            return error_response(req_id, "Invalid Request: missing method string", code=-32600)

        if method in ("shutdown", "system.shutdown"):
            log("Received shutdown request. Exiting...")
            self._is_running = False
            return success_response(req_id, {"status": "shutting_down"})

        handler = self.routes.get(method)
        if not handler:
            log(f"Method not found: '{method}'", level="WARNING")
            return error_response(req_id, f"Method not found: '{method}'", code=-32601)

        try:
            result = self._invoke_handler(handler, params)
            return success_response(req_id, result)
        except PermissionError as pe:
            log(f"Permission error executing '{method}': {pe}", level="WARNING")
            return error_response(req_id, str(pe), code=-32000)
        except SecurityError as se:
            log(f"Security error executing '{method}': {se}", level="WARNING")
            return error_response(req_id, str(se), code=-32001)
        except FileNotFoundError as fnfe:
            return error_response(req_id, str(fnfe), code=-32002)
        except Exception as ex:
            log(f"Internal error executing '{method}': {ex}", level="ERROR")
            return error_response(req_id, f"Error executing '{method}': {ex}", code=-32603)

    def run(self) -> None:
        """Main stdio loop reading JSON-RPC lines from stdin and writing to stdout."""
        log("Python Desktop Agent JSON-RPC server active. Listening on stdin...")

        def signal_handler(sig: int, frame: Any) -> None:
            log(f"Signal {sig} received. Shutting down gracefully...")
            self._is_running = False

        signal.signal(signal.SIGINT, signal_handler)
        if hasattr(signal, "SIGTERM"):
            signal.signal(signal.SIGTERM, signal_handler)

        while self._is_running:
            try:
                line = sys.stdin.readline()
                if not line:
                    # EOF reached on stdin
                    log("Stdin closed (EOF). Stopping agent loop.")
                    break

                response = self.dispatch(line)
                if response:
                    out_str = json.dumps(response)
                    sys.stdout.write(out_str + "\n")
                    sys.stdout.flush()

                if not self._is_running:
                    break

            except KeyboardInterrupt:
                log("KeyboardInterrupt received.")
                break
            except Exception as e:
                log(f"Unexpected error in main loop: {e}", level="ERROR")

        log("Desktop Agent shutdown complete.")


def main() -> None:
    # Ensure unbuffered binary/text stdio stream behavior
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(line_buffering=True, encoding="utf-8")
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8")

    dispatcher = DesktopAgentDispatcher()
    dispatcher.run()


if __name__ == "__main__":
    main()
