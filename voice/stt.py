#!/usr/bin/env python3
"""
Speech-To-Text (STT) Module for Arcange AI Assistant
Supports OpenAI Whisper API, Local Whisper model, and Google Speech Recognition fallback.
"""

import os
import sys
import json
import argparse
import tempfile
import subprocess
from typing import Optional, Dict, Any

try:
    import speech_recognition as sr
    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    SPEECH_RECOGNITION_AVAILABLE = False

try:
    import whisper
    WHISPER_LOCAL_AVAILABLE = True
except ImportError:
    WHISPER_LOCAL_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


def convert_audio_to_wav(audio_path: str) -> str:
    """
    Converts audio file (mp3, webm, ogg, etc.) to 16kHz mono WAV using ffmpeg if needed.
    """
    ext = os.path.splitext(audio_path)[1].lower()
    if ext == ".wav":
        return audio_path

    temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_wav_path = temp_wav.name
    temp_wav.close()

    try:
        cmd = [
            "ffmpeg", "-y", "-i", audio_path,
            "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
            temp_wav_path
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return temp_wav_path
    except Exception as e:
        sys.stderr.write(f"Warning: ffmpeg audio conversion failed: {e}. Using original file.\n")
        return audio_path


def transcribe_openai_api(audio_path: str, language: str = "en", api_key: Optional[str] = None) -> Optional[str]:
    """
    Transcribe audio using OpenAI Whisper API.
    """
    if not OPENAI_AVAILABLE:
        return None

    key = api_key or os.environ.get("OPENAI_API_KEY")
    if not key:
        return None

    try:
        client = openai.OpenAI(api_key=key)
        wav_path = convert_audio_to_wav(audio_path)
        with open(wav_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language=language if language else None
            )
        if wav_path != audio_path and os.path.exists(wav_path):
            os.remove(wav_path)
        return response.text.strip()
    except Exception as e:
        sys.stderr.write(f"OpenAI Whisper API transcription error: {e}\n")
        return None


def transcribe_whisper_local(audio_path: str, language: str = "en", model_size: str = "base") -> Optional[str]:
    """
    Transcribe audio using local OpenAI Whisper model.
    """
    if not WHISPER_LOCAL_AVAILABLE:
        return None

    try:
        model = whisper.load_model(model_size)
        result = model.transcribe(audio_path, language=language)
        return result.get("text", "").strip()
    except Exception as e:
        sys.stderr.write(f"Local Whisper model error: {e}\n")
        return None


def transcribe_google_sr(audio_path: str, language: str = "en") -> Optional[str]:
    """
    Fallback transcription using Google Speech Recognition via speech_recognition package.
    """
    if not SPEECH_RECOGNITION_AVAILABLE:
        return None

    wav_path = convert_audio_to_wav(audio_path)
    try:
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data, language=language)
            if wav_path != audio_path and os.path.exists(wav_path):
                os.remove(wav_path)
            return text.strip()
    except Exception as e:
        sys.stderr.write(f"Google Speech Recognition error: {e}\n")
        if wav_path != audio_path and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except OSError:
                pass
        return None


def transcribe(
    audio_path: str,
    language: str = "en",
    model_size: str = "base",
    prefer_api: bool = True,
    api_key: Optional[str] = None
) -> str:
    """
    Main transcribe function with multi-level fallbacks.
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    # Step 1: OpenAI Whisper API
    if prefer_api:
        text = transcribe_openai_api(audio_path, language=language, api_key=api_key)
        if text:
            return text

    # Step 2: Local Whisper Model
    text = transcribe_whisper_local(audio_path, language=language, model_size=model_size)
    if text:
        return text

    # Step 3: Google Speech Recognition Fallback
    text = transcribe_google_sr(audio_path, language=language)
    if text:
        return text

    raise RuntimeError("All STT engines (OpenAI API, Local Whisper, Google SR) failed or are unavailable.")


def main():
    parser = argparse.ArgumentParser(description="Arcange AI Voice STT CLI")
    parser.add_argument("--audio-path", required=True, help="Path to input audio file")
    parser.add_argument("--language", default="en", help="Target audio language code (default: en)")
    parser.add_argument("--model-size", default="base", choices=["tiny", "base", "small", "medium", "large"], help="Whisper model size")
    parser.add_argument("--api-key", default=None, help="OpenAI API Key")
    parser.add_argument("--json", action="store_true", help="Output JSON result")

    args = parser.parse_args()

    try:
        text = transcribe(
            audio_path=args.audio_path,
            language=args.language,
            model_size=args.model_size,
            api_key=args.api_key
        )
        if args.json:
            print(json.dumps({"success": True, "text": text, "audio_path": args.audio_path}))
        else:
            print(text)
    except Exception as e:
        if args.json:
            print(json.dumps({"success": False, "error": str(e), "audio_path": args.audio_path}))
        else:
            sys.stderr.write(f"Error: {e}\n")
            sys.exit(1)


if __name__ == "__main__":
    main()
