// Speech-To-Text Client Service (Sends local recorded audio to secure backend for transcription)
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

export interface TranscriptionResponse {
  success: boolean;
  text?: string;
  error?: string;
}

const TRANSCRIBE_TIMEOUT_MS = 25000;

/**
 * Robust helper to read a local audio URI into Base64 format across all Expo/React Native platforms.
 */
async function readAudioAsBase64(audioUri: string): Promise<string> {
  // 1. Primary: expo-file-system/legacy readAsStringAsync
  try {
    const base64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (base64 && base64.length > 0) {
      return base64;
    }
  } catch (fsErr) {
    console.warn('[STT] FileSystem legacy read note, trying fallback:', fsErr);
  }

  // 2. Universal Fallback: fetch blob + FileReader
  try {
    const response = await fetch(audioUri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          const cleanBase64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(cleanBase64);
        } else {
          reject(new Error('FileReader produced empty result'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (blobErr) {
    console.error('[STT] Fallback blob read failed:', blobErr);
    throw blobErr;
  }
}

/**
 * Dynamically resolves candidate backend endpoints for audio transcription.
 */
function getCandidateTranscriptionEndpoints(): string[] {
  const endpoints: string[] = [];

  // 1. Production 24/7 Cloud Backend (Highest Priority)
  endpoints.push('https://kameti-ai-ten.vercel.app/api/transcribeAudio');

  // 2. Dynamic host resolution from Expo Go debugger host
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      endpoints.push(`http://${ip}:3000/api/transcribeAudio`);
    }
  }

  // 3. Dynamic host resolution from React Native bundle scriptURL
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      const found = `http://${match[1]}:3000/api/transcribeAudio`;
      if (!endpoints.includes(found)) {
        endpoints.push(found);
      }
    }
  }

  // 4. Static candidate fallbacks
  const fallbacks = [
    'http://192.168.18.144:3000/api/transcribeAudio',
    'http://localhost:3000/api/transcribeAudio',
    'http://10.0.2.2:3000/api/transcribeAudio',
  ];

  for (const fb of fallbacks) {
    if (!endpoints.includes(fb)) {
      endpoints.push(fb);
    }
  }

  return endpoints;
}

function detectAudioMimeType(uri: string): string {
  const lower = (uri || '').toLowerCase();
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.caf')) return 'audio/x-caf';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.3gp')) return 'audio/3gpp';
  return 'audio/mp4'; // Default for iOS (.m4a) and Android (.m4a/.mp4)
}

class SpeechToTextService {
  private activeEndpoint: string | null = null;

  /**
   * Transcribe a local recorded audio file by sending base64 audio to the secure backend.
   * Supports English, Urdu script, and Roman Urdu speech.
   */
  async transcribeAudio(audioUri: string): Promise<TranscriptionResponse> {
    if (!audioUri) {
      return { success: false, error: 'No audio URI provided for transcription.' };
    }

    try {
      console.log(`[STT] Reading audio file at: ${audioUri}`);
      const mimeType = detectAudioMimeType(audioUri);
      const base64Data = await readAudioAsBase64(audioUri);

      if (!base64Data || base64Data.length < 10) {
        return { success: false, error: 'Audio recording file was empty.' };
      }

      console.log(`[STT] Prepared audio payload (~${Math.round(base64Data.length * 0.75 / 1024)} KB, ${mimeType}).`);

      const payload = {
        audioBase64: base64Data,
        mimeType,
      };

      const candidates = getCandidateTranscriptionEndpoints();
      const endpointsToTry = this.activeEndpoint
        ? [this.activeEndpoint, ...candidates.filter(e => e !== this.activeEndpoint)]
        : candidates;

      for (const endpoint of endpointsToTry) {
        try {
          console.log(`[STT] Dispatching transcription request to: ${endpoint}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.warn(`[STT] Request timed out for endpoint: ${endpoint}`);
            controller.abort();
          }, TRANSCRIBE_TIMEOUT_MS);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data && data.success) {
              const text = (data.text || '').trim();
              console.log(`[STT] Transcription succeeded (${text.length} chars): "${text}"`);
              this.activeEndpoint = endpoint; // Cache confirmed working endpoint
              return {
                success: true,
                text,
              };
            } else if (data && data.error) {
              console.warn(`[STT] Backend returned transcription error: ${data.error}`);
              return {
                success: false,
                error: data.error,
              };
            }
          } else {
            console.warn(`[STT] Endpoint HTTP ${response.status} from ${endpoint}`);
          }
        } catch (err: any) {
          console.warn(`[STT] Endpoint connection failed (${endpoint}): ${err.message}`);
        }
      }

      return {
        success: false,
        error: "Couldn't connect to transcription service. Please make sure the local server is running.",
      };
    } catch (err: any) {
      console.error('[STT] Failed to read audio or transcribe:', err);
      return {
        success: false,
        error: err.message || 'Audio transcription failed.',
      };
    }
  }
}

export const speechToTextService = new SpeechToTextService();
