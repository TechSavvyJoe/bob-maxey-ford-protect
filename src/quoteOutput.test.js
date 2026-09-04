import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuoteSnapshot } from './quoteOutput.js';
import { CONTACT_CONSENT_TEXT, CONTACT_CONSENT_VERSION } from './consent.js';

test('a local submitted timestamp never turns a draft into a submitted request', () => {
  const snapshot = buildQuoteSnapshot({ quote: { id: 'BMX-DRAFT', submittedAt: '2026-09-03T12:00:00.000Z' } });
  assert.equal(snapshot.lifecycle.status, 'draft-request');
  assert.equal(snapshot.submission.accepted, false);
  assert.equal(snapshot.timestamps.submittedAt, null);
});

test('a complete accepted receipt produces submitted lifecycle metadata', () => {
  const receivedAt = '2026-09-03T12:00:00.000Z';
  const snapshot = buildQuoteSnapshot({
    quote: {
      id: 'BMX-SUBMITTED',
      submittedAt: receivedAt,
      submissionReceipt: { accepted: true, leadId: 'DM-123', receivedAt },
    },
  });
  assert.equal(snapshot.lifecycle.status, 'submitted-request');
  assert.equal(snapshot.submission.leadId, 'DM-123');
  assert.equal(snapshot.timestamps.submittedAt, receivedAt);
});

test('decoded NHTSA facts enter the proposal model without warranty claims', () => {
  const snapshot = buildQuoteSnapshot({
    quote: {
      decodedVehicle: { trim: 'ST', engineDescription: '3.0L V6', source: 'NHTSA vPIC' },
    },
  });
  assert.equal(snapshot.vehicle.decoded.trim, 'ST');
  assert.equal(snapshot.vehicle.decoded.engineDescription, '3.0L V6');
  assert.equal(snapshot.vehicle.decoded.warrantyRecordIncluded, false);
  assert.equal(snapshot.vehicle.decoded.inServiceDateIncluded, false);
});

test('consent is granted only with the current text, version and timestamp', () => {
  const valid = buildQuoteSnapshot({ quote: {
    consent: true,
    consentText: CONTACT_CONSENT_TEXT,
    consentVersion: CONTACT_CONSENT_VERSION,
    consentAcceptedAt: '2026-09-03T12:00:00.000Z',
  } });
  const stale = buildQuoteSnapshot({ quote: {
    consent: true,
    consentText: CONTACT_CONSENT_TEXT,
    consentVersion: 'old-version',
    consentAcceptedAt: '2026-09-03T12:00:00.000Z',
  } });
  assert.equal(valid.consent.granted, true);
  assert.equal(stale.consent.granted, false);
  assert.equal(stale.consent.acceptedAt, null);
});
