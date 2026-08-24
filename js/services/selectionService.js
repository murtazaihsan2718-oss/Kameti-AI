// Recipient Selection Service: Deterministic Random Spinner & Live Voting Engine

import { storageService } from './storageService.js';
import { authService } from './authService.js';
import { PaymentStatus } from '../models/dataModels.js';

class SelectionService {
  /**
   * Randomly and fairly select recipient from eligible committee members.
   * Any member who has already received a payout is permanently excluded from future draws.
   * @param {string} committeeId 
   * @param {string} monthId 
   */
  executeRandomSelection(committeeId, monthId) {
    const committees = storageService.getCommittees();
    const commIdx = committees.findIndex(c => c.id === committeeId);
    const committee = commIdx !== -1 ? committees[commIdx] : null;

    let months = storageService.getMonths().filter(m => m.committeeId === committeeId);
    let targetMonth = monthId ? months.find(m => m.id === monthId) : (months.find(m => m.status === 'active' || m.status === 'pending_selection' || m.status === 'voting') || months[0]);
    let members = storageService.getMembers().filter(m => m.committeeId === committeeId);

    // Filter out dummy/ghost members if any exist
    if (members.length > 1) {
      members = members.filter(m => !(m.userId === 'm1' && m.user?.name === 'Committee Creator'));
    }

    if (!targetMonth) {
      targetMonth = {
        id: 'mon_' + committeeId + '_' + (months.length + 1),
        committeeId,
        monthNumber: months.length + 1,
        monthName: 'Month ' + (months.length + 1),
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        recipientUserId: null,
        selectionMethod: committee ? committee.recipientSelectionMethod : 'random',
        status: 'active'
      };
      const allMonths = storageService.getMonths();
      allMonths.push(targetMonth);
      storageService.setMonths(allMonths);
    }

    if (targetMonth.recipientUserId) {
      // Already selected permanently
      const user = storageService.getUsers().find(u => u.id === targetMonth.recipientUserId) || {
        id: targetMonth.recipientUserId,
        name: 'Selected Recipient',
        paymentMethod: 'Easypaisa',
        paymentNumber: '03000000000'
      };
      const memIdx = members.findIndex(m => m.userId === targetMonth.recipientUserId);
      return { recipient: user, alreadySelected: true, memberIndex: memIdx >= 0 ? memIdx : 0 };
    }

    // Find previous recipients in this committee across all cycles
    const previousRecipientIds = new Set();
    
    // 1. Check all past months for this committee
    months.forEach(m => {
      if (m.recipientUserId) previousRecipientIds.add(m.recipientUserId);
    });

    // 2. Check committee.pastRecipients if stored
    if (committee && Array.isArray(committee.pastRecipients)) {
      committee.pastRecipients.forEach(id => previousRecipientIds.add(id));
    }

    // 3. Filter members who have NOT yet received a payout
    let eligibleMembers = members.filter(m => !previousRecipientIds.has(m.userId) && !m.hasReceivedPayout);

    if (eligibleMembers.length === 0) {
      // If all have received, no eligible member remains
      throw new Error('All committee members have already received their payout!');
    }

    // Fair random selection among strictly eligible members
    const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
    const selectedMember = eligibleMembers[randomIndex];
    
    let recipientUser = storageService.getUsers().find(u => u.id === selectedMember.userId);
    if (!recipientUser) {
      recipientUser = {
        id: selectedMember.userId,
        name: selectedMember.user?.name || 'Member',
        verifiedPhone: selectedMember.user?.verifiedPhone || '+923000000000',
        paymentMethod: selectedMember.user?.paymentMethod || 'Easypaisa',
        paymentNumber: selectedMember.user?.paymentNumber || '03000000000',
        createdAt: new Date().toISOString()
      };
      const allUsers = storageService.getUsers();
      allUsers.push(recipientUser);
      storageService.setUsers(allUsers);
    }

    // Save permanently in database / local storage
    targetMonth.recipientUserId = selectedMember.userId;
    targetMonth.status = 'active';

    const allMonths = storageService.getMonths();
    const mIdx = allMonths.findIndex(m => m.id === targetMonth.id);
    if (mIdx !== -1) {
      allMonths[mIdx] = targetMonth;
    } else {
      allMonths.push(targetMonth);
    }
    storageService.setMonths(allMonths);

    // Mark in committee pastRecipients
    if (committee) {
      committee.pastRecipients = Array.from(new Set([...(committee.pastRecipients || []), selectedMember.userId]));
      committees[commIdx] = committee;
      storageService.setCommittees(committees);
    }

    // Mark member record as having received payout
    selectedMember.hasReceivedPayout = true;
    const allMembers = storageService.getMembers();
    const memIdx = allMembers.findIndex(m => m.committeeId === committeeId && m.userId === selectedMember.userId);
    if (memIdx !== -1) {
      allMembers[memIdx].hasReceivedPayout = true;
      storageService.setMembers(allMembers);
    }

    // Update payments for this month
    const allPayments = storageService.getPayments();
    let updatedPayments = false;
    allPayments.forEach(p => {
      if (p.committeeMonthId === targetMonth.id || (p.committeeId === committeeId && !p.recipientUserId)) {
        p.recipientUserId = selectedMember.userId;
        if (p.payerUserId === selectedMember.userId) {
          p.status = PaymentStatus.VERIFIED;
          p.submittedAt = new Date().toISOString();
          p.verifiedAt = new Date().toISOString();
        }
        updatedPayments = true;
      }
    });
    if (updatedPayments) {
      storageService.setPayments(allPayments);
    }

    const memberIndex = members.findIndex(m => m.userId === selectedMember.userId);

    return {
      recipient: recipientUser,
      memberIndex: memberIndex >= 0 ? memberIndex : 0,
      totalMembers: members.length,
      alreadySelected: false
    };
  }

  /**
   * Cast a vote for a candidate in the active voting month
   * @param {string} monthId 
   * @param {string} candidateUserId 
   */
  castVote(monthId, candidateUserId) {
    const user = authService.getCurrentUser() || storageService.getCurrentUser();
    if (!user) throw new Error('Please login to vote');

    const votes = storageService.getVotes();
    
    // Check if user already voted in this month
    const existingVote = votes.find(v => v.committeeMonthId === monthId && v.voterUserId === user.id);
    if (existingVote) {
      throw new Error('You have already cast your vote for this month.');
    }

    const newVote = {
      id: 'v_' + Date.now().toString(36),
      committeeMonthId: monthId,
      voterUserId: user.id,
      candidateUserId,
      createdAt: new Date().toISOString()
    };

    votes.push(newVote);
    storageService.setVotes(votes);

    return newVote;
  }

  /**
   * Get live vote statistics for a month
   * @param {string} committeeId 
   * @param {string} monthId 
   */
  getVotingStatus(committeeId, monthId) {
    let members = storageService.getMembers().filter(m => m.committeeId === committeeId);
    if (members.length > 1) {
      members = members.filter(m => !(m.userId === 'm1' && m.user?.name === 'Committee Creator'));
    }

    const users = storageService.getUsers();
    const votes = storageService.getVotes().filter(v => v.committeeMonthId === monthId);
    const months = storageService.getMonths().filter(m => m.committeeId === committeeId);

    // Filter out previous winners
    const previousRecipientIds = months
      .filter(m => m.id !== monthId && m.recipientUserId)
      .map(m => m.recipientUserId);

    const candidates = members
      .filter(m => !previousRecipientIds.includes(m.userId) && !m.hasReceivedPayout)
      .map(m => {
        const u = users.find(user => user.id === m.userId) || { id: m.userId, name: 'Member' };
        const count = votes.filter(v => v.candidateUserId === m.userId).length;
        return {
          user: u,
          votes: count,
          percentage: votes.length > 0 ? Math.round((count / votes.length) * 100) : 0
        };
      });

    // Sort by votes descending
    candidates.sort((a, b) => b.votes - a.votes);

    return {
      totalVotes: votes.length,
      totalEligibleVoters: members.length,
      candidates,
      allVoted: votes.length >= members.length
    };
  }

  /**
   * Conclude voting and deterministically resolve winner (with tie-breaker if needed)
   * @param {string} committeeId 
   * @param {string} monthId 
   */
  finalizeVoting(committeeId, monthId) {
    const status = this.getVotingStatus(committeeId, monthId);
    const allMonths = storageService.getMonths();
    const targetMonth = allMonths.find(m => m.id === monthId);

    if (!targetMonth) throw new Error('Month not found');

    if (targetMonth.recipientUserId) {
      const user = storageService.getUsers().find(u => u.id === targetMonth.recipientUserId);
      return { winner: user, wasTie: false };
    }

    if (status.candidates.length === 0) {
      throw new Error('No eligible candidates found');
    }

    const topVoteCount = status.candidates[0].votes;
    const topCandidates = status.candidates.filter(c => c.votes === topVoteCount);

    let winner = null;
    let wasTie = false;

    if (topCandidates.length === 1) {
      winner = topCandidates[0].user;
    } else {
      // Tie occurred: fair deterministic tie-breaker
      wasTie = true;
      const randomIdx = Math.floor(Math.random() * topCandidates.length);
      winner = topCandidates[randomIdx].user;
    }

    // Save permanently
    targetMonth.recipientUserId = winner.id;
    targetMonth.status = 'active';
    targetMonth.resolvedWithTie = wasTie;
    storageService.setMonths(allMonths);

    // Mark winner in committee pastRecipients
    const committees = storageService.getCommittees();
    const commIdx = committees.findIndex(c => c.id === committeeId);
    if (commIdx !== -1) {
      const comm = committees[commIdx];
      comm.pastRecipients = Array.from(new Set([...(comm.pastRecipients || []), winner.id]));
      comm.currentRecipientId = winner.id;
      committees[commIdx] = comm;
      storageService.setCommittees(committees);
    }

    // Mark winner in members
    const allMembers = storageService.getMembers();
    const memIdx = allMembers.findIndex(m => m.committeeId === committeeId && m.userId === winner.id);
    if (memIdx !== -1) {
      allMembers[memIdx].hasReceivedPayout = true;
      storageService.setMembers(allMembers);
    }

    // Update payments
    const allPayments = storageService.getPayments();
    allPayments.forEach(p => {
      if (p.committeeMonthId === monthId || p.committeeId === committeeId) {
        p.recipientUserId = winner.id;
        if (p.payerUserId === winner.id) {
          p.status = PaymentStatus.VERIFIED;
          p.submittedAt = new Date().toISOString();
          p.verifiedAt = new Date().toISOString();
        }
      }
    });
    storageService.setPayments(allPayments);

    return {
      winner,
      wasTie,
      candidateVotes: status.candidates
    };
  }
}

export const selectionService = new SelectionService();
