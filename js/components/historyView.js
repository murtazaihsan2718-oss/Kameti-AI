// Committee History View Component - Clean Monochromatic SVG Design

import { storageService } from '../services/storageService.js';
import { formatCurrency, PaymentStatus } from '../models/dataModels.js';

export function renderHistoryView(container, { committeeId, onBack, showToast }) {
  const comm = storageService.getCommittees().find(c => c.id === committeeId);
  const months = storageService.getMonths().filter(m => m.committeeId === committeeId);
  const users = storageService.getUsers();
  const payments = storageService.getPayments();

  if (!comm) {
    container.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h3>Committee not found</h3>
        <button id="btn-hist-back" class="btn-pill-black" style="margin-top: 14px; width: auto; display: inline-flex;">Back</button>
      </div>
    `;
    const b = document.getElementById('btn-hist-back');
    if (b) b.addEventListener('click', onBack);
    return;
  }

  function render() {
    container.innerHTML = `
      <div style="padding: 12px 20px 24px 20px;">
        <!-- Top Navbar -->
        <div class="app-top-header">
          <button id="btn-hist-back" class="btn-icon-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <div style="text-align: center;">
            <span class="header-title">History</span>
            <div style="font-size: 11px; color: #71717A; font-weight: 600;">${comm.name}</div>
          </div>
          <div style="width: 38px;"></div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 8px;">
          ${months.map((m, idx) => {
            const mPayments = payments.filter(p => p.committeeMonthId === m.id);
            const submittedCount = mPayments.filter(p => p.status === PaymentStatus.SUBMITTED || p.status === PaymentStatus.VERIFIED).length;
            const rUser = users.find(u => u.id === m.recipientUserId);
            const totalPool = comm.contributionAmount * comm.numberOfMembers;
            const isCompleted = submittedCount >= comm.numberOfMembers;

            return `
              <div class="card-light-gray" style="padding: 18px; margin-bottom: 0;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                  <span style="font-size: 11px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em;">
                    CYCLE ${m.monthNumber} (${m.monthName || `Month ${m.monthNumber}`})
                  </span>
                  <span style="background-color: #E4E4E7; color: #3F3F46; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
                    ${isCompleted ? 'Completed ✓' : 'In Progress'}
                  </span>
                </div>

                <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
                  <div>
                    <div style="font-size: 11.5px; color: #71717A; font-weight: 600;">Recipient</div>
                    <div style="font-size: 16px; font-weight: 800; color: #000000; margin-top: 2px;">
                      ${rUser ? rUser.name : 'Sarah Ahmed'}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 11.5px; color: #71717A; font-weight: 600;">Pool Amount</div>
                    <div style="font-size: 16px; font-weight: 800; color: #000000; margin-top: 2px;">
                      ${formatCurrency(totalPool)}
                    </div>
                  </div>
                </div>

                <div style="padding-top: 10px; border-top: 1px solid #E4E4E7; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #52525B;">
                  <span>Paid: <strong>${submittedCount}/${comm.numberOfMembers} members</strong></span>
                  <span style="color: #71717A;">Due: ${m.dueDate || '10th'}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const backBtn = document.getElementById('btn-hist-back');
    if (backBtn) backBtn.addEventListener('click', onBack);
  }

  render();
}
