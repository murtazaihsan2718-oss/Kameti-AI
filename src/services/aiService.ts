// Frontend AI Assistant Service (Communicates securely through backend Cloud Function)
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import { buildUserKametiContext, UserKametiContext } from './contextService';

export interface ChatHistoryItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface AssistantResponse {
  success: boolean;
  response?: string;
  error?: string;
}

// Generous client timeout to allow backend exponential backoff sequences (up to 3 retries: ~1s + ~2s + ~4s + round-trips)
const CLIENT_REQUEST_TIMEOUT_MS = 35000;

/**
 * Dynamically resolves candidate backend endpoints based on the current Expo runtime.
 * Automatically discovers your development machine's local IP address on any Wi-Fi.
 */
function getCandidateEndpoints(): string[] {
  const endpoints: string[] = [];

  // 1. Dynamic host resolution from Expo Go debugger host (e.g. "192.168.1.17:8081" -> "192.168.1.17")
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      endpoints.push(`http://${ip}:3000/api/chatWithAssistant`);
    }
  }

  // 2. Dynamic host resolution from React Native bundle scriptURL
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      const found = `http://${match[1]}:3000/api/chatWithAssistant`;
      if (!endpoints.includes(found)) {
        endpoints.push(found);
      }
    }
  }

  // 3. Static candidate fallbacks
  const fallbacks = [
    'http://192.168.1.17:3000/api/chatWithAssistant',
    'http://192.168.1.8:3000/api/chatWithAssistant',
    'http://localhost:3000/api/chatWithAssistant',
    'http://10.0.2.2:3000/api/chatWithAssistant',
    'https://chatwithassistant-g-w2367g9stx-uc.a.run.app',
  ];

  for (const fb of fallbacks) {
    if (!endpoints.includes(fb)) {
      endpoints.push(fb);
    }
  }

  return endpoints;
}

class AIService {
  private activeEndpoint: string | null = null;

  setCustomEndpoint(url: string) {
    this.activeEndpoint = url;
  }

  /**
   * Send chat message through secure backend to Gemini
   * Automatically passes user-scoped read-only Kameti context
   * (No API keys or sensitive credentials exposed)
   */
  async sendMessageToAssistant(
    message: string,
    conversationHistory: ChatHistoryItem[] = [],
    customContext?: UserKametiContext
  ): Promise<AssistantResponse> {
    const trimmed = (message || '').trim();
    if (!trimmed) {
      return {
        success: false,
        error: 'Message cannot be empty.',
      };
    }

    // Gather real read-only user Kameti context
    let userContext: UserKametiContext | undefined = customContext;
    if (!userContext) {
      try {
        userContext = await buildUserKametiContext();
      } catch (e) {
        console.warn('[AIService] Failed to load local user context:', e);
      }
    }

    const payload = {
      message: trimmed,
      conversationHistory: conversationHistory.slice(-6).map(item => ({
        sender: item.sender,
        text: item.text,
      })),
      userContext,
    };

    const candidates = getCandidateEndpoints();
    const endpointsToTry = this.activeEndpoint
      ? [this.activeEndpoint, ...candidates.filter(e => e !== this.activeEndpoint)]
      : candidates;

    let lastErrorMessage = '';

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`[AIService] Dispatching chat request to: ${endpoint}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn(`[AIService] Request timed out after ${CLIENT_REQUEST_TIMEOUT_MS}ms for endpoint: ${endpoint}`);
          controller.abort();
        }, CLIENT_REQUEST_TIMEOUT_MS);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`[AIService] Received HTTP ${response.status} from ${endpoint}`);

        if (response.ok) {
          const data = await response.json();
          if (data && data.success && data.response) {
            console.log(`[AIService] Successfully parsed Assistant response (${data.response.length} chars).`);
            this.activeEndpoint = endpoint; // Cache confirmed working endpoint
            return {
              success: true,
              response: data.response,
            };
          }
          if (data && data.error) {
            console.warn(`[AIService] Backend returned error: ${data.error}`);
            return {
              success: false,
              error: data.error,
            };
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.warn(`[AIService] HTTP Error ${response.status}:`, errorData);
          if (errorData && errorData.error) {
            return {
              success: false,
              error: errorData.error,
            };
          }
          lastErrorMessage = `Server returned HTTP ${response.status}`;
        }
      } catch (err: any) {
        console.warn(`[AIService] Endpoint connection failed (${endpoint}): ${err.name} - ${err.message}`);
        lastErrorMessage = err.message || 'Connection error';
      }
    }

    return {
      success: false,
      error:
        "Sorry, I couldn't connect to the assistant right now. Please make sure the local server is running.",
    };
  }
}

export const aiService = new AIService();
