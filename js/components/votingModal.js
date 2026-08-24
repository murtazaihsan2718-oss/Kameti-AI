// Voting Room & Multi-Device Live Countdown Modal Component

import { selectionService } from '../services/selectionService.js';
import { authService } from '../services/authService.js';
import { storageService } from '../services/storageService.js';
import { FirebaseService } from '../services/firebaseService.js';

export function openVotingModal({
  committeeId,
  monthId,
  onResolved,
  showToast
}) {
  const overlay = document.getElementById('modal-overlay');
  const sheet = document.getElementById('modal-sheet-content');
  if (!overlay || !sheet) return;

  const user = authService.getCurrentUser() || storageService.getCurrentUser();
  let timerInterval = null;
  let cloudUnsubscribe = null;
  let selectedCandidateId = null;
  let isCasting = false;
  let isResolving = false;
  let sessionStartTime = Date.now();
  let durationSeconds = 60; // 1 minute testing duration as requested

  // Initialize or retrieve live voting session from Cloud Firestore
  async function initSession() {
    try {
      const session = await FirebaseService.startVotingSession(committeeId, monthId, durationSeconds);
      if (session) {
        if (session.startTime) sessionStartTime = session.startTime;
        if (session.durationSeconds) durationSeconds = session.durationSeconds;
        if (session.votes && Array.isArray(session.votes)) {
          syncVotesToLocal(session.votes);
        }
      }
    } catch (err) {
      console.log('Error initializing voting session:', err);
    }
    render();
  }

  function syncVotesToLocal(cloudVotes) {
    if (!Array.isArray(cloudVotes)) return;
    const localVotes = storageService.getVotes();
    let changed = false;

    cloudVotes.forEach(cv => {
      const existing = localVotes.find(lv => lv.committeeMonthId === (cv.committeeMonthId || monthId) && lv.voterUserId === cv.voterUserId);
      if (!existing) {
        localVotes.push({
          id: 'v_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 4),
          committeeMonthId: cv.committeeMonthId || monthId,
          voterUserId: cv.voterUserId,
          candidateUserId: cv.candidateUserId,
          createdAt: new Date().toISOString()
        });
        changed = true;
      }
    });

    if (changed) {
      storageService.setVotes(localVotes);
    }
  }

  // Subscribe to real-time live vote updates across devices
  cloudUnsubscribe = FirebaseService.subscribeCommittees((cloudList) => {
    const target = cloudList.find(c => c.id === committeeId);
    if (target && target.votingSession) {
      if (target.votingSession.startTime) {
        sessionStartTime = target.votingSession.startTime;
      }
      if (target.votingSession.votes) {
        syncVotesToLocal(target.votingSession.votes);
      }
      if (target.votingSession.status === 'completed' && target.votingSession.winnerUserId) {
        // Winner already finalized by another device
        cleanup();
        overlay.classList.remove('open');
        const winnerUser = storageService.getUsers().find(u => u.id === target.votingSession.winnerUserId) || { name: 'Winner' };
        showToast(`🎉 Recipient chosen: ${winnerUser.name}!`);
        if (onResolved) onResolved(winnerUser);
        return;
      }
      render();
    }
  });

  function getRemainingSeconds() {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    return Math.max(0, durationSeconds - elapsed);
  }

  function render() {
    const votingStatus = selectionService.getVotingStatus(committeeId, monthId);
    const votes = storageService.getVotes().filter(v => v.committeeMonthId === monthId);
    const hasVoted = votes.some(v => v.voterUserId === user?.id);
    const myVote = votes.find(v => v.voterUserId === user?.id);
    const myVotedCandidate = myVote ? votingStatus.candidates.find(c => c.user.id === myVote.candidateUserId) : null;

    const remainingSecs = getRemainingSeconds();
    const minutes = Math.floor(remainingSecs / 60);
    const seconds = remainingSecs % 60;
    const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    sheet.innerHTML = `
      <div class="sheet-grab-handle"></div>
      
      <div class="sheet-header">
        <div>
          <h3 style="font-size: 18px; font-weight: 800; color: var(--slate-900);">Committee Recipient Vote</h3>
          <p style="font-size: 12px; color: var(--slate-500);">Who should receive the pool this month?</p>
        </div>
        <button id="btn-close-voting" class="btn-icon-only" style="width: 32px; height: 32px; border: none; background: var(--slate-100);">
          ✕
        </button>
      </div>

      <!-- Synchronized Countdown Timer Box -->
      <div style="display: flex; align-items: center; justify-content: space-between; background: #FEF3C7; border: 1.5px solid #FCD34D; padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">⏱️</span>
          <div>
            <span style="font-size: 13px; font-weight: 700; color: #92400E; display: block;">Voting Closes In:</span>
            <span style="font-size: 11px; color: #B45309;">Synchronized live countdown (1 min)</span>
          </div>
        </div>
        <span style="font-family: monospace; font-size: 22px; font-weight: 900; color: #78350F; background: white; padding: 4px 10px; border-radius: 6px; border: 1px solid #FDE68A;">
          ${timeFormatted}
        </span>
      </div>

      <!-- Live Total Votes Count -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <span style="font-size: 13px; font-weight: 700; color: var(--slate-700);">Eligible Candidates</span>
        <span style="font-size: 12px; color: var(--primary); font-weight: 600;">
          ${votingStatus.totalVotes} / ${votingStatus.totalEligibleVoters} Votes Cast
        </span>
      </div>

      <!-- Candidate list with live tallies -->
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; max-height: 42vh; overflow-y: auto;">
        ${votingStatus.candidates.map(c => {
          const isSelected = selectedCandidateId === c.user.id;
          const isMyVotedCandidate = myVote && myVote.candidateUserId === c.user.id;

          return `
            <div class="voting-candidate-row ${(isSelected || isMyVotedCandidate) ? 'selected' : ''}" 
                 data-candidate-id="${c.user.id}"
                 style="cursor: ${hasVoted ? 'default' : 'pointer'}; border: 1.5px solid ${(isSelected || isMyVotedCandidate) ? 'var(--primary)' : 'var(--slate-200)'}; background-color: ${(isSelected || isMyVotedCandidate) ? 'var(--primary-light)' : 'var(--white)'}; padding: 12px 14px; border-radius: var(--radius-md); transition: all 0.2s ease;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <strong style="font-size: 14.5px; color: var(--slate-900); display: flex; align-items: center; gap: 6px;">
                    ${c.user.name} ${c.user.id === user?.id ? '<span style="font-size: 11px; color: var(--primary); font-weight: 600;">(You)</span>' : ''}
                    ${isMyVotedCandidate ? '<span style="font-size: 11px; background: var(--emerald); color: white; padding: 2px 6px; border-radius: 4px; font-weight: 700;">Your Vote ✓</span>' : ''}
                  </strong>
                  <span style="font-size: 13.5px; font-weight: 800; color: var(--primary);">
                    ${c.votes} ${c.votes === 1 ? 'vote' : 'votes'} (${c.percentage}%)
                  </span>
                </div>
                
                <div class="voting-progress-bar" style="background: var(--slate-200); height: 8px; border-radius: 4px; overflow: hidden; margin-top: 6px;">
                  <div class="voting-progress-fill" style="width: ${c.percentage}%; background: var(--primary); height: 100%; transition: width 0.3s ease;"></div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${hasVoted ? `
        <div style="text-align: center; padding: 12px; background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: var(--radius-md); font-size: 13px; color: #166534; font-weight: 600;">
          ✓ You voted for <strong>${myVotedCandidate?.user?.name || 'your candidate'}</strong>. The winner will be declared when the timer ends!
        </div>
      ` : `
        <button id="btn-submit-vote" class="btn btn-primary" style="width: 100%; padding: 14px; font-weight: 700; font-size: 15px;" ${!selectedCandidateId || isCasting ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
          ${isCasting ? 'Recording Vote...' : 'Cast Vote (1 Vote Allowed)'}
        </button>
      `}
    `;

    attachEvents(hasVoted);
  }

  function startTimer() {
    timerInterval = setInterval(() => {
      const remainingSecs = getRemainingSeconds();
      if (remainingSecs <= 0) {
        cleanup();
        resolveWinner();
      } else {
        render();
      }
    }, 1000);
  }

  async function resolveWinner() {
    if (isResolving) return;
    isResolving = true;

    try {
      // 1. Finalize locally in selectionService
      const result = selectionService.finalizeVoting(committeeId, monthId);
      const winner = result.winner;

      // 2. Broadcast winner live to Cloud Firestore
      await FirebaseService.finalizeVoting(committeeId, winner.id, 1);

      overlay.classList.remove('open');
      const tieMsg = result.wasTie ? ' (Fair random tie-breaker resolved)' : '';
      showToast(`🎉 Recipient chosen by vote: ${winner.name}!${tieMsg}`);
      if (onResolved) onResolved(winner);
    } catch (err) {
      console.log('Error resolving voting:', err);
      showToast(err.message || 'Error declaring winner');
    }
  }

  function cleanup() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (cloudUnsubscribe) {
      cloudUnsubscribe();
      cloudUnsubscribe = null;
    }
  }

  function attachEvents(hasVoted) {
    const btnClose = document.getElementById('btn-close-voting');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        cleanup();
        overlay.classList.remove('open');
      });
    }

    if (!hasVoted) {
      const candidateRows = sheet.querySelectorAll('.voting-candidate-row');
      candidateRows.forEach(row => {
        row.addEventListener('click', () => {
          selectedCandidateId = row.getAttribute('data-candidate-id');
          render();
        });
      });

      const btnSubmit = document.getElementById('btn-submit-vote');
      if (btnSubmit) {
        btnSubmit.addEventListener('click', async () => {
          if (!selectedCandidateId || isCasting) return;
          isCasting = true;
          btnSubmit.disabled = true;
          btnSubmit.innerText = 'Casting Vote...';

          try {
            // 1. Save local vote
            selectionService.castVote(monthId, selectedCandidateId);

            // 2. Broadcast live vote to Cloud Firestore
            await FirebaseService.castVote(committeeId, {
              voterUserId: user.id,
              candidateUserId: selectedCandidateId,
              committeeMonthId: monthId
            });

            const candidate = storageService.getUsers().find(u => u.id === selectedCandidateId);
            showToast(`Vote cast for ${candidate?.name || 'candidate'} ✓`);
            isCasting = false;
            render();
          } catch (err) {
            showToast(err.message || 'Failed to cast vote');
            isCasting = false;
            render();
          }
        });
      }
    }
  }

  overlay.classList.add('open');
  initSession();
  startTimer();
}
