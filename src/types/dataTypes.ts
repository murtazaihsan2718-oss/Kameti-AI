// Data Interfaces for Kameti Native Mobile App

export type SelectionMode = 'random' | 'voting';
export type PaymentMethod = 'easypaisa' | 'jazzcash' | 'sadapay' | 'nayapay' | 'raast' | 'bank' | 'cash' | 'EasyPaisa' | 'JazzCash' | 'SadaPay' | 'NayaPay' | 'Raast' | 'Bank' | 'Cash';
export type CommitteeStatus = 'active' | 'on_track' | 'due_soon' | 'overdue' | 'completed';
export type PaymentStatus = 'pending' | 'submitted' | 'verified' | 'rejected';

export interface Member {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  avatar?: string;
  paymentMethod: PaymentMethod;
  accountNumber: string;
  accountTitle: string;
  hasReceivedPayout: boolean;
  payoutMonthIndex?: number;
  paymentProofUrl?: string;
  paymentStatus?: PaymentStatus;
  submittedAt?: string;
  verifiedAt?: string;
  paymentNotes?: string;
}

export interface PaymentProof {
  id: string;
  committeeId: string;
  memberId: string;
  cycleIndex: number;
  amount: number;
  proofImageUrl?: string;
  notes?: string;
  submittedAt: string;
  status: PaymentStatus;
}

export interface Vote {
  voterId: string;
  candidateId: string;
  timestamp: string;
}

export interface Committee {
  id: string;
  name: string;
  joinCode: string;
  memberCount: number;
  numberOfMembers?: number;
  contributionAmount: number;
  totalPool: number;
  frequency: 'monthly' | 'custom';
  selectionMode: SelectionMode;
  recipientSelectionMethod?: SelectionMode;
  startDate: string;
  currentCycle: number;
  totalCycles: number;
  duration?: number;
  currentRecipientId: string;
  status: CommitteeStatus;
  nextDueDate?: string;
  members: Member[];
  payments: PaymentProof[];
  votes?: Vote[];
  history?: {
    cycleIndex: number;
    monthName: string;
    recipientId: string;
    completedAt: string;
    poolAmount: number;
  }[];
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  paymentMethod: PaymentMethod;
  accountNumber: string;
  accountTitle: string;
  isNewUser: boolean;
  stats: {
    activeCommittees: number;
    completedCommittees: number;
    totalContributions: number;
    totalPayouts: number;
  };
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  committeeId?: string;
  type: 'reminder' | 'payment_received' | 'payout_alert' | 'vote_started';
}
