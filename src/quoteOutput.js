import { locations } from './data';
import {
  formatMiles,
  formatTerm,
  maintenanceChoices,
  protectionOptions,
} from './quoteData';
import { quoteProducts } from './quoteProducts';

const CONSENT_TEXT = 'I agree Bob Maxey may contact me about this Ford Protect request.';
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

const resolveEngineCareLevel = (quote = {}, plan = {}) => {
  const requested = cleanText(quote.engineCareLevel || quote.planId || plan.id).toLowerCase();
  return ENGINECARE_LEVELS[requested] || ENGINECARE_LEVELS['diesel-enginecare-plus'];
};

const normalizeProgram = (quote = {}, plan = {}) => {
  const value = cleanText(quote.program || plan.program || plan.id).toLowerCase();
  if (value === 'enginecare' || value === 'diesel-enginecare' || value === 'diesel-enginecare-plus') return 'enginecare';
  return value === 'csp' || value === 'continued-service' || value === 'continued service plan' ? 'csp' : 'esp';
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
      label: 'No inspection required for the CSP request',
      message: 'Continued Service Plan requests do not use the used-vehicle inspection step in the current Ford guide.',
      caveat: 'Ford plan-record eligibility and the returned CSP agreement still require specialist confirmation.',
      basis: 'program',
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
  const withinTime = warrantyEnd ? new Date(asOf).getTime() <= warrantyEnd.getTime() : null;
  const withinMiles = mileage === null ? null : mileage <= limits.miles;
  const calculatedWithin = withinTime === null || withinMiles === null ? null : withinTime && withinMiles;
  const likelyWithin = explicitWithin ?? calculatedWithin;
  const basis = explicitWithin !== null ? 'explicit-quote-status' : calculatedWithin !== null ? 'in-service-date-and-mileage' : 'insufficient-vehicle-data';

  if (likelyWithin === true) {
    return {
      code: 'not-required-within-nvlw',
      tone: 'positive',
      required: false,
      inspectionRequired: false,
      inspectionRequiredForUsedEsp: false,
      likelyWithinNewVehicleLimitedWarranty: true,
      label: 'No used-vehicle inspection expected',
      message: `The vehicle appears to remain within the ${limits.label} New Vehicle Limited Warranty window, so the current guide does not call for the used-vehicle inspection.`,
      caveat: 'Ford warranty records, not this estimate, determine the final inspection requirement.',
      basis,
      limits,
    };
  }

  if (likelyWithin === false) {
    return {
      code: 'required-outside-nvlw',
      tone: 'review',
      required: true,
      inspectionRequired: true,
      inspectionRequiredForUsedEsp: true,
      likelyWithinNewVehicleLimitedWarranty: false,
      label: 'Inspection required before ESP enrollment',
      message: 'The vehicle appears to be outside the New Vehicle Limited Warranty window. The current guide requires the applicable used-vehicle inspection before an eligible ESP can be enrolled.',
      caveat: 'Bob Maxey must verify the Ford record, inspection form, timing, and any exceptions before enrollment.',
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
    label: 'Inspection status needs Ford record review',
    message: 'The in-service date and current mileage are not complete enough to determine whether the New Vehicle Limited Warranty inspection exception applies.',
    caveat: 'Bob Maxey will confirm the warranty record and any inspection requirement before enrollment.',
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
    items: asArray(group?.items || group?.examples).map((item) => cleanText(item)).filter(Boolean),
  };
};

const normalizeBenefit = (benefit) => {
  if (typeof benefit === 'string') return { title: benefit, text: '' };
  return {
    title: cleanText(benefit?.title || benefit?.name, 'Plan benefit'),
    text: cleanText(benefit?.text || benefit?.summary || benefit?.description),
  };
};

const resolveStore = (store) => {
  if (isObject(store)) {
    return {
      id: cleanText(store.id || store.name || store.value, 'Howell'),
      name: cleanText(store.name || store.descriptor || store.label, 'Bob Maxey Ford of Howell'),
      descriptor: cleanText(store.descriptor || store.label || store.name, 'Bob Maxey Ford of Howell'),
    };
  }
  const requested = cleanText(store, 'Howell');
  const match = locations.find((location) => location.name === requested || location.descriptor === requested);
  return {
    id: match?.name || requested,
    name: match?.descriptor || requested,
    descriptor: match?.descriptor || requested,
  };
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
    purchaseWindowLabel: cleanText(raw.purchaseWindowLabel || selectedVariant?.purchaseWindowLabel),
    purchaseTiming: cleanText(raw.purchaseTiming || selectedVariant?.purchaseTiming),
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
        name: id,
        status: 'requested-catalog-review',
        selectedOptionIds: [],
        selectedOptions: [],
      };
    }
    const selectedOptionIds = selectedOptionIdsFor(quote, id);
    const selectedOptions = [...asArray(product.planOptions), ...asArray(product.configuration?.variants)]
      .filter((option) => selectedOptionIds.includes(option.id))
      .map((option) => ({ id: option.id, name: cleanText(option.name || option.label), summary: cleanText(option.summary) }));
    const configuration = normalizeProductConfiguration(quote, product, id);
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
      purchaseContexts: asArray(product.purchaseContexts).map((item) => cleanText(item)).filter(Boolean),
      powertrains: asArray(product.powertrains).map((item) => cleanText(item)).filter(Boolean),
      warrantyApplicability: asArray(product.warrantyApplicability).map((item) => cleanText(item)).filter(Boolean),
      highlights: asArray(product.highlights).map((item) => cleanText(item)).filter(Boolean),
      detailSections: asArray(product.detailSections).map((section) => ({
        title: cleanText(section?.title),
        items: asArray(section?.items).map((item) => cleanText(item)).filter(Boolean),
      })).filter((section) => section.title || section.items.length),
      eligibility: {
        headline: cleanText(product.eligibility?.headline),
        requirements: asArray(product.eligibility?.requirements).map((item) => cleanText(item)).filter(Boolean),
        dealerConfirmation: cleanText(product.eligibility?.dealerConfirmation),
        inspectionPolicy: cleanText(product.eligibility?.inspectionPolicy),
      },
      cautions: asArray(product.cautions).map((item) => cleanText(item)).filter(Boolean),
      officialSources: asArray(product.officialSources).map((source) => isObject(source)
        ? { label: cleanText(source.label || source.title), url: cleanText(source.url) }
        : { label: cleanText(source), url: cleanText(source) }),
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
      label: 'Monthly / no annual mileage limit',
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
  const id = cleanText(quote.deductible, '100');
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
  const customer = isObject(quote.customer) ? quote.customer : {};
  const fullName = [customer.firstName, customer.lastName].map((value) => cleanText(value)).filter(Boolean).join(' ');
  const mileage = finiteNumber(quote.mileage || quote.currentMileage);
  const vehicleName = [quote.year, quote.make, quote.model].map((value) => cleanText(value)).filter(Boolean).join(' ') || 'Vehicle to be confirmed';
  const coverageGroups = asArray(detail.coverageGroups?.length ? detail.coverageGroups : plan.groups).map(normalizeCoverageGroup);
  const selectedPlanBenefits = asArray(detail.benefits).map(normalizeBenefit);
  const selectedPlanOptions = program === 'enginecare'
    ? []
    : protectionOptions
      .filter((option) => asArray(quote.addOns).includes(option.id))
      .map((option) => ({ id: option.id, name: option.title, description: option.short }));
  const store = resolveStore(quote.store);
  const term = buildTerm(quote, program);
  const deductible = buildDeductible(quote, program);
  const inspection = getInspectionStatus({ quote, plan });
  const additionalProducts = resolveAdditionalProducts(quote)
    .filter((product) => !(program === 'enginecare' && product.id === 'diesel-enginecare'));
  const now = new Date().toISOString();

  return {
    schemaVersion: '1.1',
    quoteId: cleanText(quote.id, 'Pending'),
    purchaseContext: cleanText(quote.purchaseContext, 'owner'),
    program,
    customer: {
      firstName: cleanText(customer.firstName),
      lastName: cleanText(customer.lastName),
      fullName: fullName || 'Ford owner',
      email: cleanText(customer.email),
      phone: cleanText(customer.phone),
      city: cleanText(customer.city),
    },
    vehicle: {
      vin: cleanText(quote.vin),
      year: cleanText(quote.year),
      make: cleanText(quote.make),
      model: cleanText(quote.model),
      displayName: vehicleName,
      currentMileage: mileage,
      currentMileageLabel: mileage === null ? 'Mileage to be confirmed' : `${formatMiles(mileage)} miles`,
      inServiceDate: safeIso(quote.inService || quote.inServiceDate),
      inServiceDateDisplay: cleanText(quote.inService || quote.inServiceDate, 'Unknown'),
      state: cleanText(quote.state),
      zip: cleanText(quote.zip),
      powertrain: cleanText(quote.powertrain),
      usage: cleanText(quote.usage),
      snowPlow: cleanText(quote.snowPlow, 'No'),
      image: cleanText(quote.vehicleImage || quote.vehicleImageUrl),
      imageAlt: cleanText(quote.vehicleImageAlt, vehicleName),
    },
    coverage: {
      program,
      programLabel: program === 'csp' ? 'Continued Service Plan' : program === 'enginecare' ? 'Diesel EngineCARE' : 'Extended Service Plan',
      planId: engineCareLevel?.id || cleanText(plan.id || quote.planId),
      planName: engineCareLevel?.name || cleanText(plan.name || quote.planName || quote.planId, 'Plan to be confirmed'),
      planPath: program === 'csp' ? 'continued' : program === 'enginecare' ? 'diesel-specialist-review' : cleanText(quote.planPath, 'new'),
      planPathLabel: program === 'csp' ? 'Continued coverage' : program === 'enginecare' ? 'Diesel specialist record review' : quote.planPath === 'used' ? 'Used plan' : 'New plan',
      description: program === 'enginecare'
        ? cleanText(plan.description || detail.tagline, 'Focused Ford-backed protection for eligible factory-installed Power Stroke diesel engine components.')
        : cleanText(plan.description || detail.tagline),
      bestFor: program === 'enginecare'
        ? cleanText(plan.bestFor || detail.bestFor, 'Eligible Power Stroke diesel owners seeking focused engine protection.')
        : cleanText(plan.bestFor || detail.bestFor),
      coverageModel: program === 'enginecare'
        ? cleanText(detail.coverageModel || plan.description, 'Listed-component diesel engine protection, subject to specialist record review and the issued agreement.')
        : cleanText(detail.coverageModel || plan.description),
      componentCount: engineCareLevel?.componentCount || cleanText(plan.count || detail.stat),
      engineCareLevel: engineCareLevel?.id || null,
      term,
      deductible,
      inspection,
      coverageGroups,
      selectedPlanBenefits,
      selectedPlanOptions,
    },
    maintenance: buildMaintenance(quote),
    additionalProducts,
    ownership: {
      keepYears: finiteNumber(quote.keepYears),
      annualMiles: finiteNumber(quote.annualMiles),
      summary: `${finiteNumber(quote.keepYears) ?? 'Unspecified'} years; about ${finiteNumber(quote.annualMiles) === null ? 'an unspecified number of' : formatMiles(quote.annualMiles)} miles per year`,
    },
    payment: {
      preference: cleanText(quote.paymentPreference, 'Review available payment choices with the representative'),
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
      preferredMethod: cleanText(quote.preferredContact, 'phone'),
      notes: cleanText(quote.notes),
      store,
    },
    consent: {
      granted: Boolean(quote.consent),
      text: cleanText(quote.consentText, CONSENT_TEXT),
      version: cleanText(quote.consentVersion, 'ford-protect-request-v1'),
      acceptedAt: safeIso(quote.consentAcceptedAt || quote.consentAt),
      finalConfirmed: Boolean(quote.finalConfirmed || quote.finalConfirmation),
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
      submittedAt: safeIso(quote.submittedAt),
      generatedAt: safeIso(quote.generatedAt) || now,
    },
  };
}

/** Build presentation-ready content without changing the canonical snapshot. */
export function buildProposalModel(input = {}) {
  const snapshot = input.schemaVersion && input.coverage
    ? input
    : buildQuoteSnapshot(input);
  const representativeImage = !snapshot.vehicle.image;
  const additionalNames = snapshot.additionalProducts.map((product) => product.name);
  const selectedProductNames = [
    snapshot.coverage.planName,
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
      title: `${snapshot.quoteId} - Bob Maxey Ford Protect proposal`,
      subject: 'Personalized Ford Protect coverage request',
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
      eyebrow: snapshot.program === 'enginecare' ? 'DIESEL ENGINECARE SPECIALIST REQUEST' : 'PERSONALIZED FORD PROTECT REQUEST',
      headline: 'Protect the Ford you chose.',
      subhead: 'Ford-backed protection with support from Bob Maxey.',
      purchaseContext: snapshot.purchaseContext,
      purchaseContextLabel: snapshot.purchaseContext === 'shopping'
        ? 'Planned with your Bob Maxey vehicle purchase'
        : 'After-sale protection request for a vehicle you own',
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
      headline: `What ${snapshot.coverage.planName} is designed to cover`,
      groups: snapshot.coverage.coverageGroups,
      note: 'Coverage groups and component examples are a planning summary. The issued agreement controls the exact covered components and exclusions.',
    },
    products: {
      headline: 'Your additional Ford Protect requests',
      maintenance: snapshot.maintenance,
      additionalProducts: snapshot.additionalProducts,
      emptyMessage: 'No additional Ford Protect products were requested.',
    },
    requestSummary: {
      purchaseContext: snapshot.purchaseContext,
      purchaseContextLabel: snapshot.purchaseContext === 'shopping'
        ? 'Vehicle purchase + protection planning'
        : 'After-sale owner protection request',
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
    },
    nextSteps: [
      { number: 1, title: 'Verify the vehicle', text: 'Bob Maxey confirms the VIN, in-service date, current mileage, use, state, and Ford record.' },
      { number: 2, title: 'Confirm the exact offer', text: snapshot.program === 'enginecare'
        ? 'Your specialist verifies the eligible Diesel EngineCARE level, referenced time, mileage and engine-hour limits, deductible, agreement, and Bob Maxey price.'
        : 'Your specialist returns the current eligible plan, term, mileage, deductible, selected products, and Bob Maxey price.' },
      { number: 3, title: 'Review before purchase', text: 'Review the agreement, payment choice, cancellation provisions, exclusions, and state-specific terms.' },
      { number: 4, title: 'Approve and enroll', text: 'Coverage is issued only after you choose the final offer and approve enrollment.' },
    ],
    confirmation: {
      headline: 'Your Ford Protect request is on its way.',
      message: `A Bob Maxey specialist will review the vehicle and selections and follow up by ${snapshot.contact.preferredMethod}.`,
      reference: snapshot.quoteId,
    },
    disclaimer: AGREEMENT_DISCLAIMER,
    snapshot,
  };
}
