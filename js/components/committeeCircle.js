// Committee Circle Component - 100% SVG Icons, Zero Emojis (Matching Image 3 & 4 1-to-1)

import { PaymentStatus } from '../models/dataModels.js';

export function renderCommitteeCircle({
  containerId,
  members = [],
  recipientUserId = null,
  payments = [],
  currentUserId = '',
  onMemberClick,
  onSpinComplete
}) {
  const mountEl = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!mountEl) return;

  const totalMembers = Math.max(members.length, 1);
  const size = 300;
  const radius = 105;
  const centerX = size / 2;
  const centerY = size / 2;

  let currentAngleOffset = 0;

  function renderHTML() {
    mountEl.innerHTML = `
      <div class="circle-visualization-container" style="position: relative; width: ${size}px; height: ${size}px; margin: 0 auto;">
        
        <!-- Central Wheel Refresh Circle (Clean SVG Line Icon) -->
        <div style="position: absolute; top: ${centerY - 45}px; left: ${centerX - 45}px; width: 90px; height: 90px; border-radius: 50%; background-color: #FFFFFF; border: 1.5px solid #E4E4E7; display: flex; align-items: center; justify-content: center; color: #71717A; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
        </div>

        <!-- Member Nodes Arranged in Circle -->
        <div id="circle-nodes-rotator" style="position: absolute; width: 100%; height: 100%; transition: transform 3s cubic-bezier(0.15, 0.9, 0.25, 1);">
          ${members.map((m, idx) => {
            const angle = (idx / totalMembers) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle) - 24;
            const y = centerY + radius * Math.sin(angle) - 24;

            const isRecipient = m.userId === recipientUserId || (m.user && m.user.id === recipientUserId);
            const payment = payments.find(p => p.payerUserId === m.userId);
            const isPaid = payment && (payment.status === PaymentStatus.SUBMITTED || payment.status === PaymentStatus.VERIFIED);

            const initialLetter = m.user ? m.user.name[0].toUpperCase() : (m.name ? m.name[0].toUpperCase() : 'M');

            if (isRecipient) {
              return `
                <div class="circle-node-item node-recipient-black" data-idx="${idx}" style="position: absolute; left: ${x}px; top: ${y}px; cursor: pointer;">
                  <span>${initialLetter}</span>
                  <div class="node-star-badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#000000"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  </div>
                </div>
              `;
            } else if (isPaid) {
              return `
                <div class="circle-node-item node-paid-gray" data-idx="${idx}" style="position: absolute; left: ${x}px; top: ${y}px; cursor: pointer;">
                  <span>${initialLetter}</span>
                  <div class="node-check-badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </div>
              `;
            } else {
              return `
                <div class="circle-node-item node-paid-gray" data-idx="${idx}" style="position: absolute; left: ${x}px; top: ${y}px; cursor: pointer;">
                  <span>${initialLetter}</span>
                  <div class="node-clock-badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
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
      const rotator = mountEl.querySelector('#circle-nodes-rotator');
      if (!rotator) return;

      const targetAngle = -(targetIdx / totalMembers) * 360;
      const extraSpins = 360 * 4;
      currentAngleOffset += extraSpins + (targetAngle - (currentAngleOffset % 360));
      rotator.style.transform = `rotate(${currentAngleOffset}deg)`;

      setTimeout(() => {
        if (onSpinComplete) onSpinComplete(members[targetIdx]);
      }, 3100);
    }
  };
}
