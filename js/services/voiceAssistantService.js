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
      const isDemoUser = user.id === 'usr_aown' || userName.includes('aown');
      if (isDemoUser) {
        return c.id === 'com_friends_2026' || c.id === 'com_office_2026';
      }
      return false;
    });
  }

  processQuery(rawQuery) {
    const q = (rawQuery || '').toLowerCase().trim();
    const user = authService.getCurrentUser();
    const userName = user?.name || 'there';
    const committees = this.getUserScopedCommittees();
    const activeCommittees = committees.filter(c => !c.status?.toLowerCase().includes('forming'));
    const isUrduScript = /[\u0600-\u06FF]/.test(rawQuery || '');
    const isRomanUrdu = /meri|mera|mere|bari|paise|kitne|kitna|kitnay|kab|kon|kaun|kis|bheje|jama|nahi|karega|karo|mujhe|hum|aap|batao|kist|paisa|chahiye|hogi|bataen|bataiye|karen/.test(q);

    // 1. Dues & Pending Contributions
    if (
      q.includes('owe') || q.includes('due') || q.includes('kitne paise') || q.includes('kitna dena') ||
      q.includes('payment') || q.includes('pending') || q.includes('pay this month') || q.includes('kisht') ||
      q.includes('ادائیگی') || q.includes('دینے') || q.includes('کتنے')
    ) {
      if (activeCommittees.length === 0) {
        if (isUrduScript) return { reply: 'آپ کی تمام ادائیگیاں مکمل ہیں! اس مہینے کوئی ادائیگی واجب الادا نہیں ہے۔', language: 'ur' };
        if (isRomanUrdu) return { reply: 'Aap ki tamam payments complete hain! Is mahine koi payment pending nahi hai.', language: 'roman_ur' };
        return { reply: 'Great news! You have no pending payments due for this month. All your contributions are up to date.', language: 'en' };
      }

      let totalDue = 0;
      const details = [];

      activeCommittees.forEach(c => {
        const amt = c.contributionAmount || 20000;
        totalDue += amt;
        details.push(`• **${c.name}**: PKR ${amt.toLocaleString()} (Due on ${c.startDate || '10th'})`);
      });

      if (isUrduScript) {
        return {
          reply: `آپ کے اس مہینے کل **PKR ${totalDue.toLocaleString()}** واجب الادا ہیں:\n\n${details.join('\n')}`,
          language: 'ur'
        };
      }
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
      q.includes('mujhe kab') || q.includes('mera number') || q.includes('getting paid') || q.includes('kitnay mil') ||
      q.includes('باری') || q.includes('رقم') || q.includes('ملے')
    ) {
      if (activeCommittees.length === 0) {
        if (isUrduScript) return { reply: 'آپ ابھی کسی فعال کمیٹی میں شامل نہیں ہیں۔', language: 'ur' };
        if (isRomanUrdu) return { reply: 'Aap abhi kisi active committee mein shamil nahi hain.', language: 'roman_ur' };
        return { reply: 'You are not enrolled in any active committees yet.', language: 'en' };
      }

      const summaries = activeCommittees.map(c => {
        const totalPool = (c.contributionAmount || 20000) * (c.numberOfMembers || c.totalCycles || 5);
        return `• **${c.name}**: Pool of **PKR ${totalPool.toLocaleString()}** (Turn assigned via Lucky Draw / Schedule)`;
      });

      if (isUrduScript) {
        return {
          reply: `آپ کی کمیٹی کی باری کی تفصیلات درج ذیل ہیں:\n\n${summaries.join('\n')}`,
          language: 'ur'
        };
      }
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
      q.includes('kiski bari') || q.includes('kon le raha') || q.includes('who is') || q.includes('وصول')
    ) {
      const recs = activeCommittees.map(c => `• **${c.name}**: Ahmed Khan (Cycle 1 recipient)`).join('\n');
      if (isUrduScript) return { reply: `اس مہینے رقم وصول کرنے والوں کی فہرست:\n\n${recs}`, language: 'ur' };
      if (isRomanUrdu) return { reply: `Is mahine recipients ki details:\n\n${recs}`, language: 'roman_ur' };
      return { reply: `Here are the recipients for the current cycle:\n\n${recs}`, language: 'en' };
    }

    // 4. Which committees am I enrolled in
    if (
      q.includes('which committee') || q.includes('my committee') || q.includes('all committee') ||
      q.includes('meri committee') || q.includes('kitni committee') || q.includes('committees am i') ||
      q.includes('کمیٹی') || q.includes('کمیٹیاں')
    ) {
      if (committees.length === 0) {
        if (isUrduScript) return { reply: 'آپ ابھی کسی کمیٹی میں شامل نہیں ہیں۔ ہوم اسکرین پر "+ بنائیں" پر ٹیپ کریں!', language: 'ur' };
        if (isRomanUrdu) return { reply: 'Aap abhi kisi committee mein shamil nahi hain. Home screen par "+ Create" par tap karein!', language: 'roman_ur' };
        return { reply: 'You are not enrolled in any committees. Tap "+ Create New Committee" on Home to start!', language: 'en' };
      }
      const list = committees.map(c => {
        const pool = (c.contributionAmount || 20000) * (c.numberOfMembers || c.totalCycles || 5);
        return `• **${c.name}** (Code: \`${c.joinCode}\`)\n  - Contribution: PKR ${(c.contributionAmount || 20000).toLocaleString()}/month | Pool: PKR ${pool.toLocaleString()}\n  - Status: ${c.status || 'Active'}`;
      }).join('\n\n');

      if (isUrduScript) return { reply: `آپ کی رجسٹرڈ کمیٹیاں درج ذیل ہیں:\n\n${list}`, language: 'ur' };
      if (isRomanUrdu) return { reply: `Aap ki enrolled committees yeh hain:\n\n${list}`, language: 'roman_ur' };
      return { reply: `You are currently enrolled in:\n\n${list}`, language: 'en' };
    }

    // 5. How does Kameti work
    if ((q.includes('how') && (q.includes('work') || q.includes('kameti') || q.includes('beesi') || q.includes('rosca') || q.includes('kya hai'))) || q.includes('کیسے') || q.includes('kaise')) {
      if (isUrduScript) {
        return {
          reply: `**کمیٹی کا طریقہ کار:**\n\n1. **ماہانہ بچت**: تمام ممبران ہر مہینے مقررہ رقم ایک مشترکہ پول میں جمع کرتے ہیں۔\n2. **منصفانہ تقسیم**: ہر سائیکل میں قرعہ اندازی یا شیڈول کے مطابق ایک ممبر کو تمام رقم دی جاتی ہے۔\n3. **بغیر سود بچت**: بغیر کسی سود کے یکمشت بڑی رقم حاصل کرنے کا بہترین روایتی طریقہ!`,
          language: 'ur'
        };
      }
      if (isRomanUrdu) {
        return {
          reply: `**Kameti Ka Tareeqa:**\n\n1. **Monthly Pooling**: Sab members har mahine aik fix raqam jama karte hain.\n2. **Fair Turn**: Har cycle mein kisi aik member ko qura-andazi ya bari ke mutabiq sari raqam milti hai.\n3. **Bila Sood Bachat**: Baghair kisi sood ke bari raqam hasil karne ka aasan zariya!`,
          language: 'roman_ur'
        };
      }
      return {
        reply: `**How Kameti Works:**\n\n1. **Monthly Pooling**: A group of trusted members deposits a fixed monthly amount into a shared pool.\n2. **Fair Turn Allocation**: Each cycle, one member collects the entire lump-sum pool (assigned fairly via Lucky Draw or schedule).\n3. **Zero Interest**: Provides debt-free, community-driven savings for everyone!`,
        language: 'en'
      };
    }

    // Default friendly assistant response
    if (isUrduScript) {
      return {
        reply: `میں آپ کی واجب الادا رقوم، کمیٹی کی باری، ممبران کی تفصیلات اور تاریخوں کے بارے میں بتا سکتا ہوں۔ آپ کیا جاننا چاہتے ہیں؟`,
        language: 'ur'
      };
    }
    if (isRomanUrdu) {
      return {
        reply: `Main aap ki pending payments, bari ka turn, aur committee ke members ke bare mein madad kar sakta hoon. Aap kya janna chahte hain?`,
        language: 'roman_ur'
      };
    }
    return {
      reply: `I can help you check your pending payments, payout turn, committee member statuses, or next payout date. What would you like to know?`,
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

