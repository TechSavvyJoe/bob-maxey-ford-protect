import { locations } from './data.js';
import {
  formatMiles,
  formatTerm,
  maintenanceChoices,
  protectionOptions,
} from './quoteData.js';
import {
  getProductTimingPresentation,
  quoteProducts,
  validatePrimaryPlanEligibility,
  validateQuoteProductRequests,
} from './quoteProducts.js';
import { CONTACT_CONSENT_TEXT, CONTACT_CONSENT_VERSION } from './consent.js';

const AGREEMENT_DISCLAIMER = 'This personalized proposal is a request for review, not a service contract, price, eligibility approval, or promise of coverage. Vehicle eligibility, covered components, options, term, deductible, price, exclusions, cancellation provisions, and state availability must match the Ford Protect agreement issued for the vehicle. The executed agreement controls.';
const ENGINECARE_LIMITS = Object.freeze({ months: 84, miles: 200000, engineHours: 8000, deductible: '100' });
const ENGINECARE_LEVELS = Object.freeze({
  'diesel-enginecare-plus': Object.freeze({
    id: 'diesel-enginecare-plus',
    name: 'Diesel EngineCARE Plus',
    componentCount: '21 listed diesel engine components',
  }),
  'diesel-enginecare': Object.freeze({
    id: 'diesel-enginecare',
    name: 'Diesel EngineCARE',
    componentCount: '13 listed diesel engine components',
  }),
});

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const asArray = (value) => Array.isArray(value) ? value : [];
const cleanText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const PAYMENT_PREFERENCE_LABELS = Object.freeze({
  'Review interest-free financing if eligible': 'Show the interest-free payment option',
  'Pay in full': 'Show the total price',
  'Compare total price and eligible financing': 'Compare the total price and eligible financing',
  'Show me both choices': 'Compare the total price and eligible financing',
  'Not sure yet': 'Help me compare the available choices',
});

const PREFERRED_CONTACT_LABELS = Object.freeze({
  phone: 'Phone call',
  text: 'Text message',
  email: 'Email',
});

export const getPaymentPreferenceLabel = (value, fallback = 'Review available payment choices with the representative') => {
  const normalized = cleanText(value);
  return PAYMENT_PREFERENCE_LABELS[normalized] || normalized || fallback;
};

export const getPreferredContactLabel = (value, fallback = 'Phone call') => {
  const normalized = cleanText(value).toLowerCase();
  return PREFERRED_CONTACT_LABELS[normalized] || cleanText(value) || fallback;
};

export const formatPhoneNumber = (value) => {
  const original = cleanText(value);
  const digits = original.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return original;
};
const finiteNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const unique = (values) => [...new Set(asArray(values).map((value) => cleanText(value)).filter(Boolean))];
const safeIso = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const normalizeDisplayItem = (value, fallback = '') => {
  if (typeof value === 'string' || typeof value === 'number') {
    const text = cleanText(value, fallback);
    return text ? { title: text, text: '', displayText: text } : null;
  }
  if (!isObject(value)) return fallback ? { title: fallback, text: '', displayText: fallback } : null;
  const title = cleanText(value.title || value.name || value.label || value.heading);
  const detail = cleanText(value.text || value.summary || value.description || value.detail);
  const displayText = title && detail && title.toLowerCase() !== detail.toLowerCase()
    ? `${title}: ${detail}`
    : title || detail || fallback;
  return displayText ? { title: title || displayText, text: detail && detail !== title ? detail : '', displayText } : null;
};

const displayText = (value, fallback = '') => normalizeDisplayItem(value, fallback)?.displayText || fallback;

const resolveEngineCareLevel = (quote = {}, plan = {}) => {
  const requested = cleanText(quote.engineCareLevel || quote.planId).toLowerCase();
  if (!requested) return null;
  return ENGINECARE_LEVELS[requested] || (plan.id === requested ? ENGINECARE_LEVELS[plan.id] : null);
};

const normalizeProgram = (quote = {}, plan = {}) => {
  const value = cleanText(quote.program || quote.engineCareLevel || quote.planId || (quote.planId ? plan.program : '')).toLowerCase();
  if (!value) return '';
  if (value === 'enginecare' || value === 'diesel-enginecare' || value === 'diesel-enginecare-plus') return 'enginecare';
  if (value === 'csp' || value === 'continued-service' || value === 'continued service plan') return 'csp';
  if (value === 'products-only' || value === 'additional-products-only') return 'products-only';
  if (value === 'esp' || quote.planId) return 'esp';
  return '';
};

const normalizeBooleanState = (value) => {
  if (typeof value === 'boolean') return value;
  const normalized = cleanText(value).toLowerCase();
  if (['true', 'yes', 'active', 'within', 'inside', 'in warranty'].includes(normalized)) return true;
  if (['false', 'no', 'expired', 'outside', 'out of warranty'].includes(normalized)) return false;
  return null;
};

const addMonths = (value, months) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
};

const warrantyLimitsFor = (make) => cleanText(make).toLowerCase() === 'lincoln'
  ? { months: 48, miles: 50000, label: '4 years / 50,000 miles' }
  : { months: 36, miles: 36000, label: '3 years / 36,000 miles' };

/**
 * Returns the inspection posture used by proposal and CRM output. Ford records
 * remain authoritative; the date/mileage calculation is only a planning aid.
 */
export function getInspectionStatus(input = {}) {
  const quote = isObject(input.quote) ? input.quote : input;
  const program = normalizeProgram(quote, input.plan || {});
  const limits = warrantyLimitsFor(quote.make || quote.vehicle?.make);

  if (program === 'enginecare') {
    return {
      code: 'enginecare-specialist-record-review',
      tone: 'review',
      required: null,
      inspectionRequired: null,
      inspectionRequiredForUsedEsp: null,
      likelyWithinNewVehicleLimitedWarranty: null,
      label: 'Diesel EngineCARE specialist record review',
      message: 'Bob Maxey must verify the factory-installed Power Stroke engine, original in-service date, total mileage, engine hours, vehicle use, and current Diesel EngineCARE availability.',
      caveat: 'The current Ford record, returned offer, and issued Diesel EngineCARE agreement determine eligibility and any enrollment requirements.',
      basis: 'enginecare-program',
      limits: { ...ENGINECARE_LIMITS },
    };
  }

  if (program === 'csp') {
    return {
      code: 'not-required-csp',
      tone: 'positive',
      required: false,
      inspectionRequired: false,
      inspectionRequiredForUsedEsp: false,
      likelyWithinNewVehicleLimitedWarranty: null,
      label: 'No CSP enrollment inspection required',
      message: 'Ford’s current Continued Service Plan buyer guide states that CSP has no waiting period or vehicle-inspection requirement.',
      caveat: 'Ford plan-record eligibility and the returned CSP agreement still require specialist confirmation.',
      basis: 'program',
      limits,
    };
  }

  const planPath = cleanText(quote.planPath).toLowerCase();

  if (program === 'esp' && planPath === 'new') {
    return {
      code: 'not-applicable-new-plan',
      tone: 'positive',
      required: false,
      inspectionRequired: false,
      inspectionRequiredForUsedEsp: false,
      likelyWithinNewVehicleLimitedWarranty: null,
      label: 'Used-plan inspection not applicable',
      message: 'The Used Vehicle Inspection Checklist rule applies to used-plan ESP enrollment outside the New Vehicle Limited Warranty—not this new-plan path.',
      caveat: 'Ford warranty records must still confirm the VIN, original in-service date, and new-plan eligibility.',
      basis: 'new-plan-path',
      limits,
    };
  }

  if (program !== 'esp' || planPath !== 'used') {
    return {
      code: 'inspection-path-not-selected',
      tone: 'review',
      required: null,
      inspectionRequired: null,
      inspectionRequiredForUsedEsp: null,
      likelyWithinNewVehicleLimitedWarranty: null,
      label: 'Inspection path determined after plan selection',
      message: 'Select the Ford Protect program and plan path before evaluating any enrollment-inspection requirement.',
      caveat: 'Bob Maxey will use Ford records and the current product rules for the selected vehicle and program.',
      basis: 'plan-path-pending',
      limits,
    };
  }

  const explicitWithin = normalizeBooleanState(firstDefined(
    quote.withinNewVehicleLimitedWarranty,
    quote.withinNVLW,
    quote.withinNvLw,
    quote.vehicle?.withinNewVehicleLimitedWarranty,
    quote.newVehicleLimitedWarranty?.active,
    quote.newVehicleLimitedWarranty?.status,
  ));
  const inService = safeIso(quote.inService || quote.inServiceDate || quote.vehicle?.inServiceDate);
  const mileage = finiteNumber(firstDefined(quote.mileage, quote.currentMileage, quote.vehicle?.currentMileage));
  const asOf = safeIso(quote.asOfDate || quote.generatedAt || quote.timestamps?.generatedAt) || new Date().toISOString();
  const warrantyEnd = inService ? addMonths(inService, limits.months) : null;
  // The New Vehicle Limited Warranty ends at the earlier limit. Reaching the
  // exact time or mileage boundary is outside, not still within, the window.
  const withinTime = warrantyEnd ? new Date(asOf).getTime() < warrantyEnd.getTime() : null;
  const withinMiles = mileage === null ? null : mileage < limits.miles;
  const calculatedWithin = withinTime === null || withinMiles === null ? null : withinTime && withinMiles;
  const likelyWithin = explicitWithin ?? calculatedWithin;
  const warrantyRecordConfirmed = Boolean(firstDefined(
    quote.warrantyRecordConfirmed,
    quote.vehicle?.warrantyRecordConfirmed,
    quote.newVehicleLimitedWarranty?.confirmed,
    false,
  ));
  const basis = explicitWithin !== null ? 'explicit-quote-status' : calculatedWithin !== null ? 'in-service-date-and-mileage' : 'insufficient-vehicle-data';

  if (likelyWithin === true) {
    return {
      code: 'not-required-within-nvlw',
      tone: warrantyRecordConfirmed ? 'positive' : 'review',
      required: warrantyRecordConfirmed ? false : null,
      inspectionRequired: warrantyRecordConfirmed ? false : null,
      inspectionRequiredForUsedEsp: warrantyRecordConfirmed ? false : null,
      likelyWithinNewVehicleLimitedWarranty: true,
      warrantyRecordConfirmed,
      label: warrantyRecordConfirmed ? 'No ESP used-plan inspection required' : 'Used-plan inspection likely not required',
      message: warrantyRecordConfirmed
        ? 'Ford records confirm the vehicle remains within the New Vehicle Limited Warranty. No used-vehicle inspection is expected for this ESP path.'
        : 'If Ford records confirm the vehicle remains within the New Vehicle Limited Warranty, no used-vehicle inspection is expected for this ESP path.',
      caveat: warrantyRecordConfirmed ? 'The current Ford offer and issued agreement still control final eligibility.' : 'Bob Maxey will confirm the VIN, original in-service date, and remaining warranty in Ford records before finalizing coverage.',
      basis,
      limits,
    };
  }

  if (likelyWithin === false) {
    return {
      code: 'required-outside-nvlw',
      tone: 'review',
      required: warrantyRecordConfirmed ? true : null,
      inspectionRequired: warrantyRecordConfirmed ? true : null,
      inspectionRequiredForUsedEsp: warrantyRecordConfirmed ? true : null,
      likelyWithinNewVehicleLimitedWarranty: false,
      warrantyRecordConfirmed,
      label: warrantyRecordConfirmed ? 'Dealer inspection required for this used ESP path' : 'Inspection may be required after Ford record review',
      message: warrantyRecordConfirmed
        ? 'Ford records confirm the vehicle is outside the New Vehicle Limited Warranty. A participating Ford or Lincoln dealership must complete the required Used Vehicle Inspection Checklist before eligible used-plan enrollment.'
        : 'If Ford records confirm the vehicle is outside the New Vehicle Limited Warranty, a participating Ford or Lincoln dealership must complete the required Used Vehicle Inspection Checklist before eligible used-plan enrollment.',
      caveat: warrantyRecordConfirmed ? 'Bob Maxey will arrange the applicable dealership inspection before enrollment.' : 'Bob Maxey will verify the Ford record before describing the vehicle-specific inspection requirement as confirmed.',
      basis,
      limits,
    };
  }

  return {
    code: 'inspection-review-required',
    tone: 'review',
    required: null,
    inspectionRequired: null,
    inspectionRequiredForUsedEsp: null,
    likelyWithinNewVehicleLimitedWarranty: null,
    label: 'Warranty record check needed',
    message: 'The VIN and original in-service date are needed to confirm whether this used-plan ESP requires a Used Vehicle Inspection Checklist.',
    caveat: 'Bob Maxey will confirm the Ford warranty record and any inspection requirement before enrollment.',
    basis,
    limits,
  };
}

const normalizeCoverageGroup = (group) => {
  if (typeof group === 'string') {
    return { title: group, summary: 'Eligible listed components in this system are subject to the issued agreement.', items: [] };
  }
  return {
    title: cleanText(group?.title || group?.name, 'Coverage group'),
    summary: cleanText(group?.summary || group?.description),
    items: asArray(group?.items || group?.examples).map((item) => displayText(item)).filter(Boolean),
  };
};

const normalizeBenefit = (benefit) => {
  if (typeof benefit === 'string') return { title: benefit, text: '' };
  const normalized = normalizeDisplayItem(benefit, 'Plan benefit');
  return {
    title: normalized?.title || 'Plan benefit',
    text: normalized?.text || '',
  };
};

const resolveStore = (store) => {
  const locationKey = (value) => cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const matchLocation = (...values) => {
    const keys = values.map(locationKey).filter(Boolean);
    return locations.find((location) => {
      const locationKeys = [location.name, location.descriptor].map(locationKey);
      return keys.some((key) => locationKeys.includes(key));
    });
  };
  if (isObject(store)) {
    const match = matchLocation(store.id, store.name, store.value, store.descriptor, store.label);
    if (match) return { id: match.name, name: match.descriptor, descriptor: match.descriptor };
    return {
      id: cleanText(store.id || store.name || store.value, 'Howell'),
      name: cleanText(store.name || store.descriptor || store.label, 'Bob Maxey Ford of Howell'),
      descriptor: cleanText(store.descriptor || store.label || store.name, 'Bob Maxey Ford of Howell'),
    };
  }
  const requested = cleanText(store, 'Howell');
  const match = matchLocation(requested);
  return {
    id: match?.name || requested,
    name: match?.descriptor || requested,
    descriptor: match?.descriptor || requested,
  };
};

const cspPriorCoveragePresentation = (value) => {
  const raw = cleanText(value);
  const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (!raw) return { status: '', label: 'Prior coverage answer not provided', detail: 'The qualifying prior-coverage answer still needs to be provided.' };
  if (key === 'none' || /no-qualifying|without-qualifying/.test(key)) {
    return { status: raw, label: 'No qualifying prior coverage indicated', detail: 'The customer indicated no qualifying prior coverage; CSP is not the appropriate path.' };
  }
  const activeOnly = /active/.test(key) && !/ending|expir/.test(key);
  if (/ford-protect/.test(key)) {
    return {
      status: raw,
      label: activeOnly ? 'Ford Protect coverage active' : 'Ford Protect coverage active or ending',
      detail: activeOnly
        ? 'Customer indicated qualifying prior Ford Protect coverage is active; Ford records must confirm.'
        : 'Customer indicated qualifying Ford Protect coverage is active or ending; Ford records must confirm.',
    };
  }
  if (/factory|oem|warranty/.test(key)) {
    return {
      status: raw,
      label: activeOnly ? 'Factory warranty active' : 'Factory warranty active or ending',
      detail: activeOnly
        ? 'Customer indicated qualifying factory warranty is active; Ford records must confirm.'
        : 'Customer indicated qualifying factory warranty is active or ending; Ford records must confirm.',
    };
  }
  return { status: raw, label: raw, detail: `${raw}; Ford records must confirm the qualifying prior coverage.` };
};

const productCatalog = () => Array.isArray(quoteProducts)
  ? quoteProducts
  : Object.values(quoteProducts || {});

const selectedOptionIdsFor = (quote, productId) => unique([
  ...asArray(quote.requestedProductOptions?.[productId]),
  ...asArray(quote.productOptions?.[productId]),
  ...asArray(quote.additionalProductOptions?.[productId]),
  quote.productSelections?.[productId]?.optionId,
  quote.productSelections?.[productId]?.variantId,
]);

const normalizeProductConfiguration = (quote, product, productId) => {
  const raw = isObject(quote.productSelections?.[productId])
    ? quote.productSelections[productId]
    : isObject(quote.requestedProductConfigurations?.[productId])
      ? quote.requestedProductConfigurations[productId]
      : {};
  const optionId = cleanText(raw.optionId || raw.variantId || raw.levelId);
  const selectedVariant = asArray(product?.configuration?.variants).find((item) => item.id === optionId)
    || asArray(product?.configuration?.variants).find((item) => item.customerSelectable)
    || asArray(product?.configuration?.variants)[0];
  const option = asArray(product?.planOptions).find((item) => item.id === optionId) || selectedVariant;
  const termMonths = finiteNumber(raw.termMonths || raw.months);
  const mileage = finiteNumber(raw.mileage || raw.termMiles);
  const serviceIntervalMiles = finiteNumber(raw.serviceIntervalMiles || raw.serviceInterval);
  const engineHours = finiteNumber(raw.engineHours || raw.termHours);
  const benefitAmount = finiteNumber(raw.benefitAmount || raw.benefit);
  const termLabel = cleanText(
    raw.termLabel,
    termMonths === null ? '' : formatTerm(termMonths),
  );
  const mileageLabel = cleanText(
    raw.mileageLabel,
    mileage === null ? '' : `${formatMiles(mileage)} miles`,
  );
  const serviceIntervalLabel = cleanText(
    raw.serviceIntervalLabel,
    serviceIntervalMiles === null ? '' : `Every ${formatMiles(serviceIntervalMiles)} miles`,
  );
  const engineHoursLabel = cleanText(
    raw.engineHoursLabel,
    engineHours === null ? '' : `${formatMiles(engineHours)} engine hours`,
  );
  const benefitAmountLabel = cleanText(
    raw.benefitAmountLabel,
    benefitAmount === null ? '' : `$${formatMiles(benefitAmount)} benefit request`,
  );
  const labels = unique([
    cleanText(option?.name || option?.label || raw.optionName || raw.variantName),
    termLabel,
    mileageLabel,
    serviceIntervalLabel,
    engineHoursLabel,
    benefitAmountLabel,
  ]);
  const timing = getProductTimingPresentation(selectedVariant || product, {
    purchaseTiming: raw.purchaseTiming,
    purchaseWindow: raw.purchaseWindowLabel || selectedVariant?.purchaseWindowLabel,
    coverageStart: raw.startBasisLabel || selectedVariant?.startBasisLabel || product?.configuration?.startBasisLabel,
  });

  return {
    optionId: optionId || null,
    optionName: cleanText(option?.name || option?.label || raw.optionName || raw.variantName) || null,
    mode: cleanText(raw.mode || selectedVariant?.mode || product?.configuration?.mode, 'dealer-confirmed'),
    termMonths,
    termLabel: termLabel || null,
    mileage,
    mileageLabel: mileageLabel || null,
    serviceIntervalMiles,
    serviceIntervalLabel: serviceIntervalLabel || null,
    engineHours,
    engineHoursLabel: engineHoursLabel || null,
    benefitAmount,
    benefitAmountLabel: benefitAmountLabel || null,
    startBasis: cleanText(raw.startBasis || selectedVariant?.startBasis),
    startBasisLabel: cleanText(raw.startBasisLabel || selectedVariant?.startBasisLabel || product?.configuration?.startBasisLabel),
    purchaseWindowLabel: cleanText(raw.purchaseWindowLabel || selectedVariant?.purchaseWindowLabel || timing.purchaseWindow),
    purchaseTiming: timing.code,
    purchaseTimingLabel: timing.label,
    purchaseTimingShortLabel: timing.shortLabel,
    purchaseTimingDetail: timing.detail,
    purchaseContext: cleanText(raw.purchaseContext || quote.purchaseContext, 'owner'),
    status: cleanText(raw.status, 'requested-specialist-confirmation'),
    labels,
  };
};

const resolveAdditionalProducts = (quote) => {
  const requestedIds = unique(quote.requestedProductIds);
  const catalog = productCatalog();
  return requestedIds.map((id) => {
    const product = catalog.find((item) => item.id === id);
    if (!product) {
      return {
        id,
        resolved: false,
        name: 'Product selection pending catalog review',
        shortName: 'Product pending review',
        value: `The saved product reference "${id}" requires Bob Maxey catalog review before customer presentation.`,
        description: 'A specialist will match the saved reference to the current Ford Protect product and eligible configuration.',
        highlights: ['Saved product reference retained', 'Current name, benefits, timing, and terms require dealer confirmation'],
        purchaseTimingLabel: 'Dealer confirmation required',
        purchaseTimingDetail: 'The saved reference could not be matched to the current customer-facing catalog.',
        status: 'requested-catalog-review',
        selectedOptionIds: [],
        selectedOptions: [],
      };
    }
    const selectedOptionIds = selectedOptionIdsFor(quote, id);
    const selectedOptions = [...asArray(product.planOptions), ...asArray(product.configuration?.variants)]
      .filter((option) => selectedOptionIds.includes(option.id))
      .map((option) => ({ id: option.id, name: displayText(option.name || option.label), summary: displayText(option.summary || option.description) }))
      .reduce((options, option) => {
        const existing = options.find((item) => item.id === option.id);
        if (!existing) options.push(option);
        else if (!existing.summary && option.summary) Object.assign(existing, option);
        return options;
      }, []);
    const configuration = normalizeProductConfiguration(quote, product, id);
    const detailSections = asArray(product.detailSections).map((section) => ({
      title: displayText(section?.title, 'Product detail'),
      items: asArray(section?.items).map((item) => displayText(item)).filter(Boolean),
    })).filter((section) => section.title || section.items.length);
    const coverageSectionItems = detailSections
      .filter((section) => /cover|benefit|include|protect|service|repair/i.test(section.title))
      .flatMap((section) => section.items);
    const highlights = unique([
      ...asArray(product.highlights).map((item) => displayText(item)),
      ...asArray(product.planOptions).map((item) => displayText(item)),
      ...coverageSectionItems,
    ]).filter(Boolean);
    return {
      id: product.id,
      resolved: true,
      familyId: cleanText(product.familyId),
      familyLabel: cleanText(product.familyLabel),
      name: cleanText(product.name, id),
      shortName: cleanText(product.shortName || product.name, id),
      eyebrow: cleanText(product.eyebrow),
      value: cleanText(product.value),
      description: cleanText(product.description),
      image: cleanText(product.image),
      imageAlt: cleanText(product.imageAlt),
      badge: cleanText(product.badge),
      requestMode: cleanText(product.requestMode, 'specialist-review'),
      purchaseTiming: cleanText(configuration.purchaseTiming || product.purchaseTiming || product.saleTiming),
      purchaseTimingLabel: cleanText(configuration.purchaseTimingLabel || product.purchaseTimingLabel, 'Purchase timing requires dealer confirmation'),
      purchaseTimingShortLabel: cleanText(configuration.purchaseTimingShortLabel || product.purchaseTimingShortLabel, 'Dealer confirmation required'),
      purchaseTimingDetail: cleanText(configuration.purchaseTimingDetail || product.purchaseTimingDetail || configuration.purchaseWindowLabel),
      purchaseContexts: asArray(product.purchaseContexts).map((item) => cleanText(item)).filter(Boolean),
      powertrains: asArray(product.powertrains).map((item) => cleanText(item)).filter(Boolean),
      warrantyApplicability: asArray(product.warrantyApplicability).map((item) => cleanText(item)).filter(Boolean),
      highlights: highlights.length ? highlights : [
        cleanText(product.value || product.description, 'Product benefits require specialist confirmation.'),
        'The current Ford offer and issued agreement control coverage and limits.',
      ],
      detailSections,
      eligibility: {
        headline: cleanText(product.eligibility?.headline),
        requirements: asArray(product.eligibility?.requirements).map((item) => displayText(item)).filter(Boolean),
        dealerConfirmation: cleanText(product.eligibility?.dealerConfirmation),
        inspectionPolicy: cleanText(product.eligibility?.inspectionPolicy),
      },
      cautions: asArray(product.cautions).map((item) => displayText(item)).filter(Boolean),
      selectedOptionIds,
      selectedOptions,
      configuration,
      requestedTerm: firstDefined(
        quote.requestedProductTerms?.[id],
        quote.productTerms?.[id],
        null,
      ),
      status: 'requested-specialist-confirmation',
    };
  });
};

const buildTerm = (quote, program) => {
  if (program === 'enginecare') {
    return {
      mode: 'fixed-time-mileage-hours',
      months: ENGINECARE_LIMITS.months,
      years: ENGINECARE_LIMITS.months / 12,
      mileage: ENGINECARE_LIMITS.miles,
      mileageMode: 'total',
      engineHours: ENGINECARE_LIMITS.engineHours,
      label: formatTerm(ENGINECARE_LIMITS.months),
      mileageLabel: `${formatMiles(ENGINECARE_LIMITS.miles)} total miles`,
      engineHoursLabel: `${formatMiles(ENGINECARE_LIMITS.engineHours)} engine hours`,
      qualifier: 'Referenced maximum; current Ford specialist review controls.',
    };
  }
  if (program === 'csp') {
    return {
      mode: 'monthly',
      months: null,
      years: null,
      mileage: null,
      mileageMode: 'none',
      engineHours: null,
      label: 'Monthly coverage',
      mileageLabel: 'No annual mileage limit',
      engineHoursLabel: null,
    };
  }
  const months = finiteNumber(quote.termMonths);
  const mileage = finiteNumber(quote.termMiles);
  const mileageMode = quote.planPath === 'used' ? 'additional' : 'total';
  return {
    mode: 'fixed',
    months,
    years: months === null ? null : months / 12,
    mileage,
    mileageMode,
    engineHours: null,
    label: months === null ? 'Term to be confirmed' : formatTerm(months),
    mileageLabel: mileage === null ? 'Mileage to be confirmed' : `${formatMiles(mileage)} ${mileageMode} miles`,
    engineHoursLabel: null,
  };
};

const buildDeductible = (quote, program) => {
  if (program === 'enginecare') {
    return { id: ENGINECARE_LIMITS.deductible, label: '$100', status: 'referenced-specialist-review' };
  }
  if (program === 'csp') {
    return { id: null, label: 'Confirmed with the CSP offer', status: 'specialist-confirmation' };
  }
  const id = cleanText(quote.deductible);
  if (!id) return { id: null, label: 'Deductible not selected', status: 'selection-required' };
  return {
    id,
    label: id === 'disappearing' ? 'Disappearing deductible' : `$${id}`,
    status: 'requested',
  };
};

const buildMaintenance = (quote) => {
  const id = cleanText(quote.maintenanceId, 'none');
  const choice = maintenanceChoices.find((item) => item.id === id);
  const selected = id !== 'none';
  const intervalMiles = selected ? finiteNumber(quote.maintenanceInterval) : null;
  return {
    selected,
    id,
    name: cleanText(quote.maintenanceName || choice?.title, selected ? id : 'No maintenance plan requested'),
    description: cleanText(choice?.text),
    intervalMiles,
    intervalLabel: intervalMiles === null ? null : `Every ${formatMiles(intervalMiles)} miles preferred`,
    status: selected ? 'requested-specialist-confirmation' : 'not-requested',
  };
};

const normalizeStatusBlock = (value, defaults) => {
  const source = isObject(value) ? value : {};
  return {
    status: cleanText(source.status || source.code, defaults.status),
    title: cleanText(source.title || source.label, defaults.title),
    message: cleanText(source.message || source.text, defaults.message),
    confirmed: Boolean(source.confirmed),
  };
};

/** Build the serializable source of truth used by proposal, review, and CRM. */
export function buildQuoteSnapshot({ quote = {}, plan = {}, detail = {} } = {}) {
  const program = normalizeProgram(quote, plan);
  const engineCareLevel = program === 'enginecare' ? resolveEngineCareLevel(quote, plan) : null;
  const primaryCoverageRequested = program === 'csp'
    ? Boolean(cleanText(quote.cspLevel))
    : program === 'enginecare'
      ? Boolean(engineCareLevel)
      : program === 'esp' && Boolean(cleanText(quote.planId));
  const primaryValidation = validatePrimaryPlanEligibility({ ...quote, program });
  const primaryCoverageSelected = primaryCoverageRequested && primaryValidation.validForRequest;
  const customer = isObject(quote.customer) ? quote.customer : {};
  const fullName = [customer.firstName, customer.lastName].map((value) => cleanText(value)).filter(Boolean).join(' ');
  const mileage = finiteNumber(quote.mileage || quote.currentMileage);
  const vehicleName = [quote.year, quote.make, quote.model].map((value) => cleanText(value)).filter(Boolean).join(' ') || 'Vehicle to be confirmed';
  const coverageGroups = primaryCoverageSelected
    ? asArray(detail.coverageGroups?.length ? detail.coverageGroups : plan.groups).map(normalizeCoverageGroup)
    : [];
  const selectedPlanBenefits = primaryCoverageSelected ? asArray(detail.benefits).map(normalizeBenefit) : [];
  const selectedPlanOptions = !primaryCoverageSelected || program === 'enginecare'
    ? []
    : protectionOptions
      .filter((option) => asArray(quote.addOns).includes(option.id))
      .map((option) => ({ id: option.id, name: option.title, description: option.short }));
  const store = resolveStore(quote.store);
  const term = primaryCoverageSelected ? buildTerm(quote, program) : buildTerm({}, '');
  const deductible = primaryCoverageSelected ? buildDeductible(quote, program) : buildDeductible({}, '');
  const inspectionStatus = primaryCoverageSelected
    ? getInspectionStatus({ quote, plan })
    : program === 'products-only' ? {
      code: 'product-specific-review',
      tone: 'review',
      required: null,
      inspectionRequired: null,
      inspectionRequiredForUsedEsp: null,
      likelyWithinNewVehicleLimitedWarranty: null,
      label: 'Product-specific eligibility review',
      message: 'Each product uses its own eligibility, purchase-timing, configuration, and enrollment rules. Bob Maxey will verify the VIN and the current requirement for every requested product.',
      caveat: 'The eligible transaction, returned dealer offer, and issued agreement control each product.',
      basis: 'product-specific-rules',
      limits: warrantyLimitsFor(quote.make || quote.vehicle?.make),
    } : {
      code: 'coverage-selection-needs-attention',
      tone: 'review',
      required: null,
      inspectionRequired: null,
      inspectionRequiredForUsedEsp: null,
      likelyWithinNewVehicleLimitedWarranty: null,
      label: 'Resolve the coverage selection first',
      message: 'The inspection path cannot be presented until the primary coverage request passes the known selection and eligibility checks.',
      caveat: primaryValidation.message,
      basis: 'primary-coverage-validation',
      limits: warrantyLimitsFor(quote.make || quote.vehicle?.make),
    };
  const inspection = {
    ...inspectionStatus,
    title: inspectionStatus.title || inspectionStatus.label,
  };
  const additionalProductValidation = validateQuoteProductRequests(quote);
  const outputQuote = {
    ...quote,
    requestedProductIds: additionalProductValidation.acceptedProductIds,
    maintenanceId: additionalProductValidation.acceptedProductIds.includes(cleanText(quote.maintenanceId))
      ? quote.maintenanceId
      : 'none',
  };
  const maintenance = buildMaintenance(outputQuote);
  const additionalProducts = resolveAdditionalProducts(outputQuote)
    .filter((product) => !(program === 'enginecare' && product.id === 'diesel-enginecare'));
  const now = new Date().toISOString();
  const vin = cleanText(quote.vin).toUpperCase();
  const vinValid = /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
  const receipt = isObject(quote.submissionReceipt)
    ? quote.submissionReceipt
    : isObject(quote.submission)
      ? quote.submission
      : {};
  const receiptLeadId = cleanText(receipt.leadId || receipt.id);
  const receiptReceivedAt = safeIso(receipt.receivedAt || receipt.submittedAt);
  const submittedAt = safeIso(quote.submittedAt);
  // A local timestamp or identifier alone must never turn a draft into a submitted request.
  const submissionAccepted = receipt.accepted === true
    && Boolean(receiptLeadId)
    && Boolean(receiptReceivedAt)
    && (!submittedAt || submittedAt === receiptReceivedAt);
  const confirmedSubmittedAt = submissionAccepted ? receiptReceivedAt : null;
  const finalConfirmed = submissionAccepted
    && receipt.finalConfirmed === true
    && vinValid
    && Boolean(quote.eligibility?.confirmed || quote.eligibilityStatus?.confirmed)
    && Boolean(quote.pricing?.confirmed || quote.priceStatus?.confirmed);
  const consentAcceptedAt = safeIso(quote.consentAcceptedAt || quote.consentAt);
  const consentGranted = quote.consent === true
    && quote.consentVersion === CONTACT_CONSENT_VERSION
    && quote.consentText === CONTACT_CONSENT_TEXT
    && Boolean(consentAcceptedAt);
  const lifecycle = finalConfirmed
    ? { status: 'dealer-confirmed-offer', label: 'Dealer-confirmed offer', shortLabel: 'Confirmed offer', isDraft: false, isSubmitted: true, isFinal: true }
    : submissionAccepted
      ? { status: 'submitted-request', label: 'Submitted request summary', shortLabel: 'Submitted request', isDraft: false, isSubmitted: true, isFinal: false }
      : { status: 'draft-request', label: 'Draft request - not submitted', shortLabel: 'Draft request', isDraft: true, isSubmitted: false, isFinal: false };
  const rawComponentCount = primaryCoverageSelected ? engineCareLevel?.componentCount || cleanText(plan.count || detail.stat) : '';
  const componentCountLabel = program === 'csp'
    ? 'Continued coverage'
    : rawComponentCount
      ? /\bcomponents?\b/i.test(rawComponentCount) ? rawComponentCount : `${rawComponentCount} covered components`
      : '';
  const planPath = program === 'csp'
    ? 'continued'
    : program === 'enginecare'
      ? 'diesel-specialist-review'
      : primaryCoverageSelected ? cleanText(quote.planPath) : '';
  const planPathLabel = program === 'csp'
    ? 'Continued coverage'
    : program === 'enginecare'
      ? 'Diesel specialist record review'
      : planPath === 'used' ? 'Used plan' : planPath === 'new' ? 'New plan' : 'Plan path not selected';
  const programLabel = program === 'csp'
    ? 'Continued Service Plan'
    : program === 'enginecare'
      ? 'Diesel EngineCARE'
      : program === 'products-only' ? 'Ford Protect products only'
        : program === 'esp' ? 'Extended Service Plan' : 'Primary coverage not selected';
  const planName = primaryCoverageSelected
    ? engineCareLevel?.name || cleanText(plan.name || quote.planName || quote.planId, 'Coverage selection pending review')
    : program === 'products-only' ? 'Ford Protect products only' : 'Primary coverage not selected';
  const cspPriorCoverage = cspPriorCoveragePresentation(quote.cspPriorCoverageStatus);

  return {
    schemaVersion: '1.4',
    quoteId: cleanText(quote.id, 'Pending'),
    lifecycle,
    submission: {
      accepted: submissionAccepted,
      leadId: submissionAccepted ? receiptLeadId : '',
      receivedAt: confirmedSubmittedAt,
    },
    purchaseContext: cleanText(quote.purchaseContext),
    vehicleSituation: cleanText(quote.vehicleSituation),
    vehicleSituationLabel: quote.vehicleSituation === 'new-purchase'
      ? 'Buying a new vehicle from Bob Maxey'
      : quote.vehicleSituation === 'used-purchase'
        ? 'Buying a used vehicle from Bob Maxey'
        : quote.vehicleSituation === 'owned-after-sale'
          ? 'Already owns the vehicle; adding protection after the sale'
          : 'Vehicle situation not selected',
    transactionMethod: cleanText(quote.transactionMethod),
    transactionMethodLabel: quote.transactionMethod === 'finance'
      ? 'Finance'
      : quote.transactionMethod === 'lease'
        ? 'Lease'
        : quote.transactionMethod === 'cash'
          ? 'Pay in full'
          : quote.transactionMethod === 'undecided'
            ? 'Not sure yet'
            : quote.purchaseContext === 'owner' ? 'Already owned vehicle' : 'Not selected',
    program,
    customer: {
      firstName: cleanText(customer.firstName),
      lastName: cleanText(customer.lastName),
      fullName: fullName || 'Ford owner',
      email: cleanText(customer.email),
      phone: formatPhoneNumber(customer.phone),
      city: cleanText(customer.city),
    },
    vehicle: {
      vin,
      vinStatus: vinValid ? 'provided' : vin ? 'invalid' : 'missing',
      vinComplete: vinValid,
      vinMessage: vinValid
        ? 'VIN provided for Ford record review.'
        : vin ? 'VIN is incomplete or invalid; a valid 17-character VIN is required for final Ford record review.' : 'VIN is still required for final Ford record and rating review.',
      year: cleanText(quote.year),
      make: cleanText(quote.make),
      model: cleanText(quote.model),
      displayName: vehicleName,
      currentMileage: mileage,
      currentMileageLabel: mileage === null ? 'Mileage to be confirmed' : `${formatMiles(mileage)} miles`,
      purchaseDate: safeIso(quote.purchaseDate || quote.vehiclePurchaseDate || quote.saleDate),
      purchaseDateDisplay: cleanText(quote.purchaseDate || quote.vehiclePurchaseDate || quote.saleDate, 'Unknown'),
      inServiceDate: safeIso(quote.inService || quote.inServiceDate),
      inServiceDateDisplay: cleanText(quote.inService || quote.inServiceDate, 'Unknown'),
      state: cleanText(quote.state),
      zip: cleanText(quote.zip),
      powertrain: cleanText(quote.powertrain),
      usage: cleanText(quote.usage),
      snowPlow: cleanText(quote.snowPlow, 'No'),
      image: cleanText(quote.vehicleImage || quote.vehicleImageUrl),
      imageAlt: cleanText(quote.vehicleImageAlt, vehicleName),
      decoded: isObject(quote.decodedVehicle) ? {
        source: cleanText(quote.decodedVehicle.source, 'NHTSA vPIC'),
        decodedAt: safeIso(quote.decodedVehicle.decodedAt),
        trim: cleanText(quote.decodedVehicle.trim),
        series: cleanText(quote.decodedVehicle.series),
        bodyClass: cleanText(quote.decodedVehicle.bodyClass),
        bodyCabType: cleanText(quote.decodedVehicle.bodyCabType),
        driveType: cleanText(quote.decodedVehicle.driveType),
        fuelType: cleanText(quote.decodedVehicle.fuelType),
        electrificationLevel: cleanText(quote.decodedVehicle.electrificationLevel),
        engineCylinders: cleanText(quote.decodedVehicle.engineCylinders),
        engineDisplacementL: cleanText(quote.decodedVehicle.engineDisplacementL),
        engineModel: cleanText(quote.decodedVehicle.engineModel),
        engineConfiguration: cleanText(quote.decodedVehicle.engineConfiguration),
        engineHorsepower: cleanText(quote.decodedVehicle.engineHorsepower),
        engineDescription: cleanText(quote.decodedVehicle.engineDescription),
        transmissionStyle: cleanText(quote.decodedVehicle.transmissionStyle),
        transmissionSpeeds: cleanText(quote.decodedVehicle.transmissionSpeeds),
        transmission: cleanText(quote.decodedVehicle.transmission),
        gvwr: cleanText(quote.decodedVehicle.gvwr),
        doors: cleanText(quote.decodedVehicle.doors),
        vehicleType: cleanText(quote.decodedVehicle.vehicleType),
        manufacturer: cleanText(quote.decodedVehicle.manufacturer),
        plantCity: cleanText(quote.decodedVehicle.plantCity),
        plantState: cleanText(quote.decodedVehicle.plantState),
        plantCountry: cleanText(quote.decodedVehicle.plantCountry),
        plant: cleanText(quote.decodedVehicle.plant),
        modelId: cleanText(quote.decodedVehicle.modelId),
        warrantyRecordIncluded: false,
        inServiceDateIncluded: false,
      } : null,
    },
    coverage: {
      requested: primaryCoverageRequested,
      selected: primaryCoverageSelected,
      program,
      programLabel,
      planId: primaryCoverageSelected ? engineCareLevel?.id || cleanText(quote.planId || plan.id) : null,
      planName,
      planPath: planPath || null,
      planPathLabel,
      selection: {
        programSelected: Boolean(program),
        planSelected: primaryCoverageSelected,
        pathSelected: program !== 'esp' || Boolean(planPath),
        termSelected: program === 'csp' || program === 'enginecare' || Boolean(term.months && term.mileage),
        deductibleSelected: program === 'csp' || program === 'enginecare' || Boolean(deductible.id),
      },
      description: !primaryCoverageSelected ? '' : program === 'enginecare'
        ? cleanText(plan.description || detail.tagline, 'Focused Ford-backed protection for eligible factory-installed Power Stroke diesel engine components.')
        : cleanText(plan.description || detail.tagline),
      bestFor: !primaryCoverageSelected ? '' : program === 'enginecare'
        ? cleanText(plan.bestFor || detail.bestFor, 'Eligible Power Stroke diesel owners seeking focused engine protection.')
        : cleanText(plan.bestFor || detail.bestFor),
      coverageModel: program === 'products-only' ? 'Each selected product keeps its own benefits, purchase timing, term, configuration, and eligibility rules.' : !primaryCoverageSelected ? 'Choose a primary Ford Protect coverage path before submitting the request.' : program === 'enginecare'
        ? cleanText(detail.coverageModel || plan.description, 'Listed-component diesel engine protection, subject to specialist record review and the issued agreement.')
        : cleanText(detail.coverageModel || plan.description),
      componentCount: rawComponentCount,
      componentCountLabel,
      engineCareLevel: engineCareLevel?.id || null,
      qualification: {
        cspPriorCoverageStatus: cspPriorCoverage.status,
        cspPriorCoverageLabel: cspPriorCoverage.label,
        cspPriorCoverageDetail: cspPriorCoverage.detail,
        engine: cleanText(quote.engine || quote.decodedVehicle?.engineDescription),
        currentEngineHours: finiteNumber(quote.currentEngineHours),
      },
      term,
      deductible,
      inspection,
      coverageGroups,
      selectedPlanBenefits,
      selectedPlanOptions,
      validation: primaryValidation,
    },
    maintenance,
    additionalProducts,
    counts: {
      additionalProducts: additionalProducts.length,
      planBenefits: selectedPlanOptions.length,
      maintenanceProducts: additionalProducts.some((product) => product.id === maintenance.id) ? 0 : maintenance.selected ? 1 : 0,
    },
    validation: {
      validForRequest: primaryValidation.validForRequest && additionalProductValidation.validForRequest,
      primaryCoverage: primaryValidation,
      additionalProducts: additionalProductValidation,
    },
    ownership: {
      keepYears: finiteNumber(quote.keepYears),
      annualMiles: finiteNumber(quote.annualMiles),
      summary: `${finiteNumber(quote.keepYears) ?? 'Unspecified'} years; about ${finiteNumber(quote.annualMiles) === null ? 'an unspecified number of' : formatMiles(quote.annualMiles)} miles per year`,
    },
    payment: {
      preference: getPaymentPreferenceLabel(quote.paymentPreference),
      status: cleanText(quote.paymentStatus, 'preference-only'),
    },
    eligibility: normalizeStatusBlock(quote.eligibility || quote.eligibilityStatus, {
      status: 'pending-ford-record-review',
      title: 'Ford record review required',
      message: 'Bob Maxey will confirm the VIN, current eligibility, available combinations, and state availability.',
    }),
    pricing: {
      ...normalizeStatusBlock(quote.pricing || quote.priceStatus, {
        status: 'pending-specialist-confirmation',
        title: 'Specialist-confirmed pricing',
        message: 'The current Ford-authorized options and Bob Maxey price will be prepared after eligibility review.',
      }),
      total: finiteNumber(quote.pricing?.total || quote.totalPrice),
      downPayment: finiteNumber(quote.pricing?.downPayment || quote.downPayment),
      financedBalance: finiteNumber(quote.pricing?.financedBalance || quote.financedBalance),
      paymentCount: finiteNumber(quote.pricing?.paymentCount || quote.paymentCount),
      paymentAmount: finiteNumber(quote.pricing?.paymentAmount || quote.paymentAmount),
      validThrough: safeIso(quote.pricing?.validThrough || quote.priceValidThrough),
    },
    store,
    contact: {
      preferredMethod: getPreferredContactLabel(quote.preferredContact),
      notes: cleanText(quote.notes),
      store,
    },
    consent: {
      granted: consentGranted,
      text: cleanText(quote.consentText, CONTACT_CONSENT_TEXT),
      version: cleanText(quote.consentVersion, CONTACT_CONSENT_VERSION),
      acceptedAt: consentGranted ? consentAcceptedAt : null,
      finalConfirmed,
      finalConfirmedAt: safeIso(quote.finalConfirmedAt || quote.finalConfirmationAt),
    },
    source: {
      pageUrl: cleanText(quote.source?.pageUrl || quote.pageUrl),
      referrer: cleanText(quote.source?.referrer || quote.referrer),
      campaign: cleanText(quote.source?.campaign || quote.campaign),
      medium: cleanText(quote.source?.medium || quote.medium),
      utm: isObject(quote.source?.utm) ? { ...quote.source.utm } : {},
    },
    timestamps: {
      createdAt: safeIso(quote.createdAt),
      savedAt: safeIso(quote.savedAt),
      submittedAt: confirmedSubmittedAt,
      generatedAt: safeIso(quote.generatedAt) || now,
    },
  };
}

/** Build presentation-ready content without changing the canonical snapshot. */
export function buildProposalModel(input = {}) {
  const snapshot = input.schemaVersion && input.coverage
    ? input
    : buildQuoteSnapshot(input);
  const lifecycle = snapshot.lifecycle || {
    status: 'draft-request',
    label: 'Draft request - not submitted',
    shortLabel: 'Draft request',
    isDraft: true,
    isSubmitted: false,
    isFinal: false,
  };
  const representativeImage = !snapshot.vehicle.image;
  const additionalNames = snapshot.additionalProducts.map((product) => product.name);
  const selectedProductNames = [
    snapshot.coverage.selected ? snapshot.coverage.planName : null,
    snapshot.maintenance.selected ? snapshot.maintenance.name : null,
    ...additionalNames,
  ].filter(Boolean).reduce((names, name) => {
    const normalized = cleanText(name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!normalized || names.some((entry) => entry.normalized === normalized)) return names;
    names.push({ normalized, value: name });
    return names;
  }, []).map((entry) => entry.value);

  return {
    document: {
      title: `${snapshot.quoteId} - ${lifecycle.label}`,
      subject: lifecycle.isSubmitted ? 'Submitted Bob Maxey Ford Protect request summary' : 'Draft Bob Maxey Ford Protect request',
      status: lifecycle.status,
      statusLabel: lifecycle.label,
      shortStatusLabel: lifecycle.shortLabel,
      isDraft: lifecycle.isDraft,
      isSubmitted: lifecycle.isSubmitted,
      isFinal: lifecycle.isFinal,
      pageSize: 'LETTER_PORTRAIT',
      quoteId: snapshot.quoteId,
      generatedAt: snapshot.timestamps.generatedAt,
      brand: {
        dealerLogo: '/assets/bob-maxey-logo.png',
        fordProtectLogo: '/assets/ford-official/ford-protect-logo.png',
        primaryColor: '#001F49',
        accentColor: '#0068D9',
      },
    },
    cover: {
      eyebrow: `${lifecycle.shortLabel.toUpperCase()} | ${snapshot.program === 'enginecare' ? 'DIESEL ENGINECARE SPECIALIST REQUEST' : snapshot.program === 'products-only' ? 'PERSONALIZED PRODUCT REQUEST' : 'PERSONALIZED FORD PROTECT REQUEST'}`,
      headline: snapshot.program === 'products-only' ? 'Build protection around the way you drive.' : 'Protect the Ford you chose.',
      subhead: lifecycle.isSubmitted
        ? 'Request received for Bob Maxey specialist review. This is not a contract or final offer.'
        : 'Draft selections for Ford-backed protection with support from Bob Maxey.',
      purchaseContext: snapshot.purchaseContext,
      vehicleSituation: snapshot.vehicleSituation,
      vehicleSituationLabel: snapshot.vehicleSituationLabel,
      transactionMethod: snapshot.transactionMethod,
      transactionMethodLabel: snapshot.transactionMethodLabel,
      purchaseContextLabel: snapshot.purchaseContext === 'shopping'
        ? 'Planned with your Bob Maxey vehicle purchase'
        : snapshot.purchaseContext === 'owner' ? 'After-sale protection request for a vehicle you own' : 'Purchase context not selected',
      preparedFor: snapshot.customer.fullName,
      vehicle: snapshot.vehicle.displayName,
      vehicleImage: snapshot.vehicle.image || '/assets/ford-official/ford-protect.jpg',
      vehicleImageAlt: representativeImage ? 'Ford Protect representative imagery' : snapshot.vehicle.imageAlt,
      representativeImage,
      planName: snapshot.coverage.planName,
      termLabel: snapshot.coverage.term.label,
      mileageLabel: snapshot.coverage.term.mileageLabel,
      engineHoursLabel: snapshot.coverage.term.engineHoursLabel,
      deductibleLabel: snapshot.coverage.deductible.label,
      selectedProductNames,
    },
    overview: {
      headline: `A protection path built around ${snapshot.vehicle.displayName}.`,
      bestFor: snapshot.coverage.bestFor,
      coverageModel: snapshot.coverage.coverageModel,
      componentCount: snapshot.coverage.componentCount,
      ownershipSummary: snapshot.ownership.summary,
      benefits: snapshot.coverage.selectedPlanBenefits,
      selectedOptions: snapshot.coverage.selectedPlanOptions,
      inspection: snapshot.coverage.inspection,
      pricing: snapshot.pricing,
    },
    coverage: {
      headline: snapshot.program === 'products-only'
        ? 'Your selected Ford Protect products'
        : snapshot.coverage.selected ? `What ${snapshot.coverage.planName} is designed to cover` : 'Primary coverage selection still required',
      groups: snapshot.coverage.coverageGroups,
      note: 'Coverage groups and component examples are a planning summary. The issued agreement controls the exact covered components and exclusions.',
    },
    products: {
      headline: snapshot.program === 'products-only' ? 'Your selected Ford Protect products' : 'Your additional Ford Protect requests',
      maintenance: snapshot.maintenance,
      additionalProducts: snapshot.additionalProducts,
      emptyMessage: snapshot.program === 'products-only' ? 'No Ford Protect products were selected.' : 'No additional Ford Protect products were requested.',
    },
    requestSummary: {
      lifecycle,
      submission: snapshot.submission,
      purchaseContext: snapshot.purchaseContext,
      vehicleSituation: snapshot.vehicleSituation,
      vehicleSituationLabel: snapshot.vehicleSituationLabel,
      purchaseContextLabel: snapshot.purchaseContext === 'shopping'
        ? 'Vehicle purchase + protection planning'
        : snapshot.purchaseContext === 'owner' ? 'After-sale owner protection request' : 'Purchase context not selected',
      customer: snapshot.customer,
      vehicle: snapshot.vehicle,
      coverage: snapshot.coverage,
      maintenance: snapshot.maintenance,
      additionalProducts: snapshot.additionalProducts,
      payment: snapshot.payment,
      eligibility: snapshot.eligibility,
      pricing: snapshot.pricing,
      store: snapshot.store,
      contact: snapshot.contact,
      consent: snapshot.consent,
      counts: snapshot.counts,
      validation: snapshot.validation,
    },
    nextSteps: [
      { number: 1, title: 'Verify the vehicle', text: 'Bob Maxey confirms the VIN, in-service date, current mileage, use, state, and Ford record.' },
      { number: 2, title: 'Confirm the exact offer', text: snapshot.program === 'enginecare'
        ? 'Your specialist verifies the eligible Diesel EngineCARE level, referenced time, mileage and engine-hour limits, deductible, agreement, and Bob Maxey price.'
        : snapshot.program === 'products-only'
          ? 'Your specialist verifies each requested product, available configuration, coverage limits, purchase timing, agreement, and Bob Maxey price.'
          : 'Your specialist returns the current eligible plan, term, mileage, deductible, selected products, and Bob Maxey price.' },
      { number: 3, title: 'Review before purchase', text: 'Review the agreement, payment choice, cancellation provisions, exclusions, and state-specific terms.' },
      { number: 4, title: 'Approve and enroll', text: 'Coverage is issued only after you choose the final offer and approve enrollment.' },
    ],
    confirmation: {
      headline: lifecycle.isSubmitted ? 'Your Ford Protect request was submitted.' : 'This request is still a draft.',
      message: lifecycle.isSubmitted
        ? `A Bob Maxey specialist will review the vehicle and selections and follow up using your preferred method: ${snapshot.contact.preferredMethod}.`
        : 'Submit the completed request before treating this document as delivered to Bob Maxey.',
      reference: snapshot.quoteId,
    },
    disclaimer: AGREEMENT_DISCLAIMER,
    snapshot,
  };
}
