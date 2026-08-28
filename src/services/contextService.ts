import { nativeStorageService } from './storageService';
import { Committee, Member, UserProfile } from '../types/dataTypes';

export interface UserCommitteeContextItem {
  committeeId: string;
  committeeName: string;
  joinCode: string;
  contributionAmount: number;
  totalPool: number;
  frequency: string;
  currentCycle: number;
  totalCycles: number;
  nextDueDate: string | null;
  status: string;
  userPayment: {
    amountDue: number;
    paymentStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
    submittedAt?: string;
    verifiedAt?: string;
  };
  payout: {
    currentRecipientName: string;
    isUserCurrentRecipient: boolean;
    hasUserReceivedPayout: boolean;
    userPayoutCycleIndex: number | null;
    payoutTurnSummary: string;
  };
  otherMembers: Array<{
    name: string;
    hasReceivedPayout: boolean;
    isCurrentRecipient: boolean;
    paymentStatus?: string;
  }>;
}

export interface UserKametiContext {
  user: {
    id: string;
    name: string;
    phone: string;
  };
  totalActiveCommittees: number;
  totalMonthlyContributionDue: number;
  committees: UserCommitteeContextItem[];
}

/**
 * Builds a clean, read-only, user-scoped Kameti context object
 * for the AI assistant from local and Firestore-synced data.
 */
export async function buildUserKametiContext(): Promise<UserKametiContext> {
  const user: UserProfile | null = await nativeStorageService.getUser();
  const allCommittees: Committee[] = await nativeStorageService.getCommittees();

  if (!user) {
    return {
      user: {
        id: 'guest',
        name: 'Guest User',
        phone: '',
      },
      totalActiveCommittees: 0,
      totalMonthlyContributionDue: 0,
      committees: [],
    };
  }

  const cleanUserPhone = (user.phone || '').replace(/\D/g, '');
  const userNameLower = (user.name || '').toLowerCase();

  const userCommittees: UserCommitteeContextItem[] = [];
  let totalDue = 0;

  for (const committee of allCommittees) {
    const members = committee.members || [];
    
    // Locate the current user in this committee's member list
    const userMember = members.find((m) => {
      if (m.id === user.id || m.userId === user.id) return true;
      if (cleanUserPhone && m.phone && m.phone.replace(/\D/g, '') === cleanUserPhone) return true;
      const mNameLower = (m.name || '').toLowerCase();
      if (mNameLower.includes('(you)') || mNameLower.includes(userNameLower)) return true;
      return false;
    });

    // If user is not part of this committee, skip it (strict user scoping)
    if (!userMember && members.length > 0) {
      continue;
    }

    const contribution = committee.contributionAmount || 0;
    const currentCycle = committee.currentCycle || 1;
    const totalCycles = committee.totalCycles || committee.memberCount || committee.numberOfMembers || 5;
    const isFull = members.length >= totalCycles;
    const totalPool = committee.totalPool || (contribution * totalCycles);

    // If committee is still forming (waiting for members to fill all slots)
    if (!isFull) {
      userCommittees.push({
        committeeId: committee.id,
        committeeName: committee.name,
        joinCode: committee.joinCode,
        contributionAmount: contribution,
        totalPool,
        frequency: committee.frequency || 'monthly',
        currentCycle: 0,
        totalCycles,
        nextDueDate: null,
        status: `forming (${members.length} of ${totalCycles} slots filled - NOT STARTED)`,
        userPayment: {
          amountDue: 0,
          paymentStatus: 'pending',
        },
        payout: {
          currentRecipientName: 'None (Committee not started)',
          isUserCurrentRecipient: false,
          hasUserReceivedPayout: false,
          userPayoutCycleIndex: null,
          payoutTurnSummary: `Committee is still forming (${members.length} of ${totalCycles} slots filled). It has NOT started yet. No contributions are due and no payouts will be issued until all ${totalCycles} slots are filled.`,
        },
        otherMembers: members
          .filter(m => !userMember || m.id !== userMember.id)
          .map(m => ({
            name: m.name.replace(/\s*\(You\)/i, '').trim(),
            hasReceivedPayout: false,
            isCurrentRecipient: false,
            paymentStatus: 'pending',
          })),
      });
      continue;
    }

    // Committee is FULL and ACTIVE
    let userPaymentStatus: 'pending' | 'submitted' | 'verified' | 'rejected' =
      userMember?.paymentStatus || 'pending';

    // Check if there is a payment proof recorded in committee.payments
    if (committee.payments && userMember) {
      const proof = committee.payments.find(
        p => p.memberId === userMember.id && p.cycleIndex === currentCycle
      );
      if (proof && proof.status) {
        userPaymentStatus = proof.status;
      }
    }

    // Determine current recipient
    const currentRecipient = members.find(
      m => m.id === committee.currentRecipientId || m.userId === committee.currentRecipientId
    );
    const currentRecipientName = currentRecipient
      ? currentRecipient.name.replace(/\s*\(You\)/i, '').trim()
      : committee.currentRecipientId
      ? 'Selected Member'
      : 'Not yet selected';

    const isUserCurrentRecipient = userMember
      ? committee.currentRecipientId === userMember.id ||
        committee.currentRecipientId === userMember.userId ||
        (currentRecipient && (currentRecipient.id === userMember.id || currentRecipient.userId === userMember.id))
      : false;

    // Only non-recipients with pending status owe monthly contribution
    if (!isUserCurrentRecipient && userPaymentStatus === 'pending') {
      totalDue += contribution;
    }

    // Determine user payout turn summary
    let payoutTurnSummary = '';
    const hasReceived = userMember?.hasReceivedPayout || false;
    const payoutCycle = userMember?.payoutMonthIndex || null;

    if (isUserCurrentRecipient) {
      payoutTurnSummary = `User IS the payout recipient for this current cycle (#${currentCycle}) and will receive the full pool of PKR ${totalPool.toLocaleString()}!`;
    } else if (hasReceived) {
      payoutTurnSummary = `Already received full payout pool in cycle #${payoutCycle || 1}.`;
    } else if (payoutCycle) {
      payoutTurnSummary = `Scheduled to receive full payout pool of PKR ${totalPool.toLocaleString()} in cycle #${payoutCycle} of ${totalCycles}.`;
    } else if (committee.selectionMode === 'voting') {
      payoutTurnSummary = `Will receive PKR ${totalPool.toLocaleString()} in an upcoming cycle (decided by member voting).`;
    } else {
      payoutTurnSummary = `Will receive PKR ${totalPool.toLocaleString()} in an upcoming cycle (decided by lucky draw).`;
    }

    // Prepare anonymized summaries of other members (no bank details, no passwords)
    const otherMembers = members
      .filter(m => !userMember || m.id !== userMember.id)
      .map(m => ({
        name: m.name.replace(/\s*\(You\)/i, '').trim(),
        hasReceivedPayout: !!m.hasReceivedPayout,
        isCurrentRecipient: m.id === committee.currentRecipientId || m.userId === committee.currentRecipientId,
        paymentStatus: m.paymentStatus || 'pending',
      }));

    userCommittees.push({
      committeeId: committee.id,
      committeeName: committee.name,
      joinCode: committee.joinCode,
      contributionAmount: contribution,
      totalPool,
      frequency: committee.frequency || 'monthly',
      currentCycle,
      totalCycles,
      nextDueDate: committee.nextDueDate || null,
      status: committee.status || 'active',
      userPayment: {
        amountDue: isUserCurrentRecipient ? 0 : contribution,
        paymentStatus: userPaymentStatus,
        submittedAt: userMember?.submittedAt,
        verifiedAt: userMember?.verifiedAt,
      },
      payout: {
        currentRecipientName,
        isUserCurrentRecipient: !!isUserCurrentRecipient,
        hasUserReceivedPayout: hasReceived,
        userPayoutCycleIndex: payoutCycle,
        payoutTurnSummary,
      },
      otherMembers,
    });
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
    },
    totalActiveCommittees: userCommittees.length,
    totalMonthlyContributionDue: totalDue,
    committees: userCommittees,
  };
}
