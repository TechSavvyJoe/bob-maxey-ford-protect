const FORD_NVLW = Object.freeze({ months: 36, miles: 36000 });
const LINCOLN_NVLW = Object.freeze({ months: 48, miles: 50000 });
const RENTALCARE_WINDOW = Object.freeze({ months: 36, miles: 36000 });
const DIESEL_ENGINE_WINDOW = Object.freeze({ months: 60, miles: 100000 });

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

const GUIDE_SOURCE = Object.freeze({
  kind: 'historical-retail-guide',
  title: 'Ford/Lincoln Protect MI Retail Price Book',
  edition: 'September 2024',
  planningOnly: true,
  notice: 'Historical Michigan guide data is used to organize planning choices only. It is not a current price book or a promise that a product, term, mileage, option, or combination is available. Ford records and the current VIN-specific dealer rating result control.',
});

const CURRENT_SOURCE = Object.freeze({
  kind: 'current-public-ford',
  title: 'Current Ford Protect public product information',
  planningOnly: false,
  notice: 'Current public product pages establish the customer-facing purchase-timing hierarchy. The current dealer rating result and issued agreement still control VIN-specific eligibility and terms.',
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
const RENTALCARE_MATRIX = termMileageMatrix({
  24: [15000, 36000],
  27: [36000, 45000],
  36: [22500, 36000, 45000],
  39: [45000, 50000],
  48: [50000, 60000],
});
const LEASECARE_MATRIX = termMileageMatrix({
  24: [15000, 24000],
  27: [30000, 36000],
  36: [22500, 36000, 45000, 50000, 55000, 60000],
  39: [39000, 45000, 55000, 60000],
  48: [50000, 55000, 60000],
});

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
    inspection: 'For an ESP used-plan enrollment: no used-vehicle inspection while within the New Vehicle Limited Warranty; outside it, a Bob Maxey Used Vehicle Inspection Checklist is required before finalization.',
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
    coverageStart: 'Historical guide basis: original warranty start date and zero miles; expires at the earlier selected time or mileage.',
    purchaseWindow: 'Current public rule: purchase during the New Vehicle Limited Warranty. The September 2024 guide contains a broader historical 5-month/5,000-mile-from-expiration rule; use the current Ford rating result, not the historical window.',
    inspection: 'No separate maintenance-plan enrollment inspection is represented; vehicle and program eligibility still require Ford review.',
    compatibility: ['Gas, hybrid, plug-in hybrid, and eligible diesel.', 'Full-synthetic oil option is required when the vehicle specifies full synthetic oil.', 'Exact matrix is historical planning data.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  'premium-maintenance-ev': configurationRule({
    id: 'premium-maintenance-ev', label: 'Premium Maintenance EV', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale-within-nvlw',
    selectionModel: 'term-mileage-service-interval', termMileage: PREMIUM_MAINTENANCE_EV_MATRIX, serviceIntervals: [10000],
    coverageStart: 'Historical guide basis: original warranty start date and zero miles; expires at the earlier selected time or mileage.',
    purchaseWindow: 'Current public rule: purchase during the New Vehicle Limited Warranty; current VIN review controls.',
    inspection: 'No separate maintenance-plan enrollment inspection is represented.',
    compatibility: ['Electric vehicles only.', 'Do not duplicate maintenance already bundled with an eligible PremiumCARE Plus EV plan.', 'Exact matrix is historical planning data.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  'extra-maintenance': configurationRule({
    id: 'extra-maintenance', label: 'Extra Maintenance Plan', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'dealer-confirmed-after-sale-window',
    currentPublicStatus: 'historical-rating-system-only', selectionModel: 'powertrain-term-mileage-service-interval', termMileage: EXTRA_MAINTENANCE_MATRIX, serviceIntervals: [5000, 7500, 10000],
    coverageStart: 'Historical guide basis: original warranty start date and zero miles; expires at the earlier selected time or mileage.',
    purchaseWindow: 'September 2024 guide: within 5 months/5,000 miles from expiration of the New Vehicle Limited Warranty. Current public Ford sources do not independently verify this grid/window.',
    inspection: 'No separate maintenance-plan enrollment inspection is stated in the historical guide.',
    compatibility: ['Non-EV only.', 'Vehicles requiring full synthetic oil were excluded in the referenced guide.', 'Do not customer-guarantee this path until the current dealer rating system returns it.'], customerSelectable: false,
  }),
  'limited-maintenance': configurationRule({
    id: 'limited-maintenance', label: 'Limited Maintenance Plan', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'historically-any-time-during-ownership',
    currentPublicStatus: 'historical-rating-system-only', selectionModel: 'powertrain-term-mileage-service-interval', termMileage: LIMITED_MAINTENANCE_MATRIX, serviceIntervals: [3000, 5000, 7500, 10000], serviceIntervalRules: LIMITED_MAINTENANCE_INTERVAL_RULES,
    coverageStart: 'Historical guide basis: signature date and current odometer.', purchaseWindow: 'September 2024 guide: any time during vehicle ownership. Current public Ford sources do not independently verify this grid/window.',
    inspection: 'No separate maintenance-plan enrollment inspection is stated in the historical guide.',
    compatibility: ['Gas/hybrid intervals: 3,000/5,000/7,500/10,000 miles by combination.', 'Diesel intervals: 5,000/7,500/10,000 miles by combination.', 'EV and fuel-cell vehicles excluded in the referenced guide.', 'Do not customer-guarantee until returned by the current dealer rating system.'], customerSelectable: false,
  }),
  'basic-maintenance': configurationRule({
    id: 'basic-maintenance', label: 'Basic Maintenance Plan', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'historically-any-time-during-ownership',
    currentPublicStatus: 'historical-rating-system-only', selectionModel: 'powertrain-term-mileage-service-interval', termMileage: BASIC_MAINTENANCE_MATRIX, serviceIntervals: [3000, 5000, 7500, 10000], serviceIntervalRules: BASIC_MAINTENANCE_INTERVAL_RULES,
    coverageStart: 'Historical guide basis: signature date and current odometer.', purchaseWindow: 'September 2024 guide: any time during vehicle ownership. Current public Ford sources do not independently verify this grid/window.',
    inspection: 'No separate maintenance-plan enrollment inspection is stated in the historical guide.',
    compatibility: ['Gas/hybrid intervals: 3,000/5,000/7,500/10,000 miles by combination.', 'Diesel intervals: 5,000/7,500/10,000 miles by combination.', 'Full-synthetic-oil, EV, and fuel-cell vehicles excluded in the referenced guide.', 'Do not customer-guarantee until returned by the current dealer rating system.'], customerSelectable: false,
  }),
  'diesel-enginecare-plus': configurationRule({
    id: 'diesel-enginecare-plus', label: 'Diesel EngineCARE Plus', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale-within-diesel-warranty',
    selectionModel: 'fixed-time-mileage-hours', termMileage: termMileageMatrix({ 84: [200000] }), serviceIntervals: [], engineHourLimits: [8000],
    coverageStart: 'Historical guide basis: original warranty start date and zero miles/engine hours; expires at the earliest selected time, mileage, or equivalent engine hours.',
    purchaseWindow: 'Within the 5-year/100,000-mile/4,000-hour diesel engine warranty under the September 2024 guide; current Ford rating result controls.',
    inspection: 'Any record or inspection requirement is established by the current Ford program.',
    compatibility: ['Eligible factory-installed 3.0L, 3.2L, or 6.7L Power Stroke diesel.', 'Fixed referenced limit: 7 years/200,000 miles/8,000 hours.', 'Current availability requires specialist review.'],
  }),
  'diesel-enginecare': configurationRule({
    id: 'diesel-enginecare', label: 'Diesel EngineCARE', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale-within-diesel-warranty',
    selectionModel: 'fixed-time-mileage-hours', termMileage: termMileageMatrix({ 84: [200000] }), serviceIntervals: [], engineHourLimits: [8000],
    coverageStart: 'Historical guide basis: original warranty start date and zero miles/engine hours; expires at the earliest selected time, mileage, or equivalent engine hours.',
    purchaseWindow: 'Within the 5-year/100,000-mile/4,000-hour diesel engine warranty under the September 2024 guide; current Ford rating result controls.',
    inspection: 'Any record or inspection requirement is established by the current Ford program.',
    compatibility: ['Eligible factory-installed 3.0L, 3.2L, or 6.7L Power Stroke diesel.', 'Fixed referenced limit: 7 years/200,000 miles/8,000 hours.', 'Current availability requires specialist review.'],
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
    id: 'rentalcare', label: 'RentalCARE', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale-before-3yr-36k', currentPublicStatus: 'dealer-rating-required', selectionModel: 'term-mileage', termMileage: RENTALCARE_MATRIX,
    coverageStart: 'Coverage begins at the warranty start date and zero miles and ends at the earlier selected time or mileage.', purchaseWindow: 'Must be purchased before the earlier of 3 years or 36,000 miles from the Warranty Start Date. Current program availability requires Bob Maxey confirmation.', inspection: 'The referenced materials do not establish a separate used-vehicle inspection requirement for RentalCARE.',
    compatibility: ['Cannot be combined with another plan that already provides rental benefits under the referenced guide.', 'Vehicle, state, term, mileage, options, and current program availability require a dealer rating result.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  leasecare: configurationRule({
    id: 'leasecare', label: 'LeaseCARE', purchaseContexts: ['shopping', 'owner'], purchaseTiming: 'vehicle-purchase-or-after-sale-before-3yr-36k', currentPublicStatus: 'dealer-rating-required', selectionModel: 'term-mileage', termMileage: LEASECARE_MATRIX,
    coverageStart: 'Coverage begins at the warranty start date and zero miles and ends at the earlier selected time or mileage.', purchaseWindow: 'Must be purchased before the earlier of 3 years or 36,000 miles from the Warranty Start Date. Current program availability requires Bob Maxey confirmation.', inspection: 'The referenced materials do not establish a separate used-vehicle inspection requirement for LeaseCARE.',
    compatibility: ['Cannot be combined with a Core/Mechanical plan, Premium Maintenance, or RentalCARE under the referenced guide.', 'Vehicle, state, term, mileage, options, and current program availability require a dealer rating result.'], source: CURRENT_SOURCE, configurationSource: GUIDE_SOURCE,
  }),
  'key-services': configurationRule({
    id: 'key-services', label: 'Key Services', purchaseContexts: [], purchaseTiming: 'agreement-option-not-standalone', currentPublicStatus: 'plan-option-only', selectionModel: 'parent-plan-option',
    coverageStart: 'Follows the parent plan agreement.', purchaseWindow: 'Selected only as an eligible option within a parent Ford Protect plan.', inspection: 'Follows the parent product.',
    compatibility: ['Do not present as an independent product.', 'Availability and limits follow the parent agreement.'], source: CURRENT_SOURCE, customerSelectable: false,
  }),
});

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
  rentalcare: { variantId: 'rentalcare', termMonths: 36, termMiles: 36000 },
  leasecare: { variantId: 'leasecare', termMonths: 36, termMiles: 36000 },
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
  const asOf = toDate(quote.asOfDate) ?? new Date();
  const powertrain = normalizePowertrain(readVehicleValue(quote, ['powertrain', 'fuelType', 'engineType']));
  const state = normalizeText(readVehicleValue(quote, ['state', 'registrationState']));
  const planPath = normalizeText(quote.planPath).toLowerCase();
  const program = normalizeText(quote.program).toLowerCase();
  const engine = normalizeText(readVehicleValue(quote, ['engine', 'engineDescription', 'engineSize']));
  const purchaseContextValue = normalizeText(quote.purchaseContext || quote.customerContext || quote.ownershipStage).toLowerCase();
  const purchaseContext = /shop|before|pre.?sale|vehicle.?purchase|buying|leasing/.test(purchaseContextValue) ? 'shopping' : 'owner';
  return { make, year, mileage, inService, asOf, powertrain, state, planPath, program, engine, purchaseContext };
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
  let code = evaluated.code === 'within' ? 'within-nvlw' : evaluated.code === 'outside' ? 'outside-nvlw' : 'unknown';
  let likelyWithin = evaluated.within;

  // Model year is used only for a conservative fallback when the in-service
  // date is missing. Boundary years remain unknown because vehicles can be sold
  // before or after their model year.
  if (evaluated.code === 'unknown' && !facts.inService && facts.year) {
    const warrantyYears = limits.months / 12;
    const modelAge = facts.asOf.getFullYear() - facts.year;
    if (modelAge > warrantyYears + 1) {
      code = 'likely-outside-nvlw';
      likelyWithin = false;
    } else if (modelAge <= 1 && (facts.mileage === null || facts.mileage < limits.miles)) {
      code = 'likely-within-nvlw';
      likelyWithin = true;
    }
  }

  const inspectionRequired = likelyWithin === false ? true : likelyWithin === true ? false : null;
  const label = likelyWithin === true
    ? 'Likely within factory warranty'
    : likelyWithin === false
      ? 'Likely outside factory warranty'
      : 'Warranty record review needed';
  const message = likelyWithin === true
    ? 'For an ESP used-plan enrollment completed while the vehicle remains within the New Vehicle Limited Warranty, no used-vehicle inspection is required.'
    : likelyWithin === false
      ? 'For an ESP used-plan enrollment outside the New Vehicle Limited Warranty, a Bob Maxey Used Vehicle Inspection Checklist is required before coverage can be finalized.'
      : 'Bob Maxey must confirm the original in-service date and current Ford warranty record. The result determines whether an ESP used-plan inspection is required.';

  return {
    code,
    label,
    tone: likelyWithin === true ? 'positive' : likelyWithin === false ? 'warning' : 'review',
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
    { title: 'After the vehicle sale', items: ['Current Ford public information identifies this product as available only with the original eligible vehicle transaction.', 'It will not appear in the after-sale owner catalog.'] },
  ],
  eligibility: {
    headline: 'Plan it before the eligible vehicle transaction is completed.',
    requirements,
    dealerConfirmation,
    inspectionPolicy: 'This is not an after-sale ESP enrollment path; product-specific transaction and vehicle eligibility rules apply.',
  },
  cautions: [...cautions, 'Historical guide terms are planning references only. The current VIN-specific dealer result and issued agreement control.'],
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
      { title: 'Inspection rule', items: ['No Bob Maxey Used Vehicle Inspection Checklist is required for ESP used-plan enrollment while the vehicle remains within the New Vehicle Limited Warranty.', 'Outside the New Vehicle Limited Warranty, the checklist is required before an ESP used plan can be finalized.'] },
    ],
    eligibility: {
      headline: 'New- and used-plan eligibility is determined from the Ford vehicle record.',
      requirements: ['VIN and current odometer', 'Original in-service date', 'Registration state and vehicle use', 'Required inspection when outside the New Vehicle Limited Warranty'],
      dealerConfirmation,
      inspectionPolicy: 'For ESP used-plan enrollment: no used-vehicle inspection while within the New Vehicle Limited Warranty; outside it, a Bob Maxey Used Vehicle Inspection Checklist is required before coverage can be finalized.',
    },
    cautions: ['This site organizes likely choices but does not reproduce Ford’s live rating system.', 'The issued agreement controls covered components, exclusions, start rules, deductible, term, and benefits.'],
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
    highlights: ['Scheduled maintenance based on the vehicle’s maintenance guide', 'Multipoint inspections and tire rotations', 'Selected wear items such as brake pads, belts, hoses, shocks or struts, and wiper blades where included', '$0 deductible for covered maintenance'],
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
      { id: 'limited-maintenance', name: 'Limited Maintenance Plan', summary: 'Eligible oil and filter service, multipoint inspection, tire rotation, and scheduled diesel exhaust fluid top-off.' },
      { id: 'basic-maintenance', name: 'Basic Maintenance Plan', summary: 'Eligible oil and filter service, multipoint inspection, and tire rotation with narrower vehicle eligibility.' },
    ],
    highlights: ['A simpler routine-service path may be available when full Premium Maintenance is not the right fit', 'Limited and Basic plan structures are recognized in Ford’s maintenance terms', 'The supplied September 2024 Michigan guide describes Limited and Basic plans as purchasable during vehicle ownership', 'Bob Maxey selects the current eligible level rather than promising an unavailable plan'],
    detailSections: [
      { title: 'Important differences', items: ['Extra Maintenance includes listed wear items but has narrower vehicle and purchase rules.', 'Limited Maintenance includes a focused scheduled-service package.', 'Basic Maintenance has the narrowest package and excludes vehicles requiring full-synthetic oil under the referenced guide.'] },
      { title: 'Service and transfer rules', items: ['Extra and Basic plans can carry selling-dealer service restrictions.', 'Limited and Basic plans are nontransferable under the referenced Ford maintenance terms.', 'The current Ford offer and agreement must confirm every rule.'] },
    ],
    eligibility: {
      headline: 'These are dealer-matched maintenance requests, not guaranteed online selections.',
      requirements: ['Eligible non-EV powertrain', 'Oil specification and maintenance schedule review', 'Current Ford program availability', 'Selling-dealer and transfer terms acknowledged'],
      dealerConfirmation,
      inspectionPolicy: 'A used-vehicle inspection is not presented as a maintenance-plan enrollment requirement; plan, vehicle, oil, and service eligibility still require review.',
    },
    cautions: ['Extra and Basic Maintenance exclude EVs and vehicles requiring full-synthetic oil under the referenced program materials.', 'The September 2024 Michigan guide is historical planning evidence, not current pricing or guaranteed availability.'],
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
      { id: 'diesel-enginecare-plus', name: 'Diesel EngineCARE Plus', summary: 'The broader listed-component diesel engine protection level in the referenced Ford guide.' },
      { id: 'diesel-enginecare', name: 'Diesel EngineCARE', summary: 'A focused listed-component diesel engine protection level in the referenced Ford guide.' },
    ],
    highlights: ['Designed around eligible factory-installed Power Stroke diesel engines', 'The referenced guide identifies 3.0L, 3.2L, and 6.7L Power Stroke applications', 'The referenced enrollment window is during the applicable 5-year/100,000-mile/4,000-hour diesel engine warranty', 'Current engine, hours, use, and program rules require specialist confirmation'],
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
    cautions: ['The 5-year/100,000-mile/4,000-hour and engine-size references come from the supplied September 2024 Michigan guide and must be re-confirmed.', 'This catalog does not promise current terms or pricing.'],
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
    eyebrow: 'Help stay moving during qualifying repairs',
    value: 'Request rental assistance for qualifying warranty, recall, customer-satisfaction, or covered repairs.',
    description: 'RentalCARE is an elected Ford Protect plan with a limited enrollment window, a $0 referenced deductible, and term/mileage combinations that must be returned by the current dealer system.',
    image: '/assets/ford-official/ford-why-1.png',
    imageAlt: 'Ford vehicle from official Ford Protect marketing media',
    badge: 'Limited purchase window',
    requestMode: 'specialist-request',
    powertrains: ['gas', 'hybrid', 'plug-in-hybrid', 'diesel', 'electric'],
    warrantyApplicability: ['within-3-years-36000-miles'],
    catalogBadges: ['After-sale request', 'Rental support', 'Dealer verification'],
    planOptions: [
      { id: 'rentalcare', name: 'RentalCARE', summary: 'Agreement-defined rental reimbursement for qualifying repairs, with $0 deductible under the referenced terms.' },
    ],
    highlights: ['The referenced agreement provides up to three rental days for qualifying repairs', 'Qualifying events can include covered repairs, New Vehicle Limited Warranty repairs, recalls, or customer-satisfaction programs', 'The supplied guide limits purchase to the earlier of 3 years or 36,000 miles', 'Exact reimbursement, provider, term, and availability come from the current agreement'],
    detailSections: [
      { title: 'When it may help', items: ['Provides a mobility benefit when a qualifying repair keeps the vehicle at the dealership.', 'A longer RentalCARE term can include agreement-defined PremiumCARE component coverage after the referenced warranty period.'] },
      { title: 'Why this is specialist-confirmed', items: ['Ford does not currently feature RentalCARE in its normal public quote flow.', 'Bob Maxey must confirm that the product remains available for the VIN, state, and purchase date.'] },
    ],
    eligibility: {
      headline: 'A limited-window request that must be confirmed before it appears in a customer proposal.',
      requirements: ['Within the referenced earlier-of 3-year/36,000-mile purchase window', 'Eligible vehicle and registration state', 'Current RentalCARE program and agreement available'],
      dealerConfirmation,
      inspectionPolicy: 'No separate used-vehicle inspection rule is represented for RentalCARE; Bob Maxey must confirm all current enrollment requirements.',
    },
    cautions: ['Do not present RentalCARE as available until a current Ford/dealer offer confirms it.', 'Rental-day and reimbursement amounts can change by agreement and jurisdiction.'],
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
    eyebrow: 'Repair and convenience choices in one plan',
    value: 'Request a $0-deductible elected plan with agreement-defined repair, mobility, lighting, pickup-and-delivery, or key-service choices.',
    description: 'The supplied Ford retail guide treats LeaseCARE as an elected plan for an eligible vehicle within a limited enrollment window. The current dealer offer controls which benefits, terms, and mileage limits can be issued.',
    image: '/assets/ford-official/ford-why-2.png',
    imageAlt: 'Ford owner receiving dealership support from official Ford Protect marketing media',
    badge: 'Limited purchase window',
    requestMode: 'specialist-request',
    powertrains: ['gas', 'hybrid', 'plug-in-hybrid', 'diesel', 'electric'],
    warrantyApplicability: ['within-3-years-36000-miles'],
    catalogBadges: ['Vehicle purchase or limited after-sale request', '$0 referenced deductible', 'Dealer verification'],
    planOptions: [
      { id: 'leasecare', name: 'LeaseCARE', summary: 'A specialist-verified elected plan with term/mileage choices and agreement-defined benefit selections.' },
    ],
    highlights: ['The supplied guide uses a $0 deductible', 'Purchase before the earlier of 3 years or 36,000 miles from warranty start', 'Coverage begins at warranty start and zero miles', 'Term and mileage choices require a current Ford/dealer result'],
    detailSections: [
      { title: 'What the request can explore', items: ['Agreement-defined repair coverage', 'Rental or pickup-and-delivery support where elected', 'Lighting or key-service choices where returned', 'A term and mileage combination that fits the ownership plan'] },
      { title: 'What Bob Maxey verifies', items: ['Current LeaseCARE program availability', 'VIN, warranty start, mileage, and registration state', 'Available elected benefits and compatible products', 'Current term, mileage, price, and issued agreement'] },
    ],
    eligibility: {
      headline: 'A limited-window elected-plan request for an eligible vehicle.',
      requirements: ['Before the earlier of 3 years or 36,000 miles from warranty start', 'Eligible vehicle and registration state', 'Current LeaseCARE program, elected benefits, and agreement available'],
      dealerConfirmation,
      inspectionPolicy: 'The referenced LeaseCARE material does not establish the ESP used-plan inspection rule for this product. Bob Maxey verifies all current enrollment requirements.',
    },
    cautions: ['The referenced guide does not allow LeaseCARE to be combined with a Core/Mechanical plan, Premium Maintenance, or RentalCARE.', 'Do not present LeaseCARE benefits, combinations, or price as available until the current Ford/dealer offer confirms them.'],
    officialSources: [
      { label: 'Ford Protect agreement library', url: 'https://fordprotect.ford.com/fl8250contract' },
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
    cautions: ['Carbon-fiber, chrome/chrome-clad, oversized, modified, off-road, commercial, or specialty applications can have exclusions or require a specific option.', 'The historical guide’s 1- through 8-year matrix must not override the current public up-to-seven-year presentation.'],
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
    highlights: ['Paintless dent repair for eligible damage', 'Helps preserve the factory finish', '$0 deductible in referenced Ford material', 'Mobile or dealer service may be available under the agreement'],
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
    cautions: ['TheftCARE is not comprehensive insurance and does not replace required auto coverage.', 'The historical guide benefit levels are not a promise of current availability.'],
    officialSources: [{ label: 'Ford Protect TheftCARE', url: 'https://fordprotect.ford.com/theftcare' }],
  }),
  purchaseOnlyCatalogProduct({
    id: 'ford-credit-gap',
    name: 'Ford Credit GAP',
    familyId: 'finance-protection',
    familyLabel: 'Finance contract protection',
    eyebrow: 'Address a possible finance-balance shortfall',
    value: 'Ask whether eligible GAP protection fits the financing selected for the new vehicle transaction.',
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
  const variant = product.configuration.variants.find((item) => item.id === selection.variantId)
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
    if (warranty.inspectionRequiredForUsedEsp === false) return status('likely-fit', true, 'Used path · no inspection', 'positive', warranty.message, false);
    if (warranty.inspectionRequiredForUsedEsp === true) return status('inspection-required', null, 'Used path · inspection required', 'warning', warranty.message, true);
    return status('record-review', null, 'Used path · warranty review', 'review', warranty.message, null);
  }
  if (warranty.likelyWithinNewVehicleLimitedWarranty === true) return status('likely-fit', true, 'Likely new-plan fit', 'positive', 'The vehicle appears to be within the public new-plan purchase window. Ford records must confirm the exact plan and combinations.', false);
  if (warranty.likelyWithinNewVehicleLimitedWarranty === false) return status('used-path-review', null, 'Explore the used-plan path', 'warning', 'The vehicle appears outside the public new-plan window. A used ESP may still be requestable, and the Bob Maxey Used Vehicle Inspection Checklist is required before coverage can be finalized.', true);
  return status('record-review', null, 'Ford record review', 'review', 'The in-service date or mileage is incomplete. Bob Maxey will determine whether the new- or used-plan path applies.', null);
};

const premiumMaintenanceStatus = (facts, warranty) => {
  if (warranty.likelyWithinNewVehicleLimitedWarranty === true) return status('likely-fit', true, facts.powertrain === 'electric' ? 'Premium Maintenance EV' : 'Likely available within warranty', 'positive', 'The vehicle appears to be within Ford’s public purchase window; the maintenance schedule and current offer must still be confirmed.', false);
  if (warranty.likelyWithinNewVehicleLimitedWarranty === false) return status('outside-public-window', false, 'Likely outside purchase window', 'muted', 'Ford’s public FAQ says Premium Maintenance must be purchased during the New Vehicle Limited Warranty. Ask about another maintenance path.', false);
  return status('record-review', null, 'Warranty review needed', 'review', 'Bob Maxey must confirm the warranty record before presenting Premium Maintenance as available.', false);
};

const maintenanceEssentialsStatus = (facts) => {
  if (facts.powertrain === 'electric') return status('not-applicable', false, 'Choose an EV maintenance path', 'muted', 'Extra, Limited, and Basic maintenance choices are not presented for EVs. Ask about Premium Maintenance EV instead.', false);
  return status('dealer-rating-only', false, 'Dealer rating required', 'muted', 'Extra, Limited, and Basic maintenance matrices come from the September 2024 guide and are not independently verified by current public Ford sources. Bob Maxey may check the current dealer rating system, but these choices are not customer-guaranteed online.', false);
};

const cspStatus = (facts) => {
  if (facts.state.toLowerCase() === 'california') return status('state-unavailable', false, 'Not available in California', 'muted', 'Ford’s public CSP information says Continued Service Plan is not available in California.', false);
  const modelAge = facts.year ? facts.asOf.getFullYear() - facts.year : null;
  if ((facts.mileage !== null && facts.mileage > 140000) || (modelAge !== null && modelAge > 12)) return status('outside-published-enrollment', false, 'Outside published enrollment range', 'muted', 'Ford publishes CSP enrollment eligibility up to 12 model years and 140,000 miles. A specialist can verify whether another path applies.', false);
  if (facts.program === 'csp') return status('selected-for-review', null, 'Selected · no inspection', 'positive', 'CSP is selected for a vehicle-specific offer. Ford’s buyer guide says no waiting period or vehicle inspection is required.', false);
  return status('continuation-review', null, 'For expiring coverage', 'review', 'Consider CSP when eligible OEM warranty or Ford Protect coverage is ending. No CSP enrollment inspection is required under Ford’s current buyer guide.', false);
};

const dieselStatus = (facts) => {
  if (facts.powertrain !== 'diesel') return status('not-applicable', false, 'Diesel vehicles only', 'muted', 'Diesel EngineCARE is reserved for eligible factory-installed Power Stroke diesel applications.', null);
  const window = evaluateWindow({ facts, ...DIESEL_ENGINE_WINDOW });
  if (window.within === false) return status('outside-reference-window', false, 'Likely outside reference window', 'muted', 'The vehicle appears outside the referenced 5-year/100,000-mile window. Engine hours and current Ford rules must also be checked.', null);
  const recognizedEngine = /\b(3\.0|3\.2|6\.7)\s*l\b|power\s*stroke/i.test(facts.engine);
  if (window.within === true && recognizedEngine) return status('specialist-fit', null, 'Likely specialist fit', 'positive', 'The entered details align with the historical guide’s basic diesel window. Bob Maxey must confirm engine hours and the current Ford offer.', null);
  return status('specialist-review', null, 'Power Stroke review', 'review', 'Enter the engine description and let Bob Maxey verify engine family, mileage, age, hours, use, and current program eligibility.', null);
};

const limitedWindowElectedPlanStatus = (facts, label) => {
  const window = evaluateWindow({ facts, ...RENTALCARE_WINDOW });
  if (window.within === false) {
    return status('outside-reference-window', false, 'Outside referenced enrollment window', 'muted', `${label} must be purchased before the earlier of 3 years or 36,000 miles from the warranty start date under the supplied Ford retail guide.`, false);
  }
  if (window.within === true) {
    return status('specialist-verification', true, 'Request specialist verification', 'positive', `The vehicle appears to be within the referenced ${label} enrollment window. Bob Maxey must confirm the current VIN-specific program, available combinations, benefits, and price.`, false);
  }
  return status('specialist-verification', null, 'Warranty record review', 'review', `Enter the warranty start date and mileage so Bob Maxey can check the referenced ${label} enrollment window and current Ford/dealer offer.`, false);
};

const purchaseContextStatus = (product, facts) => {
  const contexts = Array.isArray(product.purchaseContexts) ? product.purchaseContexts : ['owner'];
  if (!contexts.length || product.customerSelectable === false) return status('dealer-rating-only', false, 'Not a standalone customer selection', 'muted', 'This historical, agreement-level, or dealer-returned item is not a standalone customer-selectable product. Bob Maxey can verify whether the current Ford system returns an eligible path.', false);
  if (!contexts.includes(facts.purchaseContext)) {
    if (contexts.includes('shopping')) return status('vehicle-purchase-only', false, 'Available only with vehicle purchase', 'muted', 'This product must be selected as part of the original eligible vehicle purchase, financing, or lease transaction. It is not available as an after-sale owner request.', false);
    return status('owner-path-only', false, 'Available after ownership begins', 'muted', 'This path is designed for an existing owner or expiring-coverage situation, not as a vehicle-purchase ancillary selection.', false);
  }
  if (contexts.length === 1 && contexts[0] === 'shopping') return status('purchase-planning', true, 'Add to vehicle-purchase plan', 'positive', 'This product can be considered before completing the eligible original vehicle transaction. Bob Maxey must verify the current product, vehicle, state, term, and agreement.', false);
  return null;
};

/**
 * Returns every offering with a conservative, quote-specific status. Consumers
 * can filter by `purchaseContexts` or by `status.eligible`. `shopping` includes
 * original-transaction products; `owner` includes only products Ford permits
 * after the vehicle transaction.
 */
export function getQuoteProductCatalog(quote = {}, options = {}) {
  const facts = resolveQuoteFacts({ ...quote, purchaseContext: options.purchaseContext || quote.purchaseContext });
  const warranty = getWarrantyInspectionStatus(quote);
  return quoteProducts.map((product) => {
    let productStatus = purchaseContextStatus(product, facts);
    if (!productStatus) {
      switch (product.id) {
        case 'extended-service-plan': productStatus = espStatus(facts, warranty); break;
        case 'premium-maintenance': productStatus = premiumMaintenanceStatus(facts, warranty); break;
        case 'maintenance-essentials': productStatus = maintenanceEssentialsStatus(facts); break;
        case 'continued-service-plan': productStatus = cspStatus(facts); break;
        case 'diesel-enginecare': productStatus = dieselStatus(facts); break;
        case 'rentalcare': productStatus = limitedWindowElectedPlanStatus(facts, 'RentalCARE'); break;
        case 'leasecare': productStatus = limitedWindowElectedPlanStatus(facts, 'LeaseCARE'); break;
        default: productStatus = status('dealer-review', null, 'Dealer review', 'review', dealerConfirmation, null);
      }
    }
    const recommended = (
      (product.id === 'extended-service-plan' && facts.program !== 'csp')
      || (product.id === 'continued-service-plan' && facts.program === 'csp')
      || (product.id === 'diesel-enginecare' && facts.powertrain === 'diesel')
    );
    return {
      ...product,
      purchaseContext: facts.purchaseContext,
      recommended,
      status: productStatus,
      presentationBadges: [product.badge, productStatus.label, recommended ? 'Recommended for review' : null].filter(Boolean),
    };
  });
}
