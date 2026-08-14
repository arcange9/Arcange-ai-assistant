import { useState, useRef, useCallback, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const { voice } = useSettingsStore();
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const startRecording = useCallback((onFinalTranscript?: (text: string) => void) => {
    setTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
          if (event.results[0].isFinal && onFinalTranscript) {
            onFinalTranscript(currentTranscript);
          }
        };
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start recording:', err);
      }
    } else {
      // Fallback mock voice recording
      setIsRecording(true);
      setTimeout(() => {
        const mockText = 'Analyze current workspace project status and summary';
        setTranscript(mockText);
        setIsRecording(false);
        if (onFinalTranscript) onFinalTranscript(mockText);
      }, 3000);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, [isRecording]);

  const speakText = useCallback(
    (text: string) => {
      if (!voice.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel(); // Stop any ongoing speech

      const cleanText = text.replace(/[*_#`~]/g, ''); // strip markdown markup
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.pitch = voice.pitch;
      utterance.rate = voice.rate;

      const voices = window.speechSynthesis.getVoices();
      if (voice.voiceId !== 'default') {
        const found = voices.find((v) => v.name === voice.voiceId);
        if (found) utterance.voice = found;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [voice]
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isRecording,
    transcript,
    isSpeaking,
    startRecording,
    stopRecording,
    speakText,
    stopSpeaking
  };
}
