// Onboarding View Component - 100% SVG Line Icons, Zero Emojis (Matching Image 3 & 4)

import { storageService } from '../services/storageService.js';
import { PaymentMethods } from '../models/dataModels.js';

export function renderOnboardingView(container, { onComplete, showToast }) {
  let selectedPayout = PaymentMethods.EASYPAISA;

  function render() {
    container.innerHTML = `
      <div style="padding: 32px 20px 20px 20px; max-width: 400px; margin: 0 auto; display: flex; flex-direction: column; min-height: 85vh; justify-content: space-between;">
        
        <div>
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-bottom: 6px;">
              Welcome to Kameti AI
            </h1>
            <p style="font-size: 14px; color: #71717A; font-weight: 500;">
              Set up your profile
            </p>
          </div>

          <!-- Step Indicator Pills (1  2  3) -->
          <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin-bottom: 28px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #000000; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;">
              1
            </div>
            <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #FFFFFF; border: 1.5px solid #E4E4E7; color: #A1A1AA; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">
              2
            </div>
            <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #FFFFFF; border: 1.5px solid #E4E4E7; color: #A1A1AA; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">
              3
            </div>
          </div>

          <!-- Card Form Container -->
          <div class="card-light-gray">
            <form id="onboarding-profile-form">
              
              <!-- Full Name Field -->
              <div class="form-group">
                <label class="form-label-uppercase">FULL NAME</label>
                <div style="position: relative; display: flex; align-items: center;">
                  <span style="position: absolute; left: 14px; display: flex; align-items: center; justify-content: center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </span>
                  <input type="text" id="input-onboard-name" class="form-input-pill" style="padding-left: 42px;" placeholder="Enter your full name" required autofocus />
                </div>
              </div>

              <!-- Phone Number Field -->
              <div class="form-group">
                <label class="form-label-uppercase">PHONE NUMBER</label>
                <div style="position: relative; display: flex; align-items: center;">
                  <span style="position: absolute; left: 14px; display: flex; align-items: center; justify-content: center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                  </span>
                  <input type="tel" id="input-onboard-phone" class="form-input-pill" style="padding-left: 42px;" placeholder="03XX XXXXXXX" required />
                </div>
              </div>

              <!-- Preferred Payout Selectable Cards -->
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label-uppercase">PREFERRED PAYOUT</label>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  
                  <div class="payout-option-card ${selectedPayout === PaymentMethods.EASYPAISA ? 'active' : ''}" data-method="${PaymentMethods.EASYPAISA}">
                    <div style="width: 36px; height: 36px; border-radius: 12px; background-color: #E4E4E7; display: flex; align-items: center; justify-content: center;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"></rect><path d="M6 12h12"></path></svg>
                    </div>
                    <span style="font-weight: 700; font-size: 15px; color: #000000;">EasyPaisa</span>
                  </div>

                  <div class="payout-option-card ${selectedPayout === PaymentMethods.JAZZCASH ? 'active' : ''}" data-method="${PaymentMethods.JAZZCASH}">
                    <div style="width: 36px; height: 36px; border-radius: 12px; background-color: #E4E4E7; display: flex; align-items: center; justify-content: center;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                    </div>
                    <span style="font-weight: 700; font-size: 15px; color: #000000;">JazzCash</span>
                  </div>

                  <div class="payout-option-card ${selectedPayout === PaymentMethods.RAAST || selectedPayout === PaymentMethods.BANK ? 'active' : ''}" data-method="${PaymentMethods.RAAST}">
                    <div style="width: 36px; height: 36px; border-radius: 12px; background-color: #E4E4E7; display: flex; align-items: center; justify-content: center;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"></path></svg>
                    </div>
                    <span style="font-weight: 700; font-size: 15px; color: #000000;">Bank Transfer</span>
                  </div>

                </div>
              </div>

              <button type="submit" class="btn-pill-black" style="margin-top: 24px;">
                <span>Continue</span>
                <span style="font-size: 18px;">→</span>
              </button>
            </form>
          </div>
        </div>

      </div>

      <style>
        .payout-option-card {
          background-color: #FFFFFF;
          border-radius: 16px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .payout-option-card.active {
          border-color: #000000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
      </style>
    `;

    attachEvents();
  }

  function attachEvents() {
    const cards = container.querySelectorAll('.payout-option-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        selectedPayout = card.getAttribute('data-method');
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    const form = document.getElementById('onboarding-profile-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameVal = document.getElementById('input-onboard-name').value.trim();
        const phoneVal = document.getElementById('input-onboard-phone').value.trim();

        if (!nameVal) {
          showToast('Please enter your full name');
          return;
        }

        const cleanPhone = phoneVal.startsWith('+') ? phoneVal : '+92' + phoneVal.replace(/^0+/, '');
        const newUser = {
          id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 4),
          name: nameVal,
          verifiedPhone: cleanPhone,
          paymentMethod: selectedPayout,
          paymentNumber: cleanPhone,
          isNewUser: false,
          createdAt: new Date().toISOString()
        };

        storageService.setCurrentUser(newUser);
        const users = storageService.getUsers();
        users.push(newUser);
        storageService.setUsers(users);

        showToast(`Welcome, ${nameVal}!`);
        onComplete();
      });
    }
  }

  render();
}
