// Committee Room View Component - 100% SVG Line Icons, Zero Emojis (Matching Image 3 & 4 1-to-1)

import { committeeService } from '../services/committeeService.js';
import { selectionService } from '../services/selectionService.js';
import { authService } from '../services/authService.js';
import { storageService } from '../services/storageService.js';
import { FirebaseService } from '../services/firebaseService.js';
import { renderCommitteeCircle } from './committeeCircle.js';
import { openPaymentProofModal } from './paymentProofModal.js';
import { formatCurrency, PaymentStatus } from '../models/dataModels.js';

export function renderCommitteeRoomView(container, {
  committeeId,
  onBack,
  onOpenHistory,
  showToast
}) {
  const user = authService.getCurrentUser();
  let details = committeeService.getCommitteeDetails(committeeId);
  let circleApi = null;
  let cloudUnsubscribe = null;

  if (!details || !details.committee) {
    container.innerHTML = `
      <div style="padding: 40px 20px; text-align: center;">
        <h3>Committee not found</h3>
        <button id="btn-err-back" class="btn-pill-black" style="margin-top: 16px; width: auto; display: inline-flex;">Back to Home</button>
      </div>
    `;
    const btn = document.getElementById('btn-err-back');
    if (btn) btn.addEventListener('click', onBack);
    return;
  }

  // Subscribe to Cloud Firestore real-time snapshot updates
  cloudUnsubscribe = FirebaseService.subscribeCommittees((cloudList) => {
    if (!cloudList) return;
    const target = cloudList.find(c => c.id === committeeId || c.joinCode === details.committee.joinCode);

    if (target && target.members) {
      // Sync cloud committee directly to storageService
      const committees = storageService.getCommittees();
      const cIdx = committees.findIndex(c => c.id === target.id || (c.joinCode && target.joinCode && c.joinCode.toUpperCase() === target.joinCode.toUpperCase()));
      if (cIdx >= 0) {
        committees[cIdx] = { ...committees[cIdx], ...target };
      } else {
        committees.push(target);
      }
      storageService.setCommittees(committees);

      const localMembers = storageService.getMembers();
      let updated = false;

      target.members.forEach((m) => {
        const userId = m.id || m.userId;
        if (!localMembers.some(lm => lm.committeeId === details.committee.id && lm.userId === userId)) {
          localMembers.push({
            id: 'm_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 4),
            committeeId: details.committee.id,
            userId,
            joinedAt: new Date().toISOString()
          });
          updated = true;
        }
        const users = storageService.getUsers();
        if (!users.some(u => u.id === userId)) {
          users.push({
            id: userId,
            name: m.name || 'Member',
            verifiedPhone: m.phone || '+923000000000',
            paymentMethod: m.paymentMethod || 'EasyPaisa',
            paymentNumber: m.accountNumber || m.phone || '03000000000',
            createdAt: new Date().toISOString()
          });
          storageService.setUsers(users);
        }
      });

      if (updated) {
        storageService.setMembers(localMembers);
      }

      // Auto pick winner if committee is full and no recipient set
      const totalSlots = target.totalCycles || target.duration || target.memberCount || target.numberOfMembers || 5;
      const isFull = target.members.length >= totalSlots;
      if (isFull && !target.currentRecipientId && target.members.length > 0) {
        const rand = Math.floor(Math.random() * target.members.length);
        const chosen = target.members[rand];
        const chosenId = chosen.id || chosen.userId;
        FirebaseService.updateRecipientWinner(target.id, chosenId, 1);
      }

      if (target.currentRecipientId && details.currentMonth) {
        details.currentMonth.recipientUserId = target.currentRecipientId;
      }

      reload();
    }
  });

  function reload() {
    details = committeeService.getCommitteeDetails(committeeId);
    render();
  }

  function render() {
    const { committee, members, currentMonth, currentPayments } = details;

    const totalCycles = committee.duration || committee.numberOfMembers || committee.totalCycles || 5;
    const memberCount = members.length;
    const isFull = memberCount >= totalCycles;

    let recipientUser = null;
    if (isFull) {
      if (committee.currentRecipientId) {
        const rMem = members.find(m => m.userId === committee.currentRecipientId || m.id === committee.currentRecipientId || (m.user && m.user.id === committee.currentRecipientId));
        if (rMem) recipientUser = rMem.user;
      } else if (currentMonth && currentMonth.recipientUserId) {
        const rMem = members.find(m => m.userId === currentMonth.recipientUserId || m.id === currentMonth.recipientUserId || (m.user && m.user.id === currentMonth.recipientUserId));
        if (rMem) recipientUser = rMem.user;
      }
    }

    const currentCycle = committee.currentCycle || 1;
    const slotsRemaining = Math.max(0, totalCycles - memberCount);
    const canDelete = true;
    const paidMembersCount = currentPayments.filter(p => p.status === PaymentStatus.SUBMITTED || p.status === PaymentStatus.VERIFIED).length;
    const joinLink = `${window.location.origin}/join?code=${committee.joinCode}`;

    const isCurrentUserRecipient = isFull && recipientUser && (user.id === recipientUser.id);
    let rawRecName = recipientUser ? (recipientUser.name || 'Selecting Recipient...') : 'Selecting Recipient...';
    let cleanRecName = rawRecName.replace(/\s*\(you\)/i, '').trim();
    let displayRecipientName = cleanRecName;
    if (isCurrentUserRecipient) {
      displayRecipientName = `${cleanRecName} (You)`;
    }

    container.innerHTML = `
      <div style="padding: 12px 20px 24px 20px;">
        <!-- Top Navbar -->
        <div class="app-top-header">
          <button id="btn-room-back" class="btn-icon-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <span class="header-title">Kameti AI</span>
          <button id="btn-room-share" class="btn-icon-header" title="Share Invite">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </button>
        </div>

        <!-- TOP SPOTLIGHT CARD - Swaps between Invite Members (Waiting) and Next Payout (Full) -->
        ${!isFull ? `
          <div class="card-light-gray" style="text-align: center; padding: 20px; margin-top: 4px; margin-bottom: 20px; border-radius: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 10px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em;">
                  WAITING FOR MEMBERS
                </span>
                <span style="background: #E4E4E7; padding: 3px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; color: #3F3F46;">
                  ${memberCount} / ${totalCycles} Joined
                </span>
              </div>
              <button id="btn-card-delete-committee" style="width: 28px; height: 28px; border-radius: 14px; background: #E4E4E7; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Delete Committee">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>

            <h2 style="font-size: 16.5px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-top: 2px; margin-bottom: 12px;">
              Invite Members
            </h2>

            <div style="display: flex; align-items: center; background: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; padding: 8px 12px; margin-bottom: 12px;">
              <span style="flex: 1; font-size: 12px; color: #52525B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">${joinLink}</span>
              <button id="btn-copy-join-link" style="width: 28px; height: 28px; border-radius: 8px; background: #E4E4E7; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-left: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>

            <button id="btn-share-invite-action" class="btn-pill-black" style="padding: 13px; font-size: 13.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" style="margin-right: 6px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              <span>Share Invite Link</span>
            </button>
          </div>
        ` : `
          <!-- Top Spotlight Card: NEXT PAYOUT -->
          <div class="card-light-gray" style="text-align: center; padding: 20px; margin-top: 4px; margin-bottom: 20px; border-radius: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <div style="font-size: 10px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em;">
                NEXT PAYOUT
              </div>
              <button id="btn-card-delete-committee" style="width: 28px; height: 28px; border-radius: 14px; background: #E4E4E7; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Delete Committee">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
            
            <h2 style="font-size: 20px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-bottom: 2px;">
              ${displayRecipientName}
            </h2>

            <div style="font-size: 22px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-bottom: 16px;">
              PKR ${committee.contributionAmount ? committee.contributionAmount.toLocaleString() : '500.00'}
            </div>

            ${isCurrentUserRecipient ? `
              <div style="background: #E4E4E7; border-radius: 999px; padding: 12px; font-size: 13px; font-weight: 700; color: #000000; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span>✓ You are receiving PKR ${committee.contributionAmount ? committee.contributionAmount.toLocaleString() : '500.00'} this cycle</span>
              </div>
            ` : `
              <button id="btn-submit-proof-hero" class="btn-pill-black" style="padding: 13px;">
                <span>Submit payment proof</span>
                <span style="font-size: 16px;">→</span>
              </button>
            `}
          </div>
        `}

        <!-- Middle Circular Visualization Section -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 10px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">
            ${isFull ? `CYCLE ${currentCycle} OF ${totalCycles}` : `COMMITTEE FORMING`}
          </div>
          <div style="font-size: 12px; color: #52525B; font-weight: 600;">
            ${isFull ? `${memberCount} members in circle` : `${memberCount} of ${totalCycles} slots filled`}
          </div>

          <!-- Down Arrow Pointer -->
          <div style="font-size: 12px; color: #000000; margin: 8px 0 2px 0;">▼</div>

          <!-- Signature Circle Component Mount -->
          <div id="committee-circle-mount" style="position: relative;"></div>
        </div>

      </div>
    `;

    attachEvents();

    // Render Circle Component
    circleApi = renderCommitteeCircle({
      containerId: 'committee-circle-mount',
      members,
      totalSlots: totalCycles,
      isFull,
      recipientUserId: (isFull && recipientUser) ? recipientUser.id : null,
      payments: currentPayments,
      currentUserId: user.id,
      currentUser: user,
      onMemberClick: (member) => openMemberDetailsModal(member),
      onSpinComplete: async () => {
        showToast(`🎉 ${recipientUser ? recipientUser.name : 'Member'} is this cycle's recipient!`);
      }
    });

    // First-time spin reveal per user/device
    if (isFull && recipientUser && circleApi) {
      const winnerId = recipientUser.id;
      const spinSeenKey = 'has_seen_spin_' + details.committee.id + '_' + winnerId;
      if (!localStorage.getItem(spinSeenKey)) {
        localStorage.setItem(spinSeenKey, 'true');
        const winnerIndex = members.findIndex(m => (m.userId === winnerId || (m.user && m.user.id === winnerId) || m.id === winnerId));
        if (winnerIndex >= 0) {
          setTimeout(() => {
            showToast(`🎉 ${recipientUser.name} was chosen as the recipient!`);
            circleApi.spinTo(winnerIndex);
          }, 350);
        }
      }
    }
  }

  // 1-to-1 Profile Popup Modal (Reference Design Image 4)
  function openMemberDetailsModal(member) {
    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById('modal-sheet-content');
    if (!overlay || !sheet) return;

    const memberUser = member.user || {};
    const memberId = member.userId || member.id;
    const { committee, currentMonth } = details;
    const isFull = (details.members || []).length >= (committee.duration || committee.numberOfMembers || committee.totalCycles || 5);

    let recipientUserId = null;
    if (isFull) {
      if (committee.currentRecipientId) {
        recipientUserId = committee.currentRecipientId;
      } else if (currentMonth && currentMonth.recipientUserId) {
        recipientUserId = currentMonth.recipientUserId;
      } else if (details.members.length > 0) {
        recipientUserId = details.members[0].userId;
      }
    }

    const isSelectedMemberRecipient = isFull && recipientUserId && (memberId === recipientUserId);

    // Check payment status and proof
    const proofs = storageService.getProofs ? storageService.getProofs() : [];
    const memberProof = proofs.find(p => p.uploadedBy === memberId || (p.paymentId && p.paymentId.includes(memberId))) || null;
    const proofUrl = member.paymentProofUrl || (memberProof ? memberProof.fileUrl : null);

    const payments = storageService.getPayments ? storageService.getPayments() : [];
    const payment = payments.find(p => p.payerUserId === memberId) || null;

    let isVerified = false;
    let isSubmitted = false;
    let statusText = 'Pending Payment';

    if (isSelectedMemberRecipient) {
      statusText = 'Recipient';
    } else if (member.paymentStatus === 'verified' || (payment && payment.status === PaymentStatus.VERIFIED)) {
      isVerified = true;
      statusText = 'Paid ✓';
    } else if (member.paymentStatus === 'submitted' || proofUrl || (payment && payment.status === PaymentStatus.SUBMITTED)) {
      isSubmitted = true;
      statusText = 'Submitted';
    } else {
      statusText = isFull ? 'Pending' : 'Joined';
    }

    // Check if the current logged-in user is strictly the cycle recipient
    let isRecipient = false;
    if (isFull && recipientUserId && user) {
      let rawUserPhone = user.phone;
      if (!rawUserPhone) {
        rawUserPhone = user.verifiedPhone;
      }
      if (!rawUserPhone) {
        rawUserPhone = user.paymentNumber;
      }
      if (!rawUserPhone) {
        rawUserPhone = '';
      }
      const cleanUserPhone = rawUserPhone.replace(/[^0-9]/g, '');

      const rMember = (details.members || []).find(m => m.userId === recipientUserId || m.id === recipientUserId || (m.user && m.user.id === recipientUserId));
      let rUser = null;
      if (rMember) {
        if (rMember.user) {
          rUser = rMember.user;
        } else {
          rUser = rMember;
        }
      }

      let rawRecPhone = '';
      if (rUser) {
        if (rUser.phone) {
          rawRecPhone = rUser.phone;
        } else if (rUser.verifiedPhone) {
          rawRecPhone = rUser.verifiedPhone;
        } else if (rUser.paymentNumber) {
          rawRecPhone = rUser.paymentNumber;
        }
      }
      const cleanRecipientPhone = rawRecPhone.replace(/[^0-9]/g, '');

      let rawUserName = user.name || '';
      const cleanUserName = rawUserName.trim().toLowerCase().replace('(you)', '').trim();

      let rawRecName = '';
      if (rUser && rUser.name) {
        rawRecName = rUser.name;
      }
      const cleanRecipientName = rawRecName.trim().toLowerCase().replace('(you)', '').trim();

      if (user.id === recipientUserId) {
        isRecipient = true;
      } else if (cleanUserPhone && cleanRecipientPhone && cleanUserPhone === cleanRecipientPhone) {
        isRecipient = true;
      } else if (cleanUserName && cleanRecipientName && cleanUserName === cleanRecipientName) {
        isRecipient = true;
      }
    }

    // ONLY the recipient can verify
    const canVerify = isFull && isRecipient && !isSelectedMemberRecipient && !isVerified;
    const requiresProofInspection = !!proofUrl;

    let rawMemName = memberUser.name || member.name || 'Member';
    let cleanMemName = rawMemName.replace(/\s*\(you\)/i, '').trim();

    let isSelectedMemberMe = false;
    if (user) {
      let rawUserPhone = user.phone;
      if (!rawUserPhone) rawUserPhone = user.verifiedPhone;
      if (!rawUserPhone) rawUserPhone = user.paymentNumber;
      if (!rawUserPhone) rawUserPhone = '';
      let cleanUserPhone = rawUserPhone.replace(/[^0-9]/g, '');

      let rawMemPhone = memberUser.phone;
      if (!rawMemPhone) rawMemPhone = memberUser.verifiedPhone;
      if (!rawMemPhone) rawMemPhone = memberUser.paymentNumber;
      if (!rawMemPhone) rawMemPhone = member.phone;
      if (!rawMemPhone) rawMemPhone = '';
      let cleanMemPhone = rawMemPhone.replace(/[^0-9]/g, '');

      let cleanUserName = (user.name || '').trim().toLowerCase().replace('(you)', '').trim();

      if (user.id === memberId || (user.userId && user.userId === memberId)) {
        isSelectedMemberMe = true;
      } else if (cleanUserPhone && cleanMemPhone && cleanUserPhone === cleanMemPhone) {
        isSelectedMemberMe = true;
      } else if (cleanUserName && cleanMemName.toLowerCase() === cleanUserName) {
        isSelectedMemberMe = true;
      }
    }

    let displayMemberName = cleanMemName;
    if (isSelectedMemberMe) {
      displayMemberName = `${cleanMemName} (You)`;
    }

    sheet.innerHTML = `
      <div style="position: relative; text-align: center; padding-top: 8px;">
        
        <!-- Close button ✕ -->
        <button id="btn-close-modal-x" style="position: absolute; right: 0; top: 0; width: 32px; height: 32px; border-radius: 50%; border: none; background: #F4F4F5; font-size: 16px; color: #000000; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          ✕
        </button>

        <!-- Avatar Circle -->
        <div style="width: 60px; height: 60px; border-radius: 50%; background-color: #F4F4F5; display: flex; align-items: center; justify-content: center; margin: 4px auto 10px auto;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>

        <!-- Name & Account -->
        <h2 style="font-size: 20px; font-weight: 800; color: #000000; margin-bottom: 2px;">
          ${displayMemberName}
        </h2>
        <p style="font-size: 13px; color: #71717A; font-weight: 600; margin-bottom: 16px;">
          ${memberUser.paymentNumber || memberUser.verifiedPhone || '03XX XXXXXXX'}
        </p>

        <!-- Info Cards -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
          
          <div style="background-color: #F4F4F5; border-radius: 14px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"></rect><path d="M6 12h12"></path></svg>
              <span style="font-size: 10px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em;">PREFERRED PAYOUT</span>
            </div>
            <span style="font-size: 13.5px; font-weight: 700; color: #000000;">
              ${memberUser.paymentMethod || 'EasyPaisa'}
            </span>
          </div>

          <div style="background-color: #F4F4F5; border-radius: 14px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span style="font-size: 10px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em;">PAYMENT STATUS</span>
            </div>
            <span style="font-size: 13.5px; font-weight: 700; color: #000000; text-align: right; flex-shrink: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${statusText}
            </span>
          </div>

        </div>

        <!-- Payment Proof Screenshot Box -->
        ${isSelectedMemberRecipient ? `
          <div style="background-color: #F4F4F5; border-radius: 12px; padding: 12px; margin-bottom: 16px; font-size: 12px; color: #52525B; font-weight: 600; text-align: center;">
            ${memberUser.name || 'Member'} is receiving the payout this cycle — no contribution payment required.
          </div>
        ` : `
          <div style="text-align: left; margin-bottom: 16px;">
            <div style="font-size: 10px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">ATTACHED PAYMENT PROOF</div>
            ${proofUrl ? `
              <div id="proof-thumbnail-card" style="background-color: #F4F4F5; border-radius: 14px; overflow: hidden; border: 1px solid #E4E4E7; cursor: pointer;">
                <img src="${proofUrl}" alt="Payment Proof" style="width: 100%; height: 100px; object-fit: cover; display: block;" />
                <div style="background: #FFFFFF; padding: 6px; text-align: center; font-size: 11px; font-weight: 700; color: #000000; border-top: 1px solid #E4E4E7;">
                  🔍 Click to view full screenshot
                </div>
              </div>
            ` : `
              <div style="background-color: #F4F4F5; border-radius: 12px; padding: 14px; text-align: center; font-size: 12px; color: #71717A; font-weight: 500;">
                No payment receipt uploaded yet
              </div>
            `}
          </div>
        `}

        ${canVerify ? `
          <button id="btn-verify-member-payment" class="btn-pill-black" style="margin-bottom: 8px; ${requiresProofInspection ? 'opacity: 0.45; cursor: not-allowed;' : ''}" ${requiresProofInspection ? 'disabled' : ''}>
            <span id="btn-verify-member-text">${requiresProofInspection ? 'View screenshot to enable verification' : 'Verify & Mark as Paid'}</span>
            <span style="font-size: 16px;">✓</span>
          </button>
        ` : ''}

        <button id="btn-close-modal-action" class="btn-pill-black" style="background-color: #F4F4F5; color: #000000;">
          Close
        </button>

      </div>
    `;

    const closeBtn = document.getElementById('btn-close-modal-x');
    const actionBtn = document.getElementById('btn-close-modal-action');
    const verifyBtn = document.getElementById('btn-verify-member-payment');
    const proofCard = document.getElementById('proof-thumbnail-card');

    if (proofCard && proofUrl) {
      proofCard.addEventListener('click', () => {
        // In-app full screen image inspection modal
        const fullModal = document.createElement('div');
        fullModal.id = 'web-fullscreen-receipt';
        fullModal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 20px;';
        fullModal.innerHTML = `
          <button id="btn-close-full-receipt" style="position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.25); border: none; color: #FFF; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
          <img src="${proofUrl}" alt="Full Screenshot Receipt" style="max-width: 100%; max-height: 85vh; border-radius: 12px; object-fit: contain;" />
        `;
        document.body.appendChild(fullModal);

        const closeFull = () => {
          if (document.body.contains(fullModal)) document.body.removeChild(fullModal);
        };
        fullModal.addEventListener('click', (e) => {
          if (e.target === fullModal || e.target.id === 'btn-close-full-receipt') closeFull();
        });

        if (verifyBtn) {
          verifyBtn.removeAttribute('disabled');
          verifyBtn.style.opacity = '1';
          verifyBtn.style.cursor = 'pointer';
          const btnText = document.getElementById('btn-verify-member-text');
          if (btnText) btnText.innerText = 'Verify & Mark as Paid';
        }
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    if (actionBtn) actionBtn.addEventListener('click', () => overlay.classList.remove('open'));

    if (verifyBtn) {
      verifyBtn.addEventListener('click', async () => {
        try {
          overlay.classList.remove('open');
          showToast(`Verified ${memberUser.name || 'Member'}'s payment ✓`);

          const payments = storageService.getPayments ? storageService.getPayments() : [];
          let p = payments.find(pay => pay.payerUserId === memberId);
          if (p) {
            p.status = PaymentStatus.VERIFIED;
            p.verifiedAt = new Date().toISOString();
          } else {
            payments.push({
              id: 'pay_' + committeeId + '_' + memberId,
              committeeId,
              payerUserId: memberId,
              amount: 20000,
              status: PaymentStatus.VERIFIED,
              verifiedAt: new Date().toISOString(),
            });
          }
          storageService.setPayments(payments);
          await FirebaseService.verifyMemberPayment(committeeId, memberId);
          reload();
        } catch (err) {
          showToast('Could not verify payment');
        }
      });
    }

    overlay.classList.add('open');
  }

  function attachEvents() {
    const btnBack = document.getElementById('btn-room-back');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (cloudUnsubscribe) cloudUnsubscribe();
        onBack();
      });
    }

    const btnShare = document.getElementById('btn-room-share');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        const link = `${window.location.origin}/join?code=${details.committee.joinCode}`;
        if (navigator.share) {
          navigator.share({
            title: `Join ${details.committee.name}`,
            text: `Join "${details.committee.name}" on Kameti AI:`,
            url: link
          }).catch(() => {});
        } else {
          navigator.clipboard.writeText(link).then(() => {
            showToast('Join link copied to clipboard ✓');
          });
        }
      });
    }

    const btnCopyLink = document.getElementById('btn-copy-join-link');
    if (btnCopyLink) {
      btnCopyLink.addEventListener('click', () => {
        const link = `${window.location.origin}/join?code=${details.committee.joinCode}`;
        navigator.clipboard.writeText(link).then(() => {
          showToast('Join link copied to clipboard ✓');
        });
      });
    }

    const btnShareInvite = document.getElementById('btn-share-invite-action');
    if (btnShareInvite) {
      btnShareInvite.addEventListener('click', () => {
        const link = `${window.location.origin}/join?code=${details.committee.joinCode}`;
        if (navigator.share) {
          navigator.share({
            title: `Join ${details.committee.name}`,
            text: `Join "${details.committee.name}" on Kameti AI:`,
            url: link
          }).catch(() => {});
        } else {
          navigator.clipboard.writeText(link).then(() => {
            showToast('Join link copied to clipboard ✓');
          });
        }
      });
    }

    // Custom Themed Delete Committee Modal
    function openDeleteConfirmModal() {
      const overlay = document.getElementById('modal-overlay');
      const sheet = document.getElementById('modal-sheet-content');
      if (!overlay || !sheet) return;

      sheet.innerHTML = `
        <div style="text-align: center; padding: 12px 6px;">
          <div style="width: 52px; height: 52px; border-radius: 26px; background-color: #FEE2E2; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </div>

          <h2 style="font-size: 19px; font-weight: 800; color: #000000; margin-bottom: 8px;">
            Delete Committee?
          </h2>

          <p style="font-size: 13.5px; color: #71717A; line-height: 1.45; margin-bottom: 24px;">
            Are you sure you want to delete "${details.committee.name}"? All member records and payment history will be permanently removed.
          </p>

          <button id="btn-confirm-delete-action" class="btn-pill-black" style="background-color: #DC2626; color: #FFFFFF; margin-bottom: 10px;">
            <span>Delete Committee</span>
            <span style="font-size: 16px;">✕</span>
          </button>

          <button id="btn-cancel-delete-action" class="btn-pill-black" style="background-color: #F4F4F5; color: #000000;">
            Cancel
          </button>
        </div>
      `;

      const btnConfirm = sheet.querySelector('#btn-confirm-delete-action');
      const btnCancel = sheet.querySelector('#btn-cancel-delete-action');

      if (btnCancel) {
        btnCancel.addEventListener('click', () => {
          overlay.classList.remove('open');
        });
      }

      if (btnConfirm) {
        btnConfirm.addEventListener('click', async () => {
          overlay.classList.remove('open');
          const comId = details.committee.id;
          const comms = storageService.getCommittees().filter(c => c.id !== comId);
          storageService.setCommittees(comms);
          sessionStorage.removeItem('active_room_id');
          localStorage.removeItem('active_room_id');
          if (cloudUnsubscribe) cloudUnsubscribe();
          onBack();
          showToast(`"${details.committee.name}" deleted`);
          await FirebaseService.deleteCommittee(comId);
        });
      }

      overlay.classList.add('open');
    }

    const btnCardDelete = document.getElementById('btn-card-delete-committee');
    if (btnCardDelete) {
      btnCardDelete.addEventListener('click', () => {
        openDeleteConfirmModal();
      });
    }

    // Submit Payment Proof Hero Button
    const btnSubmitHero = document.getElementById('btn-submit-proof-hero');
    if (btnSubmitHero) {
      btnSubmitHero.addEventListener('click', () => {
        const myPayment = details.currentPayments.find(p => p.payerUserId === user.id);
        const recUser = details.members.find(m => m.userId === details.currentMonth.recipientUserId)?.user || details.members[0]?.user;
        const proof = details.proofs.find(pr => pr.paymentId === myPayment?.id);

        if (recUser) {
          openPaymentProofModal({
            payment: myPayment || { id: 'p1', amount: details.committee.contributionAmount },
            recipientUser: recUser,
            proof,
            isOwner: true,
            onUpdated: () => reload(),
            showToast
          });
        }
      });
    }

    // Spin Wheel Trigger
    const btnSpin = document.getElementById('btn-trigger-spin');
    if (btnSpin) {
      btnSpin.addEventListener('click', async () => {
        try {
          const res = selectionService.executeRandomSelection(committeeId, details.currentMonth.id);
          const winnerUserId = res.recipient ? res.recipient.id : null;

          if (winnerUserId) {
            await FirebaseService.updateRecipientWinner(committeeId, winnerUserId, 1);
          }

          if (res.alreadySelected) {
            showToast(`Recipient already selected: ${res.recipient.name}`);
            reload();
          } else if (circleApi) {
            showToast('Spinning wheel...');
            circleApi.spinTo(res.memberIndex);
          } else {
            reload();
          }
        } catch (err) {
          showToast(err.message);
        }
      });
    }
  }

  render();
}
