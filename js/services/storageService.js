// Persistent Storage Service and Reactive State Store
// Automatically seeds realistic data for demo and offline execution.

import { PaymentMethods, SelectionMethods, CommitteeStatus, PaymentStatus } from '../models/dataModels.js';

const STORAGE_KEYS = {
  CURRENT_USER: 'kameti_current_user',
  USERS: 'kameti_users',
  COMMITTEES: 'kameti_committees',
  MEMBERS: 'kameti_committee_members',
  MONTHS: 'kameti_committee_months',
  PAYMENTS: 'kameti_payments',
  PROOFS: 'kameti_payment_proofs',
  VOTES: 'kameti_votes',
  NOTIFICATIONS: 'kameti_notifications'
};

class StorageService {
  constructor() {
    this.listeners = new Set();
    this.initSeedData();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => {
      try { fn(); } catch (e) { console.error('State subscriber error', e); }
    });
  }

  getItem(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      console.warn(`Storage get error for ${key}:`, e);
      return defaultValue;
    }
  }

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.notify();
    } catch (e) {
      console.error(`Storage set error for ${key}:`, e);
    }
  }

  // --- Seed Realistic Initial Data ---
  initSeedData() {
    if (localStorage.getItem(STORAGE_KEYS.USERS)) {
      return; // Already initialized
    }

    console.log('[StorageService] Seeding rich sample committee data...');

    // 1. Initial Users
    const users = [
      {
        id: 'usr_aown',
        name: 'Aown Haider',
        verifiedPhone: '+923145550101',
        paymentMethod: PaymentMethods.EASYPAISA,
        paymentNumber: '0314 5550101',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_ahmed',
        name: 'Ahmed Khan',
        verifiedPhone: '+923005550202',
        paymentMethod: PaymentMethods.JAZZCASH,
        paymentNumber: '0300 5550202',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_hamza',
        name: 'Hamza Ali',
        verifiedPhone: '+923215550303',
        paymentMethod: PaymentMethods.SADAPAY,
        paymentNumber: '0321 5550303',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_bilal',
        name: 'Bilal Tariq',
        verifiedPhone: '+923335550404',
        paymentMethod: PaymentMethods.RAAST,
        paymentNumber: 'PK99BAHL00012345678901',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_fatima',
        name: 'Fatima Zahra',
        verifiedPhone: '+923455550505',
        paymentMethod: PaymentMethods.NAYAPAY,
        paymentNumber: '0345 5550505',
        createdAt: new Date().toISOString()
      }
    ];

    // Current logged-in user default is null for new sessions so new devices trigger onboarding
    const currentUser = null;

    // 2. Active Committee: Friends Committee (Random selection, Month 1, Ahmed is recipient)
    const committee1 = {
      id: 'com_friends_2026',
      name: 'Friends Committee',
      creatorId: 'usr_aown',
      numberOfMembers: 5,
      contributionAmount: 20000,
      frequency: 'monthly',
      duration: 5,
      startDate: '2026-08-01',
      recipientSelectionMethod: SelectionMethods.RANDOM,
      status: CommitteeStatus.ACTIVE,
      joinCode: 'FRIEND5',
      createdAt: new Date().toISOString()
    };

    // Committee 2: Office Beesi (Voting in progress)
    const committee2 = {
      id: 'com_office_2026',
      name: 'Office Beesi 2026',
      creatorId: 'usr_hamza',
      numberOfMembers: 4,
      contributionAmount: 50000,
      frequency: 'monthly',
      duration: 4,
      startDate: '2026-08-15',
      recipientSelectionMethod: SelectionMethods.VOTING,
      status: CommitteeStatus.ACTIVE,
      joinCode: 'OFFICE4',
      createdAt: new Date().toISOString()
    };

    // Committee Members
    const members = [
      { id: 'm1', committeeId: 'com_friends_2026', userId: 'usr_aown', joinedAt: '2026-08-01T10:00:00Z' },
      { id: 'm2', committeeId: 'com_friends_2026', userId: 'usr_ahmed', joinedAt: '2026-08-01T10:05:00Z' },
      { id: 'm3', committeeId: 'com_friends_2026', userId: 'usr_hamza', joinedAt: '2026-08-01T10:10:00Z' },
      { id: 'm4', committeeId: 'com_friends_2026', userId: 'usr_bilal', joinedAt: '2026-08-01T10:15:00Z' },
      { id: 'm5', committeeId: 'com_friends_2026', userId: 'usr_fatima', joinedAt: '2026-08-01T10:20:00Z' },
      
      { id: 'm6', committeeId: 'com_office_2026', userId: 'usr_aown', joinedAt: '2026-08-15T09:00:00Z' },
      { id: 'm7', committeeId: 'com_office_2026', userId: 'usr_hamza', joinedAt: '2026-08-15T09:05:00Z' },
      { id: 'm8', committeeId: 'com_office_2026', userId: 'usr_bilal', joinedAt: '2026-08-15T09:10:00Z' },
      { id: 'm9', committeeId: 'com_office_2026', userId: 'usr_ahmed', joinedAt: '2026-08-15T09:15:00Z' }
    ];

    // Committee Months (Month 1 for Friends Committee)
    // Target due date 2 days from current date
    const targetDueDate = new Date();
    targetDueDate.setDate(targetDueDate.getDate() + 2);
    const dueDateStr = targetDueDate.toISOString().split('T')[0];

    const months = [
      {
        id: 'mon_friends_1',
        committeeId: 'com_friends_2026',
        monthNumber: 1,
        monthName: 'September 2026',
        dueDate: dueDateStr,
        recipientUserId: 'usr_ahmed',
        selectionMethod: SelectionMethods.RANDOM,
        status: 'active'
      },
      {
        id: 'mon_office_1',
        committeeId: 'com_office_2026',
        monthNumber: 1,
        monthName: 'September 2026',
        dueDate: dueDateStr,
        recipientUserId: null, // To be determined via active voting
        selectionMethod: SelectionMethods.VOTING,
        status: 'voting'
      }
    ];

    // Payments for Month 1 (Ahmed is recipient)
    const payments = [
      {
        id: 'pay_1',
        committeeMonthId: 'mon_friends_1',
        committeeId: 'com_friends_2026',
        payerUserId: 'usr_aown',
        recipientUserId: 'usr_ahmed',
        amount: 20000,
        status: PaymentStatus.PENDING,
        submittedAt: null
      },
      {
        id: 'pay_2',
        committeeMonthId: 'mon_friends_1',
        committeeId: 'com_friends_2026',
        payerUserId: 'usr_hamza',
        recipientUserId: 'usr_ahmed',
        amount: 20000,
        status: PaymentStatus.SUBMITTED,
        submittedAt: '2026-08-20T14:30:00Z'
      },
      {
        id: 'pay_3',
        committeeMonthId: 'mon_friends_1',
        committeeId: 'com_friends_2026',
        payerUserId: 'usr_bilal',
        recipientUserId: 'usr_ahmed',
        amount: 20000,
        status: PaymentStatus.PENDING,
        submittedAt: null
      },
      {
        id: 'pay_4',
        committeeMonthId: 'mon_friends_1',
        committeeId: 'com_friends_2026',
        payerUserId: 'usr_fatima',
        recipientUserId: 'usr_ahmed',
        amount: 20000,
        status: PaymentStatus.SUBMITTED,
        submittedAt: '2026-08-21T09:15:00Z'
      },
      {
        id: 'pay_5',
        committeeMonthId: 'mon_friends_1',
        committeeId: 'com_friends_2026',
        payerUserId: 'usr_ahmed',
        recipientUserId: 'usr_ahmed',
        amount: 20000,
        status: PaymentStatus.SUBMITTED, // Recipient itself
        submittedAt: '2026-08-01T00:00:00Z'
      }
    ];

    // Sample Payment Proofs
    const proofs = [
      {
        id: 'prf_hamza',
        paymentId: 'pay_2',
        uploadedBy: 'usr_hamza',
        fileUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="400" height="600" fill="%230F766E"/><rect x="20" y="20" width="360" height="560" rx="16" fill="white"/><text x="200" y="80" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="%230F766E">Easypaisa Receipt</text><line x1="40" y1="110" x2="360" y2="110" stroke="%23CBD5E1" stroke-width="2"/><text x="50" y="160" font-family="sans-serif" font-size="14" fill="%2364748B">Amount Sent</text><text x="50" y="190" font-family="sans-serif" font-size="24" font-weight="bold" fill="%230F172A">Rs. 20,000</text><text x="50" y="240" font-family="sans-serif" font-size="14" fill="%2364748B">Transferred To</text><text x="50" y="270" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230F172A">Ahmed Khan (0300 5550202)</text><text x="50" y="320" font-family="sans-serif" font-size="14" fill="%2364748B">Sender</text><text x="50" y="350" font-family="sans-serif" font-size="16" fill="%230F172A">Hamza Ali</text><text x="50" y="400" font-family="sans-serif" font-size="14" fill="%2364748B">Transaction ID</text><text x="50" y="430" font-family="sans-serif" font-size="15" font-family="monospace" fill="%230D9488">TRX-98234190823</text><rect x="40" y="480" width="320" height="50" rx="8" fill="%23D1FAE5"/><text x="200" y="512" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="bold" fill="%23065F46">Successful Transaction</text></svg>',
        fileType: 'image/svg+xml',
        uploadedAt: '2026-08-20T14:30:00Z',
        notes: 'Transferred via JazzCash to Ahmed'
      },
      {
        id: 'prf_fatima',
        paymentId: 'pay_4',
        uploadedBy: 'usr_fatima',
        fileUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="400" height="600" fill="%231E293B"/><rect x="20" y="20" width="360" height="560" rx="16" fill="white"/><text x="200" y="80" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="%231E293B">SadaPay Transfer</text><line x1="40" y1="110" x2="360" y2="110" stroke="%23CBD5E1" stroke-width="2"/><text x="50" y="160" font-family="sans-serif" font-size="14" fill="%2364748B">Amount</text><text x="50" y="190" font-family="sans-serif" font-size="24" font-weight="bold" fill="%230F172A">Rs. 20,000</text><text x="50" y="240" font-family="sans-serif" font-size="14" fill="%2364748B">To</text><text x="50" y="270" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230F172A">Ahmed Khan</text><rect x="40" y="480" width="320" height="50" rx="8" fill="%23D1FAE5"/><text x="200" y="512" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="bold" fill="%23065F46">Payment Completed</text></svg>',
        fileType: 'image/svg+xml',
        uploadedAt: '2026-08-21T09:15:00Z',
        notes: 'Paid via SadaPay'
      }
    ];

    // Live Votes for Office Beesi
    const votes = [
      { id: 'v1', committeeMonthId: 'mon_office_1', voterUserId: 'usr_hamza', candidateUserId: 'usr_ahmed', createdAt: '2026-08-20T10:00:00Z' },
      { id: 'v2', committeeMonthId: 'mon_office_1', voterUserId: 'usr_bilal', candidateUserId: 'usr_ahmed', createdAt: '2026-08-20T11:00:00Z' },
      { id: 'v3', committeeMonthId: 'mon_office_1', voterUserId: 'usr_ahmed', candidateUserId: 'usr_aown', createdAt: '2026-08-20T12:00:00Z' }
    ];

    // Initial Notifications
    const notifications = [
      {
        id: 'notif_1',
        userId: 'usr_aown',
        committeeId: 'com_friends_2026',
        type: 'reminder',
        title: 'Payment Reminder',
        body: "Your Friends Committee payment of Rs. 20,000 is due in 2 days. This month's recipient is Ahmed Khan.",
        read: false,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'notif_2',
        userId: 'usr_aown',
        committeeId: 'com_office_2026',
        type: 'voting',
        title: 'Voting in Progress',
        body: 'Cast your vote for who should receive Office Beesi 2026 this September.',
        read: true,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    // Persist to LocalStorage
    this.setItem(STORAGE_KEYS.CURRENT_USER, currentUser);
    this.setItem(STORAGE_KEYS.USERS, users);
    this.setItem(STORAGE_KEYS.COMMITTEES, [committee1, committee2]);
    this.setItem(STORAGE_KEYS.MEMBERS, members);
    this.setItem(STORAGE_KEYS.MONTHS, months);
    this.setItem(STORAGE_KEYS.PAYMENTS, payments);
    this.setItem(STORAGE_KEYS.PROOFS, proofs);
    this.setItem(STORAGE_KEYS.VOTES, votes);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }

  // --- Convenience Getters & Setters ---
  getCurrentUser() {
    return this.getItem(STORAGE_KEYS.CURRENT_USER);
  }
  setCurrentUser(user) {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  getUsers() {
    return this.getItem(STORAGE_KEYS.USERS, []);
  }
  setUsers(users) {
    this.setItem(STORAGE_KEYS.USERS, users);
  }

  getCommittees() {
    return this.getItem(STORAGE_KEYS.COMMITTEES, []);
  }
  setCommittees(committees) {
    this.setItem(STORAGE_KEYS.COMMITTEES, committees);
  }

  getMembers() {
    return this.getItem(STORAGE_KEYS.MEMBERS, []);
  }
  setMembers(members) {
    this.setItem(STORAGE_KEYS.MEMBERS, members);
  }

  getMonths() {
    return this.getItem(STORAGE_KEYS.MONTHS, []);
  }
  setMonths(months) {
    this.setItem(STORAGE_KEYS.MONTHS, months);
  }

  getPayments() {
    return this.getItem(STORAGE_KEYS.PAYMENTS, []);
  }
  setPayments(payments) {
    this.setItem(STORAGE_KEYS.PAYMENTS, payments);
  }

  getProofs() {
    return this.getItem(STORAGE_KEYS.PROOFS, []);
  }
  setProofs(proofs) {
    this.setItem(STORAGE_KEYS.PROOFS, proofs);
  }

  getVotes() {
    return this.getItem(STORAGE_KEYS.VOTES, []);
  }
  setVotes(votes) {
    this.setItem(STORAGE_KEYS.VOTES, votes);
  }

  getNotifications() {
    return this.getItem(STORAGE_KEYS.NOTIFICATIONS, []);
  }
  setNotifications(notifications) {
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }
}

export const storageService = new StorageService();
