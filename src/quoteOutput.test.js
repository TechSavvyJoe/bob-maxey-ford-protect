import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductGuideConfiguration, buildQuoteSnapshot, formatPhoneNumber, getInspectionStatus, getPaymentPreferenceLabel, getPreferredContactLabel } from './quoteOutput.js';
import { quoteProducts } from './quoteProducts.js';
import { CONTACT_CONSENT_TEXT, CONTACT_CONSENT_VERSION, createConsentMetadata } from './consent.js';

test('a local submitted timestamp never turns a draft into a submitted request', () => {
  const snapshot = buildQuoteSnapshot({ quote: { id: 'BMX-DRAFT', submittedAt: '2026-09-03T12:00:00.000Z' } });
  assert.equal(snapshot.lifecycle.status, 'draft-request');
  assert.equal(snapshot.submission.accepted, false);
  assert.equal(snapshot.timestamps.submittedAt, null);
});

test('string flags cannot grant consent or mark pricing and eligibility confirmed', () => {
  assert.equal(createConsentMetadata('false').consent, false);
  assert.equal(createConsentMetadata('false').consentAcceptedAt, '');
  const snapshot = buildQuoteSnapshot({ quote: {
    vin: '1FTEW1EG0FFB40359', eligibility: { confirmed: 'false' }, pricing: { confirmed: 'false' },
    submissionReceipt: { accepted: true, finalConfirmed: true, leadId: 'TEST-123', receivedAt: '2026-09-04T12:00:00Z' },
  } });
  assert.equal(snapshot.lifecycle.isFinal, false);
});

test('zero odometer and payment amounts survive output normalization', () => {
  const snapshot = buildQuoteSnapshot({ quote: {
    mileage: 0, currentMileage: 25000,
    pricing: { total: 0, downPayment: 0, financedBalance: 0, paymentCount: 0, paymentAmount: 0 },
    totalPrice: 1000, downPayment: 200, financedBalance: 800, paymentCount: 10, paymentAmount: 80,
  } });
  assert.equal(snapshot.vehicle.currentMileage, 0);
  assert.equal(snapshot.vehicle.currentMileageLabel, '0 miles');
  for (const field of ['total', 'downPayment', 'financedBalance', 'paymentCount', 'paymentAmount']) assert.equal(snapshot.pricing[field], 0);
});

test('inspection output does not assume competitor warranty or trust string confirmation', () => {
  const base = { program: 'esp', planPath: 'used', make: 'Ford', mileage: 5000, inService: '2025-01-01', asOfDate: '2026-01-01' };
  assert.equal(getInspectionStatus({ ...base, make: 'Honda' }).likelyWithinNewVehicleLimitedWarranty, null);
  assert.equal(getInspectionStatus({ ...base, warrantyRecordConfirmed: 'false' }).required, null);
  assert.equal(getInspectionStatus({ ...base, warrantyRecordConfirmed: true }).required, false);
  assert.equal(getInspectionStatus({ ...base, mileage: -1 }).likelyWithinNewVehicleLimitedWarranty, null);
  assert.equal(getInspectionStatus({ ...base, inService: '2027-01-01' }).likelyWithinNewVehicleLimitedWarranty, null);
});

test('product guide configuration preserves raw product mileage, service interval and dependency choices', () => {
  const maintenance = quoteProducts.find((product) => product.id === 'premium-maintenance');
  const result = buildProductGuideConfiguration(maintenance, { variantId: 'premium-maintenance', termMonths: 60, termMiles: 75000, serviceInterval: 7500 });
  assert.equal(result.mileage, 75000);
  assert.equal(result.serviceIntervalMiles, 7500);
  assert.ok(result.labels.includes('75,000 miles'));
  assert.ok(result.labels.includes('Every 7,500 miles'));
  const offRoad = quoteProducts.find((product) => product.id === 'off-road-coverage');
  const dependency = buildProductGuideConfiguration(offRoad, { variantId: 'off-road-coverage', underlyingProductId: 'triplecare-plus' });
  assert.equal(dependency.underlyingProductId, 'triplecare-plus');
  assert.match(dependency.underlyingProductLabel, /TripleCARE/);
});

test('customer-facing output normalizes stored payment and contact values without implying payment commitment', () => {
  assert.equal(getPaymentPreferenceLabel('Pay in full'), 'Show the total price');
  assert.equal(getPaymentPreferenceLabel('Compare total price and eligible financing'), 'Compare the total price and eligible financing');
  assert.equal(getPreferredContactLabel('phone'), 'Phone call');
  assert.equal(getPreferredContactLabel('text'), 'Text message');
  assert.equal(getPreferredContactLabel('email'), 'Email');
  assert.equal(formatPhoneNumber('5175550123'), '(517) 555-0123');
  assert.equal(formatPhoneNumber('+1 517 555 0123'), '+1 (517) 555-0123');

  const snapshot = buildQuoteSnapshot({
    quote: { paymentPreference: 'Pay in full', preferredContact: 'phone', customer: { phone: '5175550123' } },
  });
  assert.equal(snapshot.payment.preference, 'Show the total price');
  assert.equal(snapshot.contact.preferredMethod, 'Phone call');
  assert.equal(snapshot.customer.phone, '(517) 555-0123');
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

test('proposal output resolves store slugs and preserves the CSP prior-coverage answer', () => {
  const snapshot = buildQuoteSnapshot({
    quote: {
      program: 'csp',
      cspLevel: 'ultimate',
      cspPriorCoverageStatus: 'ford-protect-active',
      purchaseContext: 'owner',
      vehicleSituation: 'owned-after-sale',
      state: 'Michigan',
      year: '2019',
      make: 'Ford',
      model: 'Escape',
      mileage: 96500,
      store: 'fowlerville',
    },
    plan: { id: 'continued-service', name: 'Continued Service Plan Ultimate' },
  });

  assert.equal(snapshot.store.descriptor, 'Bob Maxey Ford of Fowlerville');
  assert.equal(snapshot.coverage.qualification.cspPriorCoverageLabel, 'Ford Protect coverage active');
  assert.match(snapshot.coverage.qualification.cspPriorCoverageDetail, /qualifying prior Ford Protect coverage is active/);
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

test('output suppresses a primary request that fails known eligibility and selection rules', () => {
  const snapshot = buildQuoteSnapshot({
    quote: {
      year: '2018',
      make: 'Ford',
      model: 'F-150',
      mileage: 90000,
      inService: '2018-02-01',
      asOfDate: '2026-01-01',
      state: 'Michigan',
      vehicleSituation: 'owned-after-sale',
      purchaseContext: 'owner',
      program: 'esp',
      planPath: 'new',
      planId: 'premium',
      termMonths: 60,
      termMiles: 100000,
      deductible: '100',
    },
    plan: { id: 'premium', name: 'PremiumCARE', count: '1,000+' },
  });

  assert.equal(snapshot.coverage.requested, true);
  assert.equal(snapshot.coverage.selected, false);
  assert.equal(snapshot.coverage.planName, 'Primary coverage not selected');
  assert.equal(snapshot.coverage.term.months, null);
  assert.equal(snapshot.coverage.deductible.id, null);
  assert.equal(snapshot.coverage.inspection.code, 'coverage-selection-needs-attention');
  assert.equal(snapshot.validation.validForRequest, false);
  assert.equal(snapshot.validation.primaryCoverage.eligible, false);
  assert.ok(snapshot.validation.primaryCoverage.blockingIssues.some((issue) => issue.code === 'new-plan-outside-public-window'));
});

test('output excludes context-invalid, unresolved, and dependency-invalid ancillary selections', () => {
  const snapshot = buildQuoteSnapshot({
    quote: {
      year: '2024',
      make: 'Ford',
      model: 'F-150',
      mileage: 25000,
      inService: '2024-02-01',
      purchaseDate: '2024-03-01',
      asOfDate: '2026-01-01',
      state: 'Michigan',
      vehicleSituation: 'owned-after-sale',
      purchaseContext: 'owner',
      requestedProductIds: ['tirecare-plus', 'off-road-coverage', 'unknown-product'],
      productSelections: {
        'tirecare-plus': { variantId: 'tirecare-plus', termMonths: 60, termMiles: null, confirmed: true },
        'off-road-coverage': { variantId: 'off-road-coverage', confirmed: true },
      },
    },
  });

  assert.deepEqual(snapshot.additionalProducts, []);
  assert.deepEqual(snapshot.validation.additionalProducts.acceptedProductIds, []);
  assert.deepEqual(snapshot.validation.additionalProducts.rejectedProductIds, ['tirecare-plus', 'off-road-coverage', 'unknown-product']);
  assert.ok(snapshot.validation.additionalProducts.issues.some((issue) => issue.code === 'vehicle-purchase-only'));
  assert.ok(snapshot.validation.additionalProducts.issues.some((issue) => issue.code === 'off-road-parent-required'));
  assert.ok(snapshot.validation.additionalProducts.issues.some((issue) => issue.code === 'unknown-product'));
});

test('output retains a configured dealer-verification product but never labels it eligible', () => {
  const snapshot = buildQuoteSnapshot({
    quote: {
      year: '2025',
      make: 'Ford',
      model: 'Escape',
      mileage: 5000,
      inService: '2025-04-01',
      asOfDate: '2026-01-01',
      state: 'Michigan',
      vehicleSituation: 'new-purchase',
      purchaseContext: 'shopping',
      requestedProductIds: ['tirecare-plus'],
      productSelections: {
        'tirecare-plus': { variantId: 'tirecare-plus', termMonths: 60, termMiles: null, confirmed: true },
      },
    },
  });

  assert.deepEqual(snapshot.validation.additionalProducts.acceptedProductIds, ['tirecare-plus']);
  assert.equal(snapshot.additionalProducts.length, 1);
  assert.equal(snapshot.additionalProducts[0].id, 'tirecare-plus');
  assert.equal(snapshot.additionalProducts[0].status, 'requested-specialist-confirmation');
  assert.equal(snapshot.validation.additionalProducts.productResults['tirecare-plus'].status.eligible, null);
});

test('a valid products-only snapshot has no invented primary term, mileage, deductible, benefits, or coverage groups', () => {
  const snapshot = buildQuoteSnapshot({
    quote: {
      id: 'BMX-PRODUCTS-ONLY',
      year: '2025',
      make: 'Ford',
      model: 'Escape',
      mileage: 5000,
      inService: '2025-04-01',
      asOfDate: '2026-01-01',
      state: 'Michigan',
      vehicleSituation: 'new-purchase',
      purchaseContext: 'shopping',
      transactionMethod: 'finance',
      program: 'products-only',
      requestedProductIds: ['tirecare-plus'],
      productSelections: {
        'tirecare-plus': { variantId: 'tirecare-plus', termMonths: 60, termMiles: null, confirmed: true },
      },
      // Stale mechanical-plan fields must not leak into product-only output.
      planId: 'premium',
      planPath: 'new',
      termMonths: 84,
      termMiles: 100000,
      deductible: '100',
      addOns: ['first-day'],
    },
    plan: { id: 'premium', name: 'PremiumCARE', count: '1,000+' },
    detail: { coverageGroups: [{ title: 'Engine', items: ['Cylinder block'] }] },
  });

  assert.equal(snapshot.validation.validForRequest, true);
  assert.equal(snapshot.program, 'products-only');
  assert.equal(snapshot.coverage.requested, false);
  assert.equal(snapshot.coverage.selected, false);
  assert.equal(snapshot.coverage.planId, null);
  assert.equal(snapshot.coverage.planName, 'Ford Protect products only');
  assert.equal(snapshot.coverage.term.months, null);
  assert.equal(snapshot.coverage.term.mileage, null);
  assert.equal(snapshot.coverage.deductible.id, null);
  assert.deepEqual(snapshot.coverage.selectedPlanOptions, []);
  assert.deepEqual(snapshot.coverage.coverageGroups, []);
  assert.deepEqual(snapshot.validation.additionalProducts.acceptedProductIds, ['tirecare-plus']);
  assert.deepEqual(snapshot.additionalProducts.map((product) => product.id), ['tirecare-plus']);
});

test('products-only output is not request-ready without an accepted product or with a broken Off-Road dependency', () => {
  const base = {
    year: '2024',
    make: 'Ford',
    model: 'Bronco',
    mileage: 25000,
    purchaseDate: '2024-03-01',
    asOfDate: '2026-01-01',
    state: 'Michigan',
    vehicleSituation: 'owned-after-sale',
    purchaseContext: 'owner',
    program: 'products-only',
  };

  const empty = buildQuoteSnapshot({ quote: base });
  assert.equal(empty.validation.validForRequest, false);
  assert.ok(empty.validation.additionalProducts.issues.some((issue) => issue.code === 'products-only-product-required'));

  const missingParent = buildQuoteSnapshot({ quote: {
    ...base,
    requestedProductIds: ['off-road-coverage'],
    productSelections: {
      'off-road-coverage': { variantId: 'off-road-coverage', confirmed: true },
    },
  } });
  assert.equal(missingParent.validation.validForRequest, false);
  assert.deepEqual(missingParent.additionalProducts, []);
  assert.ok(missingParent.validation.additionalProducts.issues.some((issue) => issue.code === 'off-road-parent-required'));
});
