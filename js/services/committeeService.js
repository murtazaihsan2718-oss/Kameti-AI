// Committee Service: CRUD, Join Codes, Member Management, Schedules

import { storageService } from './storageService.js';
import { authService } from './authService.js';
import { CommitteeStatus, SelectionMethods, PaymentStatus } from '../models/dataModels.js';

class CommitteeService {
  /**
   * Get all committees for the currently authenticated user
   */
  getMyCommittees() {
    const user = authService.getCurrentUser();
    if (!user) return [];

    const allCommittees = storageService.getCommittees();
    const allMembers = storageService.getMembers();

    const myMemberCommittees = allMembers
      .filter(m => m.userId === user.id)
      .map(m => m.committeeId);

    return allCommittees.filter(c => myMemberCommittees.includes(c.id));
  }

  /**
   * Get detailed committee data by ID
   * @param {string} committeeId 
   */
  getCommitteeDetails(committeeId) {
    const committee = storageService.getCommittees().find(c => c.id === committeeId);
    if (!committee) return null;

    const allMembers = storageService.getMembers().filter(m => m.committeeId === committeeId);
    const allUsers = storageService.getUsers();

    // Map members with user profile details
    const membersWithProfiles = allMembers.map(m => {
      const u = allUsers.find(user => user.id === m.userId) || {
        id: m.userId,
        name: 'Member',
        verifiedPhone: 'Hidden',
        paymentMethod: 'Easypaisa',
        paymentNumber: '0300 0000000'
      };
      return {
        ...m,
        user: u
      };
    });

    const months = storageService.getMonths().filter(m => m.committeeId === committeeId);
    let currentMonth = months.find(m => m.status === 'active' || m.status === 'voting') || months[0] || null;
    
    if (!currentMonth) {
      currentMonth = {
        id: 'mon_' + committeeId + '_1',
        committeeId,
        monthNumber: 1,
        monthName: 'Month 1',
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        recipientUserId: committee.currentRecipientId || null,
        status: 'active'
      };
      const allM = storageService.getMonths();
      allM.push(currentMonth);
      storageService.setMonths(allM);
    }

    const allStoredPayments = storageService.getPayments();
    const currentPayments = membersWithProfiles.map(m => {
      let p = allStoredPayments.find(pay => (pay.committeeId === committeeId || pay.committeeMonthId === currentMonth.id) && pay.payerUserId === m.userId);
      if (!p) {
        p = {
          id: 'pay_' + committeeId + '_' + m.userId,
          committeeId,
          committeeMonthId: currentMonth.id,
          payerUserId: m.userId,
          recipientUserId: currentMonth.recipientUserId,
          amount: committee.contributionAmount,
          status: (m.userId === currentMonth.recipientUserId) ? PaymentStatus.VERIFIED : PaymentStatus.PENDING
        };
      }
      return p;
    });

    const proofs = storageService.getProofs();

    return {
      committee,
      members: membersWithProfiles,
      months,
      currentMonth,
      currentPayments,
      proofs
    };
  }

  /**
   * Create a new committee
   * @param {object} params
   */
  createCommittee({
    name,
    numberOfMembers,
    contributionAmount,
    frequency = 'monthly',
    duration = null,
    startDate,
    recipientSelectionMethod = SelectionMethods.RANDOM
  }) {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('You must be logged in to create a committee');

    const numMembers = parseInt(numberOfMembers, 10);
    const amount = parseInt(contributionAmount, 10);
    const monthsDuration = duration ? parseInt(duration, 10) : numMembers;

    if (!name || name.trim().length === 0) throw new Error('Committee name is required');
    if (isNaN(numMembers) || numMembers < 2) throw new Error('A committee must have at least 2 members');
    if (isNaN(amount) || amount <= 0) throw new Error('Valid contribution amount is required');

    // Generate unique 6-character Join Code
    const joinCode = 'KMT' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const committeeId = 'com_' + Date.now().toString(36);

    const newCommittee = {
      id: committeeId,
      name: name.trim(),
      creatorId: user.id,
      numberOfMembers: numMembers,
      contributionAmount: amount,
      frequency,
      duration: monthsDuration,
      startDate: startDate || new Date().toISOString().split('T')[0],
      recipientSelectionMethod,
      status: CommitteeStatus.RECRUITING,
      joinCode,
      createdAt: new Date().toISOString()
    };

    // Add creator as first member
    const memberRecord = {
      id: 'm_' + Date.now().toString(36),
      committeeId,
      userId: user.id,
      joinedAt: new Date().toISOString()
    };

    // Save committee and member
    const committees = storageService.getCommittees();
    committees.unshift(newCommittee);
    storageService.setCommittees(committees);

    const members = storageService.getMembers();
    members.push(memberRecord);
    storageService.setMembers(members);

    return newCommittee;
  }

  /**
   * Join Committee via Join Code or Share Link
   * @param {string} joinCode 
   */
  joinCommitteeByCode(joinCode) {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Please login to join this committee');

    const cleanCode = joinCode.trim().toUpperCase();
    const committee = storageService.getCommittees().find(c => c.joinCode === cleanCode);

    if (!committee) {
      throw new Error('Invalid invitation code. Committee not found.');
    }

    const members = storageService.getMembers().filter(m => m.committeeId === committee.id);
    
    // Check if already a member
    if (members.some(m => m.userId === user.id)) {
      return { alreadyMember: true, committee };
    }

    // Check capacity
    if (members.length >= committee.numberOfMembers) {
      throw new Error('This committee is full and is no longer accepting new members.');
    }

    if (committee.status === CommitteeStatus.COMPLETED) {
      throw new Error('This committee has already completed its duration.');
    }

    // Add member
    const newMember = {
      id: 'm_' + Date.now().toString(36),
      committeeId: committee.id,
      userId: user.id,
      joinedAt: new Date().toISOString()
    };

    const allMembers = storageService.getMembers();
    allMembers.push(newMember);
    storageService.setMembers(allMembers);

    // If committee is now full, activate it and initialize Month 1
    if (members.length + 1 >= committee.numberOfMembers) {
      this.activateCommittee(committee.id);
    }

    return { alreadyMember: false, committee };
  }

  /**
   * Activate committee and create Month 1 cycle
   * @param {string} committeeId 
   */
  activateCommittee(committeeId) {
    const committees = storageService.getCommittees();
    const commIndex = committees.findIndex(c => c.id === committeeId);
    if (commIndex === -1) return;

    const comm = committees[commIndex];
    comm.status = CommitteeStatus.ACTIVE;
    committees[commIndex] = comm;
    storageService.setCommittees(committees);

    // Create Month 1
    const months = storageService.getMonths();
    const existingMonths = months.filter(m => m.committeeId === committeeId);
    
    if (existingMonths.length === 0) {
      const targetDue = new Date();
      targetDue.setDate(targetDue.getDate() + 5); // 5 days from today
      
      const month1 = {
        id: 'mon_' + committeeId + '_1',
        committeeId,
        monthNumber: 1,
        monthName: 'Month 1',
        dueDate: targetDue.toISOString().split('T')[0],
        recipientUserId: null,
        selectionMethod: comm.recipientSelectionMethod,
        status: comm.recipientSelectionMethod === SelectionMethods.VOTING ? 'voting' : 'pending_selection'
      };

      months.push(month1);
      storageService.setMonths(months);

      // Create payments shells for all members
      const committeeMembers = storageService.getMembers().filter(m => m.committeeId === committeeId);
      const payments = storageService.getPayments();
      
      committeeMembers.forEach(m => {
        payments.push({
          id: 'pay_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
          committeeMonthId: month1.id,
          committeeId,
          payerUserId: m.userId,
          recipientUserId: null,
          amount: comm.contributionAmount,
          status: PaymentStatus.PENDING,
          submittedAt: null
        });
      });
      storageService.setPayments(payments);
    }
  }
}

export const committeeService = new CommitteeService();
