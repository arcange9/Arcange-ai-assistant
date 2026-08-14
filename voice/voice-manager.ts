import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
}

export interface VoiceOptions {
  pythonPath?: string;
  sttScriptPath?: string;
  ttsScriptPath?: string;
  language?: string;
  voice?: string;
  rate?: number;
}

export type TranscriptionCallback = (text: string) => void;
export type SpeechStartCallback = () => void;
export type SpeechEndCallback = () => void;
export type ErrorCallback = (error: Error) => void;
export type StateChangeCallback = (state: VoiceState) => void;

/**
 * ARCHITECTURE ONLY: Wake Word Detector Interface
 * Demonstrates how wake word engines (such as Porcupine, Snowboy, or PocketSphinx)
 * integrate with the Voice Manager pipeline.
 */
export interface WakeWordDetector {
  /** Initialize wake word detection model */
  init(keywords: string[]): Promise<void>;
  /** Start listening for wake words (e.g. "Hey Arcange") */
  start(): Promise<void>;
  /** Stop wake word listener */
  stop(): Promise<void>;
  /** Callback fired when wake word is detected */
  onWakeWordDetected(callback: (keyword: string) => void): void;
}

export class VoiceManager extends EventEmitter {
  private state: VoiceState = {
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
  };

  private options: Required<VoiceOptions>;
  private activeTTSProcess: ChildProcess | null = null;
  private activeSTTProcess: ChildProcess | null = null;

  constructor(options: VoiceOptions = {}) {
    super();
    const basePath = path.resolve(__dirname);
    this.options = {
      pythonPath: options.pythonPath || (process.platform === 'win32' ? 'python' : 'python3'),
      sttScriptPath: options.sttScriptPath || path.join(basePath, 'stt.py'),
      ttsScriptPath: options.ttsScriptPath || path.join(basePath, 'tts.py'),
      language: options.language || 'en',
      voice: options.voice || 'default',
      rate: options.rate || 200,
    };
  }

  public getState(): VoiceState {
    return { ...this.state };
  }

  private updateState(partial: Partial<VoiceState>): void {
    this.state = { ...this.state, ...partial };
    this.emit('stateChange', this.getState());
  }

  /**
   * Register event handlers
   */
  public onTranscription(cb: TranscriptionCallback): this {
    return this.on('transcription', cb);
  }

  public onSpeechStart(cb: SpeechStartCallback): this {
    return this.on('speechStart', cb);
  }

  public onSpeechEnd(cb: SpeechEndCallback): this {
    return this.on('speechEnd', cb);
  }

  public onError(cb: ErrorCallback): this {
    return this.on('error', cb);
  }

  public onStateChange(cb: StateChangeCallback): this {
    return this.on('stateChange', cb);
  }

  /**
   * Transcribe an existing audio file using stt.py
   */
  public async transcribeAudioFile(audioFilePath: string, language?: string): Promise<string> {
    this.updateState({ isProcessing: true });

    return new Promise((resolve, reject) => {
      const lang = language || this.options.language;
      const args = [
        this.options.sttScriptPath,
        '--audio-path',
        audioFilePath,
        '--language',
        lang,
        '--json',
      ];

      this.activeSTTProcess = spawn(this.options.pythonPath, args);
      let outputData = '';
      let errorData = '';

      this.activeSTTProcess.stdout?.on('data', (data) => {
        outputData += data.toString();
      });

      this.activeSTTProcess.stderr?.on('data', (data) => {
        errorData += data.toString();
      });

      this.activeSTTProcess.on('close', (code) => {
        this.activeSTTProcess = null;
        this.updateState({ isProcessing: false });

        if (code !== 0) {
          const err = new Error(`STT process exited with code ${code}: ${errorData}`);
          this.emit('error', err);
          return reject(err);
        }

        try {
          const parsed = JSON.parse(outputData.trim());
          if (parsed.success) {
            const text = parsed.text;
            this.emit('transcription', text);
            return resolve(text);
          } else {
            const err = new Error(parsed.error || 'STT transcription failed');
            this.emit('error', err);
            return reject(err);
          }
        } catch (e) {
          const text = outputData.trim();
          this.emit('transcription', text);
          return resolve(text);
        }
      });
    });
  }

  /**
   * Record audio from mic or file and perform STT
   */
  public async startListening(options?: { audioFilePath?: string; language?: string }): Promise<string> {
    if (this.state.isListening) {
      throw new Error('VoiceManager is already listening');
    }

    this.updateState({ isListening: true });

    try {
      let audioPath = options?.audioFilePath;

      if (!audioPath) {
        // Create temporary audio path for recording input
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        audioPath = path.join(tempDir, `recording_${Date.now()}.wav`);
      }

      const text = await this.transcribeAudioFile(audioPath, options?.language);
      this.updateState({ isListening: false });
      return text;
    } catch (err: any) {
      this.updateState({ isListening: false });
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Stop listening session
   */
  public stopListening(): void {
    if (this.activeSTTProcess) {
      this.activeSTTProcess.kill();
      this.activeSTTProcess = null;
    }
    if (this.state.isListening) {
      this.updateState({ isListening: false, isProcessing: false });
    }
  }

  /**
   * Convert text to speech and play audio
   */
  public async speak(text: string, options?: { voice?: string; rate?: number }): Promise<void> {
    this.stopSpeaking();

    this.updateState({ isSpeaking: true });
    this.emit('speechStart');

    return new Promise((resolve, reject) => {
      const voice = options?.voice || this.options.voice;
      const rate = options?.rate || this.options.rate;

      const args = [
        this.options.ttsScriptPath,
        'speak',
        text,
        '--voice',
        voice,
        '--rate',
        String(rate),
      ];

      this.activeTTSProcess = spawn(this.options.pythonPath, args);
      let errorData = '';

      this.activeTTSProcess.stderr?.on('data', (data) => {
        errorData += data.toString();
      });

      this.activeTTSProcess.on('close', (code) => {
        this.activeTTSProcess = null;
        this.updateState({ isSpeaking: false });
        this.emit('speechEnd');

        if (code !== 0 && code !== null) {
          const err = new Error(`TTS process exited with code ${code}: ${errorData}`);
          this.emit('error', err);
          return reject(err);
        }

        resolve();
      });
    });
  }

  /**
   * Stop speaking and kill TTS process
   */
  public stopSpeaking(): void {
    if (this.activeTTSProcess) {
      this.activeTTSProcess.kill();
      this.activeTTSProcess = null;
    }
    if (this.state.isSpeaking) {
      this.updateState({ isSpeaking: false });
      this.emit('speechEnd');
    }
  }
}

export default VoiceManager;
