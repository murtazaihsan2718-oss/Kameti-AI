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

const ROMAN_TO_URDU_WORDS: Record<string, string> = {
  'aap': 'آپ', 'ap': 'آپ', 'ki': 'کی', 'kee': 'کی', 'ke': 'کے', 'kay': 'کے', 'ka': 'کا', 'ko': 'کو',
  'hai': 'ہے', 'hain': 'ہیں', 'ho': 'ہو', 'hoga': 'ہوگا', 'hogi': 'ہوگی', 'honge': 'ہوں گے', 'hongay': 'ہوں گے',
  'hoon': 'ہوں', 'hun': 'ہوں', 'hum': 'ہم', 'humein': 'ہمیں', 'main': 'میں', 'mei': 'میں', 'mein': 'میں',
  'meri': 'میری', 'mera': 'میرا', 'mere': 'میرے', 'mujhe': 'مجھے', 'mujhey': 'مجھے',
  'bari': 'باری', 'baari': 'باری', 'paise': 'پیسے', 'paisa': 'پیسے', 'raqam': 'رقم',
  'kitne': 'کتنے', 'kitna': 'کتنا', 'kitnay': 'کتنے', 'kitni': 'کتنی', 'kab': 'کب', 'kahan': 'کہاں',
  'kon': 'کون', 'kaun': 'کون', 'kis': 'کس', 'kisi': 'کسی', 'kiski': 'کس کی',
  'kya': 'کیا', 'kyun': 'کیوں', 'kyu': 'کیوں', 'kaise': 'کیسے', 'kesy': 'کیسے', 'kese': 'کیسے',
  'kist': 'قسط', 'kisht': 'قسط', 'kameti': 'کمیٹی', 'kamaiti': 'کمیٹی', 'committee': 'کمیٹی', 'committees': 'کمیٹیاں',
  'beesi': 'بیسی', 'bisi': 'بیسی', 'bheje': 'بھیجے', 'bhejo': 'بھیجیں', 'jama': 'جمع',
  'nahi': 'نہیں', 'nai': 'نہیں', 'nhi': 'نہیں', 'karega': 'کرے گا', 'karo': 'کرو', 'karna': 'کرنا',
  'karun': 'کروں', 'kar': 'کر', 'karte': 'کرتے', 'batao': 'بتائیں', 'bataiye': 'بتائیں', 'bataen': 'بتائیں',
  'chahiye': 'چاہیے', 'milenge': 'ملیں گے', 'milega': 'ملے گا', 'milna': 'ملنا', 'lena': 'لینا', 'dena': 'دینا', 'dene': 'دینے',
  'tamam': 'تمام', 'sab': 'سب', 'payments': 'ادائیگیاں', 'payment': 'ادائیگی', 'complete': 'مکمل',
  'pending': 'باقی', 'is': 'اس', 'mahine': 'مہینے', 'mahina': 'مہینہ', 'koi': 'کوئی', 'ada': 'ادا',
  'adaigi': 'ادائیگی', 'kul': 'کل', 'payout': 'رقم', 'members': 'ممبران', 'member': 'ممبر',
  'current': 'موجودہ', 'schedule': 'شیڈول', 'intezar': 'انتظار', 'shuru': 'شروع', 'start': 'شروع',
  'active': 'فعال', 'enrolled': 'شامل', 'shamil': 'شامل', 'tareeqa': 'طریقہ', 'tareeqakar': 'طریقہ کار',
  'savings': 'بچت', 'bachat': 'بچت', 'bila': 'بغیر', 'sood': 'سود', 'aasan': 'آسان', 'zariya': 'ذریعہ',
  'pool': 'پول', 'total': 'کل', 'fix': 'مقررہ', 'qura-andazi': 'قرعہ اندازی', 'draw': 'قرعہ اندازی',
  'mutabiq': 'مطابق', 'sari': 'ساری', 'milti': 'ملتی', 'madad': 'مدد', 'sakta': 'سکتا', 'sakti': 'سکتی',
  'chahte': 'چاہتے', 'janna': 'جاننا', 'yeh': 'یہ', 'woh': 'وہ', 'aur': 'اور', 'par': 'پر', 'pe': 'پر',
  'se': 'سے', 'tak': 'تک', 'bhi': 'بھی', 'aik': 'ایک', 'ek': 'ایک', 'do': 'دو', 'teen': 'تین',
  'char': 'چار', 'paanch': 'پانچ', 'status': 'اسٹیٹس', 'details': 'تفصیلات', 'date': 'تاریخ',
  'dates': 'تاریخیں', 'roze': 'دن', 'din': 'دن', 'salam': 'اسلام علیکم', 'assalam': 'اسلام علیکم',
  'shukriya': 'شکریہ', 'thanks': 'شکریہ', 'cycle': 'سائیکل', 'cycles': 'سائیکلز', 'code': 'کوڈ',
  'join': 'جوائن', 'create': 'بنائیں', 'home': 'ہوم', 'screen': 'اسکرین', 'tap': 'ٹیپ',
  'fund': 'فنڈ', 'circle': 'سرکل', 'family': 'فیملی', 'friends': 'دوستوں', 'office': 'آفس',
  'luckydraw': 'قرعہ اندازی', 'recipient': 'وصول کنندہ', 'designated': 'منتخب'
};

export function transliterateRomanUrdu(text: string): string {
  if (!text) return '';
  if (/[\u0600-\u06FF]/.test(text)) return text;

  let processed = text;
  processed = processed.replace(/pkr\s*([0-9,]+)/gi, (m, num) => `${num.replace(/,/g, '')} روپے`);
  processed = processed.replace(/rs\.?\s*([0-9,]+)/gi, (m, num) => `${num.replace(/,/g, '')} روپے`);
  processed = processed.replace(/cycle\s*(\d+)\s*of\s*(\d+)/gi, 'سائیکل $1 از $2');
  processed = processed.replace(/due\s*to/gi, 'کو ادا کرنا ہے');

  const tokens = processed.split(/(\s+|[.,!?:;•*()\-—]+)/);
  const result = tokens.map(tok => {
    const cleanTok = tok.toLowerCase().trim();
    if (ROMAN_TO_URDU_WORDS[cleanTok]) {
      return ROMAN_TO_URDU_WORDS[cleanTok];
    }
    return tok;
  });

  return result.join('').replace(/[*_#`~>]/g, '').trim();
}

/**
 * Detect language: Urdu script / Roman phrasing uses 'ur', English uses 'en'.
 */
export function detectSpeechLanguage(text: string): 'ur' | 'en' {
  const urduCharRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (urduCharRegex.test(text)) {
    return 'ur';
  }
  const isRomanUrdu = /meri|mera|mere|bari|baari|paise|paisa|kitne|kitna|kitnay|kab|kahan|kon|kaun|kis|kisi|kiski|bheje|bhejo|jama|nahi|nai|nhi|karega|karo|karna|karun|mujhe|mujhey|humein|hum|aap|ap|batao|bataiye|bataen|kist|kisht|chahiye|hogi|hoga|hai|hain|kya|kyun|kyu|kaise|kesy|kese|milenge|milega|milna|lena|dena|dene|kitni|kameti|kamaiti|beesi|bisi/i.test(text);
  if (isRomanUrdu) {
    return 'ur';
  }
  return 'en';
}

function getCandidateTTSEndpoints(): string[] {
  const endpoints: string[] = [];

  // 1. Production 24/7 Cloud Backend (Highest Priority)
  endpoints.push('https://kameti-ai-ten.vercel.app/api/textToSpeech');

  // 2. Dynamic host resolution from Expo Go debugger host
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      endpoints.push(`http://${ip}:3000/api/textToSpeech`);
    }
  }

  // 3. Dynamic host resolution from React Native bundle scriptURL
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

  // 4. Static candidate fallbacks
  const fallbacks = [
    'http://192.168.18.144:3000/api/textToSpeech',
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
      const fallbackText = lang === 'ur' ? transliterateRomanUrdu(cleaned) : cleaned;
      Speech.speak(fallbackText, {
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
