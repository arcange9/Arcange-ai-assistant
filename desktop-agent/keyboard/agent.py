import time
from typing import Any, Dict, List, Union

import config
from utils import log

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except Exception as e:
    PYAUTOGUI_AVAILABLE = False
    log(f"PyAutoGUI initialization note: {e}", level="WARNING")


class KeyboardAgent:
    """Agent for keyboard interaction and shortcuts execution."""

    def __init__(self) -> None:
        pass

    def _verify_permission(self, override: bool = False) -> None:
        """Check if keyboard permission is granted."""
        if not override and not config.PERMISSIONS.get("keyboard", False):
            raise PermissionError("Keyboard action blocked: 'keyboard' permission is not enabled.")

    def type_text(
        self,
        text: str,
        interval: float = 0.0,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Type a string character by character with configurable interval."""
        self._verify_permission(permission_granted)
        if not PYAUTOGUI_AVAILABLE:
            raise RuntimeError("PyAutoGUI is not available in current environment.")

        try:
            typing_interval = interval if interval > 0.0 else config.TYPING_INTERVAL
            pyautogui.write(text, interval=typing_interval)
            time.sleep(config.ACTION_DELAY)
            return {
                "status": "success",
                "action": "type_text",
                "length": len(text),
            }
        except Exception as e:
            log(f"Error in type_text: {e}", level="ERROR")
            raise

    def press_key(
        self,
        key: str,
        presses: int = 1,
        interval: float = 0.0,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Press a single key one or multiple times."""
        self._verify_permission(permission_granted)
        if not PYAUTOGUI_AVAILABLE:
            raise RuntimeError("PyAutoGUI is not available in current environment.")

        try:
            formatted_key = key.lower().strip()
            pyautogui.press(formatted_key, presses=presses, interval=interval)
            time.sleep(config.ACTION_DELAY)
            return {
                "status": "success",
                "action": "press_key",
                "key": formatted_key,
                "presses": presses,
            }
        except Exception as e:
            log(f"Error in press_key: {e}", level="ERROR")
            raise

    def hotkey(
        self,
        *keys: str,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Press multiple keys simultaneously (e.g. ('ctrl', 'c'))."""
        self._verify_permission(permission_granted)
        if not PYAUTOGUI_AVAILABLE:
            raise RuntimeError("PyAutoGUI is not available in current environment.")

        try:
            # Handle if keys were passed as a list inside first argument
            key_list: List[str] = []
            for k in keys:
                if isinstance(k, (list, tuple)):
                    key_list.extend([str(item).lower().strip() for item in k])
                else:
                    key_list.append(str(k).lower().strip())

            if not key_list:
                raise ValueError("No keys provided for hotkey execution.")

            pyautogui.hotkey(*key_list)
            time.sleep(config.ACTION_DELAY)
            return {
                "status": "success",
                "action": "hotkey",
                "keys": key_list,
            }
        except Exception as e:
            log(f"Error in hotkey: {e}", level="ERROR")
            raise

    def key_down(
        self,
        key: str,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Hold down a specific key."""
        self._verify_permission(permission_granted)
        if not PYAUTOGUI_AVAILABLE:
            raise RuntimeError("PyAutoGUI is not available in current environment.")

        try:
            formatted_key = key.lower().strip()
            pyautogui.keyDown(formatted_key)
            return {
                "status": "success",
                "action": "key_down",
                "key": formatted_key,
            }
        except Exception as e:
            log(f"Error in key_down: {e}", level="ERROR")
            raise

    def key_up(
        self,
        key: str,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Release a held key."""
        self._verify_permission(permission_granted)
        if not PYAUTOGUI_AVAILABLE:
            raise RuntimeError("PyAutoGUI is not available in current environment.")

        try:
            formatted_key = key.lower().strip()
            pyautogui.keyUp(formatted_key)
            return {
                "status": "success",
                "action": "key_up",
                "key": formatted_key,
            }
        except Exception as e:
            log(f"Error in key_up: {e}", level="ERROR")
            raise
