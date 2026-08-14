import time
from typing import Any, Dict, Optional

import config
from utils import log

try:
    import pyautogui
    pyautogui.FAILSAFE = config.FAILSAFE
    pyautogui.PAUSE = config.ACTION_DELAY
    PYAUTOGUI_AVAILABLE = True
except Exception as e:
    PYAUTOGUI_AVAILABLE = False
    log(f"PyAutoGUI initialization note: {e}", level="WARNING")


class MouseAgent:
    """Agent for controlling mouse movements and actions."""

    def __init__(self) -> None:
        if PYAUTOGUI_AVAILABLE:
            pyautogui.FAILSAFE = config.FAILSAFE
            pyautogui.PAUSE = config.ACTION_DELAY

    def _verify_permission(self, override: bool = False) -> None:
        """Check if mouse permission is granted."""
        if not override and not config.PERMISSIONS.get("mouse", False):
            raise PermissionError("Mouse action blocked: 'mouse' permission is not enabled.")

    def move_mouse(
        self, x: int, y: int, duration: float = 0.0, permission_granted: bool = False
    ) -> Dict[str, Any]:
        """Move mouse cursor to absolute screen coordinates (x, y)."""
        self._verify_permission(permission_granted)
        if not PYAUTOGUI_AVAILABLE:
            raise RuntimeError("PyAutoGUI is not available in current environment.")

        try:
            pyautogui.moveTo(x=x, y=y, duration=duration)
            time.sleep(config.ACTION_DELAY)
            pos = pyautogui.position()
            return {
                "status": "success",
                "action": "move_mouse",
                "target": {"x": x, "y": y},
                "current": {"x": pos.x, "y": pos.y},
            }
        except Exception as e:
            log(f"Error in move_mouse: {e}", level="ERROR")
            raise

    def click(
        self,
        x: Optional[int] = None,
        y: Optional[int] = None,
        button: str = "left",
        clicks: int = 1,
        interval: float = 0.0,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Move mouse to (x, y) if provided and click with specified button."""
        self._verify_permission(permission_granted)
        if not PYAUTOGUI_AVAILABLE:
            raise RuntimeError("PyAutoGUI is not available in current environment.")

        valid_buttons = ["left", "right", "middle"]
        btn = button.lower()
        if btn not in valid_buttons:
            btn = "left"

        try:
            if x is not None and y is not None:
                pyautogui.click(x=x, y=y, button=btn, clicks=clicks, interval=interval)
            else:
                pyautogui.click(button=btn, clicks=clicks, interval=interval)

            time.sleep(config.ACTION_DELAY)
            pos = pyautogui.position()
            return {
                "status": "success",
                "action": "click",
                "button": btn,
                "clicks": clicks,
                "position": {"x": pos.x, "y": pos.y},
            }
        except Exception as e:
            log(f"Error in click: {e}", level="ERROR")
            raise

    def double_click(
        self,
        x: Optional[int] = None,
        y: Optional[int] = None,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Perform a double click at optional coordinates (x, y)."""
        return self.click(x=x, y=y, button="left", clicks=2, interval=0.1, permission_granted=permission_granted)

    def right_click(
        self,
        x: Optional[int] = None,
        y: Optional[int] = None,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Perform a right click at optional coordinates (x, y)."""
        return self.click(x=x, y=y, button="right", clicks=1, permission_granted=permission_granted)

    def scroll(
        self,
        amount: int,
        x: Optional[int] = None,
        y: Optional[int] = None,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Scroll mouse wheel up (positive) or down (negative)."""
        self._verify_permission(permission_granted)
        if not PYAUTOGUI_AVAILABLE:
            raise RuntimeError("PyAutoGUI is not available in current environment.")

        try:
            if x is not None and y is not None:
                pyautogui.scroll(clicks=amount, x=x, y=y)
            else:
                pyautogui.scroll(clicks=amount)

            time.sleep(config.ACTION_DELAY)
            return {
                "status": "success",
                "action": "scroll",
                "amount": amount,
                "target": {"x": x, "y": y} if x is not None and y is not None else None,
            }
        except Exception as e:
            log(f"Error in scroll: {e}", level="ERROR")
            raise

    def get_position(self) -> Dict[str, int]:
        """Return current mouse cursor position."""
        if not PYAUTOGUI_AVAILABLE:
            return {"x": 0, "y": 0}

        try:
            pos = pyautogui.position()
            return {"x": pos.x, "y": pos.y}
        except Exception as e:
            log(f"Error getting position: {e}", level="ERROR")
            return {"x": 0, "y": 0}

    def drag(
        self,
        start_x: int,
        start_y: int,
        end_x: int,
        end_y: int,
        duration: float = 0.5,
        button: str = "left",
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Click and drag from (start_x, start_y) to (end_x, end_y)."""
        self._verify_permission(permission_granted)
        if not PYAUTOGUI_AVAILABLE:
            raise RuntimeError("PyAutoGUI is not available in current environment.")

        try:
            pyautogui.moveTo(start_x, start_y)
            time.sleep(config.ACTION_DELAY)
            pyautogui.dragTo(end_x, end_y, duration=duration, button=button)
            time.sleep(config.ACTION_DELAY)
            pos = pyautogui.position()
            return {
                "status": "success",
                "action": "drag",
                "start": {"x": start_x, "y": start_y},
                "end": {"x": end_x, "y": end_y},
                "current": {"x": pos.x, "y": pos.y},
            }
        except Exception as e:
            log(f"Error in drag: {e}", level="ERROR")
            raise
