// Voice Assistant & AI Chat View Component - 100% SVG Line Icons, Zero Emojis (Matching Image 3 & 4 1-to-1)

import { voiceAssistantService } from '../services/voiceAssistantService.js';

export function openVoiceAssistantModal({ showToast }) {
  const container = document.getElementById('app-viewport');
  if (!container) return;

  let messages = [
    { sender: 'user', text: 'How much do I have to pay in total this month?' },
    { sender: 'ai', text: 'You have a total of PKR 7,500 due this month across your Family Savings (PKR 5,000) and Office Group (PKR 2,500) committees.' }
  ];
  let isListening = false;

  function render() {
    container.innerHTML = `
      <div style="padding: 12px 20px 24px 20px; display: flex; flex-direction: column; min-height: 80vh; justify-content: space-between;">
        
        <div>
          <!-- Top Navbar -->
          <div class="app-top-header">
            <button id="btn-voice-menu" class="btn-icon-header">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <span class="header-title">Kameti AI</span>
            <button id="btn-voice-profile" class="btn-icon-header">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"></circle><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path></svg>
            </button>
          </div>

          <!-- Chat Message Bubbles List -->
          <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 10px; margin-bottom: 20px;">
            ${messages.map(msg => {
              if (msg.sender === 'user') {
                return `
                  <div style="align-self: flex-end; max-width: 80%; background-color: #E4E4E7; color: #000000; padding: 14px 18px; border-radius: 20px; font-size: 14.5px; font-weight: 500; line-height: 1.45; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                    ${msg.text}
                  </div>
                `;
              } else {
                return `
                  <div style="align-self: flex-start; max-width: 90%; background-color: #F4F4F5; color: #000000; padding: 16px 20px; border-radius: 22px; font-size: 14.5px; font-weight: 500; line-height: 1.5; margin-top: 4px;">
                    ${msg.text}
                  </div>
                `;
              }
            }).join('')}
          </div>
        </div>

        <!-- Center Voice Mic Button Section (Clean SVG Mic Icon) -->
        <div style="text-align: center; margin: 20px 0;">
          <div style="width: 170px; height: 170px; border-radius: 50%; background-color: #F4F4F5; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto;">
            <button id="btn-mic-trigger" style="width: 84px; height: 84px; border-radius: 50%; background-color: #000000; border: none; color: #FFFFFF; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.25); transition: transform 0.2s ease;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
          </div>

          <div style="font-size: 13px; color: #71717A; font-weight: 600;">
            ${isListening ? 'Listening...' : 'Tap to speak or start typing'}
          </div>
        </div>

        <!-- Bottom Input Pill Bar -->
        <div style="margin-bottom: 10px;">
          <form id="voice-chat-form" style="display: flex; align-items: center; background-color: #FFFFFF; border: 1.5px solid #E4E4E7; border-radius: 9999px; padding: 6px 8px 6px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
            <span style="display: flex; align-items: center; justify-content: center; margin-right: 10px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8"></path></svg>
            </span>
            <input type="text" id="input-voice-query" placeholder="Message Kameti AI..." style="border: none; outline: none; background: transparent; flex: 1; font-size: 14.5px; font-weight: 500; color: #000000;" />
            <button type="submit" style="width: 38px; height: 38px; border-radius: 50%; background-color: #000000; border: none; color: #FFFFFF; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-left: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            </button>
          </form>
        </div>

      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    const micBtn = container.querySelector('#btn-mic-trigger');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        isListening = !isListening;
        if (isListening) {
          showToast('Listening in Urdu & English...');
          setTimeout(() => {
            messages.push({ sender: 'user', text: 'When is my next committee payment due?' });
            messages.push({ sender: 'ai', text: 'Your Friends Committee payment of PKR 5,000 is due in 3 days on September 1st.' });
            isListening = false;
            render();
          }, 2500);
        }
        render();
      });
    }

    const form = container.querySelector('#voice-chat-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = container.querySelector('#input-voice-query');
        if (input && input.value.trim()) {
          const text = input.value.trim();
          messages.push({ sender: 'user', text });
          const response = voiceAssistantService.processQuery(text);
          messages.push({ sender: 'ai', text: response.textResponse });
          render();
        }
      });
    }
  }

  render();
}
