import AsyncStorage from '@react-native-async-storage/async-storage';
import { Committee, UserProfile, AppNotification } from '../types/dataTypes';

const STORAGE_KEYS = {
  USER: '@kameti_user',
  USERS: '@kameti_users',
  COMMITTEES: '@kameti_committees',
  NOTIFICATIONS: '@kameti_notifications',
};

function normalizePhoneDigits(raw: string): string {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('92') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('3') && digits.length === 10) {
    return '0' + digits;
  }
  return digits;
}

const SEED_USER: UserProfile = {
  id: 'u1',
  name: 'Aown Raza',
  phone: '+92 300 1234567',
  paymentMethod: 'easypaisa',
  accountNumber: '03001234567',
  accountTitle: 'Aown Raza',
  isNewUser: false,
  stats: {
    activeCommittees: 2,
    completedCommittees: 1,
    totalContributions: 120000,
    totalPayouts: 100000,
  },
};

const SEED_COMMITTEES: Committee[] = [
  {
    id: 'c1',
    name: 'Family Savings Circle',
    joinCode: 'FAM2024',
    memberCount: 5,
    contributionAmount: 20000,
    totalPool: 100000,
    frequency: 'monthly',
    selectionMode: 'random',
    startDate: '2024-05-01',
    currentCycle: 2,
    totalCycles: 5,
    currentRecipientId: 'm2',
    status: 'on_track',
    nextDueDate: '2026-08-30',
    members: [
      { id: 'u1', name: 'Aown Raza (You)', phone: '03001234567', avatar: '👨‍💼', paymentMethod: 'easypaisa', accountNumber: '03001234567', accountTitle: 'Aown Raza', hasReceivedPayout: false },
      { id: 'm2', name: 'Zainab Bibi', phone: '03019876543', avatar: '👩‍💼', paymentMethod: 'jazzcash', accountNumber: '03019876543', accountTitle: 'Zainab Bibi', hasReceivedPayout: true, payoutMonthIndex: 1 },
      { id: 'm3', name: 'Hamza Khan', phone: '03335557788', avatar: '👨‍🌾', paymentMethod: 'sadapay', accountNumber: '03335557788', accountTitle: 'Hamza Khan', hasReceivedPayout: false },
      { id: 'm4', name: 'Fatima Ali', phone: '03214443322', avatar: '👩‍🔬', paymentMethod: 'nayapay', accountNumber: '03214443322', accountTitle: 'Fatima Ali', hasReceivedPayout: false },
      { id: 'm5', name: 'Bilal Ahmed', phone: '03451122334', avatar: '👨‍💻', paymentMethod: 'raast', accountNumber: '03451122334', accountTitle: 'Bilal Ahmed', hasReceivedPayout: false },
    ],
    payments: [
      { id: 'p1', committeeId: 'c1', memberId: 'u1', cycleIndex: 2, amount: 20000, status: 'submitted', submittedAt: '2026-08-20T10:30:00Z', proofImageUrl: 'https://picsum.photos/400/300' },
      { id: 'p2', committeeId: 'c1', memberId: 'm3', cycleIndex: 2, amount: 20000, status: 'submitted', submittedAt: '2026-08-21T14:15:00Z', proofImageUrl: 'https://picsum.photos/400/301' },
    ],
    history: [
      { cycleIndex: 1, monthName: 'May 2024', recipientId: 'm2', completedAt: '2024-05-31', poolAmount: 100000 },
    ],
  },
  {
    id: 'c2',
    name: 'Office Tech Beesi',
    joinCode: 'TECH55',
    memberCount: 4,
    contributionAmount: 15000,
    totalPool: 60000,
    frequency: 'monthly',
    selectionMode: 'voting',
    startDate: '2024-06-01',
    currentCycle: 1,
    totalCycles: 4,
    currentRecipientId: 'u1',
    status: 'due_soon',
    nextDueDate: '2026-08-28',
    members: [
      { id: 'u1', name: 'Aown Raza (You)', phone: '03001234567', avatar: '👨‍💼', paymentMethod: 'easypaisa', accountNumber: '03001234567', accountTitle: 'Aown Raza', hasReceivedPayout: true, payoutMonthIndex: 1 },
      { id: 'm6', name: 'Saba Malik', phone: '03028889900', avatar: '👩‍🎨', paymentMethod: 'jazzcash', accountNumber: '03028889900', accountTitle: 'Saba Malik', hasReceivedPayout: false },
      { id: 'm7', name: 'Usman Ghani', phone: '03137776655', avatar: '👨‍🔧', paymentMethod: 'bank', accountNumber: 'PK36MEZN0001234567', accountTitle: 'Usman Ghani', hasReceivedPayout: false },
      { id: 'm8', name: 'Tariq Jameel', phone: '03342221100', avatar: '👨‍🏫', paymentMethod: 'easypaisa', accountNumber: '03342221100', accountTitle: 'Tariq Jameel', hasReceivedPayout: false },
    ],
    payments: [],
    history: [],
  },
];

const SEED_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', title: 'Payment Due Soon', body: 'Payment of Rs. 15,000 for Office Tech Beesi is due in 3 days.', timestamp: '2 hours ago', read: false, committeeId: 'c2', type: 'reminder' },
  { id: 'n2', title: 'Payment Proof Submitted', body: 'Hamza Khan submitted payment proof for Family Savings Circle.', timestamp: '1 day ago', read: true, committeeId: 'c1', type: 'payment_received' },
  { id: 'n3', title: 'Congratulations! You are Recipient', body: 'You were selected as the payout recipient for Office Tech Beesi cycle #1!', timestamp: '2 days ago', read: true, committeeId: 'c2', type: 'payout_alert' },
];

class NativeStorageService {
  private listeners: (() => void)[] = [];

  async init() {
    try {
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      // If user is not set, init empty storage
      const comStr = await AsyncStorage.getItem(STORAGE_KEYS.COMMITTEES);
      if (!comStr) {
        await AsyncStorage.setItem(STORAGE_KEYS.COMMITTEES, JSON.stringify([]));
      }
      const notifStr = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (!notifStr) {
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
      }
    } catch (err) {
      console.error('[StorageService] Error initializing:', err);
    }
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  async getUser(): Promise<UserProfile | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  }

  async getUsers(): Promise<UserProfile[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  async saveUserToRegistry(user: UserProfile) {
    if (!user) return;
    const users = await this.getUsers();
    const cleanPhone = normalizePhoneDigits(user.phone);
    const idx = users.findIndex(u => 
      u.id === user.id || 
      (cleanPhone && normalizePhoneDigits(u.phone) === cleanPhone)
    );
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  async getUserByPhone(phone: string): Promise<UserProfile | null> {
    const clean = normalizePhoneDigits(phone);
    if (!clean) return null;
    const users = await this.getUsers();
    return users.find(u => normalizePhoneDigits(u.phone) === clean) || null;
  }

  async login(user: UserProfile) {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    await this.saveUserToRegistry(user);
    this.notify();
    return user;
  }

  async updateUser(user: Partial<UserProfile>) {
    const current = await this.getUser();
    if (!current) return null;
    const updated = { ...current, ...user };
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    await this.saveUserToRegistry(updated as UserProfile);
    this.notify();
    return updated;
  }

  async getCommittees(): Promise<Committee[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.COMMITTEES);
    return data ? JSON.parse(data) : [];
  }

  async saveCommittees(committees: Committee[]) {
    await AsyncStorage.setItem(STORAGE_KEYS.COMMITTEES, JSON.stringify(committees));
    this.notify();
  }

  async deleteCommittee(committeeId: string) {
    const list = await this.getCommittees();
    const filtered = list.filter(c => c.id !== committeeId);
    await this.saveCommittees(filtered);
    return filtered;
  }

  async submitMemberProof(committeeId: string, memberId: string, proofUrl: string, notes?: string) {
    const list = await this.getCommittees();
    const updated = list.map(c => {
      if (c.id === committeeId) {
        let members = c.members;
        if (members) {
          members = members.map(m => {
            if (m.id === memberId) {
              return {
                ...m,
                paymentProofUrl: proofUrl,
                paymentStatus: 'submitted' as const,
                submittedAt: new Date().toISOString(),
                paymentNotes: notes || '',
              };
            }
            return m;
          });
        }
        return { ...c, members };
      }
      return c;
    });

    await this.saveCommittees(updated);
    return updated;
  }

  async verifyMemberPayment(committeeId: string, memberId: string) {
    const list = await this.getCommittees();
    const updated = list.map(c => {
      if (c.id === committeeId) {
        let members = c.members;
        if (members) {
          members = members.map(m => {
            if (m.id === memberId) {
              return {
                ...m,
                paymentStatus: 'verified' as const,
                verifiedAt: new Date().toISOString(),
              };
            }
            return m;
          });
        }
        return { ...c, members };
      }
      return c;
    });

    await this.saveCommittees(updated);
    return updated;
  }

  async getNotifications(): Promise<AppNotification[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : SEED_NOTIFICATIONS;
  }

  async saveNotifications(notifications: AppNotification[]) {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    this.notify();
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      await AsyncStorage.removeItem(STORAGE_KEYS.COMMITTEES);
      await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
      this.notify();
    } catch (err) {
      console.error('[StorageService] Error logging out:', err);
    }
  }
}

export const nativeStorageService = new NativeStorageService();
