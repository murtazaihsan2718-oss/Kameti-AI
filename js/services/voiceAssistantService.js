import { storageService } from './storageService.js';
import { authService } from './authService.js';
import { buildAssistantContext } from './assistantContext.js?v=11.0.1';

class VoiceAssistantService {
  async processQuery(query, conversationHistory = []) {
    const message = String(query || '').trim();
    if (!message) throw new Error('Please enter a question.');
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Please sign in to ask about your committees.');
    const userContext = buildAssistantContext({ user,
      committees: storageService.getCommittees(), members: storageService.getMembers(),
      months: storageService.getMonths(), payments: storageService.getPayments(), users: storageService.getUsers(),
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);
    try {
      const response = await fetch('https://kameti-ai-ten.vercel.app/api/chatWithAssistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ message, userContext, conversationHistory: conversationHistory.slice(-6)
          .filter(m => !m.error).map(({ sender, text }) => ({ sender, text })) }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || data.source !== 'gemini' || !data.response) {
        throw new Error(data.error || 'The AI assistant is unavailable. Please try again.');
      }
      console.info('[Kameti AI] Response source:', data.source, 'Model:', data.model);
      return { reply: data.response, language: data.language || 'en', source: data.source, model: data.model };
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The AI assistant took too long. Please try again.');
      throw error;
    } finally { clearTimeout(timer); }
  }

  speak(text, lang = 'en') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'ur' || lang === 'roman_ur' ? 'ur-PK' : 'en-US';
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    }
  }
}
export const voiceAssistantService = new VoiceAssistantService();
