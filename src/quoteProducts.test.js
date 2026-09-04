import assert from 'node:assert/strict';
import test from 'node:test';
import { deductibleOptions, getTermMatrix, isDeductibleAvailable, isProtectionOptionAvailable, protectionOptions } from './quoteData.js';
import {
  getQuoteProductCatalog,
  getWarrantyInspectionStatus,
  validatePrimaryPlanEligibility,
  validateQuoteProductRequests,
  validateQuoteProductSelection,
} from './quoteProducts.js';
import { getInspectionStatus } from './quoteOutput.js';

const vehicle = {
  year: '2024',
  make: 'Ford',
  model: 'F-150',
  powertrain: 'Gas',
  mileage: '25000',
  inService: '2024-02-15',
  purchaseDate: '2024-03-01',
  asOfDate: '2026-01-01',
  state: 'Michigan',
  program: 'esp',
  planPath: 'used',
};

const byId = (quote, id) => getQuoteProductCatalog(quote).find((product) => product.id === id);

test('used ESP planning matrices stay plan- and odometer-band specific', () => {
  const premium = getTermMatrix({ planId: 'premium', planPath: 'used', mileage: 0 });
  const base = getTermMatrix({ planId: 'base', planPath: 'used', mileage: 0 });
  const premium90k = getTermMatrix({ planId: 'premium', planPath: 'used', mileage: 90000 });
  const extra90k = getTermMatrix({ planId: 'extra', planPath: 'used', mileage: 90000 });
  const powertrain150k = getTermMatrix({ planId: 'powertrain', planPath: 'used', mileage: 150000 });

  assert.equal(premium.planningOnly, true);
  assert.match(premium.notice, /build a request|current VIN-specific offer/i);
  assert.equal(premium.isAvailable(6, 6000), false);
  assert.equal(base.isAvailable(6, 6000), true);
  assert.equal(premium90k.isAvailable(24, 36000), false);
  assert.equal(extra90k.isAvailable(24, 36000), true);
  assert.equal(powertrain150k.isAvailable(24, 24000), true);
  assert.equal(powertrain150k.isAvailable(6, 6000), false);
  assert.equal(getTermMatrix({ planId: 'premium', planPath: 'used', mileage: 120001 }).months.length, 0);
  assert.equal(getTermMatrix({ planId: 'base', planPath: 'used', mileage: 140001 }).months.length, 0);
});

test('PremiumCARE Plus EV is not given an invented used-plan matrix', () => {
  const matrix = getTermMatrix({ planId: 'premium-plus-ev', planPath: 'used', mileage: 25000 });
  assert.deepEqual(matrix.months, []);
  assert.deepEqual(matrix.miles, []);
  assert.equal(matrix.isAvailable(36, 36000), false);
  assert.match(matrix.notice, /no self-service used-plan choices/i);
});

test('historical deductible and benefit choices stay plan and term specific', () => {
  const byDeductible = (id) => deductibleOptions.find((option) => option.id === id);
  const byBenefit = (id) => protectionOptions.find((option) => option.id === id);
  assert.equal(isDeductibleAvailable(byDeductible('0'), { planId: 'premium-plus-ev', planPath: 'new', termMiles: 60000 }), true);
  assert.equal(isDeductibleAvailable(byDeductible('100'), { planId: 'premium-plus-ev', planPath: 'new', termMiles: 60000 }), false);
  assert.equal(isDeductibleAvailable(byDeductible('200'), { planId: 'premium', planPath: 'new', termMiles: 48000 }), false);
  assert.equal(isDeductibleAvailable(byDeductible('200'), { planId: 'premium', planPath: 'new', termMiles: 60000 }), true);
  assert.equal(isDeductibleAvailable(byDeductible('50'), { planId: 'base', planPath: 'used', termMiles: 6000 }), false);
  assert.equal(isDeductibleAvailable(byDeductible('50'), { planId: 'base', planPath: 'used', termMiles: 12000 }), true);
  assert.equal(isProtectionOptionAvailable(byBenefit('enhanced-rental'), { planId: 'base', planPath: 'used', termMonths: 6, termMiles: 6000 }), false);
  assert.equal(isProtectionOptionAvailable(byBenefit('key'), { planId: 'base', planPath: 'used', termMonths: 6, termMiles: 6000 }), false);
  assert.equal(isProtectionOptionAvailable(byBenefit('first-day'), { planId: 'base', planPath: 'used', termMonths: 6, termMiles: 6000 }), true);
  assert.equal(isProtectionOptionAvailable(byBenefit('lighting'), { planId: 'extra', planPath: 'new', termMonths: 60, termMiles: 75000 }), false);
  assert.equal(isProtectionOptionAvailable(byBenefit('lighting'), { planId: 'premium', planPath: 'used', termMonths: 24, termMiles: 12000 }), true);
});

test('purchase-only products distinguish new purchase, used purchase, and after-sale ownership', () => {
  for (const vehicleSituation of ['new-purchase', 'used-purchase']) {
    const quote = { ...vehicle, purchaseContext: 'shopping', vehicleSituation };
    for (const id of ['tirecare-plus', 'dentcare', 'windshieldcare', 'triplecare-plus', 'surfacecare', 'theftcare', 'ford-credit-gap', 'wearcare']) {
      const product = byId(quote, id);
      assert.equal(product.status.eligible, null, `${id} should remain a dealer-verified purchase-planning choice`);
      assert.match(product.status.message, /verify/i);
    }
  }

  const owned = { ...vehicle, purchaseContext: 'owner', vehicleSituation: 'owned-after-sale' };
  for (const id of ['tirecare-plus', 'dentcare', 'windshieldcare', 'triplecare-plus', 'surfacecare', 'theftcare', 'ford-credit-gap', 'wearcare']) {
    const product = byId(owned, id);
    assert.equal(product.status.eligible, false, `${id} must be disabled after the original vehicle transaction`);
    assert.match(product.status.message, /not available as an after-sale|original eligible vehicle purchase|cannot be added after|cannot be added later/i);
  }

  assert.match(byId(owned, 'ford-credit-gap').status.message, /financing transaction/i);
  assert.match(byId(owned, 'wearcare').status.message, /lease is signed/i);
});

test('every quote additional-product card has an explicit posture in all three vehicle situations', () => {
  const additionalIds = [
    'premium-maintenance',
    'maintenance-essentials',
    'rentalcare',
    'leasecare',
    'off-road-coverage',
    'tirecare-plus',
    'dentcare',
    'windshieldcare',
    'triplecare-plus',
    'surfacecare',
    'theftcare',
    'ford-credit-gap',
    'wearcare',
  ];
  const purchaseOnlyIds = ['tirecare-plus', 'dentcare', 'windshieldcare', 'triplecare-plus', 'surfacecare', 'theftcare', 'ford-credit-gap', 'wearcare'];
  const scenarios = {
    newPurchase: { ...vehicle, year: '2026', mileage: '1200', inService: '2025-12-01', vehicleSituation: 'new-purchase', purchaseContext: 'shopping', planPath: 'new' },
    recentUsedPurchase: { ...vehicle, vehicleSituation: 'used-purchase', purchaseContext: 'shopping' },
    olderUsedPurchase: { ...vehicle, year: '2020', mileage: '90000', inService: '2020-02-15', vehicleSituation: 'used-purchase', purchaseContext: 'shopping' },
    recentOwner: { ...vehicle, vehicleSituation: 'owned-after-sale', purchaseContext: 'owner' },
    olderOwner: { ...vehicle, year: '2020', mileage: '90000', inService: '2020-02-15', purchaseDate: '2020-03-01', vehicleSituation: 'owned-after-sale', purchaseContext: 'owner' },
  };

  for (const [scenarioName, quote] of Object.entries(scenarios)) {
    const catalog = getQuoteProductCatalog(quote);
    assert.deepEqual(
      catalog.filter((product) => additionalIds.includes(product.id)).map((product) => product.id),
      additionalIds,
      `${scenarioName} must keep every additional-product card in the catalog`,
    );
    for (const id of additionalIds) {
      const product = catalog.find((item) => item.id === id);
      assert.ok(product.status?.code, `${scenarioName}/${id} needs a status code`);
      assert.ok(product.status?.label, `${scenarioName}/${id} needs a customer-facing label`);
      assert.ok(product.status?.message, `${scenarioName}/${id} needs an exact explanation`);
      assert.notEqual(product.status.eligible, true, `${scenarioName}/${id} must not claim current eligibility without dealer verification`);
    }
  }

  for (const scenarioName of ['newPurchase', 'recentUsedPurchase', 'olderUsedPurchase']) {
    for (const id of purchaseOnlyIds) {
      assert.equal(byId(scenarios[scenarioName], id).status.eligible, null, `${scenarioName}/${id} should remain available for transaction planning`);
    }
  }
  for (const scenarioName of ['recentOwner', 'olderOwner']) {
    for (const id of purchaseOnlyIds) {
      assert.equal(byId(scenarios[scenarioName], id).status.eligible, false, `${scenarioName}/${id} must be disabled after the transaction`);
    }
  }

  for (const id of ['rentalcare', 'leasecare']) {
    assert.equal(byId(scenarios.newPurchase, id).status.eligible, null);
    assert.equal(byId(scenarios.recentUsedPurchase, id).status.eligible, null);
    assert.equal(byId(scenarios.olderUsedPurchase, id).status.eligible, false);
    assert.equal(byId(scenarios.recentOwner, id).status.eligible, null);
    assert.equal(byId(scenarios.olderOwner, id).status.eligible, false);
    assert.equal(byId(scenarios.olderUsedPurchase, id).status.code, 'outside-reference-window');
    assert.match(byId(scenarios.olderUsedPurchase, id).status.message, /Bob Maxey.*confirm current availability/i);
  }
});

test('purchase-only state restrictions disable only the affected current or historical option', () => {
  const floridaPurchase = { ...vehicle, purchaseContext: 'shopping', vehicleSituation: 'used-purchase', state: 'FL' };
  assert.equal(byId(floridaPurchase, 'windshieldcare').status.eligible, false);
  assert.equal(byId(floridaPurchase, 'triplecare-plus').status.eligible, false);
  assert.equal(byId(floridaPurchase, 'dentcare').status.eligible, null);

  const texasEvGlass = {
    ...vehicle,
    purchaseContext: 'shopping',
    vehicleSituation: 'new-purchase',
    powertrain: 'Electric',
    state: 'Texas',
    productSelections: { windshieldcare: { variantId: 'windshieldcare-plus-ev' } },
  };
  assert.equal(byId(texasEvGlass, 'windshieldcare').status.eligible, false);
  assert.match(byId(texasEvGlass, 'windshieldcare').status.message, /Plus EV|EV glass/i);
  assert.equal(byId({ ...texasEvGlass, state: 'Michigan' }, 'windshieldcare').status.eligible, null);
});

test('RentalCARE and LeaseCARE are verification-only and disabled outside the historical window', () => {
  const withinReference = { ...vehicle, purchaseContext: 'owner', vehicleSituation: 'owned-after-sale' };
  const outsideReference = { ...withinReference, inService: '2020-01-01', mileage: '80000' };

  for (const id of ['rentalcare', 'leasecare']) {
    assert.equal(byId(withinReference, id).status.eligible, null);
    assert.match(byId(withinReference, id).status.label, /verification/i);
    assert.equal(byId(outsideReference, id).status.eligible, false);
  }
});

test('Off-Road uses its limited after-sale exception without widening TireCARE', () => {
  const withinWindow = { ...vehicle, purchaseContext: 'owner', vehicleSituation: 'owned-after-sale' };
  assert.equal(byId(withinWindow, 'off-road-coverage').status.eligible, null);
  assert.equal(byId(withinWindow, 'tirecare-plus').status.eligible, false);
  assert.equal(byId({ ...withinWindow, mileage: '36000' }, 'off-road-coverage').status.eligible, false);
  assert.equal(byId({ ...withinWindow, purchaseDate: '2023-01-01' }, 'off-road-coverage').status.eligible, false);

  const usedPurchase = { ...vehicle, purchaseContext: 'shopping', vehicleSituation: 'used-purchase' };
  assert.equal(byId(usedPurchase, 'off-road-coverage').status.eligible, null);
  assert.equal(byId({ ...usedPurchase, mileage: '36000' }, 'off-road-coverage').status.eligible, false);
});

test('the exact NVLW time or mileage boundary is outside for used-plan inspection purposes', () => {
  const exactTime = {
    ...vehicle,
    inService: '2023-01-01',
    asOfDate: '2026-01-01',
    mileage: '35999',
    warrantyRecordConfirmed: true,
  };
  assert.equal(getWarrantyInspectionStatus(exactTime).likelyWithinNewVehicleLimitedWarranty, false);
  assert.equal(getInspectionStatus(exactTime).inspectionRequiredForUsedEsp, true);
  assert.equal(getWarrantyInspectionStatus({ ...exactTime, inService: '2023-01-02' }).likelyWithinNewVehicleLimitedWarranty, true);
  assert.equal(getWarrantyInspectionStatus({ ...exactTime, inService: '2023-01-02', mileage: '36000' }).likelyWithinNewVehicleLimitedWarranty, false);
});

test('primary ESP validation blocks an expired new path and malformed planning choices', () => {
  const validUsedRequest = {
    ...vehicle,
    vehicleSituation: 'owned-after-sale',
    purchaseContext: 'owner',
    program: 'esp',
    planPath: 'used',
    planId: 'extra',
    termMonths: 24,
    termMiles: 24000,
    deductible: '100',
    addOns: ['first-day'],
  };
  const valid = validatePrimaryPlanEligibility(validUsedRequest);
  assert.equal(valid.validForRequest, true);
  assert.equal(valid.eligible, null);
  assert.equal(valid.requiresDealerVerification, true);

  const expiredNew = validatePrimaryPlanEligibility({
    ...validUsedRequest,
    planPath: 'new',
    mileage: 90000,
    termMonths: 60,
    termMiles: 100000,
  });
  assert.equal(expiredNew.validForRequest, false);
  assert.equal(expiredNew.eligible, false);
  assert.ok(expiredNew.blockingIssues.some((issue) => issue.code === 'new-plan-outside-public-window'));

  const invalidCombination = validatePrimaryPlanEligibility({ ...validUsedRequest, termMonths: 6, termMiles: 6000, deductible: '50' });
  assert.equal(invalidCombination.validForRequest, false);
  assert.ok(invalidCombination.blockingIssues.some((issue) => issue.code === 'invalid-reference-combination'));
  assert.ok(invalidCombination.blockingIssues.some((issue) => issue.code === 'invalid-deductible'));

  const invalidBenefit = validatePrimaryPlanEligibility({ ...validUsedRequest, planId: 'base', termMonths: 6, termMiles: 6000, addOns: ['enhanced-rental'] });
  assert.equal(invalidBenefit.validForRequest, false);
  assert.ok(invalidBenefit.blockingIssues.some((issue) => issue.code === 'invalid-plan-benefit'));
});

test('primary and ancillary requests require an explicit three-way vehicle situation', () => {
  const primary = validatePrimaryPlanEligibility({
    ...vehicle,
    program: 'esp',
    planPath: 'used',
    planId: 'premium',
    termMonths: 84,
    termMiles: 100000,
    deductible: '100',
  });
  assert.equal(primary.validForRequest, false);
  assert.ok(primary.blockingIssues.some((issue) => issue.code === 'vehicle-situation-required' && issue.field === 'vehicleSituation'));

  const ancillary = validateQuoteProductRequests({
    ...vehicle,
    requestedProductIds: ['tirecare-plus'],
    productSelections: {
      'tirecare-plus': { variantId: 'tirecare-plus', termMonths: 60, termMiles: null, confirmed: true },
    },
  });
  assert.deepEqual(ancillary.acceptedProductIds, []);
  assert.ok(ancillary.issues.some((issue) => issue.code === 'vehicle-situation-required' && issue.field === 'vehicleSituation'));
});

test('CSP requires an owner context and a prior-coverage answer without claiming live eligibility', () => {
  const csp = {
    ...vehicle,
    vehicleSituation: 'owned-after-sale',
    purchaseContext: 'owner',
    program: 'csp',
    cspLevel: 'ultimate',
    cspPriorCoverageStatus: 'ending Ford Protect coverage',
  };
  const ready = validatePrimaryPlanEligibility(csp);
  assert.equal(ready.validForRequest, true);
  assert.equal(ready.eligible, null);
  assert.equal(ready.requiresDealerVerification, true);

  const unanswered = validatePrimaryPlanEligibility({ ...csp, cspPriorCoverageStatus: '' });
  assert.equal(unanswered.validForRequest, false);
  assert.equal(unanswered.eligible, null);
  assert.ok(unanswered.requiredFields.includes('cspPriorCoverageStatus'));

  const noPriorCoverage = validatePrimaryPlanEligibility({ ...csp, cspPriorCoverageStatus: 'none' });
  assert.equal(noPriorCoverage.validForRequest, false);
  assert.equal(noPriorCoverage.eligible, false);
  assert.ok(noPriorCoverage.blockingIssues.some((issue) => issue.field === 'cspPriorCoverageStatus'));

  const purchaseContext = validatePrimaryPlanEligibility({ ...csp, vehicleSituation: 'used-purchase', purchaseContext: 'shopping' });
  assert.equal(purchaseContext.validForRequest, false);
  assert.ok(purchaseContext.blockingIssues.some((issue) => issue.code === 'csp-owner-context-required'));

  const publishedLimit = validatePrimaryPlanEligibility({ ...csp, mileage: 140001 });
  assert.equal(publishedLimit.validForRequest, false);
  assert.equal(publishedLimit.eligible, false);
});

test('Diesel EngineCARE validates known qualification inputs and preserves unknowns for review', () => {
  const engineCare = {
    ...vehicle,
    vehicleSituation: 'owned-after-sale',
    purchaseContext: 'owner',
    program: 'enginecare',
    powertrain: 'Diesel',
    engineCareLevel: 'diesel-enginecare-plus',
    engine: '6.7L Power Stroke',
    currentEngineHours: 2500,
  };
  const ready = validatePrimaryPlanEligibility(engineCare);
  assert.equal(ready.validForRequest, true);
  assert.equal(ready.eligible, null);

  const hoursExpired = validatePrimaryPlanEligibility({ ...engineCare, currentEngineHours: 4000 });
  assert.equal(hoursExpired.validForRequest, false);
  assert.equal(hoursExpired.eligible, false);
  assert.ok(hoursExpired.blockingIssues.some((issue) => issue.code === 'outside-engine-hour-window'));

  const wrongEngine = validatePrimaryPlanEligibility({ ...engineCare, engine: '2.0L diesel' });
  assert.equal(wrongEngine.validForRequest, false);
  assert.equal(wrongEngine.eligible, false);

  const unknownHours = validatePrimaryPlanEligibility({ ...engineCare, currentEngineHours: '' });
  assert.equal(unknownHours.validForRequest, true);
  assert.ok(unknownHours.reviewIssues.some((issue) => issue.code === 'engine-hours-verification'));
});

test('product selection validation rejects an invented variant instead of silently substituting a default', () => {
  const result = validateQuoteProductSelection('windshieldcare', {
    variantId: 'invented-glass-product',
    termMonths: 60,
  });
  assert.equal(result.valid, false);
  assert.equal(result.code, 'invalid-variant');
});

test('additional-product validation enforces LeaseCARE and RentalCARE conflicts', () => {
  const base = {
    ...vehicle,
    vehicleSituation: 'new-purchase',
    purchaseContext: 'shopping',
    program: 'esp',
    planPath: 'new',
    planId: 'premium',
    requestedProductIds: ['leasecare', 'rentalcare', 'premium-maintenance'],
    maintenanceId: 'premium-maintenance',
    addOns: ['first-day'],
    productSelections: {
      leasecare: { variantId: 'leasecare', confirmed: true },
      rentalcare: { variantId: 'rentalcare', confirmed: true },
      'premium-maintenance': { variantId: 'premium-maintenance', termMonths: 60, termMiles: 75000, serviceInterval: 7500, powertrain: 'Gas', confirmed: true },
    },
  };
  const result = validateQuoteProductRequests(base);
  assert.equal(result.validForRequest, false);
  assert.ok(result.productResults.leasecare.issues.some((issue) => issue.code === 'leasecare-mechanical-conflict'));
  assert.ok(result.productResults.leasecare.issues.some((issue) => issue.code === 'leasecare-maintenance-conflict'));
  assert.ok(result.productResults.leasecare.issues.some((issue) => issue.code === 'leasecare-rentalcare-conflict'));
  assert.ok(result.productResults.rentalcare.issues.some((issue) => issue.code === 'rentalcare-benefit-conflict'));
  assert.deepEqual(result.acceptedProductIds, ['premium-maintenance']);
});

test('Off-Road requires a selected or already-owned eligible parent product', () => {
  const offRoadSelection = { variantId: 'off-road-coverage', confirmed: true };
  const purchase = {
    ...vehicle,
    vehicleSituation: 'used-purchase',
    purchaseContext: 'shopping',
    requestedProductIds: ['off-road-coverage'],
    productSelections: { 'off-road-coverage': offRoadSelection },
  };
  const missingParent = validateQuoteProductRequests(purchase);
  assert.deepEqual(missingParent.acceptedProductIds, []);
  assert.ok(missingParent.issues.some((issue) => issue.code === 'off-road-parent-required'));

  const withPurchaseParent = validateQuoteProductRequests({
    ...purchase,
    requestedProductIds: ['tirecare-plus', 'off-road-coverage'],
    productSelections: {
      'tirecare-plus': { variantId: 'tirecare-plus', termMonths: 60, termMiles: null, confirmed: true },
      'off-road-coverage': offRoadSelection,
    },
  });
  assert.deepEqual(withPurchaseParent.acceptedProductIds, ['tirecare-plus', 'off-road-coverage']);

  const ownerWithExistingParent = validateQuoteProductRequests({
    ...purchase,
    vehicleSituation: 'owned-after-sale',
    purchaseContext: 'owner',
    existingFordProtectProductIds: ['triplecare-plus'],
  });
  assert.deepEqual(ownerWithExistingParent.acceptedProductIds, ['off-road-coverage']);
});

test('GAP and WearCARE use the optional transaction method without overclaiming eligibility', () => {
  const catalogFor = (transactionMethod) => {
    const quote = { ...vehicle, vehicleSituation: 'new-purchase', purchaseContext: 'shopping', transactionMethod };
    return {
      gap: byId(quote, 'ford-credit-gap').status,
      wear: byId(quote, 'wearcare').status,
    };
  };

  assert.equal(catalogFor('finance').gap.eligible, null);
  assert.equal(catalogFor('finance').wear.eligible, false);
  assert.equal(catalogFor('lease').gap.eligible, false);
  assert.equal(catalogFor('lease').wear.eligible, null);
  assert.equal(catalogFor('cash').gap.eligible, false);
  assert.equal(catalogFor('cash').wear.eligible, false);
  assert.equal(catalogFor('undecided').gap.eligible, null);
  assert.equal(catalogFor('undecided').wear.eligible, null);
  assert.equal(catalogFor(undefined).gap.eligible, null);
  assert.equal(catalogFor(undefined).wear.eligible, null);
});

test('a products-only request requires at least one confirmed context-valid product', () => {
  const base = {
    ...vehicle,
    vehicleSituation: 'new-purchase',
    purchaseContext: 'shopping',
    program: 'products-only',
    transactionMethod: 'finance',
  };

  const empty = validateQuoteProductRequests(base);
  assert.equal(empty.validForRequest, false);
  assert.deepEqual(empty.acceptedProductIds, []);
  assert.ok(empty.issues.some((issue) => issue.code === 'products-only-product-required'));

  const unconfirmed = validateQuoteProductRequests({
    ...base,
    requestedProductIds: ['tirecare-plus'],
    productSelections: {
      'tirecare-plus': { variantId: 'tirecare-plus', termMonths: 60, termMiles: null, confirmed: false },
    },
  });
  assert.equal(unconfirmed.validForRequest, false);
  assert.deepEqual(unconfirmed.acceptedProductIds, []);
  assert.ok(unconfirmed.issues.some((issue) => issue.code === 'configuration-not-confirmed'));

  const configured = validateQuoteProductRequests({
    ...base,
    requestedProductIds: ['tirecare-plus'],
    productSelections: {
      'tirecare-plus': { variantId: 'tirecare-plus', termMonths: 60, termMiles: null, confirmed: true },
    },
  });
  assert.equal(configured.validForRequest, true);
  assert.deepEqual(configured.acceptedProductIds, ['tirecare-plus']);
});

test('a products-only Off-Road request still requires an eligible underlying product', () => {
  const result = validateQuoteProductRequests({
    ...vehicle,
    mileage: '25000',
    purchaseDate: '2024-03-01',
    vehicleSituation: 'owned-after-sale',
    purchaseContext: 'owner',
    program: 'products-only',
    requestedProductIds: ['off-road-coverage'],
    productSelections: {
      'off-road-coverage': { variantId: 'off-road-coverage', confirmed: true },
    },
  });

  assert.equal(result.validForRequest, false);
  assert.deepEqual(result.acceptedProductIds, []);
  assert.ok(result.issues.some((issue) => issue.code === 'off-road-parent-required' && issue.field === 'offRoadUnderlyingProductId'));
});
