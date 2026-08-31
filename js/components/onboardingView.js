import { storageService } from '../services/storageService.js';
import { FirebaseService } from '../services/firebaseService.js';

function isValidPakistaniPhone(raw) {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (/^03\d{9}$/.test(digits)) return true;
  if (/^923\d{9}$/.test(digits)) return true;
  if (/^3\d{9}$/.test(digits)) return true;
  return false;
}

function normalizePakistaniPhone(raw) {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('92') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('3') && digits.length === 10) {
    return '0' + digits;
  }
  return digits;
}

export function renderOnboardingView(container, { onComplete, showToast }) {
  let authMode = 'signup'; // 'signup' or 'signin'
  let selectedPayout = 'easypaisa';

  function render() {
    container.innerHTML = `
      <div style="padding: 24px 20px; max-width: 420px; margin: 0 auto; display: flex; flex-direction: column; min-height: 85vh; justify-content: flex-start;">
        
        <div>
          <!-- Brand Header -->
          <div style="text-align: center; margin-bottom: 20px; margin-top: 8px;">
            <h1 style="font-size: 26px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-bottom: 4px;">
              Kameti AI
            </h1>
            <p style="font-size: 13px; color: #71717A; font-weight: 500; line-height: 18px;">
              Informal savings committees made simple
            </p>
          </div>

          <!-- Card Form Container -->
          <div class="card-light-gray" style="background-color: #F4F4F5; border-radius: 22px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
            
            <!-- Auth Mode Switcher -->
            <div style="display: flex; background: #E4E4E7; border-radius: 14px; padding: 4px; margin-bottom: 16px;">
              <button type="button" id="tab-mode-signup" style="flex: 1; padding: 9px 0; border: none; border-radius: 11px; font-size: 13px; font-weight: ${authMode === 'signup' ? '800' : '600'}; color: ${authMode === 'signup' ? '#000000' : '#71717A'}; background: ${authMode === 'signup' ? '#FFFFFF' : 'transparent'}; cursor: pointer; box-shadow: ${authMode === 'signup' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};">
                Create Profile
              </button>
              <button type="button" id="tab-mode-signin" style="flex: 1; padding: 9px 0; border: none; border-radius: 11px; font-size: 13px; font-weight: ${authMode === 'signin' ? '800' : '600'}; color: ${authMode === 'signin' ? '#000000' : '#71717A'}; background: ${authMode === 'signin' ? '#FFFFFF' : 'transparent'}; cursor: pointer; box-shadow: ${authMode === 'signin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};">
                Sign In
              </button>
            </div>

            ${authMode === 'signin' ? `
              <!-- SIGN IN MODE -->
              <div style="margin-bottom: 16px;">
                <h2 style="font-size: 16px; font-weight: 800; color: #000000; margin-bottom: 4px;">
                  Welcome Back
                </h2>
                <p style="font-size: 13px; color: #71717A;">
                  Enter your registered phone number to access your committees.
                </p>
              </div>

              <form id="signin-phone-form">
                <!-- Phone Number Field -->
                <div class="form-group" style="margin-bottom: 16px;">
                  <label class="form-label-uppercase" style="font-size: 11px; font-weight: 700; color: #71717A; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">PHONE NUMBER</label>
                  <div style="position: relative; display: flex; align-items: center;">
                    <span style="position: absolute; left: 14px; display: flex; align-items: center; justify-content: center;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                    </span>
                    <input type="tel" id="input-signin-phone" class="form-input-pill" style="padding-left: 42px; width: 100%; height: 46px; border-radius: 14px; border: 1.5px solid #E4E4E7; background: #FFFFFF; font-size: 14px; padding-right: 14px;" placeholder="0300 1234567" maxlength="13" required autofocus />
                  </div>
                </div>

                <!-- Sign In Submit Button -->
                <button type="submit" class="btn-pill-black" style="width: 100%; height: 48px; border-radius: 14px; background: #000000; color: #FFFFFF; font-weight: 700; font-size: 15px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <span>Sign In</span>
                  <span style="font-size: 16px;">→</span>
                </button>

                <!-- Switch Link -->
                <div style="text-align: center; margin-top: 14px;">
                  <button type="button" id="link-switch-to-signup" style="background: none; border: none; font-size: 13px; color: #71717A; cursor: pointer;">
                    Don't have an account? <strong style="color: #000000;">Create Profile</strong>
                  </button>
                </div>
              </form>
            ` : `
              <!-- CREATE PROFILE MODE -->
              <div style="margin-bottom: 16px;">
                <h2 style="font-size: 16px; font-weight: 800; color: #000000; margin-bottom: 4px;">
                  Create Profile
                </h2>
                <p style="font-size: 13px; color: #71717A;">
                  Enter your details to track payments and join committees.
                </p>
              </div>

              <form id="onboarding-profile-form">
                <!-- Full Name Field -->
                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label-uppercase" style="font-size: 11px; font-weight: 700; color: #71717A; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">FULL NAME</label>
                  <div style="position: relative; display: flex; align-items: center;">
                    <span style="position: absolute; left: 14px; display: flex; align-items: center; justify-content: center;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </span>
                    <input type="text" id="input-onboard-name" class="form-input-pill" style="padding-left: 42px; width: 100%; height: 46px; border-radius: 14px; border: 1.5px solid #E4E4E7; background: #FFFFFF; font-size: 14px; padding-right: 14px;" placeholder="e.g. Aown Raza" required autofocus />
                  </div>
                </div>

                <!-- Phone Number Field -->
                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label-uppercase" style="font-size: 11px; font-weight: 700; color: #71717A; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">PHONE NUMBER</label>
                  <div style="position: relative; display: flex; align-items: center;">
                    <span style="position: absolute; left: 14px; display: flex; align-items: center; justify-content: center;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                    </span>
                    <input type="tel" id="input-onboard-phone" class="form-input-pill" style="padding-left: 42px; width: 100%; height: 46px; border-radius: 14px; border: 1.5px solid #E4E4E7; background: #FFFFFF; font-size: 14px; padding-right: 14px;" placeholder="0300 1234567" maxlength="13" required />
                  </div>
                </div>

                <!-- Preferred Payout Selectable Cards -->
                <div class="form-group" style="margin-bottom: 14px;">
                  <label class="form-label-uppercase" style="font-size: 11px; font-weight: 700; color: #71717A; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">PREFERRED PAYOUT METHOD</label>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div class="payout-option-card ${selectedPayout === 'easypaisa' ? 'active' : ''}" data-method="easypaisa">
                      <span style="font-weight: 700; font-size: 13px;">EasyPaisa</span>
                    </div>
                    <div class="payout-option-card ${selectedPayout === 'jazzcash' ? 'active' : ''}" data-method="jazzcash">
                      <span style="font-weight: 700; font-size: 13px;">JazzCash</span>
                    </div>
                    <div class="payout-option-card ${selectedPayout === 'sadapay' ? 'active' : ''}" data-method="sadapay">
                      <span style="font-weight: 700; font-size: 13px;">SadaPay</span>
                    </div>
                    <div class="payout-option-card ${selectedPayout === 'nayapay' ? 'active' : ''}" data-method="nayapay">
                      <span style="font-weight: 700; font-size: 13px;">NayaPay</span>
                    </div>
                    <div class="payout-option-card ${selectedPayout === 'bank' ? 'active' : ''}" data-method="bank" style="grid-column: span 2;">
                      <span style="font-weight: 700; font-size: 13px;">Bank Account</span>
                    </div>
                  </div>
                </div>

                <!-- Account Number Field -->
                <div class="form-group" style="margin-bottom: 18px;">
                  <label class="form-label-uppercase" style="font-size: 11px; font-weight: 700; color: #71717A; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">PAYMENT ACCOUNT NUMBER (OPTIONAL)</label>
                  <div style="position: relative; display: flex; align-items: center;">
                    <span style="position: absolute; left: 14px; display: flex; align-items: center; justify-content: center;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                    </span>
                    <input type="text" id="input-onboard-acc" class="form-input-pill" style="padding-left: 42px; width: 100%; height: 46px; border-radius: 14px; border: 1.5px solid #E4E4E7; background: #FFFFFF; font-size: 14px; padding-right: 14px;" placeholder="Account / Wallet number" />
                  </div>
                </div>

                <!-- Get Started Submit Button -->
                <button type="submit" class="btn-pill-black" style="width: 100%; height: 48px; border-radius: 14px; background: #000000; color: #FFFFFF; font-weight: 700; font-size: 15px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <span>Get Started</span>
                  <span style="font-size: 16px;">→</span>
                </button>

                <!-- Quick Demo Fill Button -->
                <button type="button" id="btn-quick-demo-fill" style="width: 100%; height: 42px; border-radius: 14px; background: #FFFFFF; color: #71717A; font-weight: 700; font-size: 13px; border: 1.5px solid #E4E4E7; margin-top: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2.2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  <span>Quick Fill Demo Profile</span>
                </button>

                <!-- Switch Link -->
                <div style="text-align: center; margin-top: 14px;">
                  <button type="button" id="link-switch-to-signin" style="background: none; border: none; font-size: 13px; color: #71717A; cursor: pointer;">
                    Already have an account? <strong style="color: #000000;">Sign In</strong>
                  </button>
                </div>
              </form>
            `}
          </div>
        </div>

      </div>

      <style>
        .payout-option-card {
          background-color: #FFFFFF;
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #E4E4E7;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #71717A;
        }
        .payout-option-card.active {
          border-color: #000000;
          background-color: #000000;
          color: #FFFFFF;
        }
      </style>
    `;

    attachEvents();
  }

  function attachEvents() {
    // Mode toggling
    const tabSignup = document.getElementById('tab-mode-signup');
    const tabSignin = document.getElementById('tab-mode-signin');
    const linkToSignin = document.getElementById('link-switch-to-signin');
    const linkToSignup = document.getElementById('link-switch-to-signup');

    if (tabSignup) tabSignup.onclick = () => { authMode = 'signup'; render(); };
    if (tabSignin) tabSignin.onclick = () => { authMode = 'signin'; render(); };
    if (linkToSignin) linkToSignin.onclick = () => { authMode = 'signin'; render(); };
    if (linkToSignup) linkToSignup.onclick = () => { authMode = 'signup'; render(); };

    // Payout cards selection (in signup mode)
    const cards = container.querySelectorAll('.payout-option-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        selectedPayout = card.getAttribute('data-method');
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    // Quick demo fill
    const quickFillBtn = document.getElementById('btn-quick-demo-fill');
    if (quickFillBtn) {
      quickFillBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('input-onboard-name');
        const phoneInput = document.getElementById('input-onboard-phone');
        const accInput = document.getElementById('input-onboard-acc');
        if (nameInput) nameInput.value = 'Aown Raza';
        if (phoneInput) phoneInput.value = '0300 1234567';
        if (accInput) accInput.value = '03001234567';
        selectedPayout = 'easypaisa';
        cards.forEach(c => {
          if (c.getAttribute('data-method') === 'easypaisa') {
            c.classList.add('active');
          } else {
            c.classList.remove('active');
          }
        });
        if (showToast) showToast('Filled with demo profile data!');
      });
    }

    // Sign in form submission
    const signinForm = document.getElementById('signin-phone-form');
    if (signinForm) {
      signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const phoneVal = document.getElementById('input-signin-phone')?.value.trim();
          if (!phoneVal) {
            if (showToast) showToast('Please enter your phone number');
            return;
          }
          if (!isValidPakistaniPhone(phoneVal)) {
            if (showToast) showToast('Please enter a valid 11-digit Pakistani mobile number (e.g. 0300 1234567)');
            return;
          }

          const clean = normalizePakistaniPhone(phoneVal);
          const isDemo = clean === '03001234567';

          let userToLogin = null;
          if (isDemo) {
            userToLogin = {
              id: 'usr_aown',
              name: 'Aown Raza',
              verifiedPhone: '0300 1234567',
              phone: '0300 1234567',
              paymentMethod: 'EasyPaisa',
              paymentNumber: '03001234567',
              accountNumber: '03001234567',
              accountTitle: 'Aown Raza',
              isNewUser: false,
              stats: {
                activeCommittees: 2,
                completedCommittees: 1,
                totalContributions: 30000,
                totalPayouts: 60000,
              },
              createdAt: new Date().toISOString()
            };
          } else {
            const storedUsers = storageService.getUsers();
            const found = storedUsers.find(u => normalizePakistaniPhone(u.verifiedPhone || u.phone) === clean);
            if (found) {
              userToLogin = found;
            } else {
              try {
                userToLogin = await FirebaseService.getUserProfileByPhone(clean);
              } catch (err) {
                console.log('[Onboarding Web] Cloud user fetch notice:', err);
              }
            }
          }

          if (userToLogin) {
            storageService.setCurrentUser(userToLogin);
            const users = storageService.getUsers();
            const idx = users.findIndex(u => u.id === userToLogin.id || normalizePakistaniPhone(u.verifiedPhone || u.phone) === clean);
            if (idx >= 0) {
              users[idx] = userToLogin;
            } else {
              users.push(userToLogin);
            }
            storageService.setUsers(users);
            FirebaseService.saveUserProfile(userToLogin).catch(err => console.warn('Cloud sync error:', err));
            if (typeof onComplete === 'function') onComplete(userToLogin);
          } else {
            const formattedPhone = clean.startsWith('03') ? `${clean.slice(0, 4)} ${clean.slice(4)}` : clean;
            authMode = 'signup';
            render();
            const phoneInput = document.getElementById('input-onboard-phone');
            if (phoneInput) phoneInput.value = formattedPhone;
            if (showToast) showToast(`No profile found for ${formattedPhone}. Please enter your name to create one.`);
          }
        } catch (err) {
          console.error('[Onboarding Web] Error signing in:', err);
          if (showToast) showToast('Error signing in: ' + (err.message || 'Please try again'));
        }
      });
    }

    // Sign up form submission
    const signupForm = document.getElementById('onboarding-profile-form');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const nameVal = document.getElementById('input-onboard-name')?.value.trim() || '';
          const phoneVal = document.getElementById('input-onboard-phone')?.value.trim() || '';
          const accVal = document.getElementById('input-onboard-acc')?.value.trim() || '';

          if (!nameVal) {
            if (showToast) showToast('Please enter your full name');
            return;
          }
          if (!phoneVal) {
            if (showToast) showToast('Please enter your phone number');
            return;
          }
          if (!isValidPakistaniPhone(phoneVal)) {
            if (showToast) showToast('Please enter a valid 11-digit Pakistani mobile number (e.g. 0300 1234567)');
            return;
          }

          const normPhone = normalizePakistaniPhone(phoneVal);
          const cleanPhone = `${normPhone.slice(0, 4)} ${normPhone.slice(4)}`;
          const isDemo = normPhone === '03001234567' || nameVal.toLowerCase().includes('aown');

          // Check if profile exists locally or in Cloud
          let existing = storageService.getUsers().find(u => normalizePakistaniPhone(u.verifiedPhone || u.phone) === normPhone);
          if (!existing && !isDemo) {
            try {
              existing = await FirebaseService.getUserProfileByPhone(normPhone);
            } catch (err) {
              console.log('[Onboarding Web] Cloud lookup notice:', err);
            }
          }

          const userId = isDemo ? 'usr_aown' : (existing?.id || ('u_' + normPhone));
          const newUser = {
            id: userId,
            name: nameVal,
            verifiedPhone: cleanPhone,
            phone: cleanPhone,
            paymentMethod: selectedPayout,
            paymentNumber: accVal || cleanPhone,
            accountNumber: accVal || cleanPhone,
            accountTitle: nameVal,
            isNewUser: false,
            stats: existing?.stats || {
              activeCommittees: 0,
              completedCommittees: 0,
              totalContributions: 0,
              totalPayouts: 0,
            },
            createdAt: new Date().toISOString()
          };

          storageService.setCurrentUser(newUser);
          const users = storageService.getUsers();
          const existingIdx = users.findIndex(u => normalizePakistaniPhone(u.verifiedPhone || u.phone) === normPhone || u.id === newUser.id);
          if (existingIdx >= 0) {
            users[existingIdx] = newUser;
          } else {
            users.push(newUser);
          }
          storageService.setUsers(users);

          // Non-blocking background save to Cloud Firestore
          FirebaseService.saveUserProfile(newUser).catch(err => {
            console.warn('[Onboarding Web] Cloud save notice:', err);
          });

          if (typeof onComplete === 'function') {
            onComplete(newUser);
          }
        } catch (err) {
          console.error('[Onboarding Web] Error creating profile:', err);
          if (showToast) showToast('Error creating profile: ' + (err.message || 'Please try again'));
        }
      });
    }
  }

  render();
}
