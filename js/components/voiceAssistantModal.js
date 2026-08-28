// Modern Kameti AI Chat & Voice Assistant Screen

import { voiceAssistantService } from '../services/voiceAssistantService.js';
import { authService } from '../services/authService.js';

export function openVoiceAssistantModal({ onBack, onOpenProfile, showToast } = {}) {
  const container = document.getElementById('app-viewport');
  if (!container) return;

  const SUGGESTED_PROMPTS = [
    'How much do I owe this month?',
    'When is my next payout turn?',
    'Who is the recipient this month?',
    'What committees am I in?',
    'How does Kameti work?',
  ];

  let messages = [
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: 'Hello! I am your Kameti AI Assistant. How can I help you today?',
    },
  ];

  let isListening = false;
  let activeSpeakingId = null;

  function parseMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Bullet points
    html = html.replace(/^[•*]\s*(.+)$/gm, '<div style="margin-left: 8px; margin-bottom: 3px;">• $1</div>');
    // Line breaks
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  function handleSend(userText) {
    const text = (userText || '').trim();
    if (!text) return;

    const userMsgId = 'msg_' + Date.now();
    messages.push({
      id: userMsgId,
      sender: 'user',
      text,
    });

    render();
    scrollToBottom();

    setTimeout(() => {
      const res = voiceAssistantService.processQuery(text);
      const replyText = res.reply || res.textResponse || 'I am here to help you manage your committees!';
      const aiMsgId = 'msg_' + (Date.now() + 1);

      messages.push({
        id: aiMsgId,
        sender: 'assistant',
        text: replyText,
        language: res.language || 'en',
      });

      render();
      scrollToBottom();
    }, 400);
  }

  function scrollToBottom() {
    setTimeout(() => {
      const chatList = document.getElementById('chat-messages-container');
      if (chatList) {
        chatList.scrollTop = chatList.scrollHeight;
      }
    }, 50);
  }

  function render() {
    container.innerHTML = `
      <div style="padding: 12px 20px 16px 20px; display: flex; flex-direction: column; height: calc(100vh - 80px); max-width: 440px; margin: 0 auto; box-sizing: border-box;">
        
        <!-- Top Navbar with Back Arrow -->
        <div class="app-top-header" style="flex-shrink: 0; margin-bottom: 8px;">
          <button id="btn-voice-back" class="btn-icon-header" style="width: 38px; height: 38px; border-radius: 50%; background: #F4F4F5; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <span class="header-title" style="font-size: 17px; font-weight: 800; color: #000000;">Kameti AI</span>
          <button id="btn-voice-profile" class="btn-icon-header" style="width: 38px; height: 38px; border-radius: 50%; background: #F4F4F5; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><circle cx="12" cy="7" r="4"></circle><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path></svg>
          </button>
        </div>

        <!-- Chat Message Bubbles List -->
        <div id="chat-messages-container" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 6px 0; margin-bottom: 8px; scroll-behavior: smooth;">
          ${messages.map(msg => {
            if (msg.sender === 'user') {
              return `
                <div style="align-self: flex-end; max-width: 82%; background-color: #E4E4E7; color: #000000; padding: 12px 16px; border-radius: 18px; font-size: 14px; font-weight: 500; line-height: 1.45; word-break: break-word;">
                  ${parseMarkdown(msg.text)}
                </div>
              `;
            } else {
              const isPlaying = activeSpeakingId === msg.id;
              return `
                <div style="align-self: flex-start; max-width: 88%; background-color: #000000; color: #FFFFFF; padding: 14px 16px; border-radius: 20px; font-size: 14px; font-weight: 400; line-height: 1.5; word-break: break-word;">
                  <div>${parseMarkdown(msg.text)}</div>
                  <div style="display: flex; justify-content: flex-end; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <button class="btn-listen-msg" data-id="${msg.id}" data-text="${encodeURIComponent(msg.text)}" data-lang="${msg.language || 'en'}" style="background: rgba(255,255,255,0.1); border: none; border-radius: 12px; padding: 3px 8px; color: ${isPlaying ? '#60A5FA' : '#9CA3AF'}; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                      <span>${isPlaying ? 'Playing...' : 'Listen'}</span>
                    </button>
                  </div>
                </div>
              `;
            }
          }).join('')}
        </div>

        <!-- Horizontal Suggested Prompt Chips -->
        <div style="flex-shrink: 0; margin-bottom: 8px; overflow-x: auto; white-space: nowrap; padding-bottom: 4px; display: flex; gap: 8px;">
          ${SUGGESTED_PROMPTS.map(p => `
            <button class="btn-suggestion-chip" data-prompt="${p}" style="display: inline-block; background-color: #F4F4F5; border: 1px solid #E4E4E7; border-radius: 9999px; padding: 7px 14px; font-size: 12px; font-weight: 600; color: #27272A; cursor: pointer; flex-shrink: 0;">
              ${p}
            </button>
          `).join('')}
        </div>

        <!-- Bottom Input Pill Bar -->
        <div style="flex-shrink: 0;">
          <form id="voice-chat-form" style="display: flex; align-items: center; background-color: #FFFFFF; border: 1.5px solid #E4E4E7; border-radius: 9999px; padding: 5px 6px 5px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <input type="text" id="input-voice-query" placeholder="Message Kameti AI..." style="border: none; outline: none; background: transparent; flex: 1; font-size: 14px; font-weight: 500; color: #000000;" autofocus />
            
            <!-- Microphone Button -->
            <button type="button" id="btn-mic-toggle" style="width: 32px; height: 32px; border-radius: 50%; background-color: ${isListening ? '#DC2626' : '#F4F4F5'}; border: none; color: ${isListening ? '#FFFFFF' : '#71717A'}; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-right: 4px; transition: all 0.2s ease;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>

            <!-- Send Button -->
            <button type="submit" style="width: 32px; height: 32px; border-radius: 50%; background-color: #000000; border: none; color: #FFFFFF; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.6"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            </button>
          </form>
        </div>

      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    const backBtn = container.querySelector('#btn-voice-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (typeof onBack === 'function') {
          onBack();
        } else if (window.kametiApp) {
          window.kametiApp.navigate('home');
        }
      });
    }

    const profileBtn = container.querySelector('#btn-voice-profile');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        if (typeof onOpenProfile === 'function') {
          onOpenProfile();
        } else if (window.kametiApp) {
          window.kametiApp.navigate('profile');
        }
      });
    }

    // Suggestion chips
    const chipBtns = container.querySelectorAll('.btn-suggestion-chip');
    chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        if (prompt) handleSend(prompt);
      });
    });

    // Listen buttons
    const listenBtns = container.querySelectorAll('.btn-listen-msg');
    listenBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const text = decodeURIComponent(btn.getAttribute('data-text') || '');
        const lang = btn.getAttribute('data-lang') || 'en';

        if (activeSpeakingId === id) {
          if ('speechSynthesis' in window) window.speechSynthesis.cancel();
          activeSpeakingId = null;
          render();
        } else {
          activeSpeakingId = id;
          render();
          voiceAssistantService.speak(text.replace(/[*_#`~>]/g, ''), lang);
          setTimeout(() => {
            activeSpeakingId = null;
            render();
          }, Math.max(2000, text.length * 70));
        }
      });
    });

    // Mic Toggle Button
    const micBtn = container.querySelector('#btn-mic-toggle');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        isListening = !isListening;
        if (isListening) {
          if (showToast) showToast('Listening in Urdu & English...');
          if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognition.onresult = (event) => {
              const transcript = event.results[0][0].transcript;
              isListening = false;
              handleSend(transcript);
            };
            recognition.onerror = () => {
              isListening = false;
              render();
            };
            recognition.onend = () => {
              isListening = false;
              render();
            };
            recognition.start();
          } else {
            // Fallback simulation
            setTimeout(() => {
              isListening = false;
              handleSend('How much do I owe this month?');
            }, 2000);
          }
        }
        render();
      });
    }

    // Input form
    const form = container.querySelector('#voice-chat-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = container.querySelector('#input-voice-query');
        if (input && input.value.trim()) {
          const text = input.value.trim();
          input.value = '';
          handleSend(text);
        }
      });
    }
  }

  render();
}

