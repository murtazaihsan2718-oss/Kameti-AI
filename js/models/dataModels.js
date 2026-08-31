// Data models, enumerations, and helper utilities for Kameti Mobile App

export const PaymentMethods = {
  EASYPAISA: 'Easypaisa',
  JAZZCASH: 'JazzCash',
  SADAPAY: 'SadaPay',
  NAYAPAY: 'NayaPay',
  BANK: 'Bank Account',
  RAAST: 'Bank Account',
  CASH: 'Cash in Hand'
};

export const SelectionMethods = {
  RANDOM: 'random',
  VOTING: 'voting'
};

export const CommitteeFrequencies = {
  MONTHLY: 'monthly',
  WEEKLY: 'weekly'
};

export const CommitteeStatus = {
  RECRUITING: 'recruiting',
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

export const PaymentStatus = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  VERIFIED: 'verified'
};

export const MemberStatus = {
  RECIPIENT: 'recipient',
  PENDING: 'pending',
  SUBMITTED: 'submitted'
};

/**
 * Format currency in Pakistani Rupees (Rs.)
 * @param {number} amount 
 * @returns {string} e.g. "Rs. 20,000"
 */
export function formatCurrency(amount) {
  if (isNaN(amount)) return 'Rs. 0';
  return `Rs. ${Number(amount).toLocaleString('en-PK')}`;
}

/**
 * Calculate natural language deadline description
 * @param {string|Date} dueDate 
 * @returns {{text: string, type: 'ontrack'|'warning'|'late'}}
 */
export function getDeadlineDescription(dueDate) {
  if (!dueDate) return { text: 'No due date set', type: 'ontrack' };
  
  const target = new Date(dueDate);
  const today = new Date();
  
  // Reset hours to compare calendar days
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const diffDays = Math.round((targetDay - todayDay) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 2) {
    return { text: `Payment due in ${diffDays} days`, type: 'ontrack' };
  } else if (diffDays === 2) {
    return { text: 'Payment due in 2 days', type: 'warning' };
  } else if (diffDays === 1) {
    return { text: 'Payment due tomorrow', type: 'warning' };
  } else if (diffDays === 0) {
    return { text: 'Payment due today', type: 'warning' };
  } else if (diffDays === -1) {
    return { text: '1 day late', type: 'late' };
  } else {
    return { text: `${Math.abs(diffDays)} days late`, type: 'late' };
  }
}
