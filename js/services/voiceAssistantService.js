// Voice & AI Assistant Service for Kameti
// Supports English, Urdu, and Roman Urdu with safe application tools

import { storageService } from './storageService.js';
import { authService } from './authService.js';
import { formatCurrency, PaymentStatus } from '../models/dataModels.js';

class VoiceAssistantService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US'; // Supports multi-lingual phrases
    }
  }

  /**
   * Safe Application Tools / Functions
   */
  tools = {
    getMyCommittees: () => {
      const user = authService.getCurrentUser();
      if (!user) return [];
      const committees = storageService.getCommittees();
      const members = storageService.getMembers().filter(m => m.userId === user.id);
      return members.map(m => committees.find(c => c.id === m.committeeId)).filter(Boolean);
    },

    getCurrentCommitteeStatus: (committeeId) => {
      const committees = storageService.getCommittees();
      const comm = committeeId ? committees.find(c => c.id === committeeId) : committees[0];
      if (!comm) return null;
      const months = storageService.getMonths().filter(m => m.committeeId === comm.id);
      const activeMonth = months.find(m => m.status === 'active' || m.status === 'voting') || months[0];
      return { committee: comm, activeMonth };
    },

    getMyPendingPayments: () => {
      const user = authService.getCurrentUser();
      if (!user) return [];
      const payments = storageService.getPayments();
      const committees = storageService.getCommittees();
      const users = storageService.getUsers();
      
      return payments
        .filter(p => p.payerUserId === user.id && p.status === PaymentStatus.PENDING)
        .map(p => {
          const comm = committees.find(c => c.id === p.committeeId);
          const recipient = users.find(u => u.id === p.recipientUserId);
          return {
            amount: p.amount,
            committeeName: comm ? comm.name : 'Committee',
            recipientName: recipient ? recipient.name : 'Pending Selection'
          };
        });
    },

    getCurrentRecipient: () => {
      const user = authService.getCurrentUser();
      if (!user) return null;
      const months = storageService.getMonths();
      const users = storageService.getUsers();
      const committees = storageService.getCommittees();
      
      const activeMonths = months.filter(m => m.status === 'active' && m.recipientUserId);
      return activeMonths.map(m => {
        const comm = committees.find(c => c.id === m.committeeId);
        const recipient = users.find(u => u.id === m.recipientUserId);
        return {
          committeeName: comm ? comm.name : 'Committee',
          recipientName: recipient ? recipient.name : 'Unknown',
          monthName: m.monthName
        };
      });
    },

    getMyUpcomingPayout: () => {
      const user = authService.getCurrentUser();
      if (!user) return null;
      const months = storageService.getMonths();
      const committees = storageService.getCommittees();

      const userTurn = months.find(m => m.recipientUserId === user.id && m.status === 'active');
      if (userTurn) {
        const comm = committees.find(c => c.id === userTurn.committeeId);
        const total = comm ? comm.contributionAmount * comm.numberOfMembers : 0;
        return { isCurrentMonth: true, committeeName: comm ? comm.name : '', amount: total };
      }
      return { isCurrentMonth: false };
    },

    getPendingMembers: () => {
      const payments = storageService.getPayments();
      const users = storageService.getUsers();
      const pending = payments.filter(p => p.status === PaymentStatus.PENDING);
      return pending.map(p => {
        const u = users.find(user => user.id === p.payerUserId);
        return u ? u.name : 'Member';
      });
    }
  };

  /**
   * Process Natural Language Query in English, Urdu, or Roman Urdu
   * @param {string} rawQuery 
   * @returns {{reply: string, language: 'en'|'ur'|'roman_ur', data?: any}}
   */
  processQuery(rawQuery) {
    const q = (rawQuery || '').toLowerCase().trim();
    if (!q) {
      return { reply: 'How can I assist you with your committees today?', language: 'en' };
    }

    // Language Detection
    const isUrduScript = /[\u0600-\u06FF]/.test(q);
    const isRomanUrdu = /meri|mera|bari|paise|kitne|kab|kon|kis|bheje|jama|nahi|karega|karo/.test(q);

    // 1. Pending payments / How much do I owe?
    if (
      q.includes('owe') || 
      q.includes('due') || 
      q.includes('kitne paise') || 
      q.includes('kitna dena') || 
      q.includes('payment kitni') || 
      q.includes('pay this month')
    ) {
      const pending = this.tools.getMyPendingPayments();
      if (pending.length === 0) {
        if (isUrduScript) return { reply: 'ماشاءاللہ! آپ کی اس مہینے کی تمام ادائیگیاں مکمل ہیں۔ کوئی واجب الادا رقم نہیں۔', language: 'ur' };
        if (isRomanUrdu) return { reply: 'Zabardast! Aap ki is mahine ki tamam payments complete hain. Koi payment pending nahi hai.', language: 'roman_ur' };
        return { reply: 'You have no pending payments for this month. All your contributions are up to date!', language: 'en' };
      }

      const totalOwed = pending.reduce((sum, p) => sum + p.amount, 0);
      const details = pending.map(p => `${formatCurrency(p.amount)} for ${p.committeeName} (to ${p.recipientName})`).join(', ');

      if (isUrduScript) {
        return { reply: `آپ کے ذمہ اس ماہ کل ${formatCurrency(totalOwed)} واجب الادا ہیں۔ تفصیل: ${details}۔`, language: 'ur' };
      }
      if (isRomanUrdu) {
        return { reply: `Aap ko is mahine kul ${formatCurrency(totalOwed)} dene hain. Details: ${details}.`, language: 'roman_ur' };
      }
      return { reply: `You currently owe ${formatCurrency(totalOwed)} this month. Breakdown: ${details}.`, language: 'en' };
    }

    // 2. Who is the recipient this month / Whose turn is it?
    if (
      q.includes('who') && (q.includes('receiving') || q.includes('recipient') || q.includes('turn')) ||
      q.includes('bari kis') || q.includes('bari kiski') || q.includes('kiski bari') || q.includes('kon le raha') ||
      q.includes('recipient kon')
    ) {
      const recipients = this.tools.getCurrentRecipient();
      if (recipients.length === 0) {
        if (isRomanUrdu) return { reply: 'Is mahine ke recipient ka intekhab abhi hona baqi hai.', language: 'roman_ur' };
        return { reply: "This month's recipient selection is currently in progress.", language: 'en' };
      }

      const recText = recipients.map(r => `${r.recipientName} for ${r.committeeName}`).join(', ');
      if (isUrduScript) return { reply: `اس مہینے کمیٹی وصول کرنے والے: ${recText}`, language: 'ur' };
      if (isRomanUrdu) return { reply: `Is mahine committee ${recText} ko milegi.`, language: 'roman_ur' };
      return { reply: `The recipient for this cycle is ${recText}.`, language: 'en' };
    }

    // 3. When is my turn / Meri bari kab hai?
    if (
      q.includes('my turn') || 
      q.includes('receive') || 
      q.includes('meri bari') || 
      q.includes('mujhe kab') || 
      q.includes('mera number')
    ) {
      const payout = this.tools.getMyUpcomingPayout();
      if (payout && payout.isCurrentMonth) {
        if (isUrduScript) return { reply: `مبارک ہو! اس مہینے آپ کی ہی باری ہے اور آپ کو ${formatCurrency(payout.amount)} ملیں گے۔`, language: 'ur' };
        if (isRomanUrdu) return { reply: `Mubarak ho! Is mahine aap ki hi bari hai aur aap ko ${formatCurrency(payout.amount)} milenge.`, language: 'roman_ur' };
        return { reply: `Congratulations! It is your turn this month to receive the committee pool of ${formatCurrency(payout.amount)}.`, language: 'en' };
      } else {
        if (isRomanUrdu) return { reply: 'Aap ki bari aane wale mahino mein random draw ya voting ke zariye select hogi.', language: 'roman_ur' };
        return { reply: 'Your committee turn is scheduled for an upcoming month according to the committee schedule.', language: 'en' };
      }
    }

    // 4. Who hasn't submitted payment proof?
    if (
      q.includes("hasn't") || q.includes('not submitted') || q.includes('pending proof') ||
      q.includes('kis ne nahi') || q.includes('kis ne paise nahi') || q.includes('pending members')
    ) {
      const pendingMembers = this.tools.getPendingMembers();
      if (pendingMembers.length === 0) {
        if (isRomanUrdu) return { reply: 'Sabhi members ne payment proof submit kar diya hai!', language: 'roman_ur' };
        return { reply: 'All members have submitted their payment proofs for this month!', language: 'en' };
      }
      const names = [...new Set(pendingMembers)].join(', ');
      if (isRomanUrdu) return { reply: `In members ka proof abhi pending hai: ${names}.`, language: 'roman_ur' };
      return { reply: `The following members have not yet submitted payment proof: ${names}.`, language: 'en' };
    }

    // 5. Which committees am I in?
    if (
      q.includes('my committees') || q.includes('which committees') || 
      q.includes('meri committee') || q.includes('kitni committee')
    ) {
      const comms = this.tools.getMyCommittees();
      if (comms.length === 0) {
        if (isRomanUrdu) return { reply: 'Aap abhi kisi committee ka hissa nahi hain.', language: 'roman_ur' };
        return { reply: "You are not currently enrolled in any active committees.", language: 'en' };
      }
      const names = comms.map(c => `${c.name} (${formatCurrency(c.contributionAmount)}/mo)`).join(', ');
      if (isRomanUrdu) return { reply: `Aap in committees mein shamil hain: ${names}.`, language: 'roman_ur' };
      return { reply: `You are currently participating in: ${names}.`, language: 'en' };
    }

    // Default Fallback
    if (isUrduScript) {
      return { reply: 'معذرت، میں آپ کا سوال پوری طرح سمجھ نہیں سکا۔ آپ مجھ سے اپنی کمیٹی، باری، یا ادائیگی کے بارے میں پوچھ سکتے ہیں۔', language: 'ur' };
    }
    if (isRomanUrdu) {
      return { reply: 'Main aap ka sawal samajh nahi saka. Aap mujh se pooch sakte hain: "meri committee ki bari kab hai?" ya "mujhe kitne paise dene hain?".', language: 'roman_ur' };
    }
    return { reply: "I can help you check your pending payments, current recipient, your payout turn, or committee member statuses. What would you like to know?", language: 'en' };
  }

  /**
   * Speak response using Text-to-Speech
   * @param {string} text 
   * @param {string} lang 
   */
  speak(text, lang = 'en') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      // Select appropriate voice if available
      const voices = window.speechSynthesis.getVoices();
      if (lang === 'ur') {
        const urVoice = voices.find(v => v.lang.includes('ur') || v.lang.includes('hi'));
        if (urVoice) utterance.voice = urVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  }
}

export const voiceAssistantService = new VoiceAssistantService();
