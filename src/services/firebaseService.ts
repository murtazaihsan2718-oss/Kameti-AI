import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { Committee, Member, PaymentProof, UserProfile } from '../types/dataTypes';

// Live Firebase Project Configuration for kameti-ai (100% Free Spark Plan)
const firebaseConfig = {
  apiKey: "AIzaSyDOKa_u_Eap8lYmYPxqfXSreEa4Cs0FPh8",
  authDomain: "kameti-ai.firebaseapp.com",
  projectId: "kameti-ai",
  storageBucket: "kameti-ai.firebasestorage.app",
  messagingSenderId: "253301810740",
  appId: "1:253301810740:web:74340e448f7a77b2098c61",
  measurementId: "G-W2367G9STX"
};

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

const SEED_CLOUD_COMMITTEES: Committee[] = [
  {
    id: 'c1',
    name: 'Friends Savings Committee',
    memberCount: 5,
    totalPool: 100000,
    contributionAmount: 20000,
    frequency: 'monthly',
    totalCycles: 5,
    currentCycle: 1,
    selectionMode: 'random',
    startDate: '2026-08-01',
    members: [
      { id: 'm1', name: 'Aown Haider', phone: '03145550101', avatar: '👑', paymentMethod: 'easypaisa', accountNumber: '03145550101', accountTitle: 'Aown Haider', hasReceivedPayout: false },
      { id: 'm2', name: 'Ahmed Khan', phone: '03005550202', avatar: '👨‍💼', paymentMethod: 'jazzcash', accountNumber: '03005550202', accountTitle: 'Ahmed Khan', hasReceivedPayout: true },
      { id: 'm3', name: 'Hamza Ali', phone: '03215550303', avatar: '👨‍💼', paymentMethod: 'sadapay', accountNumber: '03215550303', accountTitle: 'Hamza Ali', hasReceivedPayout: false },
      { id: 'm4', name: 'Bilal Tariq', phone: '03335550404', avatar: '👨‍💼', paymentMethod: 'raast', accountNumber: '03335550404', accountTitle: 'Bilal Tariq', hasReceivedPayout: false },
      { id: 'm5', name: 'Fatima Zahra', phone: '03455550505', avatar: '👩‍💼', paymentMethod: 'nayapay', accountNumber: '03455550505', accountTitle: 'Fatima Zahra', hasReceivedPayout: false }
    ],
    status: 'on_track',
    joinCode: 'FRIEND5',
    currentRecipientId: 'm2',
    nextDueDate: '2026-09-01',
    payments: [],
    history: []
  },
  {
    id: 'c2',
    name: 'Office Beesi 2026',
    memberCount: 4,
    totalPool: 200000,
    contributionAmount: 50000,
    frequency: 'monthly',
    totalCycles: 4,
    currentCycle: 1,
    selectionMode: 'voting',
    startDate: '2026-08-15',
    members: [
      { id: 'm1', name: 'Aown Haider', phone: '03145550101', avatar: '👑', paymentMethod: 'easypaisa', accountNumber: '03145550101', accountTitle: 'Aown Haider', hasReceivedPayout: false },
      { id: 'm3', name: 'Hamza Ali', phone: '03215550303', avatar: '👨‍💼', paymentMethod: 'sadapay', accountNumber: '03215550303', accountTitle: 'Hamza Ali', hasReceivedPayout: false },
      { id: 'm4', name: 'Bilal Tariq', phone: '03335550404', avatar: '👨‍💼', paymentMethod: 'raast', accountNumber: '03335550404', accountTitle: 'Bilal Tariq', hasReceivedPayout: false },
      { id: 'm2', name: 'Ahmed Khan', phone: '03005550202', avatar: '👨‍💼', paymentMethod: 'jazzcash', accountNumber: '03005550202', accountTitle: 'Ahmed Khan', hasReceivedPayout: false }
    ],
    status: 'on_track',
    joinCode: 'OFFICE4',
    currentRecipientId: '',
    nextDueDate: '2026-09-05',
    payments: [],
    history: []
  }
];

export class FirebaseService {
  static async seedCloudCommittees() {
    try {
      for (const comm of SEED_CLOUD_COMMITTEES) {
        const docRef = doc(db, 'committees', comm.id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          await setDoc(docRef, comm);
        }
      }
    } catch (e) {
      console.log('[FirebaseService Native] Seed note:', e);
    }
  }

  /**
   * Listen to real-time Cloud Firestore updates for all committees across devices
   */
  static subscribeCommittees(onUpdate: (committees: Committee[]) => void) {
    try {
      const committeesRef = collection(db, 'committees');
      return onSnapshot(committeesRef, (snapshot) => {
        const list: Committee[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Committee);
        });
        if (list.length > 0) {
          onUpdate(list);
        }
      }, (err) => {
        console.log('[FirebaseService] Firestore snapshot fallback:', err.message);
      });
    } catch (err) {
      console.log('[FirebaseService] Error setting up snapshot listener:', err);
      return () => {};
    }
  }

  /**
   * Fetch a single committee by 6-character Join Code from Cloud Firestore
   */
  static async getCommitteeByCode(joinCode: string): Promise<Committee | null> {
    try {
      const cleanCode = joinCode.trim().toUpperCase();
      const snap = await getDocs(collection(db, 'committees'));
      for (const docSnap of snap.docs) {
        const data = docSnap.data() as Committee;
        if (data.joinCode && data.joinCode.trim().toUpperCase() === cleanCode) {
          return { ...data, id: docSnap.id };
        }
      }
    } catch (err) {
      console.log('[FirebaseService] Error fetching by code:', err);
    }
    return null;
  }

  /**
   * Save a newly created committee live to Cloud Firestore
   */
  static async saveCommittee(committee: Committee) {
    try {
      const docRef = doc(db, 'committees', committee.id);
      await setDoc(docRef, committee);
      console.log('[FirebaseService] Saved committee live to Cloud Firestore:', committee.joinCode);
    } catch (err) {
      console.log('[FirebaseService] Error saving committee to cloud:', err);
    }
  }

  /**
   * Add a new member to an existing committee in Cloud Firestore (Live Multi-Device Join)
   */
  static async joinCommittee(committeeId: string, member: Member) {
    try {
      const docRef = doc(db, 'committees', committeeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const members = data.members || [];
        const exists = members.some((m: any) => m.id === member.id || (member.phone && m.phone === member.phone));
        if (!exists) {
          const updatedMembers = [...members, member];
          const totalSlots = data.memberCount || data.numberOfMembers || data.totalCycles || data.duration || 5;
          const isFull = updatedMembers.length >= totalSlots;

          const updatePayload: any = {
            members: updatedMembers,
          };

          // Auto-select random recipient as soon as committee becomes full
          if (isFull) {
            if (!data.currentRecipientId) {
              const randomIndex = Math.floor(Math.random() * updatedMembers.length);
              const chosen = updatedMembers[randomIndex];
              updatePayload.currentRecipientId = chosen.id || chosen.userId;
              console.log('[FirebaseService] Committee is now FULL! Auto-selected recipient:', updatePayload.currentRecipientId);
            }
          }

          await updateDoc(docRef, updatePayload);
          console.log('[FirebaseService] Live member joined cloud committee:', member.name);
        }
      }
    } catch (err) {
      console.log('[FirebaseService] Error joining committee:', err);
    }
  }

  /**
   * Submit payment proof live to Cloud Firestore
   */
  static async submitPaymentProof(committeeId: string, proof: PaymentProof) {
    try {
      const docRef = doc(db, 'committees', committeeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const updatedPayments = [...(data.payments || []), proof];
        await updateDoc(docRef, { payments: updatedPayments });
      }
    } catch (err) {
      console.log('[FirebaseService] Error submitting proof:', err);
    }
  }

  /**
   * Update payout recipient & member status live in Cloud Firestore
   */
  static async updateRecipientWinner(committeeId: string, recipientId: string, cycleIndex: number) {
    try {
      const docRef = doc(db, 'committees', committeeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const updatedMembers = (data.members || []).map((m: any) => {
          const mId = m.id || m.userId;
          if (mId === recipientId) {
            return { ...m, hasReceivedPayout: true, payoutMonthIndex: cycleIndex };
          }
          return m;
        });
        await updateDoc(docRef, {
          currentRecipientId: recipientId,
          members: updatedMembers,
        });
      }
    } catch (err) {
      console.log('[FirebaseService] Error updating recipient:', err);
    }
  }

  /**
   * Submit payment proof screenshot attached to a specific member
   */
  static async submitMemberProof(committeeId: string, memberId: string, proofUrl: string, notes?: string) {
    try {
      const docRef = doc(db, 'committees', committeeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const members = data.members || [];
        const updatedMembers = members.map((m: any) => {
          const mId = m.id || m.userId;
          const match = mId === memberId || 
                        (m.name && memberId && m.name.toLowerCase().includes(memberId.toLowerCase())) ||
                        (memberId && memberId.toLowerCase().includes((m.name || '').toLowerCase()));
          if (match) {
            return {
              ...m,
              paymentProofUrl: proofUrl,
              paymentStatus: 'submitted',
              submittedAt: new Date().toISOString(),
              paymentNotes: notes || '',
            };
          }
          return m;
        });

        await updateDoc(docRef, { members: updatedMembers });
        console.log('[FirebaseService] Submitted member payment proof in Firestore for:', memberId);
      }
    } catch (err) {
      console.log('[FirebaseService] Error submitting member proof:', err);
    }
  }

  /**
   * Recipient verifies member payment in Cloud Firestore
   */
  static async verifyMemberPayment(committeeId: string, memberId: string) {
    try {
      const docRef = doc(db, 'committees', committeeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const members = data.members || [];
        const updatedMembers = members.map((m: any) => {
          const mId = m.id || m.userId;
          const match = mId === memberId || 
                        (m.name && memberId && m.name.toLowerCase().includes(memberId.toLowerCase())) ||
                        (memberId && memberId.toLowerCase().includes((m.name || '').toLowerCase()));
          if (match) {
            return {
              ...m,
              paymentStatus: 'verified',
              verifiedAt: new Date().toISOString(),
            };
          }
          return m;
        });

        await updateDoc(docRef, { members: updatedMembers });
        console.log('[FirebaseService] Verified member payment in Firestore for:', memberId);
      }
    } catch (err) {
      console.log('[FirebaseService] Error verifying member payment:', err);
    }
  }

  /**
   * Delete a committee from Cloud Firestore
   */
  static async deleteCommittee(committeeId: string) {
    try {
      const docRef = doc(db, 'committees', committeeId);
      await deleteDoc(docRef);
      console.log('[FirebaseService] Deleted committee from Cloud Firestore:', committeeId);
    } catch (err) {
      console.log('[FirebaseService] Error deleting committee from cloud:', err);
    }
  }

  /**
   * Persist User Profile to Cloud Firestore by User ID and Phone
   */
  static async saveUserProfile(user: UserProfile) {
    try {
      if (!user || !user.phone) return;
      const cleanPhone = (user.phone || '').replace(/[^0-9]/g, '');
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, user, { merge: true });

      if (cleanPhone) {
        const phoneRef = doc(db, 'users_by_phone', cleanPhone);
        await setDoc(phoneRef, user, { merge: true });
      }
      console.log('[FirebaseService] Saved user profile to Cloud Firestore:', user.id, user.name);
    } catch (err) {
      console.log('[FirebaseService] Error saving user profile to cloud:', err);
    }
  }

  /**
   * Retrieve User Profile from Cloud Firestore by phone
   */
  static async getUserProfileByPhone(phone: string): Promise<UserProfile | null> {
    try {
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
      if (!cleanPhone) return null;

      const phoneRef = doc(db, 'users_by_phone', cleanPhone);
      const snap = await getDoc(phoneRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      console.log('[FirebaseService] Error getting user profile by phone:', err);
      return null;
    }
  }
}
