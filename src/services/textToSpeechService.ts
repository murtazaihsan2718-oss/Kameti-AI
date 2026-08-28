// Text-To-Speech Service (High-Fidelity Loudspeaker Audio Playback via Audio.Sound with Speech fallback)
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onError?: (err: any) => void;
}

/**
 * Clean markdown and formatting characters so text reads naturally when spoken.
 */
export function cleanMarkdownForSpeech(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // Remove markdown bold, italics, backticks, hashes, and symbols
  cleaned = cleaned.replace(/[*_#`~>]/g, '');

  // Convert bullet points to natural pauses
  cleaned = cleaned.replace(/^[\s•*\-]+/gm, '');

  // Strip code blocks or URLs if any
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');

  // Normalize spaces and linebreaks into clean pauses
  cleaned = cleaned.replace(/\n+/g, '. ');
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
}

/**
 * Detect language: Urdu script / Roman phrasing uses 'ur', English uses 'en'.
 */
export function detectSpeechLanguage(text: string): 'ur' | 'en' {
  const urduCharRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (urduCharRegex.test(text)) {
    return 'ur';
  }
  return 'en';
}

function getCandidateTTSEndpoints(): string[] {
  const endpoints: string[] = [];

  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      endpoints.push(`http://${ip}:3000/api/textToSpeech`);
    }
  }

  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      const found = `http://${match[1]}:3000/api/textToSpeech`;
      if (!endpoints.includes(found)) {
        endpoints.push(found);
      }
    }
  }

  const fallbacks = [
    'http://192.168.1.17:3000/api/textToSpeech',
    'http://192.168.1.8:3000/api/textToSpeech',
    'http://localhost:3000/api/textToSpeech',
    'http://10.0.2.2:3000/api/textToSpeech',
  ];

  for (const fb of fallbacks) {
    if (!endpoints.includes(fb)) {
      endpoints.push(fb);
    }
  }

  return endpoints;
}

class TextToSpeechService {
  private currentSound: Audio.Sound | null = null;
  private activeEndpoint: string | null = null;

  /**
   * Speak a text message aloud through the phone's main media loudspeaker.
   */
  async speakText(text: string, options?: SpeakOptions): Promise<void> {
    try {
      // 1. Stop any active speech/sound first
      await this.stopSpeech();

      const cleaned = cleanMarkdownForSpeech(text);
      if (!cleaned) {
        if (options?.onDone) options.onDone();
        return;
      }

      // 2. Configure audio session to force loud loudspeaker playback
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
          shouldDuckAndroid: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          staysActiveInBackground: false,
        });
      } catch (audioModeErr) {
        console.warn('[TTS] Audio mode setup note:', audioModeErr);
      }

      const lang = detectSpeechLanguage(cleaned);
      console.log(`[TTS] Requesting audio speech (${cleaned.length} chars, lang: ${lang})...`);

      // 3. Try fetching natural human voice audio from backend for full loudspeaker playback
      let audioBase64: string | null = null;
      const candidates = getCandidateTTSEndpoints();
      const endpointsToTry = this.activeEndpoint
        ? [this.activeEndpoint, ...candidates.filter(e => e !== this.activeEndpoint)]
        : candidates;

      for (const endpoint of endpointsToTry) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleaned, language: lang }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.audioBase64) {
              audioBase64 = data.audioBase64;
              this.activeEndpoint = endpoint;
              break;
            }
          }
        } catch (fetchErr) {
          // Try next endpoint candidate
        }
      }

      // 4. Play through Audio.Sound (media loudspeaker)
      if (audioBase64) {
        const fileUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
          encoding: 'base64',
        });

        console.log(`[TTS] Playing audio via Audio.Sound loudspeaker at: ${fileUri}`);
        const { sound } = await Audio.Sound.createAsync(
          { uri: fileUri },
          { shouldPlay: true, volume: 1.0 },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              console.log('[TTS] Sound playback finished.');
              sound.unloadAsync().catch(() => {});
              // Delete temporary audio file
              FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
              if (this.currentSound === sound) {
                this.currentSound = null;
              }
              if (options?.onDone) options.onDone();
            }
          }
        );

        this.currentSound = sound;
        await sound.setVolumeAsync(1.0);
        await sound.playAsync();
        return;
      }

      // 5. Fallback: On-device Speech synthesizer
      console.log('[TTS] Using on-device speech fallback...');
      Speech.speak(cleaned, {
        language: lang === 'ur' ? 'ur-PK' : 'en-US',
        rate: options?.rate ?? 0.95,
        pitch: options?.pitch ?? 1.0,
        volume: 1.0,
        useApplicationAudioSession: false,
        onDone: () => {
          if (options?.onDone) options.onDone();
        },
        onError: (err) => {
          console.warn('[TTS] Speech fallback error:', err);
          if (options?.onError) options.onError(err);
        },
        onStopped: () => {
          if (options?.onDone) options.onDone();
        },
      });
    } catch (err) {
      console.error('[TTS] Failed to execute speech:', err);
      if (options?.onError) options.onError(err);
    }
  }

  /**
   * Stop any active speech or sound playback immediately.
   */
  async stopSpeech(): Promise<void> {
    try {
      if (this.currentSound) {
        const sound = this.currentSound;
        this.currentSound = null;
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
      }
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop().catch(() => {});
      }
    } catch (err) {
      // Ignore
    }
  }

  /**
   * Check if speech or sound is currently playing.
   */
  async isSpeaking(): Promise<boolean> {
    try {
      if (this.currentSound) {
        const status = await this.currentSound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          return true;
        }
      }
      return await Speech.isSpeakingAsync();
    } catch {
      return false;
    }
  }
}

export const textToSpeechService = new TextToSpeechService();
