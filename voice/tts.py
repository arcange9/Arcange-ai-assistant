#!/usr/bin/env python3
"""
Text-To-Speech (TTS) Module for Arcange AI Assistant
Supports Microsoft edge-tts (online, high quality) with pyttsx3 fallback (offline).
"""

import os
import sys
import json
import asyncio
import argparse
import tempfile
import subprocess
from typing import Optional, List, Dict, Any

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False

try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False


DEFAULT_EDGE_VOICE = "en-US-AriaNeural"


async def _edge_tts_save(text: str, filepath: str, voice: str = DEFAULT_EDGE_VOICE, rate: int = 200) -> bool:
    """
    Synthesize audio using edge-tts asynchronously and save to file.
    """
    if not EDGE_TTS_AVAILABLE:
        return False

    try:
        # Rate formatting for edge-tts (e.g. +0%, +20%)
        rate_diff = rate - 200
        rate_str = f"{'+' if rate_diff >= 0 else ''}{int((rate_diff / 200) * 100)}%"
        
        communicate = edge_tts.Communicate(text, voice, rate=rate_str)
        await communicate.save(filepath)
        return True
    except Exception as e:
        sys.stderr.write(f"Edge TTS error: {e}\n")
        return False


def save_to_file(text: str, filepath: str, voice: str = "default", rate: int = 200) -> str:
    """
    Save synthesized speech audio to a file.
    Uses edge-tts first, with fallback to pyttsx3.
    """
    target_voice = DEFAULT_EDGE_VOICE if voice == "default" else voice

    # Try edge-tts
    if EDGE_TTS_AVAILABLE:
        success = asyncio.run(_edge_tts_save(text, filepath, voice=target_voice, rate=rate))
        if success and os.path.exists(filepath) and os.path.getsize(filepath) > 0:
            return filepath

    # Fallback: pyttsx3
    if PYTTSX3_AVAILABLE:
        try:
            engine = pyttsx3.init()
            engine.setProperty("rate", rate)
            if voice != "default":
                engine.setProperty("voice", voice)
            engine.save_to_file(text, filepath)
            engine.runAndWait()
            if os.path.exists(filepath):
                return filepath
        except Exception as e:
            sys.stderr.write(f"pyttsx3 save_to_file error: {e}\n")

    raise RuntimeError("Failed to generate TTS audio with both edge-tts and pyttsx3.")


def play_audio_file(filepath: str) -> bool:
    """
    Cross-platform audio file player.
    """
    try:
        if sys.platform == "darwin":
            subprocess.run(["afplay", filepath], check=True)
        elif sys.platform.startsWith if hasattr(sys.platform, 'startsWith') else sys.platform.startswith("win"):
            os.system(f'start "" "{filepath}"')
        else:
            subprocess.run(["aplay", filepath], check=True)
        return True
    except Exception as e:
        sys.stderr.write(f"Audio playback error: {e}\n")
        return False


def speak(text: str, voice: str = "default", rate: int = 200, volume: float = 0.9) -> Optional[str]:
    """
    Synthesize and speak text immediately or save to temp file and play.
    """
    temp_file = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    temp_path = temp_file.name
    temp_file.close()

    try:
        saved_path = save_to_file(text, temp_path, voice=voice, rate=rate)
        play_audio_file(saved_path)
        return saved_path
    except Exception as e:
        sys.stderr.write(f"Speak error: {e}\n")
        # Try offline pyttsx3 direct speak as ultimate fallback
        if PYTTSX3_AVAILABLE:
            try:
                engine = pyttsx3.init()
                engine.setProperty("rate", rate)
                engine.setProperty("volume", volume)
                engine.say(text)
                engine.runAndWait()
                return None
            except Exception as pyerr:
                sys.stderr.write(f"pyttsx3 direct speak error: {pyerr}\n")
        return None


def get_available_voices() -> List[Dict[str, Any]]:
    """
    Return list of available voices from edge-tts and pyttsx3.
    """
    voices_list: List[Dict[str, Any]] = []

    # Edge TTS voices
    if EDGE_TTS_AVAILABLE:
        try:
            voices = asyncio.run(edge_tts.list_voices())
            for v in voices:
                voices_list.append({
                    "id": v["Name"],
                    "name": v["FriendlyName"],
                    "gender": v["Gender"],
                    "locale": v["Locale"],
                    "provider": "edge-tts"
                })
        except Exception as e:
            sys.stderr.write(f"Error fetching edge-tts voices: {e}\n")

    # Pyttsx3 voices
    if PYTTSX3_AVAILABLE:
        try:
            engine = pyttsx3.init()
            for v in engine.getProperty("voices"):
                voices_list.append({
                    "id": v.id,
                    "name": v.name,
                    "gender": getattr(v, "gender", "unknown"),
                    "locale": getattr(v, "languages", ["unknown"]),
                    "provider": "pyttsx3"
                })
        except Exception as e:
            sys.stderr.write(f"Error fetching pyttsx3 voices: {e}\n")

    return voices_list


def main():
    parser = argparse.ArgumentParser(description="Arcange AI Voice TTS CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Speak command
    speak_parser = subparsers.add_parser("speak")
    speak_parser.add_argument("text", help="Text to speak")
    speak_parser.add_argument("--voice", default="default", help="Voice identifier")
    speak_parser.add_argument("--rate", type=int, default=200, help="Speech rate (wpm)")
    speak_parser.add_argument("--volume", type=float, default=0.9, help="Speech volume (0.0 to 1.0)")

    # Save command
    save_parser = subparsers.add_parser("save")
    save_parser.add_argument("text", help="Text to synthesize")
    save_parser.add_argument("filepath", help="Target output filepath")
    save_parser.add_argument("--voice", default="default", help="Voice identifier")
    save_parser.add_argument("--rate", type=int, default=200, help="Speech rate")

    # Voices command
    subparsers.add_parser("voices")

    args = parser.parse_args()

    if args.command == "speak":
        speak(args.text, voice=args.voice, rate=args.rate, volume=args.volume)
    elif args.command == "save":
        res = save_to_file(args.text, args.filepath, voice=args.voice, rate=args.rate)
        print(json.dumps({"success": True, "filepath": res}))
    elif args.command == "voices":
        voices = get_available_voices()
        print(json.dumps(voices, indent=2))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
