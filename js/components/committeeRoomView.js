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

    let recipientUser = null;
    if (currentMonth && currentMonth.recipientUserId) {
      const rMem = members.find(m => m.userId === currentMonth.recipientUserId);
      if (rMem) recipientUser = rMem.user;
    } else if (members.length > 0) {
      recipientUser = members[0].user;
    }

    const currentCycle = committee.currentCycle || 1;
    const totalCycles = committee.duration || committee.numberOfMembers || 5;
    const memberCount = members.length;
    const slotsRemaining = Math.max(0, totalCycles - memberCount);
    const isFull = memberCount >= totalCycles;
    const canDelete = memberCount < 2;
    const paidMembersCount = currentPayments.filter(p => p.status === PaymentStatus.SUBMITTED || p.status === PaymentStatus.VERIFIED).length;
    const joinLink = `${window.location.origin}/join?code=${committee.joinCode}`;

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
            <div style="font-size: 10px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
              NEXT PAYOUT
            </div>
            
            <h2 style="font-size: 20px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-bottom: 2px;">
              ${recipientUser ? recipientUser.name : 'Sarah Ahmed'}
            </h2>

            <div style="font-size: 22px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-bottom: 16px;">
              PKR ${committee.contributionAmount ? committee.contributionAmount.toLocaleString() : '500.00'}
            </div>

            <button id="btn-submit-proof-hero" class="btn-pill-black" style="padding: 13px;">
              <span>Submit payment proof</span>
              <span style="font-size: 16px;">→</span>
            </button>
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

        <!-- Delete Committee Button (Visible if < 2 members) -->
        ${canDelete ? `
          <div style="text-align: center; margin-top: 6px; margin-bottom: 16px;">
            <button id="btn-delete-committee" style="background: #FEE2E2; color: #DC2626; border: none; border-radius: 12px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Delete Committee</span>
            </button>
          </div>
        ` : ''}

        <!-- Spin Wheel Action (Only when full and no recipient chosen) -->
        ${isFull && (!currentMonth || !currentMonth.recipientUserId) ? `
          <div style="text-align: center; margin-top: 10px;">
            <button id="btn-trigger-spin" class="btn-pill-black" style="background-color: #18181B;">
              <span>Spin Wheel for Recipient</span>
            </button>
          </div>
        ` : ''}

      </div>
    `;

    attachEvents();

    // Render Circle Component
    circleApi = renderCommitteeCircle({
      containerId: 'committee-circle-mount',
      members,
      recipientUserId: recipientUser ? recipientUser.id : null,
      payments: currentPayments,
      currentUserId: user.id,
      onMemberClick: (member) => openMemberDetailsModal(member),
      onSpinComplete: async () => {
        showToast(`Recipient chosen!`);
        reload();
      }
    });
  }

  // 1-to-1 Profile Popup Modal (Reference Design Image 4)
  function openMemberDetailsModal(member) {
    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById('modal-sheet-content');
    if (!overlay || !sheet) return;

    sheet.innerHTML = `
      <div style="position: relative; text-align: center; padding-top: 8px;">
        
        <!-- Close button ✕ -->
        <button id="btn-close-modal-x" style="position: absolute; right: 0; top: 0; width: 32px; height: 32px; border-radius: 50%; border: none; background: #F4F4F5; font-size: 16px; color: #000000; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          ✕
        </button>

        <!-- Avatar Circle with Clean SVG Icon -->
        <div style="width: 72px; height: 72px; border-radius: 50%; background-color: #F4F4F5; display: flex; align-items: center; justify-content: center; margin: 8px auto 14px auto;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>

        <!-- Name & Account -->
        <h2 style="font-size: 22px; font-weight: 800; color: #000000; margin-bottom: 2px;">
          ${member.user ? member.user.name : 'Sarah Ahmed'}
        </h2>
        <p style="font-size: 13.5px; color: #71717A; font-weight: 600; margin-bottom: 20px;">
          ${member.user ? member.user.paymentNumber : '03XX XXXXXXX'}
        </p>

        <!-- Info Cards (Preferred Payout & Payment Status) -->
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
          
          <div style="background-color: #F4F4F5; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"></rect><path d="M6 12h12"></path></svg>
              <span style="font-size: 11px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em;">PREFERRED PAYOUT</span>
            </div>
            <span style="font-size: 14px; font-weight: 700; color: #000000;">
              ${member.user ? member.user.paymentMethod : 'EasyPaisa'}
            </span>
          </div>

          <div style="background-color: #F4F4F5; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span style="font-size: 11px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em;">PAYMENT STATUS</span>
            </div>
            <span style="font-size: 14px; font-weight: 700; color: #000000;">
              Paid
            </span>
          </div>

        </div>

        <button id="btn-close-modal-action" class="btn-pill-black">
          Close
        </button>

      </div>
    `;

    const closeBtn = document.getElementById('btn-close-modal-x');
    const actionBtn = document.getElementById('btn-close-modal-action');
    if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    if (actionBtn) actionBtn.addEventListener('click', () => overlay.classList.remove('open'));

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

    // Delete Committee
    const btnDelete = document.getElementById('btn-delete-committee');
    if (btnDelete) {
      btnDelete.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${details.committee.name}"? This action cannot be undone.`)) {
          const comId = details.committee.id;
          const comms = storageService.getCommittees().filter(c => c.id !== comId);
          storageService.setCommittees(comms);
          await FirebaseService.deleteCommittee(comId);
          showToast(`"${details.committee.name}" deleted`);
          if (cloudUnsubscribe) cloudUnsubscribe();
          onBack();
        }
      });
    }

    const btnCardDelete = document.getElementById('btn-card-delete-committee');
    if (btnCardDelete) {
      btnCardDelete.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${details.committee.name}"? This action cannot be undone.`)) {
          const comId = details.committee.id;
          const comms = storageService.getCommittees().filter(c => c.id !== comId);
          storageService.setCommittees(comms);
          await FirebaseService.deleteCommittee(comId);
          showToast(`"${details.committee.name}" deleted`);
          if (cloudUnsubscribe) cloudUnsubscribe();
          onBack();
        }
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
