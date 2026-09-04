import {
  deductibleOptions,
  getTermMatrix,
  isDeductibleAvailable,
  isProtectionOptionAvailable,
  protectionOptions,
} from './quoteData.js';

const FORD_NVLW = Object.freeze({ months: 36, miles: 36000 });
const LINCOLN_NVLW = Object.freeze({ months: 48, miles: 50000 });
const RENTALCARE_WINDOW = Object.freeze({ months: 36, miles: 36000 });
const OFF_ROAD_AFTER_SALE_WINDOW = Object.freeze({ months: 36, miles: 36000 });
const DIESEL_ENGINE_WINDOW = Object.freeze({ months: 60, miles: 100000 });
const DIESEL_ENGINE_HOUR_ENROLLMENT_LIMIT = 4000;
const CSP_ENROLLMENT_LIMITS = Object.freeze({ modelYears: 12, miles: 140000 });
const CSP_LEVELS = Object.freeze(['ultimate', 'standard-plus']);
const DIESEL_ENGINECARE_LEVELS = Object.freeze(['diesel-enginecare-plus', 'diesel-enginecare']);
const OFF_ROAD_PARENT_PRODUCTS = Object.freeze(['tirecare', 'tirecare-plus', 'triplecare', 'triplecare-plus']);

export const PRODUCT_PURCHASE_CONTEXTS = Object.freeze({
  shopping: Object.freeze({
    id: 'shopping',
    label: 'Planning a vehicle purchase',
    description: 'Compare products before buying or leasing a vehicle so the dealership can verify and include eligible selections in the original transaction.',
  }),
  owner: Object.freeze({
    id: 'owner',
    label: 'Already own the vehicle',
    description: 'Request products that Ford permits after the original vehicle transaction, including vehicles purchased from Bob Maxey or another dealership.',
  }),
});

export const VEHICLE_SITUATIONS = Object.freeze({
  'new-purchase': Object.freeze({
    id: 'new-purchase',
    purchaseContext: 'shopping',
    label: 'New vehicle I am buying now',
  }),
  'used-purchase': Object.freeze({
    id: 'used-purchase',
    purchaseContext: 'shopping',
    label: 'Used vehicle I am buying now',
  }),
  'owned-after-sale': Object.freeze({
    id: 'owned-after-sale',
    purchaseContext: 'owner',
    label: 'Vehicle I already own',
  }),
});

const GUIDE_SOURCE = Object.freeze({
  kind: 'historical-retail-guide',
  title: 'Ford/Lincoln Protect MI Retail Price Book',
  edition: 'September 2024',
  planningOnly: true,
  notice: 'These choices help organize a request. Bob Maxey must confirm the product, term, mileage, options, and price in the current VIN-specific Ford offer.',
});

const CURRENT_SOURCE = Object.freeze({
  kind: 'current-public-ford',
  title: 'Current Ford Protect public product information',
  planningOnly: false,
  notice: 'Ford product information helps explain this choice. The current VIN-specific Ford offer and issued agreement control eligibility and terms.',
});

const termMileageMatrix = (rows) => Object.freeze(Object.entries(rows).map(([months, miles]) => Object.freeze({
  months: Number(months),
  miles: Object.freeze([...miles]),
})));

const termOnly = (months) => Object.freeze(months.map((value) => Object.freeze({ months: value, miles: null })));

const PURCHASE_ONLY_TERM_MONTHS = Object.freeze([12, 24, 27, 36, 39, 48, 60, 72, 84, 96]);
const PREMIUM_MAINTENANCE_GAS_DIESEL_MATRIX = termMileageMatrix({
  24: [25000, 30000],
  27: [25000, 30000, 39000, 45000],
  36: [22500, 31500, 36000, 37500, 45000, 60000, 75000, 85000, 100000, 125000, 150000, 175000],
  39: [25000, 30000, 39000, 45000, 60000],
  48: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000, 175000],
  60: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000, 175000],
  72: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000, 175000],
  84: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000, 175000],
  96: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000, 175000],
  108: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000, 175000],
  120: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000, 175000],
});
const PREMIUM_MAINTENANCE_EV_MATRIX = termMileageMatrix({
  24: [25000, 30000],
  27: [25000, 30000, 39000, 45000],
  36: [22500, 31500, 36000, 37500, 45000, 60000],
  39: [25000, 30000, 39000, 45000, 60000],
  48: [36000, 48000, 60000, 75000],
  60: [36000, 48000, 60000, 75000, 85000, 100000],
  72: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
  84: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
  96: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
  108: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
  120: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
});
const EXTRA_MAINTENANCE_MATRIX = termMileageMatrix({
  24: [25000, 30000],
  36: [22500, 31500, 36000, 37500, 45000, 60000, 75000, 85000, 100000, 125000, 150000],
  48: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
  60: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
  72: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
  84: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
  96: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
});
const LIMITED_MAINTENANCE_MATRIX = termMileageMatrix({
  12: [15000],
  24: [24000, 30000],
  27: [30000, 36000],
  36: [22500, 31500, 36000, 37500, 45000],
  39: [39000, 45000],
  48: [60000],
  60: [75000],
  72: [100000],
});
const BASIC_MAINTENANCE_MATRIX = termMileageMatrix({
  12: [15000],
  24: [24000, 30000],
  27: [30000, 36000],
  36: [36000, 45000],
  39: [39000, 45000],
  48: [60000],
  60: [75000],
  72: [100000],
});
const LIMITED_MAINTENANCE_INTERVAL_RULES = Object.freeze([
  Object.freeze({
    termMonths: 12,
    termMiles: 15000,
    byPowertrain: Object.freeze({ gas: Object.freeze([3000, 5000]), hybrid: Object.freeze([3000, 5000]), 'plug-in-hybrid': Object.freeze([3000, 5000]), diesel: Object.freeze([5000]) }),
  }),
  Object.freeze({
    default: true,
    byPowertrain: Object.freeze({ gas: Object.freeze([3000, 5000, 7500, 10000]), hybrid: Object.freeze([3000, 5000, 7500, 10000]), 'plug-in-hybrid': Object.freeze([3000, 5000, 7500, 10000]), diesel: Object.freeze([5000, 7500, 10000]) }),
  }),
]);
const BASIC_MAINTENANCE_INTERVAL_RULES = Object.freeze([
  Object.freeze({
    termMonths: 12,
    termMiles: 15000,
    byPowertrain: Object.freeze({ gas: Object.freeze([3000, 5000, 7500]), hybrid: Object.freeze([3000, 5000, 7500]), 'plug-in-hybrid': Object.freeze([3000, 5000, 7500]), diesel: Object.freeze([5000]) }),
  }),
  Object.freeze({
    default: true,
    byPowertrain: Object.freeze({ gas: Object.freeze([3000, 5000, 7500, 10000]), hybrid: Object.freeze([3000, 5000, 7500, 10000]), 'plug-in-hybrid': Object.freeze([3000, 5000, 7500, 10000]), diesel: Object.freeze([5000, 7500, 10000]) }),
  }),
]);
const configurationRule = ({
  id,
  label,
  purchaseContexts,
  purchaseTiming,
  currentPublicStatus = 'verified',
  selectionModel,
  termMileage = [],
  serviceIntervals = [],
  serviceIntervalRules = [],
  engineHourLimits = [],
  benefitAmounts = [],
  coverageStart,
  purchaseWindow,
  inspection,
  compatibility = [],
  source = GUIDE_SOURCE,
  configurationSource = source,
  customerSelectable = true,
  customerNote,
}) => Object.freeze({
  id,
  label,
  purchaseContexts: Object.freeze([...purchaseContexts]),
  purchaseTiming,
  currentPublicStatus,
  customerSelectable,
  selectionModel,
  termMileage: Object.freeze([...termMileage]),
  serviceIntervals: Object.freeze([...serviceIntervals]),
  serviceIntervalRules: Object.freeze([...serviceIntervalRules]),
  engineHourLimits: Object.freeze([...engineHourLimits]),
  benefitAmounts: Object.freeze([...benefitAmounts]),
  coverageStart,
  purchaseWindow,
  inspection,
  compatibility: Object.freeze([...compatibility]),
  source,
  configurationSource,
  customerNote: customerNote || 'Bob Maxey must verify the current VIN-specific Ford offer before any selection is presented as available.',
});

/**
 * Product-level rules used by the quote builder. Current public Ford purchase
 * timing outranks the older retail guide. Historical matrices are retained only
 * as planning/rating-system references and always require a current VIN review.
 */
export const FORD_PROTECT_PRODUCT_RULES = Object.freeze({
  'extended-service-plan': configurationRule({
    id: 'extended-service-plan', label: 'Extended Service Plan', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale',
    currentPublicStatus: 'vin-rated', selectionModel: 'plan-term-mileage-deductible', coverageStart: 'New-plan coverage is measured from original in-service date and zero miles; used-plan coverage follows the issued contract date/current-odometer rules.',
    purchaseWindow: 'New- and used-plan paths depend on Ford records, current mileage, state, use, inspection status, and program rules.',
    inspection: 'For an ESP used-plan enrollment: no used-vehicle inspection while within the New Vehicle Limited Warranty; outside it, a completed Used Vehicle Inspection Checklist from a participating dealership, such as Bob Maxey, is required before finalization.',
    compatibility: ['Plan level, term, mileage, deductible, optional benefits, powertrain, and usage must match the Ford rating result.'], source: CURRENT_SOURCE,
  }),
  'continued-service-plan': configurationRule({
    id: 'continued-service-plan', label: 'Continued Service Plan', purchaseContexts: ['owner'], purchaseTiming: 'after-sale-when-prior-coverage-is-ending',
    currentPublicStatus: 'vin-rated', selectionModel: 'monthly-returned-offer', coverageStart: 'The returned CSP agreement establishes the effective date after qualifying prior coverage.',
    purchaseWindow: 'For eligible vehicles whose OEM warranty or Ford Protect coverage is ending, subject to published age, mileage, state, and prior-coverage rules.',
    inspection: 'Ford’s current CSP buyer guide states that no enrollment inspection is required.',
    compatibility: ['Not a duplicate of active coverage.', 'Monthly amount, level, deductible, and effective date come from the returned offer.'], source: CURRENT_SOURCE,
  }),
  'premium-maintenance': configurationRule({
    id: 'premium-maintenance', label: 'Premium Maintenance Plan', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale-within-nvlw',
    selectionModel: 'powertrain-term-mileage-service-interval', termMileage: PREMIUM_MAINTENANCE_GAS_DIESEL_MATRIX, serviceIntervals: [5000, 7500, 10000],
    coverageStart: 'Coverage is measured from the original warranty start date and zero miles and ends at the earlier selected time or mileage limit.',
    purchaseWindow: 'Available during the applicable New Vehicle Limited Warranty; Bob Maxey confirms eligibility and available choices for the VIN.',
    inspection: 'No separate maintenance-plan enrollment inspection is represented; vehicle and program eligibility still require Ford review.',
    compatibility: ['Gas, hybrid, plug-in hybrid, and eligible diesel.', 'Full-synthetic oil option is required when the vehicle specifies full synthetic oil.', 'Available term, mileage, and service-interval combinations are confirmed for the VIN.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  'premium-maintenance-ev': configurationRule({
    id: 'premium-maintenance-ev', label: 'Premium Maintenance EV', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale-within-nvlw',
    selectionModel: 'term-mileage-service-interval', termMileage: PREMIUM_MAINTENANCE_EV_MATRIX, serviceIntervals: [10000],
    coverageStart: 'Coverage is measured from the original warranty start date and zero miles and ends at the earlier selected time or mileage limit.',
    purchaseWindow: 'Available during the applicable New Vehicle Limited Warranty; Bob Maxey confirms eligibility and available choices for the VIN.',
    inspection: 'No separate maintenance-plan enrollment inspection is represented.',
    compatibility: ['Electric vehicles only.', 'Do not duplicate maintenance already bundled with an eligible PremiumCARE Plus EV plan.', 'Available term, mileage, and service-interval combinations are confirmed for the VIN.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  'extra-maintenance': configurationRule({
    id: 'extra-maintenance', label: 'Extra Maintenance Plan', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'dealer-confirmed-after-sale-window',
    currentPublicStatus: 'historical-rating-system-only', selectionModel: 'powertrain-term-mileage-service-interval', termMileage: EXTRA_MAINTENANCE_MATRIX, serviceIntervals: [5000, 7500, 10000],
    coverageStart: 'The current offer confirms whether coverage is measured from the original warranty start date and zero miles.',
    purchaseWindow: 'Ask Bob Maxey to verify whether this plan is currently available near the end of the New Vehicle Limited Warranty.',
    inspection: 'No separate vehicle inspection is expected for this maintenance request; Bob Maxey confirms current requirements.',
    compatibility: ['Non-EV only.', 'Vehicles requiring full-synthetic oil may be excluded.', 'This option is shown for specialist review and cannot be promised until the current Ford offer returns it.'], customerSelectable: false,
  }),
  'limited-maintenance': configurationRule({
    id: 'limited-maintenance', label: 'Limited Maintenance Plan', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'historically-any-time-during-ownership',
    currentPublicStatus: 'historical-rating-system-only', selectionModel: 'powertrain-term-mileage-service-interval', termMileage: LIMITED_MAINTENANCE_MATRIX, serviceIntervals: [3000, 5000, 7500, 10000], serviceIntervalRules: LIMITED_MAINTENANCE_INTERVAL_RULES,
    coverageStart: 'The current offer confirms whether coverage begins on the signature date and current odometer.', purchaseWindow: 'May be requested during vehicle ownership; Bob Maxey must confirm current program availability.',
    inspection: 'No separate vehicle inspection is expected for this maintenance request; Bob Maxey confirms current requirements.',
    compatibility: ['Gas/hybrid intervals can vary by selected combination.', 'Diesel intervals can vary by selected combination.', 'EV and fuel-cell vehicles are not presented for this plan.', 'This option is shown for specialist review and cannot be promised until the current Ford offer returns it.'], customerSelectable: false,
  }),
  'basic-maintenance': configurationRule({
    id: 'basic-maintenance', label: 'Basic Maintenance Plan', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'historically-any-time-during-ownership',
    currentPublicStatus: 'historical-rating-system-only', selectionModel: 'powertrain-term-mileage-service-interval', termMileage: BASIC_MAINTENANCE_MATRIX, serviceIntervals: [3000, 5000, 7500, 10000], serviceIntervalRules: BASIC_MAINTENANCE_INTERVAL_RULES,
    coverageStart: 'The current offer confirms whether coverage begins on the signature date and current odometer.', purchaseWindow: 'May be requested during vehicle ownership; Bob Maxey must confirm current program availability.',
    inspection: 'No separate vehicle inspection is expected for this maintenance request; Bob Maxey confirms current requirements.',
    compatibility: ['Gas/hybrid intervals can vary by selected combination.', 'Diesel intervals can vary by selected combination.', 'Vehicles requiring full-synthetic oil, EVs, and fuel-cell vehicles are not presented for this plan.', 'This option is shown for specialist review and cannot be promised until the current Ford offer returns it.'], customerSelectable: false,
  }),
  'diesel-enginecare-plus': configurationRule({
    id: 'diesel-enginecare-plus', label: 'Diesel EngineCARE Plus', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale-within-diesel-warranty',
    selectionModel: 'fixed-time-mileage-hours', termMileage: termMileageMatrix({ 84: [200000] }), serviceIntervals: [], engineHourLimits: [8000],
    coverageStart: 'The current offer confirms whether coverage is measured from the original warranty start date and zero miles or engine hours.',
    purchaseWindow: 'Request while the applicable 5-year/100,000-mile/4,000-hour diesel engine warranty is active; Bob Maxey confirms current eligibility.',
    inspection: 'Any record or inspection requirement is established by the current Ford program.',
    compatibility: ['Eligible factory-installed 3.0L, 3.2L, or 6.7L Power Stroke diesel.', 'Planning maximum: 7 years/200,000 miles/8,000 hours.', 'Current availability requires specialist review.'],
  }),
  'diesel-enginecare': configurationRule({
    id: 'diesel-enginecare', label: 'Diesel EngineCARE', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale-within-diesel-warranty',
    selectionModel: 'fixed-time-mileage-hours', termMileage: termMileageMatrix({ 84: [200000] }), serviceIntervals: [], engineHourLimits: [8000],
    coverageStart: 'The current offer confirms whether coverage is measured from the original warranty start date and zero miles or engine hours.',
    purchaseWindow: 'Request while the applicable 5-year/100,000-mile/4,000-hour diesel engine warranty is active; Bob Maxey confirms current eligibility.',
    inspection: 'Any record or inspection requirement is established by the current Ford program.',
    compatibility: ['Eligible factory-installed 3.0L, 3.2L, or 6.7L Power Stroke diesel.', 'Planning maximum: 7 years/200,000 miles/8,000 hours.', 'Current availability requires specialist review.'],
  }),
  'tirecare-plus': configurationRule({
    id: 'tirecare-plus', label: 'TireCARE Plus', purchaseContexts: ['shopping'], purchaseTiming: 'original-vehicle-transaction-only',
    selectionModel: 'term-only', termMileage: termOnly([12, 24, 27, 36, 39, 48, 60, 72, 84]), coverageStart: 'Signature date; expires at the selected time term.',
    purchaseWindow: 'Current Ford public rule: available only at the time an eligible new or used vehicle is purchased.', inspection: 'Not applicable as an after-sale enrollment path.',
    compatibility: ['No mileage limit in current public material.', 'Wheel material/finish, wheel diameter, vehicle use, vehicle model, and road-hazard rules apply.', 'The September 2024 guide lists 1 year through 8 years, including 27- and 39-month choices; current dealer offering controls.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  tirecare: configurationRule({
    id: 'tirecare', label: 'TireCARE', purchaseContexts: ['shopping'], purchaseTiming: 'original-vehicle-transaction-only', currentPublicStatus: 'historical-rating-system-only',
    selectionModel: 'term-only', termMileage: termOnly(PURCHASE_ONLY_TERM_MONTHS), coverageStart: 'Historical guide basis: signature date; expires at selected time term.',
    purchaseWindow: 'Treat as original-vehicle-transaction-only unless the current dealer rating result expressly returns it.', inspection: 'Not an after-sale enrollment path.',
    compatibility: ['Cosmetic wheel coverage excluded.', 'Wheel diameter, vehicle use, model, and road-hazard restrictions apply.', 'Do not customer-guarantee the non-Plus version from the historical guide.'], customerSelectable: false,
  }),
  dentcare: configurationRule({
    id: 'dentcare', label: 'DentCARE', purchaseContexts: ['shopping'], purchaseTiming: 'original-vehicle-transaction-only', selectionModel: 'term-only', termMileage: termOnly(PURCHASE_ONLY_TERM_MONTHS),
    coverageStart: 'Signature date; expires at selected time term.', purchaseWindow: 'Current Ford public rule: only at the time an eligible new or used vehicle is purchased.', inspection: 'Not an after-sale enrollment path.',
    compatibility: ['Eligible metal body panels and agreement-defined dent size/location rules apply.', 'Composite/plastic body panels and specified uses/models can be excluded.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  'doublecare-plus': configurationRule({
    id: 'doublecare-plus', label: 'DoubleCARE Plus', purchaseContexts: ['shopping'], purchaseTiming: 'original-vehicle-transaction-only', currentPublicStatus: 'historical-rating-system-only',
    selectionModel: 'term-only', termMileage: termOnly(PURCHASE_ONLY_TERM_MONTHS), coverageStart: 'Historical guide basis: signature date; expires at selected time term.',
    purchaseWindow: 'September 2024 guide: only at the time an eligible new or used vehicle is purchased. Current public sources do not independently verify availability.', inspection: 'Not an after-sale enrollment path.',
    compatibility: ['Combines TireCARE Plus and DentCARE under historical guide rules.', 'Wheel, body-panel, use, and vehicle restrictions all apply.'], customerSelectable: false,
  }),
  doublecare: configurationRule({
    id: 'doublecare', label: 'DoubleCARE', purchaseContexts: ['shopping'], purchaseTiming: 'original-vehicle-transaction-only', currentPublicStatus: 'historical-rating-system-only',
    selectionModel: 'term-only', termMileage: termOnly(PURCHASE_ONLY_TERM_MONTHS), coverageStart: 'Historical guide basis: signature date; expires at selected time term.',
    purchaseWindow: 'September 2024 guide: only at the time an eligible new or used vehicle is purchased. Current public sources do not independently verify availability.', inspection: 'Not an after-sale enrollment path.',
    compatibility: ['Combines TireCARE and DentCARE without cosmetic wheel coverage under historical guide rules.'], customerSelectable: false,
  }),
  windshieldcare: configurationRule({
    id: 'windshieldcare', label: 'WindshieldCARE', purchaseContexts: ['shopping'], purchaseTiming: 'original-vehicle-transaction-only', selectionModel: 'term-only', termMileage: termOnly(PURCHASE_ONLY_TERM_MONTHS),
    coverageStart: 'Signature date; expires at selected time term.', purchaseWindow: 'Current Ford public rule: only at the time an eligible new or used vehicle is purchased.', inspection: 'Not an after-sale enrollment path.',
    compatibility: ['Unlimited mileage in current public material.', 'State, vehicle, glass-damage, calibration, and service rules apply.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  'windshieldcare-plus-ev': configurationRule({
    id: 'windshieldcare-plus-ev', label: 'WindshieldCARE Plus EV', purchaseContexts: ['shopping'], purchaseTiming: 'original-vehicle-transaction-only', selectionModel: 'term-only', termMileage: termOnly(PURCHASE_ONLY_TERM_MONTHS),
    coverageStart: 'Signature date; expires at selected time term.', purchaseWindow: 'Current Ford public rule: only at the time an eligible new or used EV is purchased.', inspection: 'Not an after-sale enrollment path.',
    compatibility: ['All-electric vehicles only.', 'Includes agreement-defined OEM-glass replacement/calibration benefit.', 'State availability restrictions apply.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  'triplecare-plus': configurationRule({
    id: 'triplecare-plus', label: 'TripleCARE Plus', purchaseContexts: ['shopping'], purchaseTiming: 'original-vehicle-transaction-only', selectionModel: 'term-only', termMileage: termOnly(PURCHASE_ONLY_TERM_MONTHS),
    coverageStart: 'Signature date; expires at selected time term.', purchaseWindow: 'Current Ford public rule: only at the time an eligible new or used vehicle is purchased.', inspection: 'Not an after-sale enrollment path.',
    compatibility: ['Combines eligible tire-and-wheel, dent, and windshield benefits.', 'Wheel, tread, dent-size, glass-damage, state, use, and vehicle restrictions all apply.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  triplecare: configurationRule({
    id: 'triplecare', label: 'TripleCARE', purchaseContexts: ['shopping'], purchaseTiming: 'original-vehicle-transaction-only', currentPublicStatus: 'historical-rating-system-only', selectionModel: 'term-only', termMileage: termOnly(PURCHASE_ONLY_TERM_MONTHS),
    coverageStart: 'Historical guide basis: signature date; expires at selected time term.', purchaseWindow: 'September 2024 guide: only at the time an eligible new or used vehicle is purchased. Current public sources emphasize TripleCARE Plus.', inspection: 'Not an after-sale enrollment path.',
    compatibility: ['Historical non-cosmetic tire-and-wheel bundle with dent and windshield benefits.', 'Do not customer-guarantee unless returned by the dealer rating system.'], customerSelectable: false,
  }),
  surfacecare: configurationRule({
    id: 'surfacecare', label: 'SurfaceCARE', purchaseContexts: ['shopping'], purchaseTiming: 'original-vehicle-transaction-only', selectionModel: 'term-only', termMileage: termOnly([24, 36, 48, 60, 72, 84]),
    coverageStart: 'Signature date; expires at selected time term.', purchaseWindow: 'Current Ford public rule: only at the time an eligible new or used vehicle is purchased.', inspection: 'Not an after-sale enrollment path.',
    compatibility: ['Published term choices are 2–7 years with unlimited mileage.', 'Application, maintenance, surface, vehicle-use, and state/provider rules apply.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  theftcare: configurationRule({
    id: 'theftcare', label: 'TheftCARE', purchaseContexts: ['shopping'], purchaseTiming: 'original-vehicle-transaction-only', selectionModel: 'term-and-benefit', termMileage: termOnly([24, 36, 48, 60]), benefitAmounts: [2500, 5000],
    coverageStart: 'Signature date; expires at selected time term.', purchaseWindow: 'Current Ford public rule: only at the time an eligible new or used vehicle is purchased.', inspection: 'Not an after-sale enrollment path.',
    compatibility: ['Historical guide terms: 2–5 years with $2,500 or $5,000 benefit selections.', 'Current benefit, vehicle, state, use, and provider rules must be verified.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  'ford-credit-gap': configurationRule({
    id: 'ford-credit-gap', label: 'Ford Credit GAP', purchaseContexts: ['shopping'], purchaseTiming: 'original-finance-transaction-only', currentPublicStatus: 'finance-contract-only', selectionModel: 'finance-contract-option',
    coverageStart: 'Established by the financing contract.', purchaseWindow: 'Only in connection with an eligible original vehicle financing transaction.', inspection: 'Not applicable.',
    compatibility: ['Financing source, state, amount financed, vehicle, and contract terms control.', 'Not an after-sale Ford Protect ancillary card.'], source: CURRENT_SOURCE,
  }),
  wearcare: configurationRule({
    id: 'wearcare', label: 'WearCare', purchaseContexts: ['shopping'], purchaseTiming: 'original-lease-signing-only', currentPublicStatus: 'lease-contract-only', selectionModel: 'lease-contract-option',
    coverageStart: 'Established by the lease agreement.', purchaseWindow: 'Only when signing an eligible original lease.', inspection: 'Not applicable.',
    compatibility: ['Lease program, vehicle, state, mileage allowance, and return standards control.', 'Not an after-sale Ford Protect ancillary card.'], source: CURRENT_SOURCE,
  }),
  rentalcare: configurationRule({
    id: 'rentalcare', label: 'RentalCARE', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale-before-3yr-36k', currentPublicStatus: 'dealer-verification-only', selectionModel: 'dealer-rating-only',
    coverageStart: 'Bob Maxey must verify whether RentalCARE is currently offered and confirm its coverage start in the returned offer.',
    purchaseWindow: 'Request dealer verification before the earlier of 3 years or 36,000 miles from the warranty start date. This is not an online eligibility decision.',
    inspection: 'Do not apply the ESP used-plan inspection rule to RentalCARE. Bob Maxey must verify any current product-specific enrollment requirement.',
    compatibility: ['RentalCARE may conflict with another plan that already provides rental benefits.', 'Vehicle, state, benefits, term, mileage, price, current product status, and compatibility require a dealer result.'], source: GUIDE_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  leasecare: configurationRule({
    id: 'leasecare', label: 'LeaseCARE', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale-before-3yr-36k', currentPublicStatus: 'dealer-verification-only', selectionModel: 'dealer-rating-only',
    coverageStart: 'Bob Maxey must verify whether LeaseCARE is currently offered and confirm its coverage start in the returned offer.',
    purchaseWindow: 'Request dealer verification before the earlier of 3 years or 36,000 miles from the warranty start date. This is not an online eligibility decision.',
    inspection: 'Do not apply the ESP used-plan inspection rule to LeaseCARE. Bob Maxey must verify any current product-specific enrollment requirement.',
    compatibility: ['LeaseCARE may conflict with Core/Mechanical, Premium Maintenance, and RentalCARE products.', 'Vehicle, state, benefits, term, mileage, price, current product status, and compatibility require a dealer result.'], source: GUIDE_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  'off-road-coverage': configurationRule({
    id: 'off-road-coverage', label: 'Off-Road Coverage Request', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'off-road-limited-post-sale', currentPublicStatus: 'dealer-verification-required', selectionModel: 'dealer-rating-only',
    coverageStart: 'The current dealer offer and issued agreement establish the underlying TireCARE, TireCARE Plus, TripleCARE, or TripleCARE Plus term and the Off-Road option start date.',
    purchaseWindow: 'Ford currently describes a limited request window: the vehicle must have been purchased within 3 years and have fewer than 36,000 miles. Existing eligible plan owners may ask to add Off-Road coverage. Bob Maxey must confirm the underlying product and current rules.',
    inspection: 'This limited Off-Road request is not an ESP used-plan enrollment. Do not apply the ESP used-plan inspection rule; the current product rules control.',
    compatibility: ['Requires an eligible TireCARE, TireCARE Plus, TripleCARE, or TripleCARE Plus product returned by the dealer system.', 'Off-road use, vehicle, tire/wheel specification, purchase date, mileage, state, term, and product availability all require dealer confirmation.'], source: CURRENT_SOURCE,
  }),
  'key-services': configurationRule({
    id: 'key-services', label: 'Key Services', purchaseContexts: [], purchaseTiming: 'agreement-option-not-standalone', currentPublicStatus: 'plan-option-only', selectionModel: 'parent-plan-option',
    coverageStart: 'Follows the parent plan agreement.', purchaseWindow: 'Selected only as an eligible option within a parent Ford Protect plan.', inspection: 'Follows the parent product.',
    compatibility: ['Do not present as an independent product.', 'Availability and limits follow the parent agreement.'], source: CURRENT_SOURCE, customerSelectable: false,
  }),
});

const PRODUCT_TIMING_PRESENTATIONS = Object.freeze({
  'vehicle-purchase-or-after-sale': Object.freeze({
    shortLabel: 'At purchase or eligible after-sale',
    label: 'May be available with the vehicle purchase or after the sale',
    detail: 'Ford records and the current dealer rating result determine the available enrollment path and timing.',
  }),
  'after-sale-when-prior-coverage-is-ending': Object.freeze({
    shortLabel: 'As prior coverage is ending',
    label: 'After-sale continuation when eligible prior coverage is ending',
    detail: 'Continued Service Plan availability depends on the prior Ford Protect record and the current vehicle-specific offer.',
  }),
  'vehicle-purchase-or-after-sale-within-nvlw': Object.freeze({
    shortLabel: 'At purchase or while in factory warranty',
    label: 'May be available at purchase or after the sale during the New Vehicle Limited Warranty window',
    detail: 'The original in-service date, mileage, warranty record, vehicle, state, and current program rules determine the remaining purchase window.',
  }),
  'dealer-confirmed-after-sale-window': Object.freeze({
    shortLabel: 'Dealer-confirmed purchase window',
    label: 'May be available after the sale within a dealer-confirmed enrollment window',
    detail: 'Bob Maxey must confirm the current product, vehicle, mileage, state, and purchase window before enrollment.',
  }),
  'historically-any-time-during-ownership': Object.freeze({
    shortLabel: 'Current availability must be verified',
    label: 'Historical materials allowed purchase during ownership; current availability requires confirmation',
    detail: 'Historical guide timing is not a current offer. Bob Maxey must verify that the product remains available for the VIN.',
  }),
  'vehicle-purchase-or-after-sale-within-diesel-warranty': Object.freeze({
    shortLabel: 'Within the eligible diesel warranty window',
    label: 'May be available at purchase or after the sale within the eligible diesel engine warranty window',
    detail: 'Power Stroke engine, time, mileage, engine hours, use, state, and current Diesel EngineCARE rules require specialist review.',
  }),
  'original-vehicle-transaction-only': Object.freeze({
    shortLabel: 'Original vehicle transaction only',
    label: 'Must be selected with the eligible original vehicle transaction',
    detail: 'This product is not presented as a separate after-sale purchase. The current transaction and issued agreement control eligibility.',
  }),
  'original-finance-transaction-only': Object.freeze({
    shortLabel: 'Original finance contract only',
    label: 'Must be selected with an eligible original finance contract',
    detail: 'Lender, state, vehicle, and transaction rules determine whether the product can be included in the original finance contract.',
  }),
  'original-lease-signing-only': Object.freeze({
    shortLabel: 'Original lease signing only',
    label: 'Must be selected when the eligible original lease is signed',
    detail: 'This lease product is not a separate post-sale enrollment. The original lease and issued agreement control.',
  }),
  'vehicle-purchase-or-after-sale-before-3yr-36k': Object.freeze({
    shortLabel: 'Historical limited window · verify with dealer',
    label: 'Historical materials describe a limited purchase window; current availability is not established online',
    detail: 'Bob Maxey must verify that the product remains offered and return the VIN-specific benefits, term, mileage, price, and enrollment rules.',
  }),
  'off-road-limited-post-sale': Object.freeze({
    shortLabel: 'Limited after-sale Off-Road request',
    label: 'May be requested with the vehicle transaction or during Ford’s limited Off-Road after-sale window',
    detail: 'Ford currently describes a request for vehicles purchased within 3 years and with fewer than 36,000 miles. An eligible underlying product and the current dealer result are required.',
  }),
  'agreement-option-not-standalone': Object.freeze({
    shortLabel: 'Parent-plan option only',
    label: 'Available only as an eligible option within a parent agreement',
    detail: 'This is not a standalone Ford Protect product. Availability and limits follow the parent plan and issued agreement.',
  }),
  'after-sale': Object.freeze({
    shortLabel: 'Eligible after-sale request',
    label: 'May be requested after the vehicle sale',
    detail: 'VIN-specific eligibility, purchase timing, available terms, and price require Bob Maxey confirmation.',
  }),
});

/**
 * One source for purchase-timing copy across cards, proposals, PDFs, and CRM
 * output. The rule code remains canonical; labels never widen its eligibility.
 */
export const getProductTimingPresentation = (source, overrides = {}) => {
  const selectedVariantId = overrides.variantId || overrides.selectedVariantId;
  const variants = source && typeof source === 'object' && Array.isArray(source.configuration?.variants)
    ? source.configuration.variants
    : [];
  const variant = variants.find((item) => item.id === selectedVariantId)
    || variants.find((item) => item.customerSelectable !== false)
    || variants[0];
  const code = typeof source === 'string'
    ? source
    : source?.purchaseTiming || variant?.purchaseTiming || overrides.purchaseTiming || '';
  const presentation = PRODUCT_TIMING_PRESENTATIONS[code] || Object.freeze({
    shortLabel: 'Dealer confirmation required',
    label: 'Purchase timing requires current dealer confirmation',
    detail: 'Bob Maxey must verify the current VIN-specific product availability and enrollment timing.',
  });
  const purchaseWindow = overrides.purchaseWindow || source?.purchaseWindow || variant?.purchaseWindowLabel || '';
  const coverageStart = overrides.coverageStart || source?.coverageStart || variant?.startBasisLabel || '';
  return Object.freeze({
    code,
    shortLabel: presentation.shortLabel,
    label: presentation.label,
    detail: [presentation.detail, purchaseWindow].filter(Boolean).join(' '),
    purchaseWindow,
    coverageStart,
  });
};

export const getFordProtectProductRule = (id) => FORD_PROTECT_PRODUCT_RULES[id] || null;

export const getProductConfigurationOptions = (id) => {
  const rule = getFordProtectProductRule(id);
  if (!rule) return null;
  return {
    selectionModel: rule.selectionModel,
    termMileage: rule.termMileage,
    serviceIntervals: rule.serviceIntervals,
    serviceIntervalRules: rule.serviceIntervalRules,
    engineHourLimits: rule.engineHourLimits,
    benefitAmounts: rule.benefitAmounts,
    source: rule.configurationSource,
    policySource: rule.source,
    currentPublicStatus: rule.currentPublicStatus,
    customerSelectable: rule.customerSelectable,
  };
};

export const getProductsForPurchaseContext = (context = 'owner', { includeDealerOnly = false } = {}) => Object.values(FORD_PROTECT_PRODUCT_RULES)
  .filter((rule) => rule.purchaseContexts.includes(context))
  .filter((rule) => includeDealerOnly || rule.customerSelectable);

const CONFIGURATION_DEFAULTS = Object.freeze({
  'premium-maintenance': { variantId: 'premium-maintenance', termMonths: 60, termMiles: 75000, serviceInterval: 7500 },
  'premium-maintenance-ev': { variantId: 'premium-maintenance-ev', termMonths: 60, termMiles: 75000, serviceInterval: 10000 },
  'extra-maintenance': { variantId: 'extra-maintenance', termMonths: 60, termMiles: 75000, serviceInterval: 7500 },
  'limited-maintenance': { variantId: 'limited-maintenance', termMonths: 36, termMiles: 36000, serviceInterval: 7500 },
  'basic-maintenance': { variantId: 'basic-maintenance', termMonths: 36, termMiles: 36000, serviceInterval: 7500 },
  'diesel-enginecare-plus': { variantId: 'diesel-enginecare-plus', termMonths: 84, termMiles: 200000, engineHours: 8000 },
  'diesel-enginecare': { variantId: 'diesel-enginecare', termMonths: 84, termMiles: 200000, engineHours: 8000 },
  'tirecare-plus': { variantId: 'tirecare-plus', termMonths: 60, termMiles: null },
  tirecare: { variantId: 'tirecare', termMonths: 60, termMiles: null },
  dentcare: { variantId: 'dentcare', termMonths: 60, termMiles: null },
  'doublecare-plus': { variantId: 'doublecare-plus', termMonths: 60, termMiles: null },
  doublecare: { variantId: 'doublecare', termMonths: 60, termMiles: null },
  windshieldcare: { variantId: 'windshieldcare', termMonths: 60, termMiles: null },
  'windshieldcare-plus-ev': { variantId: 'windshieldcare-plus-ev', termMonths: 60, termMiles: null },
  'triplecare-plus': { variantId: 'triplecare-plus', termMonths: 60, termMiles: null },
  triplecare: { variantId: 'triplecare', termMonths: 60, termMiles: null },
  surfacecare: { variantId: 'surfacecare', termMonths: 60, termMiles: null },
  theftcare: { variantId: 'theftcare', termMonths: 60, termMiles: null, benefitAmount: 2500 },
  rentalcare: { variantId: 'rentalcare' },
  leasecare: { variantId: 'leasecare' },
  'off-road-coverage': { variantId: 'off-road-coverage' },
});

const genericConfigurationMode = (selectionModel) => {
  if (selectionModel === 'term-only' || selectionModel === 'term-and-benefit') return 'term-only';
  if (selectionModel === 'monthly-returned-offer') return 'monthly';
  if (selectionModel === 'fixed-time-mileage-hours') return 'fixed';
  if (selectionModel === 'dealer-rating-only' || selectionModel === 'parent-plan-option' || selectionModel === 'finance-contract-option' || selectionModel === 'lease-contract-option') return 'dealer-returned';
  if (selectionModel.includes('term-mileage')) return 'term-mileage';
  return 'dealer-returned';
};

const uniqueSorted = (values) => [...new Set(values.filter((value) => value !== undefined && value !== null))].sort((a, b) => a - b);

export const createProductSelectionConfiguration = (ruleIds, defaultOverride = {}) => {
  const variants = ruleIds.map((id) => FORD_PROTECT_PRODUCT_RULES[id]).filter(Boolean).map((rule) => {
    const termMonths = uniqueSorted(rule.termMileage.map((item) => item.months));
    return Object.freeze({
      id: rule.id,
      label: rule.label,
      mode: genericConfigurationMode(rule.selectionModel),
      termMileageMatrix: rule.termMileage,
      termMonths: Object.freeze(termMonths),
      serviceIntervals: rule.serviceIntervals,
      serviceIntervalRules: rule.serviceIntervalRules,
      engineHourLimits: rule.engineHourLimits,
      benefitAmounts: rule.benefitAmounts,
      startBasisLabel: rule.coverageStart,
      purchaseWindowLabel: rule.purchaseWindow,
      purchaseTiming: rule.purchaseTiming,
      currentPublicStatus: rule.currentPublicStatus,
      customerSelectable: rule.customerSelectable,
      compatibility: rule.compatibility,
      source: rule.configurationSource,
      policySource: rule.source,
      defaults: Object.freeze({ ...(CONFIGURATION_DEFAULTS[rule.id] || {}) }),
    });
  });
  const primary = variants.find((item) => item.customerSelectable) || variants[0] || null;
  const defaults = Object.freeze({ ...(primary?.defaults || {}), ...defaultOverride });
  return Object.freeze({
    mode: primary?.mode || 'dealer-returned',
    variants: Object.freeze(variants),
    termMileageMatrix: primary?.termMileageMatrix || Object.freeze([]),
    termMonths: primary?.termMonths || Object.freeze([]),
    serviceIntervals: primary?.serviceIntervals || Object.freeze([]),
    serviceIntervalRules: primary?.serviceIntervalRules || Object.freeze([]),
    engineHourLimits: primary?.engineHourLimits || Object.freeze([]),
    benefitAmounts: primary?.benefitAmounts || Object.freeze([]),
    startBasisLabel: primary?.startBasisLabel || 'The current Ford offer and issued agreement establish when coverage begins.',
    defaults,
  });
};

const normalizeText = (value) => String(value ?? '').trim();

const normalizePowertrain = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (/electric|\bev\b/.test(normalized)) return 'electric';
  if (/plug.?in|phev/.test(normalized)) return 'plug-in-hybrid';
  if (/hybrid|hev/.test(normalized)) return 'hybrid';
  if (/diesel|power\s*stroke/.test(normalized)) return 'diesel';
  if (/gas|gasoline|petrol/.test(normalized)) return 'gas';
  return 'unknown';
};

const normalizeTransactionMethod = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  if (/^cash$/.test(normalized)) return 'cash';
  if (/financ|loan/.test(normalized)) return 'finance';
  if (/lease/.test(normalized)) return 'lease';
  return 'undecided';
};

const readPriorCoverageValue = (quote = {}) => {
  const priorCoverage = quote.priorCoverage && typeof quote.priorCoverage === 'object'
    ? quote.priorCoverage
    : {};
  return quote.cspPriorCoverageStatus
    ?? quote.priorCoverageStatus
    ?? quote.qualifyingPriorCoverage
    ?? quote.cspPriorCoverage
    ?? priorCoverage.status
    ?? priorCoverage.type
    ?? null;
};

const normalizePriorCoverageReadiness = (value) => {
  if (value === true) return true;
  if (value === false) return false;
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized || /unknown|unsure|not sure|verify|pending/.test(normalized)) return null;
  if (/^no$|^none$|no prior|never had|not covered|without coverage/.test(normalized)) return false;
  if (/active|current|ending|expir|factory|oem|warranty|ford protect|extended service|\besp\b/.test(normalized)) return true;
  return null;
};

const readVehicleValue = (quote, keys) => {
  const vehicle = quote?.vehicle && typeof quote.vehicle === 'object' ? quote.vehicle : {};
  for (const key of keys) {
    if (quote?.[key] !== undefined && quote[key] !== null && quote[key] !== '') return quote[key];
    if (vehicle[key] !== undefined && vehicle[key] !== null && vehicle[key] !== '') return vehicle[key];
  }
  return undefined;
};

const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = value instanceof Date
    ? new Date(value.getTime())
    : new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const wholeMonthsBetween = (start, end) => {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
};

const resolveQuoteFacts = (quote = {}) => {
  const make = normalizeText(readVehicleValue(quote, ['make'])) || 'Ford';
  const year = toFiniteNumber(readVehicleValue(quote, ['year', 'modelYear']));
  const mileage = toFiniteNumber(readVehicleValue(quote, ['mileage', 'currentMileage', 'odometer']));
  const inService = toDate(readVehicleValue(quote, ['inService', 'inServiceDate', 'originalInServiceDate']));
  const purchaseDate = toDate(readVehicleValue(quote, ['purchaseDate', 'vehiclePurchaseDate', 'saleDate']));
  const asOf = toDate(quote.asOfDate) ?? new Date();
  const powertrain = normalizePowertrain(readVehicleValue(quote, ['powertrain', 'fuelType', 'engineType']));
  const state = normalizeText(readVehicleValue(quote, ['state', 'registrationState']));
  const planPath = normalizeText(quote.planPath).toLowerCase();
  const rawProgram = normalizeText(quote.program).toLowerCase();
  const program = /enginecare|diesel-enginecare/.test(rawProgram)
    ? 'enginecare'
    : /continued|\bcsp\b/.test(rawProgram)
      ? 'csp'
      : /extended|\besp\b/.test(rawProgram)
        ? 'esp'
        : rawProgram;
  const engine = normalizeText(readVehicleValue(quote, ['engine', 'engineDescription', 'engineSize']))
    || normalizeText(quote.decodedVehicle?.engineDescription || quote.decodedVehicle?.engineDisplacementL);
  const engineHours = toFiniteNumber(readVehicleValue(quote, ['currentEngineHours', 'engineHours', 'totalEngineHours']));
  const transactionMethod = normalizeTransactionMethod(quote.transactionMethod);
  const priorCoverageReadiness = normalizePriorCoverageReadiness(readPriorCoverageValue(quote));
  const explicitVehicleSituation = normalizeText(quote.vehicleSituation).toLowerCase();
  const vehicleSituationExplicit = Object.prototype.hasOwnProperty.call(VEHICLE_SITUATIONS, explicitVehicleSituation);
  const situationValue = normalizeText(quote.vehicleSituation || quote.vehicleCondition || quote.purchaseSituation).toLowerCase();
  const purchaseContextValue = normalizeText(quote.purchaseContext || quote.customerContext || quote.ownershipStage).toLowerCase();
  const vehicleSituation = /owned|after.?sale|already/.test(situationValue)
    ? 'owned-after-sale'
    : /used/.test(situationValue)
      ? 'used-purchase'
      : /new/.test(situationValue)
        ? 'new-purchase'
        : /shop|before|pre.?sale|vehicle.?purchase|buying|leasing/.test(purchaseContextValue)
          ? planPath === 'new' ? 'new-purchase' : 'used-purchase'
          : 'owned-after-sale';
  const purchaseContext = VEHICLE_SITUATIONS[vehicleSituation].purchaseContext;
  return {
    make,
    year,
    mileage,
    inService,
    purchaseDate,
    asOf,
    powertrain,
    state,
    planPath,
    program,
    engine,
    engineHours,
    transactionMethod,
    priorCoverageReadiness,
    purchaseContext,
    vehicleSituation,
    vehicleSituationExplicit,
  };
};

export const getProductPurchaseContext = (quote = {}) => resolveQuoteFacts(quote).purchaseContext;

const evaluateWindow = ({ facts, months, miles }) => {
  const mileageExpired = facts.mileage !== null && facts.mileage >= miles;
  const ageMonths = facts.inService ? wholeMonthsBetween(facts.inService, facts.asOf) : null;
  const timeExpired = ageMonths !== null && ageMonths >= months;
  if (mileageExpired || timeExpired) return { code: 'outside', within: false, ageMonths, mileageExpired, timeExpired };
  if (ageMonths !== null && facts.mileage !== null) return { code: 'within', within: true, ageMonths, mileageExpired, timeExpired };
  return { code: 'unknown', within: null, ageMonths, mileageExpired, timeExpired };
};

/**
 * A planning aid only. Ford's vehicle record and the issued agreement determine
 * the actual warranty and plan status.
 */
export function getWarrantyInspectionStatus(quote = {}) {
  const facts = resolveQuoteFacts(quote);
  const limits = facts.make.toLowerCase() === 'lincoln' ? LINCOLN_NVLW : FORD_NVLW;
  const evaluated = evaluateWindow({ facts, ...limits });
  const code = evaluated.code === 'within' ? 'within-nvlw-estimate' : evaluated.code === 'outside' ? 'outside-nvlw-estimate' : 'unknown';
  const likelyWithin = evaluated.within;
  const warrantyRecordConfirmed = Boolean(
    quote.warrantyRecordConfirmed
    || quote.vehicle?.warrantyRecordConfirmed
    || quote.newVehicleLimitedWarranty?.confirmed,
  );
  const inspectionRequired = warrantyRecordConfirmed
    ? likelyWithin === false ? true : likelyWithin === true ? false : null
    : null;
  const label = likelyWithin === true
    ? warrantyRecordConfirmed ? 'No ESP used-plan inspection required' : 'Used-plan inspection likely not required'
    : likelyWithin === false
      ? warrantyRecordConfirmed ? 'Dealer inspection required for this used ESP path' : 'Inspection may be required after Ford record review'
      : 'Warranty record review needed';
  const message = likelyWithin === true
    ? warrantyRecordConfirmed
      ? 'Ford records confirm the vehicle remains within the New Vehicle Limited Warranty, so Ford’s Used Vehicle Inspection Checklist is not required for this used-plan ESP path.'
      : 'If Ford records confirm the vehicle remains within the New Vehicle Limited Warranty, Ford’s Used Vehicle Inspection Checklist is not required for this used-plan ESP path.'
    : likelyWithin === false
      ? warrantyRecordConfirmed
        ? 'Ford records confirm the vehicle is outside the New Vehicle Limited Warranty. A participating Ford dealership must complete Ford’s Used Vehicle Inspection Checklist before enrollment.'
        : 'If Ford records confirm the vehicle is outside the New Vehicle Limited Warranty, a participating Ford dealership must complete Ford’s Used Vehicle Inspection Checklist before enrollment.'
      : 'Bob Maxey must confirm the original in-service date and current Ford warranty record. The result determines whether an ESP used-plan inspection is required.';

  return {
    code,
    label,
    tone: warrantyRecordConfirmed && likelyWithin === true ? 'positive' : likelyWithin === false ? 'warning' : 'review',
    warrantyRecordConfirmed,
    likelyWithinNewVehicleLimitedWarranty: likelyWithin,
    inspectionRequiredForUsedEsp: inspectionRequired,
    message,
    caveat: 'This is a planning estimate, not a warranty lookup. Ford records, the current program rules, and the issued agreement control.',
    limits: {
      make: facts.make,
      months: limits.months,
      miles: limits.miles,
      basis: facts.make.toLowerCase() === 'lincoln' ? 'Lincoln planning limit' : 'Ford planning limit',
    },
  };
}

const dealerConfirmation = 'Bob Maxey must confirm the VIN, original in-service date, current mileage, registration state, vehicle use, current Ford program availability, and price before coverage can be purchased.';

const purchaseOnlyCatalogProduct = ({
  id,
  ruleIds = [id],
  name,
  shortName = name,
  familyId,
  familyLabel,
  eyebrow,
  value,
  description,
  image,
  imageAlt,
  badge = 'Available with vehicle purchase',
  powertrains = ['gas', 'hybrid', 'plug-in-hybrid', 'diesel', 'electric'],
  planOptions,
  highlights,
  requirements,
  cautions,
  officialSources = [],
}) => Object.freeze({
  id,
  purchaseContexts: ['shopping'],
  configurationRuleIds: ruleIds,
  configuration: createProductSelectionConfiguration(ruleIds),
  customerSelectable: true,
  familyId,
  familyLabel,
  category: 'purchase-only',
  name,
  shortName,
  eyebrow,
  value,
  description,
  image,
  imageAlt,
  badge,
  requestMode: 'original-transaction-only',
  powertrains,
  warrantyApplicability: ['original-vehicle-transaction'],
  catalogBadges: ['Vehicle-purchase planning', 'Not available after the sale', 'Dealer verification'],
  planOptions,
  highlights,
  detailSections: [
    { title: 'When to choose it', items: ['Select this while planning an eligible vehicle purchase or lease.', 'Bob Maxey verifies the exact product, term, vehicle, state, use, and agreement before including it in the transaction.'] },
    { title: 'After the vehicle sale', items: ['Current Ford public information identifies this product as available only with the original eligible vehicle transaction.', 'In an owner quote it remains visible for clarity, but it is disabled and cannot be added.'] },
  ],
  eligibility: {
    headline: 'Plan it before the eligible vehicle transaction is completed.',
    requirements,
    dealerConfirmation,
    inspectionPolicy: 'This is not an after-sale ESP enrollment path; product-specific transaction and vehicle eligibility rules apply.',
  },
  cautions: [...cautions, 'Bob Maxey confirms the product, term, vehicle, state, use, and current Ford offer. The issued agreement controls.'],
  officialSources,
});

export const quoteProducts = Object.freeze([
  {
    id: 'extended-service-plan',
    purchaseContexts: ['shopping', 'owner'],
    configurationRuleIds: ['extended-service-plan'],
    configuration: createProductSelectionConfiguration(['extended-service-plan']),
    familyId: 'mechanical',
    familyLabel: 'Mechanical protection',
    name: 'Ford Protect Extended Service Plan',
    shortName: 'Extended Service Plan',
    eyebrow: 'Ford-backed repair protection',
    value: 'Choose the level and term that fit how long you plan to keep your Ford.',
    description: 'Helps protect against the cost of eligible covered mechanical and electrical failures after the applicable warranty ends, with Ford-authorized service and parts.',
    image: '/assets/ford-official/ford-why-plan.png',
    imageAlt: 'Ford vehicle on the road from official Ford Protect marketing media',
    badge: 'Most flexible coverage path',
    requestMode: 'dealer-confirmed',
    powertrains: ['gas', 'hybrid', 'plug-in-hybrid', 'diesel', 'electric'],
    warrantyApplicability: ['within-nvlw', 'outside-nvlw'],
    catalogBadges: ['After-sale request', 'New and used paths', 'Ford-backed'],
    planOptions: [
      { id: 'premium', name: 'PremiumCARE', summary: 'Ford Protect’s broadest gas, hybrid, and eligible diesel mechanical coverage.' },
      { id: 'extra', name: 'ExtraCARE', summary: 'Enhanced listed-component protection for drivability, electrical, climate, and selected high-tech systems.' },
      { id: 'base', name: 'BaseCARE', summary: 'Essential listed-component protection across major vehicle systems.' },
      { id: 'powertrain', name: 'PowertrainCARE', summary: 'Focused protection for critical engine, transmission, and driveline components.' },
      { id: 'premium-plus-ev', name: 'PremiumCARE Plus EV', summary: 'Comprehensive EV component coverage bundled with eligible scheduled maintenance.' },
      { id: 'premium-ev', name: 'PremiumCARE EV', summary: 'Broad eligible EV drive, electrical, high-tech, steering, braking, suspension, and climate coverage.' },
      { id: 'extra-ev', name: 'ExtraCARE EV', summary: 'Enhanced listed-component protection for eligible EV systems.' },
      { id: 'base-ev', name: 'BaseCARE EV', summary: 'Focused listed-component protection for eligible major EV systems.' },
    ],
    highlights: [
      'Ford-backed coverage with service through participating Ford and Lincoln dealers',
      'New-plan terms are measured from the original in-service date and zero miles',
      'Used-plan terms begin from the contract date and current odometer under the applicable agreement',
      'Available terms, mileage limits, deductibles, and benefits are vehicle-specific',
    ],
    detailSections: [
      { title: 'New-plan path', items: ['Designed for an eligible vehicle still inside the purchase window confirmed by Ford records.', 'The current Ford FAQ uses the New Vehicle Limited Warranty as the public purchase window.'] },
      { title: 'Used-plan path', items: ['Can provide an after-warranty path with time and mileage beginning under used-plan agreement rules.', 'Ford and Bob Maxey must confirm vehicle history, inspection status, usage, and available combinations.'] },
      { title: 'Inspection rule', items: ['No Used Vehicle Inspection Checklist is required for ESP used-plan enrollment while the vehicle remains within the New Vehicle Limited Warranty.', 'Outside the New Vehicle Limited Warranty, a participating dealership, such as Bob Maxey, must complete the checklist before an ESP used plan can be finalized.'] },
    ],
    eligibility: {
      headline: 'New- and used-plan eligibility is determined from the Ford vehicle record.',
      requirements: ['VIN and current odometer', 'Original in-service date', 'Registration state and vehicle use', 'Required inspection when outside the New Vehicle Limited Warranty'],
      dealerConfirmation,
      inspectionPolicy: 'For ESP used-plan enrollment: no used-vehicle inspection while within the New Vehicle Limited Warranty; outside it, a completed Used Vehicle Inspection Checklist from a participating dealership, such as Bob Maxey, is required before coverage can be finalized.',
    },
    cautions: ['Bob Maxey confirms the choices available for the VIN before purchase.', 'The issued agreement controls covered components, exclusions, start rules, deductible, term, and benefits.'],
    officialSources: [
      { label: 'Ford Protect Extended Service Plans', url: 'https://fordprotect.ford.com/extended-service-plan' },
      { label: 'Ford Protect FAQ', url: 'https://fordprotect.ford.com/faq' },
      { label: 'Ford Protect agreement library', url: 'https://fordprotect.ford.com/fl8250contract' },
    ],
  },
  {
    id: 'premium-maintenance',
    purchaseContexts: ['shopping', 'owner'],
    configurationRuleIds: ['premium-maintenance', 'premium-maintenance-ev'],
    configuration: createProductSelectionConfiguration(['premium-maintenance', 'premium-maintenance-ev']),
    familyId: 'maintenance',
    familyLabel: 'Scheduled maintenance',
    name: 'Premium Maintenance Plan',
    shortName: 'Premium Maintenance',
    eyebrow: 'Plan ahead for scheduled service',
    value: 'Bundle scheduled maintenance and selected wear items into one Ford Protect plan.',
    description: 'Covers eligible scheduled maintenance based on the vehicle’s maintenance guide, including inspections and selected wear items, with a $0 deductible on covered maintenance.',
    image: '/assets/ford-official/ford-maintenance-wide.png',
    imageAlt: 'Ford service technician from official Ford Protect marketing media',
    badge: 'Scheduled service + wear items',
    requestMode: 'dealer-confirmed',
    powertrains: ['gas', 'hybrid', 'plug-in-hybrid', 'diesel', 'electric'],
    warrantyApplicability: ['within-nvlw'],
    catalogBadges: ['After-sale within warranty', '$0 deductible', 'Maintenance'],
    planOptions: [
      { id: 'premium-maintenance', name: 'Premium Maintenance', summary: 'For eligible gas, hybrid, plug-in hybrid, and diesel vehicles.' },
      { id: 'premium-maintenance-ev', name: 'Premium Maintenance EV', summary: 'EV-specific scheduled inspections, services, and eligible wear-item coverage.' },
    ],
    highlights: ['Scheduled maintenance based on the vehicle’s maintenance guide', 'Multi-point inspections and tire rotations', 'Selected wear items such as brake pads, belts, hoses, shocks or struts, and wiper blades where included', '$0 deductible for covered maintenance'],
    detailSections: [
      { title: 'Ownership value', items: ['Locks in a planned service program rather than paying separately at each eligible visit.', 'Keeps Ford-authorized maintenance records together for convenience and future ownership confidence.'] },
      { title: 'EV path', items: ['Premium Maintenance EV follows the eligible EV maintenance schedule.', 'Do not add separate maintenance when PremiumCARE Plus EV already includes the applicable maintenance bundle.'] },
    ],
    eligibility: {
      headline: 'Ford’s public FAQ says Premium Maintenance must be purchased during the New Vehicle Limited Warranty.',
      requirements: ['Vehicle still within the applicable New Vehicle Limited Warranty', 'Vehicle-specific maintenance schedule', 'Eligible powertrain and service interval'],
      dealerConfirmation,
      inspectionPolicy: 'A used-vehicle inspection is not presented as a Premium Maintenance enrollment requirement; Ford program eligibility still must be confirmed.',
    },
    cautions: ['Covered services and intervals follow the issued plan and the vehicle’s maintenance schedule.', 'PremiumCARE Plus EV already bundles eligible EV maintenance.'],
    officialSources: [
      { label: 'Premium Maintenance Plan', url: 'https://fordprotect.ford.com/premium-maintenance-plan' },
      { label: 'Ford Protect maintenance terms', url: 'https://fordprotect.ford.com/fplp-8324-mntc/' },
      { label: 'Ford Protect FAQ', url: 'https://fordprotect.ford.com/faq' },
    ],
  },
  {
    id: 'maintenance-essentials',
    purchaseContexts: ['shopping', 'owner'],
    configurationRuleIds: ['extra-maintenance', 'limited-maintenance', 'basic-maintenance'],
    configuration: createProductSelectionConfiguration(['extra-maintenance', 'limited-maintenance', 'basic-maintenance']),
    customerSelectable: false,
    familyId: 'maintenance',
    familyLabel: 'Everyday maintenance',
    name: 'Ford Protect Maintenance Choices',
    shortName: 'Maintenance Choices',
    eyebrow: 'More ways to plan routine care',
    value: 'Ask for the maintenance level that matches your vehicle, service needs, and ownership timeline.',
    description: 'Ford’s maintenance terms recognize Extra, Limited, and Basic maintenance paths with different service, wear-item, transfer, and selling-dealer rules.',
    image: '/assets/ford-official/ford-maintenance.jpg',
    imageAlt: 'Ford vehicle receiving maintenance from official Ford Protect marketing media',
    badge: 'Dealer-matched maintenance',
    requestMode: 'specialist-request',
    powertrains: ['gas', 'hybrid', 'plug-in-hybrid', 'diesel'],
    warrantyApplicability: ['within-nvlw', 'outside-nvlw'],
    catalogBadges: ['After-sale request', 'Multiple service levels', 'Dealer review'],
    planOptions: [
      { id: 'extra-maintenance', name: 'Extra Maintenance Plan', summary: 'Scheduled maintenance plus listed wear items for eligible vehicles; purchase and servicing restrictions apply.' },
      { id: 'limited-maintenance', name: 'Limited Maintenance Plan', summary: 'Eligible oil and filter service, multi-point inspection, tire rotation, and scheduled diesel exhaust fluid top-off.' },
      { id: 'basic-maintenance', name: 'Basic Maintenance Plan', summary: 'Eligible oil and filter service, multi-point inspection, and tire rotation with narrower vehicle eligibility.' },
    ],
    highlights: ['A simpler routine-service path may be available when full Premium Maintenance is not the right fit', 'Available services can be matched to the vehicle’s powertrain and maintenance schedule', 'Some maintenance choices may be requested during vehicle ownership', 'Bob Maxey confirms the current eligible level and service interval for this VIN'],
    detailSections: [
      { title: 'Important differences', items: ['Extra Maintenance can include selected wear items but has narrower vehicle and purchase rules.', 'Limited Maintenance provides a focused scheduled-service package.', 'Basic Maintenance is the narrowest package and may not be available for vehicles requiring full-synthetic oil.'] },
      { title: 'Service and transfer rules', items: ['Some maintenance plans can require service at the selling dealer.', 'Some plans may not transfer to a future owner.', 'The current Ford offer and agreement confirm the services, interval, eligibility, and ownership rules.'] },
    ],
    eligibility: {
      headline: 'These are dealer-matched maintenance requests, not guaranteed online selections.',
      requirements: ['Eligible non-EV powertrain', 'Oil specification and maintenance schedule review', 'Current Ford program availability', 'Selling-dealer and transfer terms acknowledged'],
      dealerConfirmation,
      inspectionPolicy: 'A used-vehicle inspection is not presented as a maintenance-plan enrollment requirement; plan, vehicle, oil, and service eligibility still require review.',
    },
    cautions: ['Extra and Basic Maintenance are not presented for EVs and may exclude vehicles requiring full-synthetic oil.', 'Availability, included services, purchase timing, transferability, and price must be confirmed for the vehicle before purchase.'],
    officialSources: [
      { label: 'Ford Protect maintenance terms', url: 'https://fordprotect.ford.com/fplp-8324-mntc/' },
    ],
  },
  {
    id: 'continued-service-plan',
    purchaseContexts: ['owner'],
    configurationRuleIds: ['continued-service-plan'],
    configuration: createProductSelectionConfiguration(['continued-service-plan']),
    familyId: 'continued-coverage',
    familyLabel: 'Monthly continued coverage',
    name: 'Ford Protect Continued Service Plan',
    shortName: 'Continued Service Plan',
    eyebrow: 'Continue protection as coverage ends',
    value: 'A monthly path designed to begin after an eligible OEM warranty or Ford Protect plan expires.',
    description: 'Offers Ultimate or Standard Plus coverage with a fixed monthly payment and no annual mileage limit while the agreement remains eligible.',
    image: '/assets/ford-official/ford-why-3.png',
    imageAlt: 'Ford vehicle from official Ford Protect marketing media',
    badge: 'No enrollment inspection',
    requestMode: 'dealer-confirmed',
    powertrains: ['gas', 'hybrid', 'plug-in-hybrid', 'diesel'],
    warrantyApplicability: ['expiring-oem-warranty', 'expiring-ford-protect', 'outside-nvlw'],
    catalogBadges: ['Monthly coverage', 'No annual mileage limit', 'No inspection'],
    planOptions: [
      { id: 'csp-ultimate', name: 'CSP Ultimate', summary: 'The broader exclusionary continued-coverage level for eligible moving lubricated parts and electrical components.' },
      { id: 'csp-standard-plus', name: 'CSP Standard Plus', summary: 'Listed-component continued protection for eligible major mechanical and electrical systems.' },
    ],
    highlights: ['Published enrollment eligibility begins up to 12 model years and 140,000 miles', 'Coverage can potentially continue to 14 model years and 160,000 miles', 'No annual mileage limit while coverage remains active and eligible', 'Ford’s current buyer guide says there is no waiting period or vehicle inspection required'],
    detailSections: [
      { title: 'How it starts', items: ['The buyer guide says coverage becomes active the day after signup when the current OEM warranty or Ford Protect plan expires.', 'The exact effective date and prior-coverage requirement come from the returned agreement.'] },
      { title: 'Inspection carve-out', items: ['CSP is not an ESP used-plan enrollment.', 'Ford’s current CSP buyer guide explicitly states that no inspection is required for CSP enrollment.'] },
    ],
    eligibility: {
      headline: 'Designed for an eligible vehicle whose OEM warranty or Ford Protect coverage is ending.',
      requirements: ['Up to the published enrollment age and mileage limits', 'Eligible state and vehicle', 'Returned CSP offer and effective date'],
      dealerConfirmation,
      inspectionPolicy: 'No vehicle inspection is required for CSP enrollment according to Ford’s current CSP buyer guide.',
    },
    cautions: ['Ford’s public CSP information says the product is not available in California.', 'Monthly price, deductible, coverage level, effective date, cancellation, and transfer terms come from the vehicle-specific offer.'],
    officialSources: [
      { label: 'Ford Protect Continued Service Plan', url: 'https://fordprotect.ford.com/continued-service-plan' },
      { label: 'Continued Service Plan buyer guide', url: 'https://fordprotect.ford.com/media/brochure/ford/FR-CSP-Buyer-Guide-FINAL.pdf' },
    ],
  },
  {
    id: 'diesel-enginecare',
    purchaseContexts: ['shopping', 'owner'],
    configurationRuleIds: ['diesel-enginecare-plus', 'diesel-enginecare'],
    configuration: createProductSelectionConfiguration(['diesel-enginecare-plus', 'diesel-enginecare']),
    customerSelectable: false,
    familyId: 'diesel-specialty',
    familyLabel: 'Diesel engine protection',
    name: 'Diesel EngineCARE',
    shortName: 'Diesel EngineCARE',
    eyebrow: 'Focused Power Stroke protection',
    value: 'Protect eligible high-cost diesel engine components with a focused Ford-backed plan.',
    description: 'EngineCARE Plus and EngineCARE are specialist-rated plans for eligible Power Stroke diesel engines, with different listed-component coverage levels.',
    image: '/assets/ford-official/ford-breakdown.jpg',
    imageAlt: 'Ford vehicle service scene from official Ford Protect marketing media',
    badge: 'Power Stroke specialist review',
    requestMode: 'specialist-request',
    powertrains: ['diesel'],
    warrantyApplicability: ['within-diesel-engine-warranty'],
    catalogBadges: ['After-sale request', 'Diesel-only', 'Specialist review'],
    planOptions: [
      { id: 'diesel-enginecare-plus', name: 'Diesel EngineCARE Plus', summary: 'The broader listed-component protection request for an eligible Power Stroke diesel engine.' },
      { id: 'diesel-enginecare', name: 'Diesel EngineCARE', summary: 'A focused listed-component protection request for an eligible Power Stroke diesel engine.' },
    ],
    highlights: ['Designed around eligible factory-installed Power Stroke diesel engines', 'Planning eligibility includes selected 3.0L, 3.2L, and 6.7L Power Stroke applications', 'Enrollment is requested while the applicable diesel engine warranty is active', 'Engine, mileage, hours, vehicle use, and current program eligibility require specialist confirmation'],
    detailSections: [
      { title: 'Why request it', items: ['Focuses the request on eligible diesel engine components rather than a broad vehicle plan.', 'Can be compared with a full ESP when both paths are available.'] },
      { title: 'What Bob Maxey verifies', items: ['Engine family and displacement', 'Original in-service date, mileage, and engine hours', 'Commercial or specialty use', 'Current Ford terms and available coverage level'] },
    ],
    eligibility: {
      headline: 'For an eligible factory-installed Power Stroke diesel within the applicable diesel engine warranty window.',
      requirements: ['Qualifying Power Stroke engine', 'Within the current time, mileage, and engine-hour enrollment window', 'Current vehicle use and Ford program eligibility'],
      dealerConfirmation,
      inspectionPolicy: 'The diesel product request requires record-level specialist review; any inspection requirement is determined by the current Ford program and agreement.',
    },
    cautions: ['Bob Maxey must confirm the applicable diesel warranty, engine, mileage, and engine-hour limits for the VIN.', 'The returned Ford offer and agreement—not this planning catalog—control current eligibility, coverage, terms, and price.'],
    officialSources: [
      { label: 'Ford Protect agreement library', url: 'https://fordprotect.ford.com/fl8250contract' },
    ],
  },
  {
    id: 'rentalcare',
    purchaseContexts: ['shopping', 'owner'],
    configurationRuleIds: ['rentalcare'],
    configuration: createProductSelectionConfiguration(['rentalcare']),
    customerSelectable: true,
    familyId: 'mobility',
    familyLabel: 'Rental support',
    name: 'RentalCARE',
    shortName: 'RentalCARE',
    eyebrow: 'Availability requires dealer verification',
    value: 'Ask Bob Maxey to check whether a current RentalCARE offer exists for the vehicle.',
    description: 'RentalCARE is not presented as currently available online. This card sends a dealer-verification request so Bob Maxey can check for a vehicle-specific offer.',
    image: '/assets/ford-official/ford-why-1.png',
    imageAlt: 'Ford vehicle from official Ford Protect marketing media',
    badge: 'Dealer verification only',
    requestMode: 'specialist-request',
    powertrains: ['gas', 'hybrid', 'plug-in-hybrid', 'diesel', 'electric'],
    warrantyApplicability: ['within-3-years-36000-miles'],
    catalogBadges: ['Dealer verification', 'Vehicle-specific review', 'Current offer required'],
    planOptions: [
      { id: 'rentalcare', name: 'RentalCARE verification', summary: 'Ask Bob Maxey to confirm whether RentalCARE and a vehicle-specific offer are currently available.' },
    ],
    highlights: ['May provide rental support for qualifying repair events when offered', 'Time-and-mileage enrollment limits may apply', 'No term, mileage, benefit, price, or availability is confirmed online', 'A current dealer response and issued agreement supply the final details'],
    detailSections: [
      { title: 'What it may provide', items: ['Rental support for qualifying repair events when included in a current offer.', 'A limited enrollment window based on vehicle time and mileage may apply.'] },
      { title: 'What Bob Maxey must return', items: ['Confirmation that RentalCARE is currently offered for the VIN and state.', 'The actual benefits, term, mileage, price, coverage start, compatibility, and agreement.'] },
    ],
    eligibility: {
      headline: 'A dealer-verification request—not a statement that RentalCARE is currently available.',
      requirements: ['Current product confirmed in the dealer system', 'VIN, state, warranty start, mileage, and purchase date reviewed', 'Current benefits, terms, price, and agreement returned'],
      dealerConfirmation,
      inspectionPolicy: 'The ESP used-plan inspection rule does not establish RentalCARE eligibility. Bob Maxey must confirm any current product-specific enrollment requirement.',
    },
    cautions: ['RentalCARE is a verification request until a current dealer offer confirms availability.', 'The returned offer and issued agreement control the terms, benefits, price, and compatibility.'],
    officialSources: [
      { label: 'Ford Protect agreement terms recognizing RentalCARE', url: 'https://fordprotect.ford.com/media/contracts/t-and-c/ESC-103-NAT-wKey-OCT-2023.pdf' },
      { label: 'Ford Protect agreement library', url: 'https://fordprotect.ford.com/fl8250contract' },
    ],
  },
  {
    id: 'leasecare',
    purchaseContexts: ['shopping', 'owner'],
    configurationRuleIds: ['leasecare'],
    configuration: createProductSelectionConfiguration(['leasecare']),
    customerSelectable: true,
    familyId: 'mobility',
    familyLabel: 'Coordinated vehicle support',
    name: 'LeaseCARE',
    shortName: 'LeaseCARE',
    eyebrow: 'Availability requires dealer verification',
    value: 'Ask Bob Maxey to check whether a current LeaseCARE offer exists for the vehicle.',
    description: 'LeaseCARE is not presented as currently available online. This card sends a dealer-verification request so Bob Maxey can check for a vehicle-specific offer.',
    image: '/assets/ford-official/ford-why-2.png',
    imageAlt: 'Ford owner receiving dealership support from official Ford Protect marketing media',
    badge: 'Dealer verification only',
    requestMode: 'specialist-request',
    powertrains: ['gas', 'hybrid', 'plug-in-hybrid', 'diesel', 'electric'],
    warrantyApplicability: ['within-3-years-36000-miles'],
    catalogBadges: ['Dealer verification', 'Vehicle-specific review', 'Current offer required'],
    planOptions: [
      { id: 'leasecare', name: 'LeaseCARE verification', summary: 'Ask Bob Maxey to confirm whether LeaseCARE and a vehicle-specific offer are currently available.' },
    ],
    highlights: ['May provide agreement-defined repair and convenience benefits when offered', 'Time-and-mileage enrollment limits may apply', 'No term, mileage, benefit, price, or availability is confirmed online', 'A current dealer response and issued agreement supply the final details'],
    detailSections: [
      { title: 'What it may provide', items: ['Agreement-defined repair and convenience benefits when included in a current offer.', 'A limited enrollment window based on vehicle time and mileage may apply.'] },
      { title: 'What Bob Maxey must return', items: ['Confirmation that LeaseCARE is currently offered for the VIN and state.', 'The actual benefits, compatible products, term, mileage, price, coverage start, and agreement.'] },
    ],
    eligibility: {
      headline: 'A dealer-verification request—not a statement that LeaseCARE is currently available.',
      requirements: ['Current product confirmed in the dealer system', 'VIN, state, warranty start, mileage, and purchase date reviewed', 'Current benefits, terms, price, and agreement returned'],
      dealerConfirmation,
      inspectionPolicy: 'The ESP used-plan inspection rule does not establish LeaseCARE eligibility. Bob Maxey must confirm any current product-specific enrollment requirement.',
    },
    cautions: ['Compatibility restrictions with other coverage products may apply.', 'LeaseCARE benefits, combinations, terms, and price require a current dealer offer.'],
    officialSources: [
      { label: 'Ford Protect agreement library', url: 'https://fordprotect.ford.com/fl8250contract' },
    ],
  },
  {
    id: 'off-road-coverage',
    purchaseContexts: ['shopping', 'owner'],
    configurationRuleIds: ['off-road-coverage'],
    configuration: createProductSelectionConfiguration(['off-road-coverage']),
    customerSelectable: true,
    familyId: 'tire-wheel',
    familyLabel: 'Tire and wheel protection',
    name: 'Off-Road Coverage Request',
    shortName: 'Off-Road Coverage',
    eyebrow: 'A narrow Ford-published after-sale exception',
    value: 'Ask Bob Maxey to verify Off-Road coverage with an eligible TireCARE or TripleCARE product.',
    description: 'Ford’s current Off-Road page describes a limited request for TireCARE, TireCARE Plus, TripleCARE, or TripleCARE Plus customers. The vehicle must have been purchased within 3 years and have fewer than 36,000 miles; the underlying product and current offer still require dealer confirmation.',
    image: '/assets/ford-official/tirecare.png',
    imageAlt: 'Ford Protect tire and wheel coverage',
    badge: 'Limited after-sale exception',
    requestMode: 'specialist-request',
    powertrains: ['gas', 'hybrid', 'plug-in-hybrid', 'diesel', 'electric'],
    warrantyApplicability: ['purchased-within-3-years', 'fewer-than-36000-miles'],
    catalogBadges: ['At purchase or limited after-sale request', 'Underlying product required', 'Dealer verification'],
    planOptions: [
      { id: 'off-road-coverage', name: 'Off-Road coverage verification', summary: 'Verify the eligible underlying TireCARE or TripleCARE product, vehicle window, term, and current Off-Road option.' },
    ],
    highlights: ['May be requested with an eligible vehicle transaction', 'Ford currently describes a limited after-sale request window', 'Existing eligible plan owners may ask to add Off-Road coverage', 'Vehicle purchase date, mileage, underlying product, tires/wheels, use, state, term, and price all require confirmation'],
    detailSections: [
      { title: 'The limited exception', items: ['The vehicle must have been purchased within 3 years and have fewer than 36,000 miles.', 'Ford says existing eligible TireCARE or TripleCARE plan owners may ask to add Off-Road coverage.'] },
      { title: 'What this does not change', items: ['Ordinary TireCARE Plus and TripleCARE Plus remain presented as original-transaction products.', 'This request does not guarantee that an underlying product, vehicle, tire/wheel, state, term, or price qualifies.'] },
    ],
    eligibility: {
      headline: 'A limited dealer-verification request for an eligible underlying product.',
      requirements: ['Vehicle purchased within 3 years', 'Current mileage below 36,000', 'Eligible TireCARE, TireCARE Plus, TripleCARE, or TripleCARE Plus product', 'Current dealer offer and issued agreement'],
      dealerConfirmation,
      inspectionPolicy: 'This is not an ESP used-plan enrollment. The ESP used-plan inspection rule is not applied to this request.',
    },
    cautions: ['The three-year/36,000-mile rule is a request window, not automatic eligibility.', 'Off-road damage, vehicle use, tire/wheel specifications, exclusions, and benefit limits come from the current agreement.'],
    officialSources: [
      { label: 'Ford Protect Off-Road Coverage', url: 'https://fordprotect.ford.com/offroad' },
      { label: 'Ford Protect TireCARE Plus', url: 'https://fordprotect.ford.com/tirecare' },
    ],
  },
  purchaseOnlyCatalogProduct({
    id: 'tirecare-plus',
    ruleIds: ['tirecare-plus'],
    name: 'TireCARE Plus',
    familyId: 'tire-wheel',
    familyLabel: 'Tire and wheel protection',
    eyebrow: 'Road-hazard tire and wheel support',
    value: 'Help protect eligible tires and wheels from covered road-hazard damage, including cosmetic wheel coverage where the agreement provides it.',
    description: 'A vehicle-purchase-only product for eligible new and used vehicles. Current Ford public information publishes unlimited mileage and time terms up to seven years; the current dealer offer controls the exact choices.',
    image: '/assets/ford-official/tirecare.png',
    imageAlt: 'Ford Protect TireCARE Plus tire and wheel protection',
    planOptions: [{ id: 'tirecare-plus', name: 'TireCARE Plus', summary: 'Road-hazard tire and wheel protection with eligible cosmetic wheel coverage.' }],
    highlights: ['Eligible covered tire repair or replacement', 'Eligible covered wheel repair or replacement', 'Cosmetic wheel coverage where included', 'No mileage limit in current public material'],
    requirements: ['Selected before the original eligible vehicle transaction is completed', 'Eligible tire and wheel size/material/finish', 'Eligible vehicle, use, state, and agreement'],
    cautions: ['Carbon-fiber, chrome/chrome-clad, oversized, modified, off-road, commercial, or specialty applications can have exclusions or require a specific option.', 'Current public information describes terms up to seven years. Bob Maxey confirms the exact term returned for the vehicle.'],
    officialSources: [{ label: 'Ford Protect TireCARE Plus', url: 'https://fordprotect.ford.com/tirecare' }],
  }),
  purchaseOnlyCatalogProduct({
    id: 'dentcare',
    name: 'DentCARE',
    familyId: 'appearance',
    familyLabel: 'Paintless dent repair',
    eyebrow: 'Help keep body panels looking their best',
    value: 'Request paintless dent repair protection for eligible small dents and dings that meet the agreement rules.',
    description: 'A vehicle-purchase-only product for eligible new and used vehicles, subject to body-panel material, damage size/location, use, and provider rules.',
    image: '/assets/ford-official/dentcare.png',
    imageAlt: 'Ford Protect DentCARE paintless dent repair protection',
    planOptions: [{ id: 'dentcare', name: 'DentCARE', summary: 'Agreement-defined paintless dent repair for eligible dents and dings.' }],
    highlights: ['Paintless dent repair for eligible damage', 'Helps preserve the factory finish', '$0 deductible where included in the current offer', 'Mobile or dealer service may be available under the agreement'],
    requirements: ['Selected before the original eligible vehicle transaction is completed', 'Eligible metal body panels', 'Eligible dent size, location, vehicle, use, and state'],
    cautions: ['Plastic, fiberglass, composite, previously damaged, inaccessible, or oversized areas can be excluded.'],
    officialSources: [{ label: 'Ford Protect DentCARE', url: 'https://fordprotect.ford.com/dentcare' }],
  }),
  purchaseOnlyCatalogProduct({
    id: 'windshieldcare',
    ruleIds: ['windshieldcare', 'windshieldcare-plus-ev'],
    name: 'WindshieldCARE',
    familyId: 'glass',
    familyLabel: 'Windshield protection',
    eyebrow: 'Repair eligible chips and cracks',
    value: 'Plan for agreement-defined windshield repair, with an EV-specific Plus path where offered.',
    description: 'WindshieldCARE and WindshieldCARE Plus EV are original-transaction products. State availability, damage dimensions, OEM-glass/calibration benefits, and vehicle eligibility vary by agreement.',
    image: '/assets/ford-official/windshieldcare.png',
    imageAlt: 'Ford Protect WindshieldCARE glass protection',
    powertrains: ['gas', 'hybrid', 'plug-in-hybrid', 'diesel', 'electric'],
    planOptions: [
      { id: 'windshieldcare', name: 'WindshieldCARE', summary: 'Agreement-defined windshield chip and crack repair for eligible vehicles.' },
      { id: 'windshieldcare-plus-ev', name: 'WindshieldCARE Plus EV', summary: 'EV-only path with agreement-defined OEM-glass replacement and calibration benefit.' },
    ],
    highlights: ['Eligible windshield chip and crack repair', 'Unlimited mileage in current public material', 'EV Plus path where eligible', 'Agreement-defined mobile or dealer service'],
    requirements: ['Selected before the original eligible vehicle transaction is completed', 'Correct gas/hybrid/diesel or EV variant', 'Eligible state, damage, glass, calibration, and provider rules'],
    cautions: ['State exclusions apply.', 'Stress cracks, large cracks, pre-existing damage, replacement, and calibration are covered only when the selected agreement expressly includes them.'],
    officialSources: [{ label: 'Ford Protect WindshieldCARE', url: 'https://fordprotect.ford.com/windshieldcare' }],
  }),
  purchaseOnlyCatalogProduct({
    id: 'triplecare-plus',
    name: 'TripleCARE Plus',
    familyId: 'bundled-vehicle-care',
    familyLabel: 'Three-in-one vehicle care',
    eyebrow: 'Tire, dent, and glass protection together',
    value: 'Bundle eligible TireCARE Plus, DentCARE, and WindshieldCARE benefits in one original-transaction request.',
    description: 'A vehicle-purchase-only package with separate tire/wheel, dent, and windshield coverage rules inside one agreement.',
    image: '/assets/ford-official/triplecare.png',
    imageAlt: 'Ford Protect TripleCARE Plus bundled vehicle-care protection',
    planOptions: [{ id: 'triplecare-plus', name: 'TripleCARE Plus', summary: 'Eligible TireCARE Plus, DentCARE, and WindshieldCARE benefits in one product.' }],
    highlights: ['Eligible tire-and-wheel road-hazard protection', 'Eligible cosmetic wheel coverage', 'Eligible paintless dent repair', 'Eligible windshield chip and crack repair'],
    requirements: ['Selected before the original eligible vehicle transaction is completed', 'Vehicle qualifies for each included benefit', 'Eligible state, use, wheel, body-panel, glass, and damage rules'],
    cautions: ['Each included benefit keeps its own exclusions, limits, authorization process, and service rules.'],
    officialSources: [{ label: 'Ford Protect TripleCARE Plus', url: 'https://fordprotect.ford.com/triplecare' }],
  }),
  purchaseOnlyCatalogProduct({
    id: 'surfacecare',
    name: 'SurfaceCARE',
    familyId: 'appearance',
    familyLabel: 'Interior and exterior surfaces',
    eyebrow: 'Protect treated vehicle surfaces',
    value: 'Request agreement-defined protection for eligible treated interior and exterior surfaces.',
    description: 'An original-transaction limited warranty for specifically treated surfaces and listed conditions; it is not collision, comprehensive, or general appearance insurance.',
    image: '/assets/ford-official/surfacecare.png',
    imageAlt: 'Ford Protect SurfaceCARE interior and exterior protection',
    planOptions: [{ id: 'surfacecare', name: 'SurfaceCARE', summary: 'Agreement-defined interior and exterior surface protection.' }],
    highlights: ['Eligible interior stain protection', 'Eligible exterior environmental-damage protection', 'Published 2–7 year terms', 'Unlimited mileage in current public material'],
    requirements: ['Selected before the original eligible vehicle transaction is completed', 'Protectant applied and maintained as required', 'Eligible vehicle, surfaces, use, state, and provider'],
    cautions: ['Collision, ordinary wear, neglect, improper cleaning, pre-existing damage, and untreated surfaces are not automatically covered.'],
    officialSources: [{ label: 'Ford Protect SurfaceCARE', url: 'https://fordprotect.ford.com/surfacecare' }],
  }),
  purchaseOnlyCatalogProduct({
    id: 'theftcare',
    name: 'TheftCARE',
    familyId: 'theft-assistance',
    familyLabel: 'Theft deterrent and benefit',
    eyebrow: 'Add agreement-defined theft support',
    value: 'Request the eligible theft-deterrent product and benefit level while completing the original vehicle transaction.',
    description: 'A vehicle-purchase-only product with terms, deterrent treatment, benefit amount, exclusions, and claim requirements set by the current agreement.',
    image: '/assets/ford-official/theftcare.png',
    imageAlt: 'Ford Protect TheftCARE theft protection',
    planOptions: [{ id: 'theftcare', name: 'TheftCARE', summary: 'Agreement-defined theft deterrent and benefit for eligible vehicles.' }],
    highlights: ['Theft-deterrent product/application', 'Choose an eligible term and benefit level', 'Referenced guide included $2,500 and $5,000 benefit levels', 'Dealer verifies state and provider terms'],
    requirements: ['Selected before the original eligible vehicle transaction is completed', 'Eligible vehicle, use, state, provider, term, and benefit level', 'Application and documentation completed as required'],
    cautions: ['TheftCARE is not comprehensive insurance and does not replace required auto coverage.', 'Bob Maxey confirms the benefit level and current availability for the eligible vehicle transaction.'],
    officialSources: [{ label: 'Ford Protect TheftCARE', url: 'https://fordprotect.ford.com/theftcare' }],
  }),
  purchaseOnlyCatalogProduct({
    id: 'ford-credit-gap',
    name: 'Ford Credit GAP',
    familyId: 'finance-protection',
    familyLabel: 'Finance contract protection',
    eyebrow: 'Address a possible finance-balance shortfall',
    value: 'Ask whether eligible GAP protection fits the financing selected for this vehicle transaction.',
    description: 'GAP is tied to an eligible original finance contract. It is not an after-sale Ford Protect product and the finance agreement controls all benefits and exclusions.',
    image: '/assets/ford-official/ford-financing.png',
    imageAlt: 'Ford financing illustration',
    badge: 'Available with eligible financing',
    planOptions: [{ id: 'ford-credit-gap', name: 'Ford Credit GAP', summary: 'Eligible original-finance-contract protection, subject to lender and state rules.' }],
    highlights: ['Reviewed with the original finance structure', 'State and lender rules apply', 'Benefit follows the finance contract', 'Not available as a later standalone quote'],
    requirements: ['Eligible original financing transaction', 'Eligible vehicle, lender, amount financed, and state', 'Required disclosures and contract acceptance'],
    cautions: ['Not auto insurance and not a mechanical service contract.', 'Availability cannot be inferred from a Ford Protect vehicle-product rating alone.'],
  }),
  purchaseOnlyCatalogProduct({
    id: 'wearcare',
    name: 'WearCare',
    familyId: 'lease-protection',
    familyLabel: 'Lease-end wear protection',
    eyebrow: 'Plan for eligible lease-end wear',
    value: 'Ask about eligible excess-wear protection when signing the original vehicle lease.',
    description: 'WearCare is tied to an eligible original lease agreement and must be selected at lease signing. It is not an after-sale ownership product.',
    image: '/assets/ford-official/ford-why-plan.png',
    imageAlt: 'Ford vehicle ownership planning',
    badge: 'Available at eligible lease signing',
    planOptions: [{ id: 'wearcare', name: 'WearCare', summary: 'Lease-contract protection for eligible excess wear and use charges.' }],
    highlights: ['Designed for eligible lease-end charges', 'Reviewed with the original lease', 'Vehicle and lease-program rules apply', 'Not available as a later standalone quote'],
    requirements: ['Eligible original lease transaction', 'Eligible vehicle, lease program, state, and mileage allowance', 'Required lease disclosures and acceptance'],
    cautions: ['Does not waive every type of damage, mileage, disposition, or lease-end charge.', 'The lease agreement controls.'],
  }),
]);

export const getQuoteProductDefinition = (id) => quoteProducts.find((product) => product.id === id) || null;

export const createDefaultQuoteProductSelection = (productId, variantId) => {
  const product = getQuoteProductDefinition(productId);
  if (!product) return null;
  const variant = product.configuration.variants.find((item) => item.id === variantId)
    || product.configuration.variants.find((item) => item.customerSelectable)
    || product.configuration.variants[0];
  if (!variant) return { productId, variantId: null };
  return {
    productId,
    variantId: variant.id,
    termMonths: variant.defaults.termMonths ?? null,
    termMiles: variant.defaults.termMiles ?? null,
    serviceInterval: variant.defaults.serviceInterval ?? null,
    engineHours: variant.defaults.engineHours ?? null,
    benefitAmount: variant.defaults.benefitAmount ?? null,
  };
};

/** Validates only against the selected planning matrix, not live eligibility. */
export const validateQuoteProductSelection = (productId, selection = {}, { includeDealerOnly = false } = {}) => {
  const product = getQuoteProductDefinition(productId);
  if (!product) return { valid: false, code: 'unknown-product', message: 'Unknown Ford Protect product.' };
  const requestedVariantId = normalizeText(selection.variantId || selection.optionId);
  const requestedVariant = requestedVariantId
    ? product.configuration.variants.find((item) => item.id === requestedVariantId)
    : null;
  if (requestedVariantId && !requestedVariant) {
    return { valid: false, code: 'invalid-variant', message: 'Choose a product option listed for this product.' };
  }
  if (!requestedVariantId && product.configuration.variants.length > 1) {
    return { valid: false, code: 'missing-variant', message: 'Choose which product option you want Bob Maxey to review.' };
  }
  const variant = requestedVariant
    || product.configuration.variants.find((item) => item.customerSelectable)
    || product.configuration.variants[0];
  if (!variant) return { valid: false, code: 'missing-configuration', message: 'A dealer-returned configuration is required.' };
  if (!includeDealerOnly && !variant.customerSelectable) return { valid: false, code: 'dealer-rating-required', message: 'This path cannot be customer-guaranteed online; a current dealer rating result is required.' };
  if (variant.mode === 'monthly' || variant.mode === 'dealer-returned') return { valid: true, code: 'dealer-returned', message: 'The dealer-returned offer supplies the final configuration.' };

  const months = Number(selection.termMonths);
  const miles = selection.termMiles === null || selection.termMiles === undefined ? null : Number(selection.termMiles);
  const row = variant.termMileageMatrix.find((item) => item.months === months);
  if (!row) return { valid: false, code: 'invalid-term', message: 'Choose a term listed for this product.' };
  if (variant.mode !== 'term-only' && (!row.miles || !row.miles.includes(miles))) return { valid: false, code: 'invalid-term-mileage', message: 'Choose a mileage paired with the selected term.' };
  const selectedPowertrain = normalizePowertrain(selection.powertrain);
  const intervalRule = variant.serviceIntervalRules.find((item) => item.termMonths === months && item.termMiles === miles)
    || variant.serviceIntervalRules.find((item) => item.default);
  const allowedIntervals = intervalRule?.byPowertrain?.[selectedPowertrain] || variant.serviceIntervals;
  if (allowedIntervals.length && (selection.serviceInterval === null || selection.serviceInterval === undefined)) {
    return { valid: false, code: 'missing-service-interval', message: 'Choose a service interval for this maintenance plan.' };
  }
  if (selection.serviceInterval !== null && selection.serviceInterval !== undefined && allowedIntervals.length && !allowedIntervals.includes(Number(selection.serviceInterval))) {
    return { valid: false, code: 'invalid-service-interval', message: 'Choose a service interval listed for this product.' };
  }
  if (variant.engineHourLimits.length && !variant.engineHourLimits.includes(Number(selection.engineHours))) {
    return { valid: false, code: 'invalid-engine-hours', message: 'Choose the published engine-hour limit for this product.' };
  }
  if (variant.benefitAmounts.length && !variant.benefitAmounts.includes(Number(selection.benefitAmount))) {
    return { valid: false, code: 'invalid-benefit-amount', message: 'Choose an available benefit request for this product.' };
  }
  return { valid: true, code: variant.source.planningOnly ? 'planning-match' : 'selection-match', message: variant.source.notice };
};

const status = (code, eligible, label, tone, message, inspectionRequired = null) => ({
  code,
  eligible,
  label,
  tone,
  message,
  inspectionRequired,
});

const espStatus = (facts, warranty) => {
  if (facts.planPath === 'used') {
    if (warranty.inspectionRequiredForUsedEsp === false) return status('likely-fit', null, 'Used path · no inspection · verify offer', 'review', `${warranty.message} The current Ford rating result must still confirm plan availability.`, false);
    if (warranty.inspectionRequiredForUsedEsp === true) return status('inspection-required', null, 'Used path · inspection required', 'warning', warranty.message, true);
    return status('record-review', null, 'Used path · warranty review', 'review', warranty.message, null);
  }
  if (warranty.likelyWithinNewVehicleLimitedWarranty === true) return status(
    warranty.warrantyRecordConfirmed ? 'confirmed-fit' : 'likely-fit',
    null,
    warranty.warrantyRecordConfirmed ? 'Warranty window confirmed · verify offer' : 'Likely new-plan path · Ford record review',
    'review',
    `${warranty.message} The current Ford rating result must still confirm plan availability.`,
    warranty.inspectionRequiredForUsedEsp,
  );
  if (warranty.likelyWithinNewVehicleLimitedWarranty === false) return status(
    'new-plan-outside-public-window',
    false,
    'New-plan window has ended',
    'muted',
    'The entered time or mileage has reached the New Vehicle Limited Warranty boundary, so the new-plan path cannot be used. Choose the used-plan path and let Bob Maxey verify the VIN-specific offer and inspection requirement.',
    null,
  );
  return status('record-review', null, 'Ford record review', 'review', 'The in-service date or mileage is incomplete. Bob Maxey will determine whether the new- or used-plan path applies.', null);
};

const premiumMaintenanceStatus = (facts, warranty) => {
  if (warranty.likelyWithinNewVehicleLimitedWarranty === true) return status('likely-fit', null, facts.powertrain === 'electric' ? 'Premium Maintenance EV · verify offer' : 'Within public window · verify offer', 'review', 'The vehicle appears to be within Ford’s public purchase window; the VIN-specific maintenance schedule, available combination, and current offer still require confirmation.', false);
  if (warranty.likelyWithinNewVehicleLimitedWarranty === false) return status('outside-public-window', false, 'Likely outside purchase window', 'muted', 'Ford’s public FAQ says Premium Maintenance must be purchased during the New Vehicle Limited Warranty. Ask about another maintenance path.', false);
  return status('record-review', null, 'Warranty review needed', 'review', 'Bob Maxey must confirm the warranty record before presenting Premium Maintenance as available.', false);
};

const maintenanceEssentialsStatus = (facts) => {
  if (facts.powertrain === 'electric') return status('not-applicable', false, 'Choose an EV maintenance path', 'muted', 'Extra, Limited, and Basic maintenance choices are not presented for EVs. Ask about Premium Maintenance EV instead.', false);
  return status('dealer-rating-only', false, 'Dealer verification required', 'muted', 'These maintenance alternatives are not selectable online. Bob Maxey can check current availability and return the choices offered for the VIN.', false);
};

const cspStatus = (facts) => {
  if (facts.state.toLowerCase() === 'california') return status('state-unavailable', false, 'Not available in California', 'muted', 'Ford’s public CSP information says Continued Service Plan is not available in California.', false);
  const modelAge = facts.year ? facts.asOf.getFullYear() - facts.year : null;
  if ((facts.mileage !== null && facts.mileage > CSP_ENROLLMENT_LIMITS.miles) || (modelAge !== null && modelAge > CSP_ENROLLMENT_LIMITS.modelYears)) return status('outside-published-enrollment', false, 'Outside published enrollment range', 'muted', 'Ford publishes CSP enrollment eligibility up to 12 model years and 140,000 miles. A specialist can verify whether another path applies.', false);
  if (facts.priorCoverageReadiness === false) return status('qualifying-prior-coverage-not-indicated', false, 'Qualifying prior coverage is required', 'muted', 'Continued Service Plan is a continuation path for eligible OEM warranty or Ford Protect coverage. The entered answer does not indicate qualifying prior coverage.', false);
  if (facts.program === 'csp' && facts.priorCoverageReadiness === null) return status('prior-coverage-answer-required', null, 'Confirm the prior-coverage situation', 'warning', 'Tell Bob Maxey whether eligible OEM warranty or Ford Protect coverage is active, ending, or expiring. Ford records and the returned CSP offer make the final determination.', false);
  if (facts.program === 'csp') return status('selected-for-review', null, 'Selected · no inspection', 'positive', 'CSP is selected for a vehicle-specific offer. Ford’s buyer guide says no waiting period or vehicle inspection is required; Ford records must confirm the qualifying prior coverage.', false);
  return status('continuation-review', null, 'For expiring coverage', 'review', 'Consider CSP when eligible OEM warranty or Ford Protect coverage is ending. No CSP enrollment inspection is required under Ford’s current buyer guide.', false);
};

const dieselStatus = (facts) => {
  if (facts.powertrain !== 'diesel') return status('not-applicable', false, 'Diesel vehicles only', 'muted', 'Diesel EngineCARE is reserved for eligible factory-installed Power Stroke diesel applications.', null);
  const window = evaluateWindow({ facts, ...DIESEL_ENGINE_WINDOW });
  if (window.within === false) return status('outside-reference-window', false, 'Likely outside enrollment window', 'muted', 'The vehicle appears outside the 5-year/100,000-mile planning window. Engine hours and current Ford rules must also be checked.', null);
  if (facts.engineHours !== null && facts.engineHours >= DIESEL_ENGINE_HOUR_ENROLLMENT_LIMIT) return status('outside-engine-hour-window', false, 'Outside planning engine-hour window', 'muted', 'The entered engine hours have reached the 4,000-hour Diesel EngineCARE planning boundary. Bob Maxey can verify whether another current path applies.', null);
  const displacementMatch = facts.engine.match(/\b(\d(?:\.\d+)?)\s*l\b/i);
  const recognizedEngine = displacementMatch ? ['3.0', '3.2', '6.7'].includes(displacementMatch[1]) : false;
  if (displacementMatch && !recognizedEngine) return status('engine-not-in-reference-list', false, 'Engine needs another coverage path', 'muted', 'The entered diesel engine displacement is not one of the 3.0L, 3.2L, or 6.7L Power Stroke applications shown for Diesel EngineCARE planning.', null);
  if (window.within === true && recognizedEngine && facts.engineHours !== null) return status('specialist-fit', null, 'Likely specialist fit', 'positive', 'The entered time, mileage, engine, and engine-hour details appear to fit the published Diesel EngineCARE enrollment factors. Bob Maxey must confirm the current Ford offer.', null);
  return status('specialist-review', null, 'Power Stroke review', 'review', 'Enter the engine description and let Bob Maxey verify engine family, mileage, age, hours, use, and current program eligibility.', null);
};

const limitedWindowElectedPlanStatus = (facts, label) => {
  const window = evaluateWindow({ facts, ...RENTALCARE_WINDOW });
  if (window.within === false) {
    return status('outside-reference-window', false, 'Dealer verification required', 'muted', `The entered age or mileage may be outside the applicable ${label} enrollment window. Ask Bob Maxey to confirm current availability.`, false);
  }
  if (window.within === true) {
    return status('specialist-verification', null, 'Dealer verification required', 'review', `The entered vehicle details may fit a limited ${label} enrollment window. Bob Maxey must confirm current availability and return the VIN-specific benefits, terms, and price.`, false);
  }
  return status('specialist-verification', null, 'Dealer verification required', 'review', `Bob Maxey must check the warranty start date, mileage, product status, and current dealer offer before presenting ${label} as available.`, false);
};

const offRoadStatus = (facts) => {
  if (facts.purchaseContext === 'shopping') {
    if (facts.mileage !== null && facts.mileage >= OFF_ROAD_AFTER_SALE_WINDOW.miles) {
      return status('outside-off-road-window', false, 'Outside published Off-Road mileage window', 'muted', 'Ford’s current Off-Road page requires fewer than 36,000 miles. This vehicle-purchase plan cannot include an Off-Road request at the entered mileage.', false);
    }
    return status('purchase-planning', null, 'Plan with vehicle purchase · verify', 'review', 'Off-Road coverage may be considered with an eligible vehicle transaction. Bob Maxey must confirm the underlying TireCARE or TripleCARE product and the current offer.', false);
  }
  const requestFacts = { ...facts, inService: facts.purchaseDate };
  const window = evaluateWindow({ facts: requestFacts, ...OFF_ROAD_AFTER_SALE_WINDOW });
  if (window.within === false) {
    return status('outside-off-road-window', false, 'Outside published Off-Road request window', 'muted', 'Ford’s current Off-Road page describes the after-sale request only when the vehicle was purchased within 3 years and has fewer than 36,000 miles.', false);
  }
  if (window.within === true) {
    return status('off-road-verification', null, 'Limited after-sale request · verify', 'review', 'The entered purchase date and mileage fit Ford’s published request window. Bob Maxey still must confirm the eligible underlying product, vehicle, state, term, and current offer.', false);
  }
  if (facts.mileage !== null && facts.mileage >= OFF_ROAD_AFTER_SALE_WINDOW.miles) {
    return status('outside-off-road-window', false, 'Outside published Off-Road request window', 'muted', 'Ford’s current Off-Road page requires fewer than 36,000 miles for this after-sale request.', false);
  }
  return status('off-road-verification', null, 'Purchase date and dealer review needed', 'review', 'Ford’s limited after-sale Off-Road request uses the customer’s vehicle purchase date and current mileage. Bob Maxey must verify both and confirm an eligible underlying product.', false);
};

const purchaseContextStatus = (product, facts) => {
  const contexts = Array.isArray(product.purchaseContexts) ? product.purchaseContexts : ['owner'];
  if (!contexts.length || product.customerSelectable === false) return status('dealer-rating-only', false, 'Not selectable online', 'muted', 'This item is not a standalone online selection. Bob Maxey can check whether a current vehicle-specific option is available.', false);
  if (!contexts.includes(facts.purchaseContext)) {
    if (product.id === 'ford-credit-gap') return status('original-finance-only', false, 'Available only with eligible vehicle financing', 'muted', 'Ford Credit GAP must be selected with an eligible original vehicle financing transaction. It cannot be added after that financing transaction is completed.', false);
    if (product.id === 'wearcare') return status('original-lease-only', false, 'Available only when signing an eligible lease', 'muted', 'WearCare must be selected when an eligible original vehicle lease is signed. It cannot be added later as an after-sale ownership product.', false);
    if (contexts.includes('shopping')) return status('vehicle-purchase-only', false, 'Available only with vehicle purchase', 'muted', 'This product must be selected as part of the original eligible vehicle purchase transaction. It is not available as an after-sale owner request.', false);
    return status('owner-path-only', false, 'Available after ownership begins', 'muted', 'This path is designed for an existing owner or expiring-coverage situation, not as a vehicle-purchase ancillary selection.', false);
  }
  if (contexts.length === 1 && contexts[0] === 'shopping') {
    const vehicleLabel = facts.vehicleSituation === 'new-purchase' ? 'new vehicle' : 'used vehicle';
    if (product.id === 'ford-credit-gap') {
      if (!['finance', 'undecided'].includes(facts.transactionMethod)) return status('transaction-method-unavailable', false, 'Requires eligible financing', 'muted', `GAP cannot be requested when this ${vehicleLabel} transaction is marked ${facts.transactionMethod}. Choose finance or undecided only if that accurately reflects the planned transaction.`, false);
      return status('purchase-planning', null, 'Eligible financing transaction only · verify', 'review', `GAP may be considered only if this ${vehicleLabel} is being financed through an eligible original transaction. Bob Maxey must verify the lender, vehicle, amount financed, state, disclosures, and contract.`, false);
    }
    if (product.id === 'wearcare') {
      if (!['lease', 'undecided'].includes(facts.transactionMethod)) return status('transaction-method-unavailable', false, 'Requires an eligible lease', 'muted', `WearCare cannot be requested when this ${vehicleLabel} transaction is marked ${facts.transactionMethod}. Choose lease or undecided only if that accurately reflects the planned transaction.`, false);
      return status('purchase-planning', null, 'Eligible lease signing only · verify', 'review', `WearCare may be considered only if this ${vehicleLabel} is being placed on an eligible original lease. Bob Maxey must verify the vehicle, lease program, state, mileage allowance, disclosures, and agreement.`, false);
    }
    return status('purchase-planning', null, `Plan with this ${vehicleLabel} purchase · verify`, 'review', `This product may be considered before completing this eligible ${vehicleLabel} transaction. Bob Maxey must verify the VIN, product, vehicle, state, term, and agreement; this planning choice is not a confirmed offer.`, false);
  }
  return null;
};

const normalizeStateCode = (value) => {
  const normalized = normalizeText(value).toLowerCase().replace(/[^a-z]/g, '');
  const aliases = {
    fl: 'florida',
    ga: 'georgia',
    me: 'maine',
    ny: 'newyork',
    tx: 'texas',
  };
  return aliases[normalized] || normalized;
};

const purchaseOnlyStateStatus = (product, facts, selectedVariantId = '') => {
  if (facts.purchaseContext !== 'shopping') return null;
  const state = normalizeStateCode(facts.state);
  if (!state) return null;

  if (product.id === 'windshieldcare') {
    if (state === 'florida') {
      return status('state-unavailable', false, 'Not available in Florida', 'muted', 'Ford’s current WindshieldCARE information identifies Florida as unavailable. Choose another eligible product or ask Bob Maxey to confirm a current alternative.', false);
    }
    if (selectedVariantId === 'windshieldcare-plus-ev' && ['georgia', 'maine', 'newyork', 'texas'].includes(state)) {
      return status('state-unavailable', false, 'EV glass option unavailable in this state', 'muted', 'WindshieldCARE Plus EV is not offered in this planning flow for Georgia, Maine, New York, Texas, or Florida. Bob Maxey can check whether a current alternative exists.', false);
    }
  }

  if (product.id === 'triplecare-plus' && state === 'florida') {
    return status('state-unavailable', false, 'Not available in Florida', 'muted', 'Ford’s published TripleCARE Plus information identifies Florida as unavailable. Tire-and-wheel or dent coverage may have separate rules, which Bob Maxey must verify.', false);
  }

  return null;
};

const validationIssue = (code, message, {
  field = '',
  productId = '',
  eligibility = null,
  type = 'selection',
} = {}) => ({ code, message, field, productId, eligibility, type });

const primaryProductIdFor = (program, quote = {}) => {
  if (program === 'esp') return 'extended-service-plan';
  if (program === 'csp') return 'continued-service-plan';
  if (program === 'enginecare') return normalizeText(quote.engineCareLevel || quote.planId) || 'diesel-enginecare';
  return '';
};

/**
 * Validates the customer's primary-program request against known public rules
 * and the historical planning matrices. A `null` eligibility result always
 * means dealer/VIN verification is still required; this function never turns
 * planning data into a confirmed offer.
 */
export function validatePrimaryPlanEligibility(quote = {}) {
  const facts = resolveQuoteFacts(quote);
  const warranty = getWarrantyInspectionStatus(quote);
  const blockingIssues = [];
  const reviewIssues = [];
  const addBlocking = (code, message, options = {}) => blockingIssues.push(validationIssue(code, message, options));
  const addReview = (code, message, options = {}) => reviewIssues.push(validationIssue(code, message, { ...options, type: 'review' }));
  const program = facts.program;
  const productId = primaryProductIdFor(program, quote);
  let productStatus = status('program-not-selected', null, 'Choose a coverage program', 'review', 'Choose the Ford Protect coverage program you want Bob Maxey to review.', null);

  if (!facts.vehicleSituationExplicit) {
    addBlocking('vehicle-situation-required', 'Choose whether this is a new-vehicle purchase, used-vehicle purchase, or an after-sale request for a vehicle already owned.', { field: 'vehicleSituation' });
  }

  if (program === 'products-only') {
    productStatus = status('products-only-request', null, 'Ford Protect products only', 'review', 'No primary mechanical coverage is requested. Bob Maxey will verify each selected product, its purchase timing, compatibility, term, and current offer.', null);
    addReview('products-only-verification', 'Every selected product remains subject to its own vehicle, transaction, timing, state, compatibility, and current dealer-offer requirements.', { field: 'requestedProductIds' });
  } else if (!['esp', 'csp', 'enginecare'].includes(program)) {
    addBlocking('missing-program', 'Choose Extended Service Plan, Continued Service Plan, or Diesel EngineCARE.', { field: 'program' });
  } else if (program === 'esp') {
    productStatus = espStatus(facts, warranty);
    const planPath = facts.planPath;
    const planId = normalizeText(quote.planId);
    const termMonths = toFiniteNumber(quote.termMonths);
    const termMiles = toFiniteNumber(quote.termMiles);

    if (!['new', 'used'].includes(planPath)) addBlocking('missing-plan-path', 'Choose the new-plan or used-plan measurement path.', { field: 'planPath' });
    if (!planId) addBlocking('missing-plan', 'Choose an Extended Service Plan coverage level.', { field: 'planId' });
    if (productStatus.eligible === false) addBlocking(productStatus.code, productStatus.message, { field: 'planPath', eligibility: false, type: 'eligibility' });

    if (planPath && planId) {
      const matrix = getTermMatrix({ planId, planPath, mileage: facts.mileage ?? 0 });
      if (termMonths === null) addBlocking('missing-term', 'Choose a protection term.', { field: 'termMonths' });
      if (termMiles === null) addBlocking('missing-mileage-limit', 'Choose the mileage limit paired with the protection term.', { field: 'termMiles' });
      if (termMonths !== null && termMiles !== null && !matrix.isAvailable(termMonths, termMiles)) {
        addBlocking(
          matrix.months.length ? 'invalid-reference-combination' : 'no-reference-grid',
          matrix.months.length
            ? 'That term and mileage do not form an available combination for this plan and measurement path. Choose another combination shown.'
            : 'Self-service term choices are not available for this plan, measurement path, and current mileage. A specialist will help identify another supported path.',
          { field: 'termMonths', type: 'selection' },
        );
      }

      const deductibleId = normalizeText(quote.deductible);
      const deductible = deductibleOptions.find((option) => option.id === deductibleId);
      if (!deductibleId) addBlocking('missing-deductible', 'Choose a deductible to request.', { field: 'deductible' });
      else if (!deductible || !isDeductibleAvailable(deductible, { planId, planPath, termMiles })) {
        addBlocking('invalid-deductible', 'That deductible is not available for this plan, measurement path, and mileage. Choose another displayed option.', { field: 'deductible' });
      }

      const selectedBenefits = [...new Set(Array.isArray(quote.addOns) ? quote.addOns.map((id) => normalizeText(id)).filter(Boolean) : [])];
      for (const benefitId of selectedBenefits) {
        const benefit = protectionOptions.find((option) => option.id === benefitId);
        if (!benefit || !isProtectionOptionAvailable(benefit, { planId, planPath, termMonths, termMiles })) {
          addBlocking('invalid-plan-benefit', `The selected plan benefit "${benefitId}" is not available for this plan, measurement path, and term.`, { field: 'addOns' });
        }
      }

      addReview('historical-matrix-verification', matrix.notice, { field: 'termMonths' });
    }
  } else if (program === 'csp') {
    productStatus = cspStatus(facts);
    const cspLevel = normalizeText(quote.cspLevel);
    if (facts.purchaseContext !== 'owner') addBlocking('csp-owner-context-required', 'Continued Service Plan is an after-sale continuation path for a vehicle the customer already owns.', { field: 'vehicleSituation', eligibility: false, type: 'eligibility' });
    if (!CSP_LEVELS.includes(cspLevel)) addBlocking(cspLevel ? 'invalid-csp-level' : 'missing-csp-level', 'Choose Ultimate or Standard Plus for specialist review.', { field: 'cspLevel' });
    if (productStatus.eligible === false) addBlocking(productStatus.code, productStatus.message, { field: productStatus.code === 'state-unavailable' ? 'state' : 'cspPriorCoverageStatus', eligibility: false, type: 'eligibility' });
    if (facts.priorCoverageReadiness === null) {
      addBlocking('prior-coverage-answer-required', 'Indicate whether qualifying OEM warranty or Ford Protect coverage is active, ending, or expiring.', { field: 'cspPriorCoverageStatus' });
    }
    addReview('csp-record-verification', 'Ford records and the returned CSP offer must confirm prior coverage, effective date, level, deductible, monthly amount, state availability, and vehicle eligibility.', { field: 'cspPriorCoverageStatus' });
  } else {
    productStatus = dieselStatus(facts);
    const level = normalizeText(quote.engineCareLevel || quote.planId);
    if (!DIESEL_ENGINECARE_LEVELS.includes(level)) addBlocking(level ? 'invalid-enginecare-level' : 'missing-enginecare-level', 'Choose Diesel EngineCARE or Diesel EngineCARE Plus for specialist review.', { field: 'engineCareLevel' });
    if (facts.engineHours !== null && facts.engineHours < 0) addBlocking('invalid-current-engine-hours', 'Current engine hours cannot be negative.', { field: 'currentEngineHours' });
    if (productStatus.eligible === false) addBlocking(productStatus.code, productStatus.message, { field: productStatus.code.includes('hour') ? 'currentEngineHours' : productStatus.code.includes('engine') ? 'engine' : 'mileage', eligibility: false, type: 'eligibility' });
    if (!facts.engine) addReview('engine-description-verification', 'The factory-installed engine family and displacement still require Ford record review.', { field: 'engine' });
    if (facts.engineHours === null) addReview('engine-hours-verification', 'Current engine hours are not entered; Bob Maxey must verify that the vehicle is still within the 4,000-hour planning window.', { field: 'currentEngineHours' });
    addReview('enginecare-current-offer-required', 'The current VIN-specific Ford result controls Diesel EngineCARE availability and enrollment.', { field: 'engineCareLevel' });
  }

  const knownIneligible = blockingIssues.some((issue) => issue.eligibility === false);
  const validForRequest = blockingIssues.length === 0;
  return {
    valid: validForRequest,
    validForRequest,
    eligible: knownIneligible ? false : null,
    program,
    productId,
    status: productStatus,
    code: blockingIssues[0]?.code || productStatus.code,
    label: blockingIssues.length ? 'Coverage request needs attention' : productStatus.label,
    message: blockingIssues[0]?.message || productStatus.message,
    blockingIssues,
    reviewIssues,
    issues: [...blockingIssues, ...reviewIssues],
    requiredFields: [...new Set(blockingIssues.map((issue) => issue.field).filter(Boolean))],
    requiresDealerVerification: true,
    planningOnly: true,
  };
}

const productSelectionFor = (quote, productId) => {
  if (quote.productSelections?.[productId] && typeof quote.productSelections[productId] === 'object') return quote.productSelections[productId];
  if (quote.requestedProductConfigurations?.[productId] && typeof quote.requestedProductConfigurations[productId] === 'object') return quote.requestedProductConfigurations[productId];
  return {};
};

const offRoadParentIdsFor = (quote = {}) => {
  const selection = productSelectionFor(quote, 'off-road-coverage');
  return [...new Set([
    quote.offRoadUnderlyingProductId,
    quote.underlyingOffRoadProductId,
    selection.underlyingProductId,
    selection.existingProductId,
    ...(Array.isArray(quote.existingFordProtectProductIds) ? quote.existingFordProtectProductIds : []),
    ...(Array.isArray(quote.existingProductIds) ? quote.existingProductIds : []),
  ].map((id) => normalizeText(id)).filter(Boolean))];
};

/**
 * Validates every requested ancillary product in context, including its stored
 * configuration and known cross-product dependencies. Products with a `null`
 * catalog eligibility remain valid dealer-verification requests; products with
 * `false` eligibility or invalid/missing choices are rejected from output.
 */
export function validateQuoteProductRequests(quote = {}) {
  const requestedIds = [...new Set((Array.isArray(quote.requestedProductIds) ? quote.requestedProductIds : [])
    .map((id) => normalizeText(id)).filter(Boolean))];
  const catalog = getQuoteProductCatalog(quote);
  const catalogById = new Map(catalog.map((product) => [product.id, product]));
  const issuesByProduct = new Map();
  const requestIssues = [];
  const primaryIds = new Set(['extended-service-plan', 'continued-service-plan', 'diesel-enginecare', 'diesel-enginecare-plus']);
  const facts = resolveQuoteFacts(quote);
  const reject = (productId, issue) => {
    const issues = issuesByProduct.get(productId) || [];
    if (!issues.some((item) => item.code === issue.code)) issues.push(issue);
    issuesByProduct.set(productId, issues);
  };

  for (const productId of requestedIds) {
    const product = catalogById.get(productId);
    if (!product) {
      reject(productId, validationIssue('unknown-product', 'The saved product reference is not in the current customer-facing catalog.', { productId }));
      continue;
    }
    if (primaryIds.has(productId)) {
      reject(productId, validationIssue('primary-product-in-additional-list', 'Primary coverage must be selected through the coverage program, not as an additional product.', { productId }));
      continue;
    }
    if (!facts.vehicleSituationExplicit) {
      reject(productId, validationIssue('vehicle-situation-required', 'Choose whether this is a new-vehicle purchase, used-vehicle purchase, or an after-sale request before adding products.', { productId, field: 'vehicleSituation' }));
      continue;
    }
    if (product.status?.eligible === false) {
      reject(productId, validationIssue(product.status.code, product.status.message, { productId, eligibility: false, type: 'eligibility' }));
      continue;
    }
    const selection = productSelectionFor(quote, productId);
    if (selection.confirmed !== true) {
      reject(productId, validationIssue('configuration-not-confirmed', 'Review and confirm this product request before continuing.', { productId, field: `productSelections.${productId}` }));
      continue;
    }
    const configuration = validateQuoteProductSelection(productId, selection, { includeDealerOnly: false });
    if (!configuration.valid) {
      reject(productId, validationIssue(configuration.code, configuration.message, { productId, field: `productSelections.${productId}` }));
    }
  }

  const program = facts.program;
  const selectedSet = new Set(requestedIds);
  const maintenanceIds = new Set(['premium-maintenance', 'premium-maintenance-ev', 'maintenance-essentials']);
  const hasMaintenance = requestedIds.some((id) => maintenanceIds.has(id))
    || (normalizeText(quote.maintenanceId) && normalizeText(quote.maintenanceId) !== 'none');
  if (selectedSet.has('leasecare')) {
    if (['esp', 'enginecare'].includes(program)) {
      reject('leasecare', validationIssue('leasecare-mechanical-conflict', 'LeaseCARE cannot be combined here with a Core/Mechanical protection plan. Remove LeaseCARE or change the primary coverage request.', { productId: 'leasecare', type: 'conflict' }));
    }
    if (hasMaintenance) {
      reject('leasecare', validationIssue('leasecare-maintenance-conflict', 'LeaseCARE cannot be combined here with Premium Maintenance.', { productId: 'leasecare', type: 'conflict' }));
    }
    if (selectedSet.has('rentalcare')) {
      reject('leasecare', validationIssue('leasecare-rentalcare-conflict', 'LeaseCARE and RentalCARE cannot be combined in the same request.', { productId: 'leasecare', type: 'conflict' }));
    }
  }
  if (selectedSet.has('rentalcare') && (Array.isArray(quote.addOns) ? quote.addOns : []).some((id) => ['first-day', 'enhanced-rental'].includes(id))) {
    reject('rentalcare', validationIssue('rentalcare-benefit-conflict', 'RentalCARE cannot be combined with an ESP request that retains First-Day Rental or Enhanced Rental because the rental benefits overlap.', { productId: 'rentalcare', type: 'conflict' }));
  }

  if (selectedSet.has('off-road-coverage')) {
    const explicitParents = offRoadParentIdsFor(quote);
    const requestedParents = requestedIds.filter((id) => OFF_ROAD_PARENT_PRODUCTS.includes(id) && !issuesByProduct.has(id));
    const recognizedParents = [...new Set([...explicitParents, ...requestedParents])].filter((id) => OFF_ROAD_PARENT_PRODUCTS.includes(id));
    if (!recognizedParents.length) {
      reject('off-road-coverage', validationIssue('off-road-parent-required', 'Off-Road coverage requires an eligible TireCARE, TireCARE Plus, TripleCARE, or TripleCARE Plus product. Select one with this vehicle purchase or identify the eligible plan already owned.', { productId: 'off-road-coverage', field: 'offRoadUnderlyingProductId', type: 'dependency' }));
    }
  }

  const rejectedProductIds = requestedIds.filter((id) => issuesByProduct.has(id));
  const acceptedProductIds = requestedIds.filter((id) => !issuesByProduct.has(id));
  if (program === 'products-only' && acceptedProductIds.length === 0) {
    requestIssues.push(validationIssue(
      'products-only-product-required',
      'Choose and confirm at least one product that is available for this vehicle situation.',
      { field: 'requestedProductIds' },
    ));
  }
  const productResults = Object.fromEntries(requestedIds.map((id) => [id, {
    valid: !issuesByProduct.has(id),
    issues: issuesByProduct.get(id) || [],
    status: catalogById.get(id)?.status || null,
  }]));
  const issues = [
    ...requestIssues,
    ...rejectedProductIds.flatMap((id) => issuesByProduct.get(id) || []),
  ];
  const validForRequest = rejectedProductIds.length === 0 && requestIssues.length === 0;

  return {
    valid: validForRequest,
    validForRequest,
    requestedProductIds: requestedIds,
    acceptedProductIds,
    rejectedProductIds,
    productResults,
    issues,
    requiresDealerVerification: acceptedProductIds.length > 0,
  };
}

/**
 * Returns every offering with a conservative, quote-specific status. Consumers
 * can filter by `purchaseContexts` or by `status.eligible`. The complete array
 * intentionally keeps out-of-context products so the quote UI can show them as
 * disabled with a situation-specific reason instead of silently hiding them.
 */
export function getQuoteProductCatalog(quote = {}, options = {}) {
  const facts = resolveQuoteFacts({
    ...quote,
    purchaseContext: options.purchaseContext || quote.purchaseContext,
    vehicleSituation: options.vehicleSituation || quote.vehicleSituation,
  });
  const warranty = getWarrantyInspectionStatus(quote);
  return quoteProducts.map((product) => {
    const selectedVariantId = quote.productSelections?.[product.id]?.variantId;
    const selectedVariant = product.configuration?.variants?.find((item) => item.id === selectedVariantId)
      || product.configuration?.variants?.find((item) => item.customerSelectable !== false)
      || product.configuration?.variants?.[0];
    const canonicalRule = FORD_PROTECT_PRODUCT_RULES[product.id];
    let productStatus = purchaseContextStatus(product, facts);
    const stateStatus = purchaseOnlyStateStatus(product, facts, selectedVariantId);
    if (stateStatus && productStatus?.eligible !== false) productStatus = stateStatus;
    if (!productStatus) {
      switch (product.id) {
        case 'extended-service-plan': productStatus = espStatus(facts, warranty); break;
        case 'premium-maintenance': productStatus = premiumMaintenanceStatus(facts, warranty); break;
        case 'maintenance-essentials': productStatus = maintenanceEssentialsStatus(facts); break;
        case 'continued-service-plan': productStatus = cspStatus(facts); break;
        case 'diesel-enginecare': productStatus = dieselStatus(facts); break;
        case 'rentalcare': productStatus = limitedWindowElectedPlanStatus(facts, 'RentalCARE'); break;
        case 'leasecare': productStatus = limitedWindowElectedPlanStatus(facts, 'LeaseCARE'); break;
        case 'off-road-coverage': productStatus = offRoadStatus(facts); break;
        default: productStatus = status('dealer-review', null, 'Dealer review', 'review', dealerConfirmation, null);
      }
    }
    const recommended = (
      (product.id === 'extended-service-plan' && facts.program !== 'csp')
      || (product.id === 'continued-service-plan' && facts.program === 'csp')
      || (product.id === 'diesel-enginecare' && facts.powertrain === 'diesel')
    );
    const timing = getProductTimingPresentation(product, { selectedVariantId });
    return {
      ...product,
      purchaseTiming: timing.code,
      purchaseTimingLabel: timing.shortLabel,
      purchaseTimingDetail: timing.detail,
      purchaseWindow: timing.purchaseWindow,
      coverageStart: timing.coverageStart,
      currentPublicStatus: selectedVariant?.currentPublicStatus
        || canonicalRule?.currentPublicStatus
        || product.currentPublicStatus,
      purchaseContext: facts.purchaseContext,
      vehicleSituation: facts.vehicleSituation,
      recommended,
      status: productStatus,
      presentationBadges: [product.badge, productStatus.label, recommended ? 'Recommended for review' : null].filter(Boolean),
    };
  });
}
