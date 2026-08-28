// Voice & AI Assistant Service for Kameti
// Supports English, Urdu, and Roman Urdu with safe application tools

import { storageService } from './storageService.js';
import { authService } from './authService.js';
import { formatCurrency, PaymentStatus } from '../models/dataModels.js';

class VoiceAssistantService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
  }

  getUserScopedCommittees() {
    const user = authService.getCurrentUser();
    const all = storageService.getCommittees();
    if (!user) return all;

    const userPhone = (user.verifiedPhone || user.phone || '').replace(/[^0-9]/g, '');
    const userName = (user.name || '').trim().toLowerCase().replace('(you)', '').trim();

    return all.filter(c => {
      if (c.creatorId === user.id) return true;
      if (c.members && Array.isArray(c.members)) {
        return c.members.some(m => {
          const mPhone = (m.phone || '').replace(/[^0-9]/g, '');
          const mName = (m.name || '').trim().toLowerCase().replace('(you)', '').trim();
          return (m.id === user.id || m.userId === user.id) || (userPhone && mPhone && userPhone === mPhone) || (userName && mName && userName === mName);
        });
      }
      return c.id === 'com_friends_2026' || c.id === 'com_office_2026';
    });
  }

  processQuery(rawQuery) {
    const q = (rawQuery || '').toLowerCase().trim();
    const user = authService.getCurrentUser();
    const userName = user?.name || 'there';
    const committees = this.getUserScopedCommittees();
    const activeCommittees = committees.filter(c => !c.status?.toLowerCase().includes('forming'));
    const isRomanUrdu = /meri|mera|bari|paise|kitne|kab|kon|kis|bheje|jama|nahi|karega|karo|kaun|mujhe/.test(q);
    const isUrduScript = /[\u0600-\u06FF]/.test(q);

    // 1. Dues & Pending Contributions
    if (
      q.includes('owe') || q.includes('due') || q.includes('kitne paise') || q.includes('kitna dena') ||
      q.includes('payment') || q.includes('pending') || q.includes('pay this month') || q.includes('kisht')
    ) {
      if (activeCommittees.length === 0) {
        if (isRomanUrdu) return { reply: 'Aap ki koi active committee nahi hai jis ki payment pending ho.', language: 'roman_ur' };
        return { reply: 'You have no active committees with pending dues this month.', language: 'en' };
      }

      let totalDue = 0;
      const details = [];

      activeCommittees.forEach(c => {
        const amt = c.contributionAmount || 20000;
        totalDue += amt;
        details.push(`• **${c.name}**: PKR ${amt.toLocaleString()} (Due on ${c.startDate || '10th'})`);
      });

      if (isRomanUrdu) {
        return {
          reply: `Aap ko is mahine kul **PKR ${totalDue.toLocaleString()}** ada karne hain:\n\n${details.join('\n')}`,
          language: 'roman_ur'
        };
      }
      return {
        reply: `You have **PKR ${totalDue.toLocaleString()}** due this month across your active committees:\n\n${details.join('\n')}`,
        language: 'en'
      };
    }

    // 2. Payout turn & Receiving
    if (
      q.includes('turn') || q.includes('payout') || q.includes('receive') || q.includes('meri bari') ||
      q.includes('mujhe kab') || q.includes('mera number') || q.includes('getting paid') || q.includes('kitnay mil')
    ) {
      if (activeCommittees.length === 0) {
        return { reply: 'You are not enrolled in any active committees yet.', language: 'en' };
      }

      const summaries = activeCommittees.map(c => {
        const totalPool = (c.contributionAmount || 20000) * (c.numberOfMembers || 5);
        return `• **${c.name}**: Pool of **PKR ${totalPool.toLocaleString()}** (Turn will be assigned via Lucky Draw / Schedule)`;
      });

      if (isRomanUrdu) {
        return {
          reply: `Aap ki committee payout details yeh hain:\n\n${summaries.join('\n')}`,
          language: 'roman_ur'
        };
      }
      return {
        reply: `Here are your upcoming committee payout details:\n\n${summaries.join('\n')}`,
        language: 'en'
      };
    }

    // 3. Current Recipient this cycle
    if (
      q.includes('recipient') || q.includes('receiving') || q.includes('bari kis') ||
      q.includes('kiski bari') || q.includes('kon le raha') || q.includes('who is')
    ) {
      const recs = activeCommittees.map(c => `• **${c.name}**: Ahmed Khan (Cycle 1 recipient)`).join('\n');
      if (isRomanUrdu) return { reply: `Is mahine recipients ki details:\n\n${recs}`, language: 'roman_ur' };
      return { reply: `Here are the recipients for the current cycle:\n\n${recs}`, language: 'en' };
    }

    // 4. Which committees am I enrolled in
    if (
      q.includes('which committee') || q.includes('my committee') || q.includes('all committee') ||
      q.includes('meri committee') || q.includes('kitni committee') || q.includes('committees am i') || q.includes('in')
    ) {
      if (committees.length === 0) {
        return { reply: 'You are not enrolled in any committees. Tap "+ Create New Committee" on Home to start!', language: 'en' };
      }
      const list = committees.map(c => {
        const pool = (c.contributionAmount || 20000) * (c.numberOfMembers || 5);
        return `• **${c.name}** (Code: \`${c.joinCode}\`)\n  - Contribution: PKR ${(c.contributionAmount || 20000).toLocaleString()}/month | Pool: PKR ${pool.toLocaleString()}\n  - Status: ${c.status || 'Active'}`;
      }).join('\n\n');

      return { reply: `You are currently enrolled in:\n\n${list}`, language: 'en' };
    }

    // 5. How does Kameti work
    if (q.includes('how') && (q.includes('work') || q.includes('kameti') || q.includes('beesi') || q.includes('rosca') || q.includes('kya hai'))) {
      return {
        reply: `**How Kameti Works:**\n\n1. **Monthly Pooling**: A group of trusted members deposits a fixed monthly amount into a shared pool.\n2. **Fair Turn Allocation**: Each cycle, one member collects the entire lump-sum pool (assigned fairly via Lucky Draw or schedule).\n3. **Zero Interest**: Provides debt-free, community-driven savings for everyone!`,
        language: 'en'
      };
    }

    // Explicit Offline notice for arbitrary queries
    if (isRomanUrdu) {
      return {
        reply: `[Offline Mode] Main aap ki local committee records se connected hoon. Aap pooch sakte hain:\n• *"Mujhe kitne paise dene hain?"*\n• *"Meri committee ki bari kab hai?"*\n• *"Main kitni committees mein hoon?"*`,
        language: 'roman_ur'
      };
    }
    return {
      reply: `[Offline Mode] I am currently in offline mode with your local committee records. You can ask me:\n• *"How much do I owe this month?"*\n• *"When is my next payout turn?"*\n• *"What committees am I in?"*\n• *"How does Kameti work?"*`,
      language: 'en'
    };
  }

  speak(text, lang = 'en') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }
}

export const voiceAssistantService = new VoiceAssistantService();

