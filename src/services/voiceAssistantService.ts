// Multilingual Voice Assistant Service for React Native

export interface VoiceQueryResult {
  action: string;
  textResponse: string;
  intent: 'balance' | 'due_date' | 'payout' | 'general';
}

export class VoiceAssistantService {
  processQuery(query: string): VoiceQueryResult {
    const q = query.toLowerCase();

    if (q.includes('pay') || q.includes('total') || q.includes('kitne') || q.includes('amount')) {
      return {
        action: 'CHECK_TOTAL_DUE',
        textResponse: 'You have a total of PKR 7,500 due this month across your Family Savings (PKR 5,000) and Office Group (PKR 2,500) committees.',
        intent: 'balance',
      };
    } else if (q.includes('due') || q.includes('when') || q.includes('kab')) {
      return {
        action: 'CHECK_DUE_DATE',
        textResponse: 'Your next payment is due on September 10th for the Summer Vacation Fund.',
        intent: 'due_date',
      };
    } else if (q.includes('payout') || q.includes('receive') || q.includes('kameti kab')) {
      return {
        action: 'CHECK_PAYOUT',
        textResponse: 'You are scheduled to receive your payout in Cycle 3 on September 15th.',
        intent: 'payout',
      };
    } else {
      return {
        action: 'GENERAL_ASSIST',
        textResponse: `I've noted that. You can ask me about your monthly contributions, next payout turn, or payment deadlines.`,
        intent: 'general',
      };
    }
  }
}

export const voiceAssistantService = new VoiceAssistantService();
