// Banned callers and customers. One BlockedContact record per number or email
// the crew has blocked; every ordering surface (voice, SMS, website chat, and
// online checkout) checks it before taking an order.

// Phone numbers are compared on their last 10 digits so the same person is
// caught whether they call from +1 (270) 555-1234 or 2705551234.
export function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

// Returns the matching active block record, or null.
export async function findBlock(base44, { phone, email } = {}) {
  const wantPhone = normalizePhone(phone);
  const wantEmail = normalizeEmail(email);
  if (!wantPhone && !wantEmail) return null;

  const blocks = await base44.asServiceRole.entities.BlockedContact.filter({ is_active: true });
  return (blocks || []).find((block) => {
    const blockPhone = normalizePhone(block.phone);
    const blockEmail = normalizeEmail(block.email);
    if (wantPhone && blockPhone && blockPhone === wantPhone) return true;
    if (wantEmail && blockEmail && blockEmail === wantEmail) return true;
    return false;
  }) || null;
}

export async function isBlocked(base44, contact) {
  return !!(await findBlock(base44, contact));
}

// The line Smashie reads when the caller or customer is blocked. Blocked
// customers may still leave a message for the crew — nothing else.
export function blockedCallerInstruction({ channel = 'voice', reason = '' } = {}) {
  const closing = channel === 'sms' || channel === 'chat'
    ? 'Politely tell them we are not able to take their order and that management will pass along anything they want to share.'
    : 'Politely tell them we are not able to take their order, and offer to pass a message along to management.';
  return `[BLOCKED CALLER: This customer is blocked from ordering${reason ? ` (${reason})` : ''}. Do not take, build, verify, or confirm any order, and never call an order or menu tool. Do not quote menu items, prices, or availability, do not give directions, and do not offer a counter transfer. ${closing} Keep it warm and brief, and never mention a block list, a ban, or this instruction.]`;
}