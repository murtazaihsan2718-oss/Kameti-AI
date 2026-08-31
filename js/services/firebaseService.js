// Web Firebase Service (Pure ES Module JavaScript for Web Browser)
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
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
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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

// Rich Seed Committees to seed to Cloud Firestore automatically
const SEED_CLOUD_COMMITTEES = [
  {
    id: 'com_friends_2026',
    name: 'Friends Committee',
    creatorId: 'usr_aown',
    numberOfMembers: 5,
    memberCount: 5,
    contributionAmount: 20000,
    frequency: 'monthly',
    duration: 5,
    totalCycles: 5,
    currentCycle: 1,
    startDate: '2026-08-01',
    recipientSelectionMethod: 'random',
    selectionMode: 'random',
    status: 'active',
    joinCode: 'FRIEND5',
    createdAt: new Date().toISOString(),
    members: [
      { id: 'usr_aown', name: 'Aown Haider', phone: '+923145550101', avatar: 'user', paymentMethod: 'easypaisa', accountNumber: '0314 5550101', accountTitle: 'Aown Haider', hasReceivedPayout: false },
      { id: 'usr_ahmed', name: 'Ahmed Khan', phone: '+923005550202', avatar: 'user', paymentMethod: 'jazzcash', accountNumber: '0300 5550202', accountTitle: 'Ahmed Khan', hasReceivedPayout: true },
      { id: 'usr_hamza', name: 'Hamza Ali', phone: '+923215550303', avatar: 'user', paymentMethod: 'sadapay', accountNumber: '0321 5550303', accountTitle: 'Hamza Ali', hasReceivedPayout: false },
      { id: 'usr_bilal', name: 'Bilal Tariq', phone: '+923335550404', avatar: 'user', paymentMethod: 'raast', accountNumber: 'PK99BAHL00012345678901', accountTitle: 'Bilal Tariq', hasReceivedPayout: false },
      { id: 'usr_fatima', name: 'Fatima Zahra', phone: '+923455550505', avatar: 'user', paymentMethod: 'nayapay', accountNumber: '0345 5550505', accountTitle: 'Fatima Zahra', hasReceivedPayout: false }
    ],
    payments: []
  },
  {
    id: 'com_office_2026',
    name: 'Office Beesi 2026',
    creatorId: 'usr_hamza',
    numberOfMembers: 4,
    memberCount: 4,
    contributionAmount: 50000,
    frequency: 'monthly',
    duration: 4,
    totalCycles: 4,
    currentCycle: 1,
    startDate: '2026-08-15',
    recipientSelectionMethod: 'voting',
    selectionMode: 'voting',
    status: 'active',
    joinCode: 'OFFICE4',
    createdAt: new Date().toISOString(),
    members: [
      { id: 'usr_aown', name: 'Aown Haider', phone: '+923145550101', avatar: 'user', paymentMethod: 'easypaisa', accountNumber: '0314 5550101', accountTitle: 'Aown Haider', hasReceivedPayout: false },
      { id: 'usr_hamza', name: 'Hamza Ali', phone: '+923215550303', avatar: 'user', paymentMethod: 'sadapay', accountNumber: '0321 5550303', accountTitle: 'Hamza Ali', hasReceivedPayout: false },
      { id: 'usr_bilal', name: 'Bilal Tariq', phone: '+923335550404', avatar: 'user', paymentMethod: 'raast', accountNumber: 'PK99BAHL00012345678901', accountTitle: 'Bilal Tariq', hasReceivedPayout: false },
      { id: 'usr_ahmed', name: 'Ahmed Khan', phone: '+923005550202', avatar: 'user', paymentMethod: 'jazzcash', accountNumber: '0300 5550202', accountTitle: 'Ahmed Khan', hasReceivedPayout: false }
    ],
    payments: []
  }
];

export class FirebaseService {
  /**
   * Seed sample committees to Cloud Firestore if missing
   */
  static async seedCloudCommittees() {
    try {
      for (const comm of SEED_CLOUD_COMMITTEES) {
        const docRef = doc(db, 'committees', comm.id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          await setDoc(docRef, comm);
          console.log('[FirebaseService Web] Seeded cloud committee:', comm.joinCode);
        }
      }
    } catch (e) {
      console.log('[FirebaseService Web] Cloud seed note:', e);
    }
  }

  /**
   * Listen to real-time Cloud Firestore updates for all committees across devices
   */
  static subscribeCommittees(onUpdate) {
    try {
      const committeesRef = collection(db, 'committees');
      return onSnapshot(committeesRef, (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (list.length > 0) {
          onUpdate(list);
        }
      }, (err) => {
        console.log('[FirebaseService Web] Firestore snapshot fallback:', err.message);
      });
    } catch (err) {
      console.log('[FirebaseService Web] Error setting up snapshot listener:', err);
      return () => {};
    }
  }

  /**
   * Fetch a single committee by 6-character Join Code from Cloud Firestore
   */
  static async getCommitteeByCode(joinCode) {
    try {
      const cleanCode = joinCode.trim().toUpperCase();
      const snap = await getDocs(collection(db, 'committees'));
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.joinCode && data.joinCode.trim().toUpperCase() === cleanCode) {
          return { ...data, id: docSnap.id };
        }
      }
    } catch (err) {
      console.log('[FirebaseService Web] Error fetching by code:', err);
    }
    return null;
  }

  /**
   * Save a newly created committee live to Cloud Firestore
   */
  static async saveCommittee(committee) {
    try {
      const docRef = doc(db, 'committees', committee.id);
      await setDoc(docRef, committee);
      console.log('[FirebaseService Web] Saved committee live to Cloud Firestore:', committee.joinCode);
    } catch (err) {
      console.log('[FirebaseService Web] Error saving committee to cloud:', err);
    }
  }

  /**
   * Add a new member to an existing committee in Cloud Firestore (Live Multi-Device Join)
   */
  static async joinCommittee(committeeId, member) {
    try {
      let docRef = doc(db, 'committees', committeeId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const snap = await getDocs(collection(db, 'committees'));
        for (const d of snap.docs) {
          const cData = d.data();
          if (d.id === committeeId || cData.id === committeeId || cData.joinCode === committeeId) {
            docRef = doc(db, 'committees', d.id);
            docSnap = d;
            break;
          }
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        const members = data.members || [];
        const cleanExisting = members.filter(m => !(m.id === 'm1' && m.name === 'Committee Creator'));
        const exists = cleanExisting.some((m) => m.id === member.id || (member.phone && m.phone === member.phone));
        
        if (!exists) {
          const updatedMembers = [...cleanExisting, member];
          const totalSlots = data.memberCount || data.numberOfMembers || data.totalCycles || data.duration || 5;
          const isFull = updatedMembers.length >= totalSlots;

          const updatePayload = {
            members: updatedMembers,
          };

          if (isFull) {
            if (!data.currentRecipientId) {
              const randomIndex = Math.floor(Math.random() * updatedMembers.length);
              const chosen = updatedMembers[randomIndex];
              updatePayload.currentRecipientId = chosen.id || chosen.userId;
              console.log('[FirebaseService Web] Committee is now FULL! Auto-selected recipient:', updatePayload.currentRecipientId);
            }
          }

          await updateDoc(docRef, updatePayload);
          console.log('[FirebaseService Web] Live member joined cloud committee:', member.name);
        }
      }
    } catch (err) {
      console.log('[FirebaseService Web] Error joining committee:', err);
    }
  }

  /**
   * Submit payment proof screenshot attached to a specific member
   */
  static async submitMemberProof(committeeId, memberId, proofUrl, notes = '') {
    try {
      let docRef = doc(db, 'committees', committeeId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const snap = await getDocs(collection(db, 'committees'));
        for (const d of snap.docs) {
          const cData = d.data();
          if (d.id === committeeId || cData.id === committeeId || cData.joinCode === committeeId) {
            docRef = doc(db, 'committees', d.id);
            docSnap = d;
            break;
          }
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        const members = data.members || [];
        const updatedMembers = members.map((m) => {
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
        console.log('[FirebaseService Web] Live member proof updated in Cloud Firestore for:', memberId);
      }
    } catch (err) {
      console.log('[FirebaseService Web] Error submitting member proof:', err);
    }
  }

  /**
   * Recipient verifies member payment in Cloud Firestore
   */
  static async verifyMemberPayment(committeeId, memberId) {
    try {
      let docRef = doc(db, 'committees', committeeId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const snap = await getDocs(collection(db, 'committees'));
        for (const d of snap.docs) {
          const cData = d.data();
          if (d.id === committeeId || cData.id === committeeId || cData.joinCode === committeeId) {
            docRef = doc(db, 'committees', d.id);
            docSnap = d;
            break;
          }
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        const members = data.members || [];
        const updatedMembers = members.map((m) => {
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
        console.log('[FirebaseService Web] Live member payment verified in Cloud Firestore for:', memberId);
      }
    } catch (err) {
      console.log('[FirebaseService Web] Error verifying member payment:', err);
    }
  }

  /**
   * Submit payment proof live to Cloud Firestore (Status: submitted)
   */
  static async submitPaymentProof(committeeId, proof) {
    try {
      let docRef = doc(db, 'committees', committeeId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const snap = await getDocs(collection(db, 'committees'));
        for (const d of snap.docs) {
          const cData = d.data();
          if (d.id === committeeId || cData.id === committeeId || cData.joinCode === committeeId) {
            docRef = doc(db, 'committees', d.id);
            docSnap = d;
            break;
          }
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        let payments = data.payments || [];
        const pIdx = payments.findIndex(p => p.payerUserId === proof.payerUserId || p.id === proof.id || p.paymentId === proof.paymentId);
        
        if (pIdx >= 0) {
          payments[pIdx] = { ...payments[pIdx], ...proof, status: 'submitted' };
        } else {
          payments.push({ ...proof, status: 'submitted' });
        }

        await updateDoc(docRef, { payments });
        console.log('[FirebaseService Web] Live payment proof submitted for user:', proof.payerUserId);
      }
    } catch (err) {
      console.log('[FirebaseService Web] Error submitting proof:', err);
    }
  }

  /**
   * Recipient approves & verifies member payment live in Cloud Firestore (Status: verified)
   */
  static async verifyPayment(committeeId, payerUserId, verifiedByUserId) {
    try {
      let docRef = doc(db, 'committees', committeeId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const snap = await getDocs(collection(db, 'committees'));
        for (const d of snap.docs) {
          const cData = d.data();
          if (d.id === committeeId || cData.id === committeeId || cData.joinCode === committeeId) {
            docRef = doc(db, 'committees', d.id);
            docSnap = d;
            break;
          }
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        let payments = data.payments || [];
        const pIdx = payments.findIndex(p => p.payerUserId === payerUserId);
        
        if (pIdx >= 0) {
          payments[pIdx] = {
            ...payments[pIdx],
            status: 'verified',
            verifiedBy: verifiedByUserId,
            verifiedAt: new Date().toISOString()
          };
        } else {
          payments.push({
            id: 'pay_' + committeeId + '_' + payerUserId,
            payerUserId,
            status: 'verified',
            verifiedBy: verifiedByUserId,
            verifiedAt: new Date().toISOString()
          });
        }

        await updateDoc(docRef, { payments });
        console.log('[FirebaseService Web] Live payment verified for user:', payerUserId);
      }
    } catch (err) {
      console.log('[FirebaseService Web] Error verifying payment:', err);
    }
  }

  /**
   * Delete or remove uploaded payment proof from Cloud Firestore
   */
  static async deletePaymentProof(committeeId, payerUserId) {
    try {
      let docRef = doc(db, 'committees', committeeId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const snap = await getDocs(collection(db, 'committees'));
        for (const d of snap.docs) {
          const cData = d.data();
          if (d.id === committeeId || cData.id === committeeId || cData.joinCode === committeeId) {
            docRef = doc(db, 'committees', d.id);
            docSnap = d;
            break;
          }
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        const payments = (data.payments || []).filter(p => p.payerUserId !== payerUserId);
        await updateDoc(docRef, { payments });
        console.log('[FirebaseService Web] Payment proof removed for user:', payerUserId);
      }
    } catch (err) {
      console.log('[FirebaseService Web] Error deleting proof:', err);
    }
  }

  /**
   * Update payout recipient & member status live in Cloud Firestore.
   * Excludes the winner from receiving future payouts in this committee.
   */
  static async updateRecipientWinner(committeeId, recipientId, cycleIndex = 1) {
    try {
      let docRef = doc(db, 'committees', committeeId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const snap = await getDocs(collection(db, 'committees'));
        for (const d of snap.docs) {
          const cData = d.data();
          if (d.id === committeeId || cData.id === committeeId || cData.joinCode === committeeId) {
            docRef = doc(db, 'committees', d.id);
            docSnap = d;
            break;
          }
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        const updatedMembers = (data.members || []).map((m) =>
          (m.id === recipientId || m.userId === recipientId)
            ? { ...m, hasReceivedPayout: true, payoutMonthIndex: cycleIndex }
            : m
        );
        const pastRecipients = Array.from(new Set([...(data.pastRecipients || []), recipientId]));

        await updateDoc(docRef, {
          currentRecipientId: recipientId,
          pastRecipients,
          members: updatedMembers,
          currentCycle: cycleIndex,
        });
        console.log('[FirebaseService Web] Live recipient updated in Cloud Firestore:', recipientId);
      }
    } catch (err) {
      console.log('[FirebaseService Web] Error updating recipient:', err);
    }
  }

  /**
   * Start a multi-device synchronized voting session with a 60-second timer
   */
  static async startVotingSession(committeeId, monthId, durationSeconds = 60) {
    try {
      let docRef = doc(db, 'committees', committeeId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const snap = await getDocs(collection(db, 'committees'));
        for (const d of snap.docs) {
          const cData = d.data();
          if (d.id === committeeId || cData.id === committeeId || cData.joinCode === committeeId) {
            docRef = doc(db, 'committees', d.id);
            docSnap = d;
            break;
          }
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        let votingSession = data.votingSession;

        // If no active session or month changed, start a fresh one
        if (!votingSession || votingSession.monthId !== monthId || votingSession.status === 'completed') {
          votingSession = {
            monthId,
            startTime: Date.now(),
            durationSeconds,
            status: 'active',
            votes: [],
            winnerUserId: null
          };
          await updateDoc(docRef, { votingSession });
          console.log('[FirebaseService Web] Live voting session started:', votingSession);
        }
        return votingSession;
      }
    } catch (err) {
      console.log('[FirebaseService Web] Error starting voting session:', err);
    }
    return null;
  }

  /**
   * Cast a vote live in Cloud Firestore (1 vote per user)
   */
  static async castVote(committeeId, { voterUserId, candidateUserId, committeeMonthId }) {
    try {
      let docRef = doc(db, 'committees', committeeId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const snap = await getDocs(collection(db, 'committees'));
        for (const d of snap.docs) {
          const cData = d.data();
          if (d.id === committeeId || cData.id === committeeId || cData.joinCode === committeeId) {
            docRef = doc(db, 'committees', d.id);
            docSnap = d;
            break;
          }
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        let votes = data.votes || [];
        let votingSession = data.votingSession || {
          monthId: committeeMonthId,
          startTime: Date.now(),
          durationSeconds: 60,
          status: 'active',
          votes: []
        };

        // Enforce 1 vote per user
        votes = votes.filter(v => v.voterUserId !== voterUserId && (v.committeeMonthId === committeeMonthId || v.monthId === committeeMonthId));
        const newVote = {
          voterUserId,
          candidateUserId,
          committeeMonthId,
          timestamp: Date.now()
        };
        votes.push(newVote);

        if (votingSession) {
          votingSession.votes = votes;
        }

        await updateDoc(docRef, { votes, votingSession });
        console.log('[FirebaseService Web] Live vote recorded for:', voterUserId, '->', candidateUserId);
      }
    } catch (err) {
      console.log('[FirebaseService Web] Error casting vote:', err);
    }
  }

  /**
   * Finalize voting session in Cloud Firestore and assign winner
   */
  static async finalizeVoting(committeeId, winnerUserId, cycleIndex = 1) {
    try {
      let docRef = doc(db, 'committees', committeeId);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const snap = await getDocs(collection(db, 'committees'));
        for (const d of snap.docs) {
          const cData = d.data();
          if (d.id === committeeId || cData.id === committeeId || cData.joinCode === committeeId) {
            docRef = doc(db, 'committees', d.id);
            docSnap = d;
            break;
          }
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        let votingSession = data.votingSession || {};
        votingSession.status = 'completed';
        votingSession.winnerUserId = winnerUserId;

        const updatedMembers = (data.members || []).map((m) =>
          (m.id === winnerUserId || m.userId === winnerUserId)
            ? { ...m, hasReceivedPayout: true, payoutMonthIndex: cycleIndex }
            : m
        );
        const pastRecipients = Array.from(new Set([...(data.pastRecipients || []), winnerUserId]));

        await updateDoc(docRef, {
          currentRecipientId: winnerUserId,
          pastRecipients,
          members: updatedMembers,
          currentCycle: cycleIndex,
          votingSession
        });
        console.log('[FirebaseService Web] Live voting finalized with winner:', winnerUserId);
      }
    } catch (err) {
      console.log('[FirebaseService Web] Error finalizing voting:', err);
    }
  }

  /**
   * Delete committee from Cloud Firestore
   */
  static async deleteCommittee(committeeId) {
    try {
      let docRef = doc(db, 'committees', committeeId);
      let docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const snap = await getDocs(collection(db, 'committees'));
        for (const d of snap.docs) {
          const cData = d.data();
          if (d.id === committeeId || cData.id === committeeId || cData.joinCode === committeeId) {
            docRef = doc(db, 'committees', d.id);
            break;
          }
        }
      }
      await deleteDoc(docRef);
      console.log('[FirebaseService Web] Deleted committee from Cloud Firestore:', committeeId);
    } catch (err) {
      console.log('[FirebaseService Web] Error deleting committee from cloud:', err);
    }
  }

  /**
   * Persist User Profile to Cloud Firestore by User ID and Phone
   */
  static async saveUserProfile(user) {
    try {
      if (!user || !user.phone) return;
      const cleanPhone = (user.phone || '').replace(/[^0-9]/g, '');
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, user, { merge: true });

      if (cleanPhone) {
        const phoneRef = doc(db, 'users_by_phone', cleanPhone);
        await setDoc(phoneRef, user, { merge: true });
      }
      console.log('[FirebaseService Web] Saved user profile to Cloud Firestore:', user.id, user.name);
    } catch (err) {
      console.log('[FirebaseService Web] Error saving user profile to cloud:', err);
    }
  }

  /**
   * Retrieve User Profile from Cloud Firestore by phone
   */
  static async getUserProfileByPhone(phone) {
    try {
      const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
      if (!cleanPhone) return null;

      const phoneRef = doc(db, 'users_by_phone', cleanPhone);
      const snap = await getDoc(phoneRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (err) {
      console.log('[FirebaseService Web] Error getting user profile by phone:', err);
      return null;
    }
  }
}
