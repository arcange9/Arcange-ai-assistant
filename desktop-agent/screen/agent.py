import io
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import config
from utils import log, to_base64

try:
    from PIL import Image, ImageGrab
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


class ScreenAgent:
    """Agent for screen capturing, OCR, template matching, and screen state inspection."""

    def __init__(self) -> None:
        pass

    def _verify_permission(self, permission_granted: bool = False) -> None:
        """Verify screen capture permission."""
        if not permission_granted and not config.PERMISSIONS.get("screen", False):
            raise PermissionError(
                "Screen operation blocked: explicit 'screen' permission is required."
            )

    def get_screen_size(self) -> Dict[str, int]:
        """Return primary screen width and height."""
        if PYAUTOGUI_AVAILABLE:
            try:
                size = pyautogui.size()
                return {"width": size.width, "height": size.height}
            except Exception:
                pass

        if PIL_AVAILABLE:
            try:
                img = ImageGrab.grab()
                return {"width": img.width, "height": img.height}
            except Exception:
                pass

        return {"width": 1920, "height": 1080}

    def take_screenshot(
        self,
        region: Optional[Union[Tuple[int, int, int, int], List[int]]] = None,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """
        Capture entire screen or a specific region [x, y, width, height].
        Returns base64-encoded PNG string.
        """
        self._verify_permission(permission_granted)

        img = None
        if PYAUTOGUI_AVAILABLE:
            try:
                # region in pyautogui is (left, top, width, height)
                if region and len(region) == 4:
                    img = pyautogui.screenshot(region=tuple(region))
                else:
                    img = pyautogui.screenshot()
            except Exception as e:
                log(f"PyAutoGUI screenshot fallback: {e}", level="WARNING")

        if img is None and PIL_AVAILABLE:
            try:
                if region and len(region) == 4:
                    x, y, w, h = region
                    bbox = (x, y, x + w, y + h)
                    img = ImageGrab.grab(bbox=bbox)
                else:
                    img = ImageGrab.grab()
            except Exception as e:
                log(f"PIL ImageGrab error: {e}", level="ERROR")
                raise RuntimeError(f"Failed to capture screenshot: {e}")

        if img is None:
            raise RuntimeError("Screen capture libraries (PyAutoGUI / PIL) are unavailable.")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        png_bytes = buffer.getvalue()
        base64_str = to_base64(png_bytes)

        return {
            "status": "success",
            "width": img.width,
            "height": img.height,
            "format": "png",
            "image_base64": base64_str,
        }

    def get_pixel_color(
        self,
        x: int,
        y: int,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """Return RGB color dictionary for screen coordinate (x, y)."""
        self._verify_permission(permission_granted)

        if PYAUTOGUI_AVAILABLE:
            try:
                rgb = pyautogui.pixel(x, y)
                r, g, b = rgb[0], rgb[1], rgb[2]
                hex_val = f"#{r:02x}{g:02x}{b:02x}"
                return {"r": r, "g": g, "b": b, "hex": hex_val}
            except Exception as e:
                log(f"PyAutoGUI pixel reading error: {e}", level="WARNING")

        if PIL_AVAILABLE:
            try:
                bbox = (x, y, x + 1, y + 1)
                img = ImageGrab.grab(bbox=bbox)
                r, g, b = img.getpixel((0, 0))[:3]
                hex_val = f"#{r:02x}{g:02x}{b:02x}"
                return {"r": r, "g": g, "b": b, "hex": hex_val}
            except Exception as e:
                raise RuntimeError(f"Failed to read pixel color at ({x}, {y}): {e}")

        raise RuntimeError("Pixel color extraction requires PyAutoGUI or PIL.")

    def find_text(
        self,
        text: str,
        permission_granted: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Search for text on screen using OCR (pytesseract).
        Returns list of bounding boxes and confidence scores.
        """
        self._verify_permission(permission_granted)

        if not PYTESSERACT_AVAILABLE:
            raise RuntimeError("pytesseract library is not installed.")

        # Capture screenshot for OCR
        shot_res = self.take_screenshot(permission_granted=True)
        img_bytes = io.BytesIO(to_base64(shot_res["image_base64"]).encode('utf-8'))
        # decode base64
        import base64
        raw_bytes = base64.b64decode(shot_res["image_base64"])
        img = Image.open(io.BytesIO(raw_bytes))

        try:
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        except Exception as e:
            log(f"Tesseract OCR error: {e}", level="ERROR")
            raise RuntimeError(f"Tesseract OCR failed. Ensure Tesseract-OCR is installed: {e}")

        matches: List[Dict[str, Any]] = []
        target_lower = text.lower().strip()

        num_boxes = len(data.get("text", []))
        for i in range(num_boxes):
            word = str(data["text"][i]).strip()
            conf = int(data["conf"][i]) if "conf" in data and data["conf"][i] != -1 else 0
            if word and (target_lower in word.lower() or word.lower() in target_lower):
                matches.append({
                    "text": word,
                    "x": data["left"][i],
                    "y": data["top"][i],
                    "width": data["width"][i],
                    "height": data["height"][i],
                    "center_x": data["left"][i] + (data["width"][i] // 2),
                    "center_y": data["top"][i] + (data["height"][i] // 2),
                    "confidence": conf,
                })

        return matches

    def find_image(
        self,
        template_path: str,
        threshold: float = 0.8,
        permission_granted: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Locate template image on screen using OpenCV template matching.
        Returns coordinates and match confidence or None if not found.
        """
        self._verify_permission(permission_granted)

        if not CV2_AVAILABLE:
            raise RuntimeError("opencv-python (cv2) is not installed.")

        t_path = Path(template_path).expanduser().resolve()
        if not t_path.exists():
            raise FileNotFoundError(f"Template image not found: {template_path}")

        template = cv2.imread(str(t_path), cv2.IMREAD_COLOR)
        if template is None:
            raise ValueError(f"Failed to load template image at {template_path}")

        t_h, t_w = template.shape[:2]

        # Capture current screen
        shot_res = self.take_screenshot(permission_granted=True)
        import base64
        raw_bytes = base64.b64decode(shot_res["image_base64"])
        pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        screen_np = np.array(pil_img)
        screen_bgr = cv2.cvtColor(screen_np, cv2.COLOR_RGB2BGR)

        res = cv2.matchTemplate(screen_bgr, template, cv2.TM_CCOEFF_NORMED)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)

        if max_val >= threshold:
            top_left_x, top_left_y = max_loc
            center_x = top_left_x + (t_w // 2)
            center_y = top_left_y + (t_h // 2)
            return {
                "x": center_x,
                "y": center_y,
                "top_left": {"x": top_left_x, "y": top_left_y},
                "width": t_w,
                "height": t_h,
                "confidence": float(max_val),
            }

        return None

    def find_ui_element(
        self,
        description: str,
        permission_granted: bool = False,
    ) -> Dict[str, Any]:
        """
        Find UI element by description using either template image path or OCR text search.
        """
        self._verify_permission(permission_granted)

        # Check if description is an existing file path
        desc_path = Path(description)
        if desc_path.exists() and desc_path.is_file():
            img_match = self.find_image(description, permission_granted=True)
            if img_match:
                return {
                    "status": "found",
                    "method": "template_matching",
                    "coordinates": img_match,
                }
            return {"status": "not_found", "description": description}

        # Otherwise try text OCR match
        text_matches = self.find_text(description, permission_granted=True)
        if text_matches:
            top_match = sorted(text_matches, key=lambda m: m["confidence"], reverse=True)[0]
            return {
                "status": "found",
                "method": "ocr_text",
                "coordinates": top_match,
                "all_matches": text_matches,
            }

        return {"status": "not_found", "description": description}
