// Payment Proof Upload Modal Component - 100% SVG Line Icons, Zero Emojis (Matching Image 3 & 4 1-to-1)

import { paymentService } from '../services/paymentService.js';
import { authService } from '../services/authService.js';
import { FirebaseService } from '../services/firebaseService.js';

export function openPaymentProofModal({
  payment,
  recipientUser,
  proof = null,
  isOwner = false,
  onUpdated,
  showToast
}) {
  const overlay = document.getElementById('modal-overlay');
  const sheet = document.getElementById('modal-sheet-content');
  if (!overlay || !sheet) return;

  const currentUser = authService.getCurrentUser();
  const committeeId = payment.committeeId || 'com_friends_2026';

  let newlySelectedImage = null;

  function compressImage(file, maxWidth = 900, maxHeight = 900, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  function render() {
    const activeImage = newlySelectedImage || (proof ? proof.fileUrl : null);
    const amountVal = payment.amount || 5000;

    sheet.innerHTML = `
      <div style="text-align: left; padding: 4px 0;">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <button id="btn-close-proof-x" style="border: none; background: transparent; font-size: 20px; font-weight: 700; cursor: pointer;">
            ←
          </button>
          <h2 style="font-size: 18px; font-weight: 800; color: #000000;">Upload Proof</h2>
          <div style="width: 24px;"></div>
        </div>

        <!-- Top Amount & Details Card -->
        <div class="card-light-gray" style="margin-bottom: 20px; padding: 20px;">
          <div style="text-align: center; margin-bottom: 14px;">
            <div style="font-size: 11px; font-weight: 800; color: #71717A; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">
              AMOUNT TO PAY
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #000000; letter-spacing: -0.02em;">
              Rs. ${amountVal.toLocaleString()}
            </div>
          </div>

          <div style="border-top: 1px solid #E4E4E7; padding-top: 14px; display: flex; flex-direction: column; gap: 10px; font-size: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="color: #71717A; font-weight: 500;">Recipient</span>
              <span style="font-weight: 800; color: #000000;">${recipientUser ? recipientUser.name : 'Sarah Ahmed'}</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="color: #71717A; font-weight: 500;">Method</span>
              <span style="font-weight: 800; color: #000000;">${recipientUser ? recipientUser.paymentMethod : 'EasyPaisa'}</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="color: #71717A; font-weight: 500;">Account Number</span>
              <span style="font-weight: 800; color: #000000;">${recipientUser ? recipientUser.paymentNumber : '0300 1234567'}</span>
            </div>
          </div>
        </div>

        <!-- Bottom Upload Dropzone (Clean SVG File Upload Icon) -->
        ${activeImage ? `
          <div style="position: relative; margin-bottom: 20px; border-radius: 24px; overflow: hidden; border: 1.5px solid #E4E4E7;">
            <img src="${activeImage}" style="width: 100%; max-height: 220px; object-fit: cover; display: block;" />
            <button id="btn-reselect-image" style="position: absolute; top: 10px; right: 10px; background-color: rgba(0,0,0,0.7); color: #FFF; border: none; border-radius: 9999px; padding: 6px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">
              Change Screenshot
            </button>
          </div>
        ` : `
          <div id="dropzone-attach-proof" style="border: 2px dashed #D4D4D8; border-radius: 24px; padding: 36px 20px; text-align: center; cursor: pointer; background-color: #FFFFFF; margin-bottom: 20px;">
            <input type="file" id="file-input-attach" accept="image/*" style="display: none;" />
            
            <div style="width: 54px; height: 54px; border-radius: 50%; background-color: #F4F4F5; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="12" y2="12"></line><line x1="15" y1="15" x2="12" y2="12"></line></svg>
            </div>

            <h3 style="font-size: 20px; font-weight: 800; color: #000000; margin-bottom: 6px;">
              Tap to upload
            </h3>
            <p style="font-size: 13px; color: #71717A; font-weight: 500; max-width: 260px; margin: 0 auto; line-height: 1.4;">
              Select a screenshot of your successful transaction.
            </p>
          </div>
        `}

        <button id="btn-confirm-submit-proof" class="btn-pill-black" ${!activeImage ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
          <span>Confirm & Submit Proof</span>
          <span style="font-size: 18px;">→</span>
        </button>

      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    const closeBtn = sheet.querySelector('#btn-close-proof-x');
    if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));

    const dropzone = sheet.querySelector('#dropzone-attach-proof');
    const fileInput = sheet.querySelector('#file-input-attach');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            showToast('Processing screenshot...');
            newlySelectedImage = await compressImage(file);
            render();
          } catch (err) {
            showToast('Error reading image');
          }
        }
      });
    }

    const reselectBtn = sheet.querySelector('#btn-reselect-image');
    if (reselectBtn) {
      reselectBtn.addEventListener('click', () => {
        newlySelectedImage = null;
        render();
      });
    }

    const submitBtn = sheet.querySelector('#btn-confirm-submit-proof');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        if (!newlySelectedImage) return;

        try {
          const paymentId = payment.id || 'pay_' + committeeId + '_' + currentUser.id;
          await paymentService.submitPaymentProof(paymentId, newlySelectedImage, 'Submitted via web app');
          
          await FirebaseService.submitMemberProof(committeeId, currentUser.id, newlySelectedImage, 'Submitted via web app');

          await FirebaseService.submitPaymentProof(committeeId, {
            paymentId,
            payerUserId: currentUser.id,
            recipientUserId: recipientUser ? (recipientUser.id || recipientUser.userId) : null,
            amount: payment.amount || 5000,
            status: 'submitted',
            fileUrl: newlySelectedImage,
            notes: 'Submitted screenshot proof',
            submittedAt: new Date().toISOString()
          });

          // Also update local storage committee members
          const committees = storageService.getCommittees ? storageService.getCommittees() : [];
          const com = committees.find(c => c.id === committeeId);
          if (com && com.members) {
            const m = com.members.find(mem => mem.id === currentUser.id || mem.userId === currentUser.id);
            if (m) {
              m.paymentProofUrl = newlySelectedImage;
              m.paymentStatus = 'submitted';
              storageService.setCommittees(committees);
            }
          }

          showToast('Payment proof submitted successfully ✓');
          overlay.classList.remove('open');
          if (onUpdated) onUpdated();
        } catch (err) {
          showToast(err.message || 'Failed to submit proof');
        }
      });
    }
  }

  render();
  overlay.classList.add('open');
}
