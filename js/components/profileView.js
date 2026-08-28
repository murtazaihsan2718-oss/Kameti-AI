// User Profile View Component - Clean Monochromatic SVG Design

import { authService } from '../services/authService.js';
import { storageService } from '../services/storageService.js';
import { committeeService } from '../services/committeeService.js';
import { formatCurrency, PaymentMethods } from '../models/dataModels.js';

export function renderProfileView(container, { onBack, onLogout, onReload, showToast }) {
  const user = authService.getCurrentUser();
  const committees = committeeService.getMyCommittees();

  function render() {
    container.innerHTML = `
      <div style="padding: 12px 20px 24px 20px;">
        <!-- Top Navbar -->
        <div class="app-top-header">
          <button id="btn-profile-back" class="btn-icon-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <span class="header-title">My Profile</span>
          <div style="width: 38px;"></div>
        </div>

        <!-- User Identity Card -->
        <div class="card-light-gray" style="padding: 24px 20px; text-align: center; margin-top: 4px; margin-bottom: 20px;">
          <div style="width: 72px; height: 72px; border-radius: 50%; background-color: #E4E4E7; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          
          <h2 style="font-size: 22px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-bottom: 2px;">
            ${user ? user.name : 'Aown Haider'}
          </h2>
          <p style="font-size: 13.5px; color: #71717A; font-weight: 600; margin-bottom: 6px;">
            ${user ? user.verifiedPhone : '+923145550101'}
          </p>
          <div style="font-size: 13px; color: #000000; font-weight: 700;">
            ${user ? user.paymentMethod : 'EasyPaisa'} • ${user ? user.paymentNumber : '0314 5550101'}
          </div>
        </div>

        <!-- Form Edit Card -->
        <div class="card-light-gray" style="padding: 20px; margin-bottom: 20px;">
          <form id="profile-edit-form">
            <div class="form-group">
              <label class="form-label-uppercase">FULL NAME</label>
              <input type="text" id="input-edit-name" class="form-input-pill" value="${user ? user.name : ''}" required />
            </div>

            <div class="form-group">
              <label class="form-label-uppercase">PREFERRED PAYOUT METHOD</label>
              <select id="select-edit-method" class="form-input-pill">
                <option value="${PaymentMethods.EASYPAISA}" ${user?.paymentMethod === PaymentMethods.EASYPAISA ? 'selected' : ''}>EasyPaisa</option>
                <option value="${PaymentMethods.JAZZCASH}" ${user?.paymentMethod === PaymentMethods.JAZZCASH ? 'selected' : ''}>JazzCash</option>
                <option value="${PaymentMethods.SADAPAY}" ${user?.paymentMethod === PaymentMethods.SADAPAY ? 'selected' : ''}>SadaPay</option>
                <option value="${PaymentMethods.NAYAPAY}" ${user?.paymentMethod === PaymentMethods.NAYAPAY ? 'selected' : ''}>NayaPay</option>
                <option value="${PaymentMethods.RAAST}" ${user?.paymentMethod === PaymentMethods.RAAST ? 'selected' : ''}>Bank Transfer (Raast)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label-uppercase">PAYMENT ACCOUNT NUMBER</label>
              <input type="text" id="input-edit-account" class="form-input-pill" value="${user ? user.paymentNumber : ''}" required />
            </div>

            <button type="submit" class="btn-pill-black" style="margin-top: 10px;">
              Save Changes
            </button>
          </form>
        </div>

        <!-- Logout Button -->
        <button id="btn-logout-action" style="width: 100%; padding: 14px; background: transparent; border: 1.5px solid #E4E4E7; border-radius: 9999px; font-weight: 700; color: #71717A; cursor: pointer;">
          Log Out
        </button>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    const form = document.getElementById('profile-edit-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('input-edit-name').value.trim();
        const method = document.getElementById('select-edit-method').value;
        const account = document.getElementById('input-edit-account').value.trim();

        if (user) {
          const updated = { ...user, name, paymentMethod: method, paymentNumber: account };
          storageService.setCurrentUser(updated);
          showToast('Profile updated successfully ✓');
          render();
        }
      });
    }

    const btnBack = document.getElementById('btn-profile-back');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (onBack) onBack();
      });
    }

    const btnLogout = document.getElementById('btn-logout-action');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        storageService.setCurrentUser(null);
        if (onLogout) onLogout();
      });
    }
  }

  render();
}
