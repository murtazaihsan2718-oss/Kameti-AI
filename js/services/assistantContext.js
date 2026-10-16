// Read-only assistant context. Never include phone numbers, bank details or proofs.
const phone = value => String(value || '').replace(/\D/g, '').replace(/^92(?=3\d{9}$)/, '0');
const amount = value => Number.isFinite(Number(value)) && value !== null && value !== undefined && value !== '' ? Number(value) : null;

export function buildAssistantContext({ user, committees = [], members = [], months = [], payments = [], users = [] }) {
  if (!user?.id) return { user: null, committees: [], totalActiveCommittees: 0, totalMonthlyContributionDue: 0 };
  const matches = member => member && (member.id === user.id || member.userId === user.id ||
    (phone(user.verifiedPhone || user.phone) && phone(member.phone || member.verifiedPhone) === phone(user.verifiedPhone || user.phone)));
  const records = [];
  for (const committee of committees) {
    const relatedMembers = members.filter(m => m.committeeId === committee.id);
    const roster = Array.isArray(committee.members) && committee.members.length ? committee.members : relatedMembers;
    const mine = roster.find(matches);
    if (committee.creatorId !== user.id && !mine) continue;
    const myIds = new Set([user.id, mine?.id, mine?.userId].filter(Boolean));
    const cycle = Number(committee.currentCycle) || 1;
    const committeeMonths = months.filter(m => m.committeeId === committee.id);
    const currentMonth = committeeMonths.find(m => Number(m.monthNumber) === cycle) ||
      committeeMonths.find(m => ['active', 'voting'].includes(m.status));
    const slots = Number(committee.numberOfMembers || committee.totalCycles || committee.duration || committee.memberCount) || null;
    const rawStatus = String(committee.status || '').toLowerCase();
    const completed = /completed|closed|cancelled/.test(rawStatus);
    const forming = !completed && (/forming|waiting|recruiting/.test(rawStatus) || (slots !== null && roster.length < slots));
    const status = completed ? 'completed' : forming ? 'forming' : (rawStatus || 'unknown');
    const recipientId = committee.currentRecipientId || currentMonth?.recipientUserId || null;
    const recipient = roster.find(m => m.id === recipientId || m.userId === recipientId);
    const recipientProfile = users.find(u => u.id === (recipient?.userId || recipientId));
    const isRecipient = Boolean(recipientId && myIds.has(recipientId));
    const inCurrentCycle = payment => payment.committeeMonthId
      ? payment.committeeMonthId === currentMonth?.id
      : Number(payment.cycleIndex || payment.cycle || payment.currentCycle || 1) === cycle;
    const localPayment = payments.find(p => (p.committeeId === committee.id || (currentMonth && p.committeeMonthId === currentMonth.id)) &&
      myIds.has(p.payerUserId || p.memberId) && inCurrentCycle(p));
    const cloudPayment = (committee.payments || []).find(p => myIds.has(p.memberId || p.payerUserId) && inCurrentCycle(p));
    // Explicit current-cycle proofs override the member's summary status.
    const paymentStatus = cloudPayment?.status || localPayment?.status || mine?.paymentStatus || 'pending';
    const contribution = amount(committee.contributionAmount);
    const inactive = forming || completed;
    const amountDue = inactive || isRecipient || ['verified', 'submitted'].includes(paymentStatus) ? 0 : contribution;
    records.push({
      committeeId: committee.id, committeeName: committee.name || 'Unnamed committee',
      contributionAmount: contribution,
      totalPool: amount(committee.totalPool) ?? (contribution !== null && slots !== null ? contribution * slots : null),
      frequency: committee.frequency || 'monthly', status,
      currentCycle: forming ? 0 : cycle, totalCycles: slots, enrolledMembers: roster.length,
      nextDueDate: inactive ? null : committee.nextDueDate || currentMonth?.dueDate || null,
      userPayment: { amountDue, paymentStatus: inactive ? 'not_due' : paymentStatus },
      payout: {
        currentRecipientName: forming ? 'Not selected (committee is forming)' : recipient?.name || recipientProfile?.name || null,
        isUserCurrentRecipient: !inactive && isRecipient,
        hasUserReceivedPayout: Boolean(mine?.hasReceivedPayout),
        userPayoutCycleIndex: mine?.payoutMonthIndex || null,
        selectionMethod: committee.selectionMode || committee.recipientSelectionMethod || null,
      },
    });
  }
  return {
    user: { name: user.name || 'Member' }, committees: records,
    totalActiveCommittees: records.filter(c => c.status !== 'forming' && c.status !== 'completed').length,
    totalMonthlyContributionDue: records.some(c => c.frequency === 'monthly' && c.userPayment.amountDue === null) ? null :
      records.filter(c => c.frequency === 'monthly').reduce((sum, c) => sum + (c.userPayment.amountDue || 0), 0),
  };
}
