// Home View Component - 100% SVG Line Icons, Zero Emojis (Matching Reference Design 1-to-1)

import { storageService } from '../services/storageService.js';
import { FirebaseService } from '../services/firebaseService.js';
import { formatCurrency } from '../models/dataModels.js';

export function renderHomeView(container, { onNavigate, onOpenCommittee, showToast }) {
  const currentUser = storageService.getCurrentUser();

  function getUserCommittees() {
    const allCommittees = storageService.getCommittees();
    if (!currentUser) return allCommittees;

    const userPhone = (currentUser.verifiedPhone || currentUser.phone || '').replace(/[^0-9]/g, '');
    const userName = (currentUser.name || '').trim().toLowerCase().replace('(you)', '').trim();

    return allCommittees.filter(c => {
      // Creator match
      if (c.creatorId === currentUser.id) return true;
      // Member list match
      if (c.members && Array.isArray(c.members)) {
        return c.members.some(m => {
          const mPhone = (m.phone || '').replace(/[^0-9]/g, '');
          const mName = (m.name || '').trim().toLowerCase().replace('(you)', '').trim();
          if (m.id === currentUser.id || m.userId === currentUser.id) return true;
          if (userPhone && mPhone && userPhone === mPhone) return true;
          if (userName && mName && userName === mName) return true;
          return false;
        });
      }
      // Default sample committees
      return c.id === 'com_friends_2026' || c.id === 'com_office_2026';
    });
  }

  let committees = getUserCommittees();

  // Cloud sync only for user's relevant committees
  const unsub = FirebaseService.subscribeCommittees((cloudList) => {
    if (cloudList && cloudList.length > 0 && currentUser) {
      const localList = storageService.getCommittees();
      const userPhone = (currentUser.verifiedPhone || currentUser.phone || '').replace(/[^0-9]/g, '');
      const userName = (currentUser.name || '').trim().toLowerCase().replace('(you)', '').trim();

      cloudList.forEach(cc => {
        const isUserInComm = (cc.creatorId === currentUser.id) || (cc.members && cc.members.some(m => {
          const mPhone = (m.phone || '').replace(/[^0-9]/g, '');
          const mName = (m.name || '').trim().toLowerCase().replace('(you)', '').trim();
          return (m.id === currentUser.id || m.userId === currentUser.id) || (userPhone && mPhone && userPhone === mPhone) || (userName && mName && userName === mName);
        }));

        if (isUserInComm) {
          const existingIdx = localList.findIndex(lc => lc.id === cc.id || (lc.joinCode && cc.joinCode && lc.joinCode === cc.joinCode));
          if (existingIdx >= 0) {
            localList[existingIdx] = { ...localList[existingIdx], ...cc };
          } else {
            localList.unshift({
              id: cc.id,
              name: cc.name,
              creatorId: cc.creatorId || currentUser.id,
              numberOfMembers: cc.memberCount || cc.numberOfMembers || 5,
              contributionAmount: cc.contributionAmount,
              frequency: cc.frequency || 'monthly',
              duration: cc.totalCycles || cc.duration || 5,
              startDate: cc.startDate,
              recipientSelectionMethod: cc.selectionMode || cc.recipientSelectionMethod || 'random',
              status: cc.status || 'active',
              joinCode: cc.joinCode,
              members: cc.members || [],
              createdAt: new Date().toISOString()
            });
          }
        }
      });

      storageService.setCommittees(localList);
      committees = getUserCommittees();
      render();
    }
  });

  function render() {
    container.innerHTML = `
      <div style="padding: 16px 20px 24px 20px;">
        <!-- Top Navbar -->
        <div class="app-top-header">
          <button id="btn-menu" class="btn-icon-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <span class="header-title">Kameti AI</span>
          <button id="btn-profile-top" class="btn-icon-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"></circle><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path></svg>
          </button>
        </div>

        <!-- Hero Card: + Create New Committee -->
        <div id="btn-create-committee-card" class="card-light-gray" style="display: flex; align-items: center; justify-content: center; gap: 14px; padding: 24px 20px; cursor: pointer; border: 1.5px dashed #D4D4D8; margin-top: 8px; margin-bottom: 24px;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #000000; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            +
          </div>
          <span style="font-size: 16.5px; font-weight: 800; color: #000000; letter-spacing: -0.01em;">
            Create New Committee
          </span>
        </div>

        <!-- Section Title: Active Committees -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <h2 style="font-size: 17px; font-weight: 800; color: #000000; letter-spacing: -0.01em;">
            Active Committees
          </h2>
          <button id="btn-view-all" style="border: none; background: transparent; font-size: 13px; font-weight: 700; color: #52525B; cursor: pointer;">
            View All →
          </button>
        </div>

        <!-- Committee Cards List -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${committees.map((comm) => {
            const currentCycle = comm.currentCycle || 1;
            const totalCycles = comm.duration || comm.numberOfMembers || 5;
            
            const groupSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;

            return `
              <div class="card-light-gray committee-item-card" data-id="${comm.id}" style="padding: 20px; cursor: pointer; transition: transform 0.15s ease; margin-bottom: 0;">
                
                <!-- Top Row: SVG Icon + Flex Title + Cycle Badge -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 16px;">
                  <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; margin-right: 6px;">
                    <div style="width: 38px; height: 38px; border-radius: 50%; background-color: #E4E4E7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      ${groupSvg}
                    </div>
                    <strong style="font-size: 16px; font-weight: 800; color: #000000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${comm.name}
                    </strong>
                  </div>

                  <span style="flex-shrink: 0; background-color: #E4E4E7; color: #3F3F46; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 9999px;">
                    Cycle ${currentCycle} of ${totalCycles}
                  </span>
                </div>

                <!-- Bottom Row: Monthly Contribution -->
                <div>
                  <div style="font-size: 12px; color: #71717A; font-weight: 600; margin-bottom: 4px;">
                    Monthly Contribution
                  </div>
                  <div style="font-size: 22px; font-weight: 800; color: #000000; letter-spacing: -0.02em;">
                    ${formatCurrency(comm.contributionAmount)}
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    const btnCreate = document.getElementById('btn-create-committee-card');
    if (btnCreate) btnCreate.addEventListener('click', () => onNavigate('create'));

    const btnProfile = document.getElementById('btn-profile-top');
    if (btnProfile) btnProfile.addEventListener('click', () => onNavigate('profile'));

    const cards = container.querySelectorAll('.committee-item-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        if (id) onOpenCommittee(id);
      });
    });
  }

  render();
}
