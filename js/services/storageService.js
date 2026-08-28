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

    // Sample Payment Proofs (Base64 Encoded for Safe HTML Attribute Rendering)
    const proofs = [
      {
        id: 'prf_hamza',
        paymentId: 'pay_2',
        uploadedBy: 'usr_hamza',
        fileUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgNDAwIDYwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiMwRjc2NkUiLz48cmVjdCB4PSIyMCIgeT0iMjAiIHdpZHRoPSIzNjAiIGhlaWdodD0iNTYwIiByeD0iMTYiIGZpbGw9IndoaXRlIi8+PHRleHQgeD0iMjAwIiB5PSI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMEY3NjZFIj5FYXN5cGFpc2EgUmVjZWlwdDwvdGV4dD48bGluZSB4MT0iNDAiIHkxPSIxMTAiIHgyPSIzNjAiIHkyPSIxMTAiIHN0cm9rZT0iI0NCRDVFMSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iNTAiIHk9IjE2MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NDc0OEIiPkFtb3VudCBTZW50PC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSIxOTAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzBGMTcyQSI+UnMuIDIwLDAwMDwvdGV4dD48dGV4dCB4PSI1MCIgeT0iMjQwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY0NzQ4QiI+VHJhbnNmZXJyZWQgVG88L3RleHQ+PHRleHQgeD0iNTAiIHk9IjI3MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMEYxNzJBIj5BaG1lZCBLaGFuICgwMzAwIDU1NTAyMDIpPC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSIzMjAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjQ3NDhCIj5TZW5kZXI8L3RleHQ+PHRleHQgeD0iNTAiIHk9IjM1MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMEYxNzJBIj5IYW16YSBBbGk8L3RleHQ+PHRleHQgeD0iNTAiIHk9IjQwMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NDc0OEIiPlRyYW5zYWN0aW9uIElEPC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSI0MzAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE1IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmaWxsPSIjMEQ5NDg4Ij5UUlgtOTgyMzQxOTA4MjM8L3RleHQ+PHJlY3QgeD0iNDAiIHk9IjQ4MCIgd2lkdGg9IjMyMCIgaGVpZ2h0PSI1MCIgcng9IjgiIGZpbGw9IiNEMUZBRTUiLz48dGV4dCB4PSIyMDAiIHk9IjUxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTUiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMDY1RjQ2Ij5TdWNjZXNzZnVsIFRyYW5zYWN0aW9uPC90ZXh0Pjwvc3ZnPg==',
        fileType: 'image/svg+xml',
        uploadedAt: '2026-08-20T14:30:00Z',
        notes: 'Transferred via JazzCash to Ahmed'
      },
      {
        id: 'prf_fatima',
        paymentId: 'pay_4',
        uploadedBy: 'usr_fatima',
        fileUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgNDAwIDYwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiMxRTI5M0IiLz48cmVjdCB4PSIyMCIgeT0iMjAiIHdpZHRoPSIzNjAiIGhlaWdodD0iNTYwIiByeD0iMTYiIGZpbGw9IndoaXRlIi8+PHRleHQgeD0iMjAwIiB5PSI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMUUyOTNCIj5TYWRhUGF5IFRyYW5zZmVyPC90ZXh0PjxsaW5lIHgxPSI0MCIgeTE9IjExMCIgeDI9IjM2MCIgeTI9IjExMCIgc3Ryb2tlPSIjQ0JENUUxIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCIgeT0iMTYwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY0NzQ4QiI+QW1vdW50PC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSIxOTAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzBGMTcyQSI+UnMuIDIwLDAwMDwvdGV4dD48dGV4dCB4PSI1MCIgeT0iMjQwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY0NzQ4QiI+VG88L3RleHQ+PHRleHQgeD0iNTAiIHk9IjI3MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMEYxNzJBIj5BaG1lZCBLaGFuPC90ZXh0PjxyZWN0IHg9IjQwIiB5PSI0ODAiIHdpZHRoPSIzMjAiIGhlaWdodD0iNTAiIHJ4PSI4IiBmaWxsPSIjRDFGQUU1Ii8+PHRleHQgeD0iMjAwIiB5PSI1MTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE1IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzA2NUY0NiI+UGF5bWVudCBDb21wbGV0ZWQ8L3RleHQ+PC9zdmc+',
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
    const proofs = this.getItem(STORAGE_KEYS.PROOFS, []);
    return proofs.map(p => {
      if (p.fileUrl && p.fileUrl.startsWith('data:image/svg+xml;utf8,<svg')) {
        const svgContent = p.fileUrl.replace('data:image/svg+xml;utf8,', '');
        return {
          ...p,
          fileUrl: 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)))
        };
      }
      return p;
    });
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
