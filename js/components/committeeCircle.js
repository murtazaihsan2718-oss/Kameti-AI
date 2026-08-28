// Committee Circle Component - 100% SVG Icons, Zero Emojis (Matching Image 3 & 4 1-to-1)

import { PaymentStatus } from '../models/dataModels.js';

export function renderCommitteeCircle({
  containerId,
  members = [],
  totalSlots = 5,
  isFull = false,
  recipientUserId = null,
  payments = [],
  currentUserId = '',
  currentUser = null,
  onMemberClick,
  onSpinComplete
}) {
  const mountEl = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!mountEl) return;

  const totalDisplaySlots = isFull ? members.length : Math.max(totalSlots, members.length);
  const size = 300;
  const radius = 105;
  const centerX = size / 2;
  const centerY = size / 2;

  let currentAngleOffset = 0;

  // Build display nodes array (real members + dashed placeholders)
  const displayNodes = [];
  members.forEach((m, idx) => {
    displayNodes.push({ type: 'member', member: m, idx });
  });

  const emptySlotsCount = Math.max(0, totalDisplaySlots - members.length);
  for (let i = 0; i < emptySlotsCount; i++) {
    displayNodes.push({ type: 'empty', slotNumber: members.length + i + 1 });
  }

  // Find index of recipient so that the recipient is ALWAYS positioned under the top arrow (12 o'clock)
  let recipientIdx = 0;
  if (isFull && recipientUserId) {
    const foundIdx = members.findIndex(m => (m.userId === recipientUserId || (m.user && m.user.id === recipientUserId) || m.id === recipientUserId));
    if (foundIdx >= 0) {
      recipientIdx = foundIdx;
    }
  }

  function renderHTML() {
    mountEl.innerHTML = `
      <div class="circle-visualization-container" style="position: relative; width: ${size}px; height: ${size}px; margin: 0 auto;">
        
        <!-- Central Node - Visual Indicator (Non-clickable, no manual spin) -->
        ${isFull ? `
          <div style="position: absolute; top: ${centerY - 45}px; left: ${centerX - 45}px; width: 90px; height: 90px; border-radius: 50%; background-color: #FFFFFF; border: 1.5px solid #E4E4E7; display: flex; align-items: center; justify-content: center; color: #71717A; box-shadow: 0 2px 6px rgba(0,0,0,0.05); cursor: default;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          </div>
        ` : `
          <div style="position: absolute; top: ${centerY - 42}px; left: ${centerX - 42}px; width: 84px; height: 84px; border-radius: 50%; background-color: #F4F4F5; border: 1.5px solid #E4E4E7; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #71717A;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span style="font-size: 9.5px; font-weight: 800; color: #71717A; text-transform: uppercase; margin-top: 3px; letter-spacing: 0.05em;">WAITING</span>
          </div>
        `}

        <!-- Member Nodes Arranged in Circle - Recipient anchored at top 12 o'clock directly under arrow ▼ -->
        <div id="circle-nodes-rotator" style="position: absolute; width: 100%; height: 100%; transition: transform 2.4s cubic-bezier(0.15, 0.9, 0.25, 1);">
          ${displayNodes.map((node, index) => {
            // Anchor recipient at 12 o'clock (under the black arrow ▼)
            const angle = ((index - recipientIdx) * 2 * Math.PI) / totalDisplaySlots - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle) - 24;
            const y = centerY + radius * Math.sin(angle) - 24;

            if (node.type === 'empty') {
              return `
                <div style="position: absolute; left: ${x}px; top: ${y}px; width: 46px; height: 46px; border-radius: 23px; background-color: #FAFAFA; border: 1.5px dashed #D4D4D8; display: flex; align-items: center; justify-content: center; color: #A1A1AA;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
              `;
            }

            const m = node.member;
            const isRecipient = isFull && (m.userId === recipientUserId || (m.user && m.user.id === recipientUserId) || m.id === recipientUserId);
            const payment = payments.find(p => p.payerUserId === (m.userId || m.id));
            const isVerified = isFull && ((payment && payment.status === PaymentStatus.VERIFIED) || m.paymentStatus === 'verified');
            const isSubmitted = isFull && !isVerified && ((payment && payment.status === PaymentStatus.SUBMITTED) || m.paymentStatus === 'submitted' || m.paymentProofUrl);

            let isMe = false;
            if (currentUser) {
              let rawUserPhone = currentUser.phone || currentUser.verifiedPhone || currentUser.paymentNumber || '';
              let cleanUserPhone = rawUserPhone.replace(/[^0-9]/g, '');
              let rawMemPhone = (m.user && (m.user.phone || m.user.verifiedPhone || m.user.paymentNumber)) || m.phone || '';
              let cleanMemPhone = rawMemPhone.replace(/[^0-9]/g, '');
              let cleanUserName = (currentUser.name || '').trim().toLowerCase().replace('(you)', '').trim();
              let cleanMemName = (m.name || (m.user && m.user.name) || '').trim().toLowerCase().replace('(you)', '').trim();

              if (currentUser.id === (m.userId || m.id) || (currentUser.userId && currentUser.userId === (m.userId || m.id))) {
                isMe = true;
              } else if (cleanUserPhone && cleanMemPhone && cleanUserPhone === cleanMemPhone) {
                isMe = true;
              } else if (cleanUserName && cleanMemName && cleanUserName === cleanMemName) {
                isMe = true;
              }
            } else if (currentUserId && (m.userId === currentUserId || m.id === currentUserId)) {
              isMe = true;
            }

            const initialLetter = m.user ? m.user.name[0].toUpperCase() : (m.name ? m.name[0].toUpperCase() : 'M');
            const outlineCss = (isMe && !isRecipient) ? 'border: 2.2px solid #000000; box-shadow: 0 0 0 2px rgba(0,0,0,0.08);' : 'border: 1px solid #E4E4E7;';

            if (isRecipient) {
              return `
                <div class="circle-node-item node-recipient-black" data-idx="${node.idx}" style="position: absolute; left: ${x}px; top: ${y}px; cursor: pointer; ${isMe ? 'outline: 2px solid #000000; outline-offset: 2px;' : ''}">
                  <span>${initialLetter}</span>
                  <div class="node-star-badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#000000"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </div>
                </div>
              `;
            } else if (isVerified) {
              return `
                <div class="circle-node-item node-paid-gray" data-idx="${node.idx}" style="position: absolute; left: ${x}px; top: ${y}px; cursor: pointer; ${outlineCss}">
                  <span>${initialLetter}</span>
                  <div class="node-check-badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </div>
              `;
            } else if (isSubmitted) {
              return `
                <div class="circle-node-item node-paid-gray" data-idx="${node.idx}" style="position: absolute; left: ${x}px; top: ${y}px; cursor: pointer; ${outlineCss}">
                  <span>${initialLetter}</span>
                  <div class="node-clock-badge" style="background-color: #000000;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  </div>
                </div>
              `;
            } else {
              return `
                <div class="circle-node-item node-paid-gray" data-idx="${node.idx}" style="position: absolute; left: ${x}px; top: ${y}px; cursor: pointer; ${outlineCss}">
                  <span>${initialLetter}</span>
                  ${isFull ? `
                    <div class="node-clock-badge">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                  ` : ''}
                </div>
              `;
            }
          }).join('')}
        </div>

      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    const nodes = mountEl.querySelectorAll('.circle-node-item');
    nodes.forEach(node => {
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(node.getAttribute('data-idx'), 10);
        if (members[idx] && onMemberClick) {
          onMemberClick(members[idx]);
        }
      });
    });
  }

  renderHTML();

  return {
    spinTo: (targetIdx) => {
      if (!isFull) return;
      const rotator = mountEl.querySelector('#circle-nodes-rotator');
      if (!rotator) return;

      currentAngleOffset += 360 * 3;
      rotator.style.transform = `rotate(${currentAngleOffset}deg)`;

      setTimeout(() => {
        if (onSpinComplete) onSpinComplete(members[targetIdx]);
      }, 2500);
    }
  };
}
