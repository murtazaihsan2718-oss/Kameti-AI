// Join Committee View Component - Clean Monochromatic SVG Design

import { committeeService } from '../services/committeeService.js';
import { storageService } from '../services/storageService.js';
import { authService } from '../services/authService.js';
import { FirebaseService } from '../services/firebaseService.js';
import { formatCurrency } from '../models/dataModels.js';

export function renderJoinCommitteeView(container, { initialCode = '', onBack, onJoined, showToast }) {
  let joinCode = initialCode;
  let previewCommittee = null;
  let isLoading = !!initialCode;

  if (joinCode) {
    lookupCommittee(joinCode);
  }

  async function lookupCommittee(code) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      isLoading = false;
      render();
      return;
    }

    isLoading = true;
    render();

    let comm = storageService.getCommittees().find(c => c.joinCode === cleanCode);

    if (!comm) {
      try {
        const cloudComm = await FirebaseService.getCommitteeByCode(cleanCode);
        if (cloudComm) {
          comm = {
            id: cloudComm.id,
            name: cloudComm.name,
            creatorId: cloudComm.creatorId || cloudComm.members?.[0]?.id || 'usr_creator',
            numberOfMembers: cloudComm.numberOfMembers || cloudComm.memberCount || 5,
            contributionAmount: cloudComm.contributionAmount,
            frequency: cloudComm.frequency || 'monthly',
            duration: cloudComm.totalCycles || cloudComm.duration || 5,
            startDate: cloudComm.startDate,
            recipientSelectionMethod: cloudComm.selectionMode || cloudComm.recipientSelectionMethod || 'random',
            status: cloudComm.status || 'active',
            joinCode: cloudComm.joinCode,
            members: cloudComm.members || [],
            createdAt: new Date().toISOString()
          };
          const localList = storageService.getCommittees();
          if (!localList.some(c => c.id === comm.id)) {
            storageService.setCommittees([comm, ...localList]);
          }
        }
      } catch (e) {
        console.log('[JoinView] Cloud lookup note:', e);
      }
    }

    isLoading = false;
    if (comm) {
      previewCommittee = comm;

      // If user is already a member, direct immediately to the room without showing join card
      const currentUser = authService.getCurrentUser() || storageService.getCurrentUser();
      if (currentUser && comm.members && comm.members.length > 0) {
        let uPhone = currentUser.phone || currentUser.verifiedPhone || currentUser.paymentNumber || '';
        const cleanUserPhone = uPhone.replace(/[^0-9]/g, '');
        let uName = currentUser.name || '';
        const cleanUserName = uName.trim().toLowerCase().replace('(you)', '').trim();

        const isMember = comm.members.some((m) => {
          let mPhone = (m.phone || '').replace(/[^0-9]/g, '');
          let mName = (m.name || '').trim().toLowerCase().replace('(you)', '').trim();
          if (m.id === currentUser.id || m.userId === currentUser.id) {
            return true;
          }
          if (cleanUserPhone && mPhone && cleanUserPhone === mPhone) {
            return true;
          }
          if (cleanUserName && mName && cleanUserName === mName) {
            return true;
          }
          return false;
        });

        if (isMember) {
          if (onJoined) {
            onJoined(comm.id);
            return;
          }
        }
      }
    } else {
      if (showToast) showToast(`No committee found with code "${cleanCode}"`);
    }
    render();
  }

  function render() {
    const isPreview = !!previewCommittee;

    container.innerHTML = `
      <div style="padding: 12px 20px 24px 20px;">
        <!-- Top Navbar -->
        <div class="app-top-header">
          <button id="btn-join-back" class="btn-icon-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <span class="header-title">Kameti AI</span>
          <div style="width: 38px;"></div>
        </div>

        <!-- Title -->
        <div style="margin-top: 4px; margin-bottom: 20px;">
          <h1 style="font-size: 22px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-bottom: 4px;">
            ${isPreview ? previewCommittee.name : (isLoading ? 'Loading Committee...' : 'Enter Join Code')}
          </h1>
          <p style="font-size: 13.5px; color: #71717A; font-weight: 500;">
            ${isPreview ? "You've been invited to join this committee" : (isLoading ? 'Fetching committee details from invite link...' : 'Enter the 6-character code shared by your committee creator.')}
          </p>
        </div>

        ${isLoading ? `
          <div class="card-light-gray" style="padding: 32px 20px; text-align: center;">
            <p style="font-size: 14px; color: #71717A; font-weight: 600;">Loading committee invitation...</p>
          </div>
        ` : (isPreview ? renderPreview() : `
          <!-- Code Input Card -->
          <div class="card-light-gray" style="padding: 20px; margin-bottom: 20px;">
            <form id="join-code-form">
              <div class="form-group">
                <label class="form-label-uppercase">INVITATION CODE</label>
                <input type="text" id="input-join-code" class="form-input-pill" placeholder="e.g. FRIEND5" value="${joinCode}" style="text-transform: uppercase; font-size: 18px; font-weight: 800; letter-spacing: 2px; text-align: center;" required autofocus />
              </div>

              <button type="submit" class="btn-pill-black" style="margin-top: 10px;">
                <span>Find Committee</span>
                <span style="font-size: 18px;">→</span>
              </button>
            </form>
          </div>
        `)}
      </div>
    `;

    attachEvents();
  }

  function renderPreview() {
    const members = (previewCommittee.members && previewCommittee.members.length > 0)
      ? previewCommittee.members
      : storageService.getMembers().filter(m => m.committeeId === previewCommittee.id);
    const memberCount = Math.max(members.length, 1);
    const totalMonthlyPool = (previewCommittee.numberOfMembers || previewCommittee.totalCycles || 5) * previewCommittee.contributionAmount;

    return `
      <div class="card-light-gray" style="padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h2 style="font-size: 18px; font-weight: 800; color: #000000;">${previewCommittee.name}</h2>
          <span style="background-color: #E4E4E7; color: #3F3F46; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
            ${memberCount} / ${previewCommittee.numberOfMembers || 5} joined
          </span>
        </div>

        <div style="font-size: 24px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-bottom: 16px;">
          ${formatCurrency(previewCommittee.contributionAmount)} <span style="font-size: 13px; font-weight: 500; color: #71717A;">/ month</span>
        </div>

        <div style="background-color: #FFFFFF; border-radius: 16px; padding: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; border: 1px solid #E5E7EB;">
          <div>
            <div style="color: #71717A; font-size: 11px; font-weight: 800; text-transform: uppercase;">MONTHLY POOL</div>
            <div style="font-weight: 800; color: #000000; font-size: 15px; margin-top: 2px;">${formatCurrency(totalMonthlyPool)}</div>
          </div>
          <div>
            <div style="color: #71717A; font-size: 11px; font-weight: 800; text-transform: uppercase;">DURATION</div>
            <div style="font-weight: 800; color: #000000; font-size: 15px; margin-top: 2px;">${previewCommittee.duration || 5} mos</div>
          </div>
        </div>

        <button id="btn-confirm-join" class="btn-pill-black">
          <span>Join Committee</span>
          <span style="font-size: 18px;">→</span>
        </button>
      </div>
    `;
  }

  function attachEvents() {
    const btnBack = document.getElementById('btn-join-back');
    if (btnBack) btnBack.addEventListener('click', onBack);

    const form = document.getElementById('join-code-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('input-join-code').value.trim();
        joinCode = code;
        await lookupCommittee(code);
      });
    }

    const btnConfirm = document.getElementById('btn-confirm-join');
    if (btnConfirm && previewCommittee) {
      btnConfirm.addEventListener('click', () => {
        try {
          const result = committeeService.joinCommitteeByCode(joinCode || previewCommittee.joinCode);
          const currentUser = authService.getCurrentUser() || storageService.getCurrentUser();

          if (currentUser && previewCommittee) {
            FirebaseService.joinCommittee(previewCommittee.id, {
              id: currentUser.id,
              name: currentUser.name,
              phone: currentUser.verifiedPhone || currentUser.paymentNumber || 'Joined Member',
              avatar: 'user',
              paymentMethod: currentUser.paymentMethod || 'easypaisa',
              accountNumber: currentUser.paymentNumber || '03000000000',
              accountTitle: currentUser.name,
              hasReceivedPayout: false,
            }).catch(() => {});
          }

          if (result.alreadyMember) {
            showToast('You are already a member of this committee');
          } else {
            showToast(`Joined ${previewCommittee.name}!`);
          }
          onJoined(previewCommittee.id);
        } catch (err) {
          showToast(err.message || 'Could not join committee');
        }
      });
    }
  }

  render();
}
