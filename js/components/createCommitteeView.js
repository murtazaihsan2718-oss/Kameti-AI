// Create Committee View Component - 100% SVG Line Icons, Zero Emojis (Matching Image 3 & 4 1-to-1)

import { committeeService } from '../services/committeeService.js';
import { FirebaseService } from '../services/firebaseService.js';
import { formatCurrency, SelectionMethods } from '../models/dataModels.js';

export function renderCreateCommitteeView(container, { onBack, onCreated, showToast }) {
  let step = 1;
  let createdCommittee = null;

  let formData = {
    name: 'Summer Vacation Fund',
    members: 4,
    contribution: 250,
    frequency: 'monthly',
    duration: 12,
    deadlineDay: '10th',
    startDate: new Date().toISOString().split('T')[0],
    selectionMethod: SelectionMethods.RANDOM
  };

  function render() {
    container.innerHTML = `
      <div style="padding: 12px 20px 24px 20px;">
        <!-- Top Navbar -->
        <div class="app-top-header">
          <button id="btn-create-back" class="btn-icon-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <span class="header-title">Kameti AI</span>
          <button id="btn-create-profile" class="btn-icon-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"></circle><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path></svg>
          </button>
        </div>

        <!-- Title Header -->
        <div style="margin-top: 4px; margin-bottom: 20px;">
          <h1 style="font-size: 22px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-bottom: 4px;">
            ${step === 1 ? 'Committee Settings' : 'Committee Created!'}
          </h1>
          <p style="font-size: 13.5px; color: #71717A; font-weight: 500;">
            ${step === 1 ? 'Configure the settings for your new savings pool.' : 'Share your invite link with members below.'}
          </p>
        </div>

        ${step === 1 ? renderForm() : renderSuccess()}
      </div>
    `;

    attachEvents();
  }

  function renderForm() {
    const totalMonthlyPool = formData.members * formData.contribution;

    return `
      <!-- Committee Settings Card -->
      <div class="card-light-gray">
        <form id="create-committee-form">
          
          <!-- COMMITTEE NAME -->
          <div class="form-group">
            <label class="form-label-uppercase">COMMITTEE NAME</label>
            <input type="text" id="input-comm-name" class="form-input-pill" placeholder="e.g. Summer Vacation Fund" value="${formData.name}" required />
          </div>

          <!-- NUMBER OF PARTICIPANTS (Stepper - 4 +) -->
          <div class="form-group">
            <label class="form-label-uppercase">NUMBER OF PARTICIPANTS</label>
            <div class="stepper-container">
              <button type="button" id="btn-stepper-minus" class="btn-stepper-circle">-</button>
              <span id="stepper-count" class="stepper-val">${formData.members}</span>
              <button type="button" id="btn-stepper-plus" class="btn-stepper-circle btn-stepper-plus">+</button>
            </div>
          </div>

          <!-- MONTHLY CONTRIBUTION -->
          <div class="form-group">
            <label class="form-label-uppercase">MONTHLY CONTRIBUTION</label>
            <div style="background-color: #FFFFFF; border-radius: 18px; padding: 14px 18px; border: 1px solid #E5E7EB; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 24px; font-weight: 800; color: #A1A1AA;">PKR</span>
              <input type="number" id="input-comm-contribution" style="border: none; outline: none; font-size: 26px; font-weight: 800; color: #000000; width: 100%;" value="${formData.contribution}" min="50" step="50" required />
            </div>
          </div>

          <!-- MONTHLY POOL SUB-CARD -->
          <div style="background-color: #E4E4E7; border-radius: 18px; padding: 16px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">
                MONTHLY POOL
              </div>
              <div id="display-monthly-pool" style="font-size: 20px; font-weight: 800; color: #000000;">
                ${formatCurrency(totalMonthlyPool)}
              </div>
            </div>
            <div style="width: 38px; height: 38px; border-radius: 50%; background-color: #FFFFFF; display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"></rect><path d="M6 12h12"></path></svg>
            </div>
          </div>

          <!-- DURATION (MONTHS) -->
          <div class="form-group">
            <label class="form-label-uppercase">DURATION (MONTHS)</label>
            <select id="select-comm-duration" class="form-input-pill">
              <option value="6" ${formData.duration === 6 ? 'selected' : ''}>6 Months</option>
              <option value="12" ${formData.duration === 12 ? 'selected' : ''}>12 Months</option>
              <option value="24" ${formData.duration === 24 ? 'selected' : ''}>24 Months</option>
            </select>
          </div>

          <!-- MONTHLY DEPOSIT DEADLINE -->
          <div class="form-group">
            <label class="form-label-uppercase">MONTHLY DEPOSIT DEADLINE</label>
            <select id="select-comm-deadline" class="form-input-pill">
              <option value="1st">1st of the month</option>
              <option value="5th">5th of the month</option>
              <option value="10th" selected>10th of the month</option>
              <option value="15th">15th of the month</option>
            </select>
          </div>

          <button type="submit" class="btn-pill-black" style="margin-top: 10px;">
            <span>Create Committee</span>
            <span style="font-size: 18px;">→</span>
          </button>
        </form>
      </div>
    `;
  }

  function renderSuccess() {
    const inviteLink = `${window.location.origin}/?join=${createdCommittee.joinCode}`;

    return `
      <!-- Invite Members Card -->
      <div class="card-light-gray">
        
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 42px; height: 42px; border-radius: 50%; background-color: #E4E4E7; display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          </div>
          <div>
            <h3 style="font-size: 18px; font-weight: 800; color: #000000; letter-spacing: -0.01em;">
              Invite Members
            </h3>
          </div>
        </div>

        <p style="font-size: 13.5px; color: #71717A; font-weight: 500; margin-bottom: 18px; line-height: 1.45;">
          Share this secure link with your friends to allow them to join the committee.
        </p>

        <!-- Input with Copy Icon -->
        <div class="form-group">
          <div style="position: relative; display: flex; align-items: center;">
            <input type="text" readonly class="form-input-pill" value="${inviteLink}" style="padding-right: 50px; font-size: 13.5px; color: #52525B;" />
            <button type="button" id="btn-copy-link-input" style="position: absolute; right: 10px; width: 34px; height: 34px; border-radius: 10px; border: none; background-color: #E4E4E7; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        </div>

        <button id="btn-share-invite-action" class="btn-pill-black" style="margin-top: 14px;">
          <span>Invite Friends</span>
        </button>

      </div>
    `;
  }

  function attachEvents() {
    const btnBack = document.getElementById('btn-create-back');
    if (btnBack) btnBack.addEventListener('click', onBack);

    const btnMinus = document.getElementById('btn-stepper-minus');
    const btnPlus = document.getElementById('btn-stepper-plus');
    const stepperVal = document.getElementById('stepper-count');
    const displayPool = document.getElementById('display-monthly-pool');

    if (btnMinus) {
      btnMinus.addEventListener('click', () => {
        if (formData.members > 2) {
          formData.members--;
          if (stepperVal) stepperVal.innerText = String(formData.members);
          if (displayPool) displayPool.innerText = formatCurrency(formData.members * formData.contribution);
        }
      });
    }

    if (btnPlus) {
      btnPlus.addEventListener('click', () => {
        if (formData.members < 50) {
          formData.members++;
          if (stepperVal) stepperVal.innerText = String(formData.members);
          if (displayPool) displayPool.innerText = formatCurrency(formData.members * formData.contribution);
        }
      });
    }

    const form = document.getElementById('create-committee-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputName = document.getElementById('input-comm-name');
        const inputContrib = document.getElementById('input-comm-contribution');
        const selectDuration = document.getElementById('select-comm-duration');

        try {
          createdCommittee = committeeService.createCommittee({
            name: inputName ? inputName.value.trim() : formData.name,
            numberOfMembers: formData.members,
            contributionAmount: inputContrib ? parseInt(inputContrib.value, 10) : formData.contribution,
            duration: selectDuration ? parseInt(selectDuration.value, 10) : formData.duration,
            startDate: formData.startDate,
            recipientSelectionMethod: formData.selectionMethod
          });

          await FirebaseService.saveCommittee({
            id: createdCommittee.id,
            name: createdCommittee.name,
            joinCode: createdCommittee.joinCode,
            contributionAmount: createdCommittee.contributionAmount,
            numberOfMembers: createdCommittee.numberOfMembers,
            memberCount: 1,
            totalCycles: createdCommittee.duration,
            currentCycle: 1,
            frequency: createdCommittee.frequency,
            startDate: createdCommittee.startDate,
            selectionMode: createdCommittee.recipientSelectionMethod,
            status: createdCommittee.status,
            members: [
              {
                id: 'm1',
                name: 'Committee Creator',
                phone: '+923000000000',
                avatar: 'creator',
                paymentMethod: 'easypaisa',
                accountNumber: '03000000000',
                accountTitle: 'Creator',
                hasReceivedPayout: false,
              }
            ],
            payments: [],
          });

          step = 2;
          render();
          showToast('Committee created & saved live!');
        } catch (err) {
          showToast(err.message || 'Error creating committee');
        }
      });
    }

    const btnCopy = document.getElementById('btn-copy-link-input');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const link = `${window.location.origin}/?join=${createdCommittee.joinCode}`;
        navigator.clipboard.writeText(link).then(() => {
          showToast('Link copied to clipboard ✓');
        });
      });
    }

    const btnShare = document.getElementById('btn-share-invite-action');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        const link = `${window.location.origin}/?join=${createdCommittee.joinCode}`;
        if (navigator.share) {
          navigator.share({
            title: `Join ${createdCommittee.name}`,
            text: `Join "${createdCommittee.name}" on Kameti AI:`,
            url: link
          }).catch(() => {});
        } else {
          navigator.clipboard.writeText(link).then(() => {
            showToast('Link copied to clipboard ✓');
          });
        }
      });
    }
  }

  render();
}
