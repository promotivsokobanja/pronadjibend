const BLOCKED_DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'guerrillamail.com',
  'maildrop.cc',
  'mailinator.com',
  'mintemail.com',
  'sharklasers.com',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com',
]);

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function getEmailDomain(email) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex <= 0 || atIndex >= normalized.length - 1) return '';
  return normalized.slice(atIndex + 1);
}

export function isDisposableEmail(email) {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  return BLOCKED_DISPOSABLE_DOMAINS.has(domain);
}
