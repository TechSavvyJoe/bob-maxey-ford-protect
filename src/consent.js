export const CONTACT_CONSENT_VERSION = 'bob-maxey-ford-protect-contact-v1-2026-09-03';
export const CONTACT_CONSENT_TEXT = 'I agree Bob Maxey may contact me about this Ford Protect request. This permission does not purchase coverage or authorize a contract.';

export function createConsentMetadata(granted, now = new Date()) {
  return {
    consent: Boolean(granted),
    consentText: CONTACT_CONSENT_TEXT,
    consentVersion: CONTACT_CONSENT_VERSION,
    consentAcceptedAt: granted ? now.toISOString() : '',
  };
}
