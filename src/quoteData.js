export const NEW_PLAN_MATRICES = {
  premium: {
    months: [36, 48, 60, 72, 84, 96, 108, 120],
    miles: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000, 175000],
    isAvailable: (months, miles) => !(months === 36 && miles === 36000),
  },
  extra: {
    months: [36, 48, 60, 72, 84, 96, 108, 120],
    miles: [36000, 48000, 60000, 75000, 100000, 125000, 150000, 175000],
    isAvailable: (months, miles) => !(months === 36 && miles === 36000),
  },
  base: {
    months: [36, 48, 60, 72, 84, 96, 108, 120],
    miles: [36000, 48000, 60000, 75000, 100000, 125000, 150000, 175000],
    isAvailable: (months, miles) => !(months === 36 && miles === 36000),
  },
  powertrain: {
    months: [36, 48, 60, 72, 84, 96, 108, 120],
    miles: [36000, 48000, 60000, 75000, 100000, 125000, 150000, 175000],
    isAvailable: (months, miles) => months <= 60 ? miles >= 75000 : true,
  },
  'premium-plus-ev': {
    planPaths: ['new'],
    months: [36, 48, 60, 72, 84, 96, 108, 120],
    miles: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
    isAvailable: (months, miles) => !(months === 36 && miles === 36000),
  },
  'premium-ev': {
    months: [36, 48, 60, 72, 84, 96, 108, 120],
    miles: [36000, 48000, 60000, 75000, 85000, 100000, 125000, 150000],
    isAvailable: (months, miles) => !(months === 36 && miles === 36000),
  },
  'extra-ev': {
    months: [36, 48, 60, 72, 84, 96, 108, 120],
    miles: [36000, 48000, 60000, 75000, 100000, 125000, 150000],
    isAvailable: (months, miles) => !(months === 36 && miles === 36000),
  },
  'base-ev': {
    months: [36, 48, 60, 72, 84, 96, 108, 120],
    miles: [36000, 48000, 60000, 75000, 100000, 125000, 150000],
    isAvailable: (months, miles) => !(months === 36 && miles === 36000),
  },
};

const usedBand = (maxMileage, rows) => Object.freeze({
  maxMileage,
  rows: Object.freeze(Object.fromEntries(Object.entries(rows).map(([months, miles]) => [months, Object.freeze(miles)]))),
});

// Historical used-plan grids differ by plan and by current-odometer band. These
// are exact planning references from the supplied September 2024 Michigan guide;
// they are never a substitute for Ford's current VIN-specific rating response.
const PREMIUM_USED_BANDS = Object.freeze([
  usedBand(40000, { 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000, 30000, 36000, 40000], 36: [18000, 20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000], 48: [20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000, 75000], 60: [30000, 40000, 48000, 50000, 60000, 75000], 72: [40000, 50000, 60000, 75000] }),
  usedBand(60000, { 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000, 30000, 36000, 40000], 36: [18000, 20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000], 48: [20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000, 75000], 60: [30000, 40000, 48000, 50000, 60000, 75000], 72: [40000, 50000, 60000, 75000] }),
  usedBand(80000, { 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000, 30000, 36000, 40000], 36: [18000, 20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000], 48: [20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000], 60: [30000, 40000, 48000] }),
  usedBand(100000, { 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000], 36: [18000, 20000, 36000, 48000, 60000], 48: [20000, 30000, 36000, 40000, 48000] }),
  usedBand(120000, { 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000], 36: [18000, 20000, 24000] }),
]);

const EXTRA_USED_BANDS = Object.freeze([
  PREMIUM_USED_BANDS[0],
  PREMIUM_USED_BANDS[1],
  PREMIUM_USED_BANDS[2],
  usedBand(100000, { 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000, 30000, 36000], 36: [18000, 20000, 30000, 36000, 48000, 60000], 48: [20000, 24000, 36000, 40000, 48000] }),
  PREMIUM_USED_BANDS[4],
]);

const BASE_USED_BANDS = Object.freeze([
  usedBand(40000, { 6: [6000], 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000, 30000, 36000, 40000], 36: [18000, 20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000], 48: [20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000, 75000], 60: [30000, 40000, 48000, 50000, 60000, 75000] }),
  usedBand(60000, { 6: [6000], 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000, 30000, 36000, 40000], 36: [18000, 20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000], 48: [20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000, 75000], 60: [30000, 40000, 48000, 50000, 60000, 75000], 72: [40000, 50000, 60000] }),
  usedBand(80000, { 6: [6000], 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000, 30000, 36000, 40000], 36: [18000, 20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000], 48: [20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000], 60: [30000, 40000, 48000, 50000, 60000] }),
  usedBand(100000, { 6: [6000], 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000, 30000, 36000], 36: [18000, 20000, 24000, 30000, 36000, 40000, 48000, 60000], 48: [20000, 24000, 30000, 36000, 40000, 48000], 60: [30000, 40000, 48000] }),
  usedBand(120000, { 6: [6000], 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000], 36: [18000, 20000, 36000] }),
  usedBand(140000, { 6: [6000], 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000] }),
]);

export const USED_PLAN_BANDS = Object.freeze({
  premium: PREMIUM_USED_BANDS,
  extra: EXTRA_USED_BANDS,
  base: BASE_USED_BANDS,
  powertrain: Object.freeze([...BASE_USED_BANDS, usedBand(160000, { 12: [10000, 12000, 20000], 24: [10000, 12000, 18000, 20000, 24000] })]),
  'premium-ev': PREMIUM_USED_BANDS,
  'extra-ev': EXTRA_USED_BANDS,
  'base-ev': BASE_USED_BANDS,
});

const TERM_MATRIX_SOURCE = Object.freeze({
  title: 'Ford/Lincoln Protect MI Retail Price Book',
  edition: 'September 2024',
  planningOnly: true,
});

const matrixNotice = 'These choices help build a request. Ford records and the current VIN-specific offer must confirm the plan, term, mileage, deductible, benefits, and price.';

const calendarDate = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};
const offsetMonths = (date, months) => {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
};
const odometerValue = (value) => {
  const raw = String(value ?? '').trim().replace(/,/g, '');
  return /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
};

// Source: supplied September 2024 Michigan guide, pp. 116/120/124/129/134/138/142.
// Preserve its literal AND: both remaining limits exceed 12 months/12,000 miles,
// and both selected limits are below 24 months/24,000 miles. Not live eligibility.
const usedWarrantyRestriction = ({ inService, make, mileage, now = new Date() }) => {
  const brand = String(make ?? '').trim().toLowerCase();
  const limits = brand === 'lincoln' ? { months: 48, miles: 50000 }
    : ['ford', 'mercury'].includes(brand) ? { months: 36, miles: 36000 } : null;
  const start = calendarDate(inService);
  const asOf = calendarDate(now);
  const odometer = odometerValue(mileage);
  const known = Boolean(limits && start && asOf && start <= asOf && odometer !== null);
  const applies = known ? offsetMonths(start, limits.months) > offsetMonths(asOf, 12) && limits.miles - odometer > 12000 : null;
  return {
    applies,
    minimumMonths: 24,
    minimumMiles: 24000,
    operator: 'both-below',
    notice: applies === true
      ? 'The historical guide excludes used-plan combinations below both 24 months and 24,000 miles when more than 12 months and 12,000 miles of factory coverage remain. Shorter combinations are omitted; Ford records must confirm the current rule.'
      : applies === null ? 'Remaining factory warranty must be verified before shorter used-plan combinations can be approved.' : '',
  };
};

export const getTermMatrix = ({ planId, planPath, mileage = 0, inService, make, now }) => {
  if (planPath === 'new') {
    const matrix = NEW_PLAN_MATRICES[planId];
    if (!matrix) {
      return {
        months: [],
        miles: [],
        isAvailable: () => false,
        mileageMode: 'total',
        planningOnly: true,
        source: TERM_MATRIX_SOURCE,
        notice: `${matrixNotice} No self-service new-plan choices are available for this plan.`,
      };
    }
    return {
      months: matrix.months,
      miles: matrix.miles,
      isAvailable: (months, miles) => matrix.months.includes(months)
        && matrix.miles.includes(miles)
        && matrix.isAvailable(months, miles),
      mileageMode: 'total',
      planningOnly: true,
      source: TERM_MATRIX_SOURCE,
      notice: matrixNotice,
    };
  }

  const planBands = planPath === 'used' ? USED_PLAN_BANDS[planId] : null;
  if (!planBands) {
    return {
      months: [],
      miles: [],
      mileageMode: 'additional',
      currentMileageBandMaximum: null,
      planningOnly: true,
      source: TERM_MATRIX_SOURCE,
      notice: `${matrixNotice} No self-service used-plan choices are available for this plan.`,
      isAvailable: () => false,
    };
  }
  const currentMileage = odometerValue(mileage);
  const band = currentMileage === null ? null : planBands.find((item) => currentMileage <= item.maxMileage);
  const historicalWarrantyRestriction = usedWarrantyRestriction({ inService, make, mileage, now });
  const rows = Object.fromEntries(Object.entries(band?.rows ?? {})
    .map(([months, miles]) => [months, miles.filter((value) => !(historicalWarrantyRestriction.applies === true && Number(months) < 24 && value < 24000))])
    .filter(([, miles]) => miles.length));
  const months = Object.keys(rows).map(Number).sort((a, b) => a - b);
  const miles = [...new Set(months.flatMap((value) => rows[value] ?? []))].sort((a, b) => a - b);

  return {
    months,
    miles,
    mileageMode: 'additional',
    currentMileageBandMaximum: band?.maxMileage ?? null,
    historicalWarrantyRestriction,
    planningOnly: true,
    source: TERM_MATRIX_SOURCE,
    notice: matrixNotice,
    isAvailable: (selectedMonths, selectedMiles) => (rows[selectedMonths] ?? []).includes(selectedMiles),
  };
};

export const deductibleOptions = [
  { id: '0', label: '$0', help: 'Available only when included in the current Ford offer for this vehicle and plan.', paths: ['new'], planIds: 'all', planningOnly: true },
  { id: '50', label: '$50', help: 'Request this amount; Bob Maxey confirms availability in the current Ford offer.', paths: ['new', 'used'], planIds: ['premium', 'extra', 'base', 'powertrain', 'premium-ev', 'extra-ev', 'base-ev'], planningOnly: true },
  { id: '100', label: '$100', help: 'A common planning choice; the current Ford offer confirms availability.', paths: ['new', 'used'], planIds: ['premium', 'extra', 'base', 'powertrain', 'premium-ev', 'extra-ev', 'base-ev'], recommended: true, planningOnly: true },
  { id: '200', label: '$200', help: 'Request this amount; Bob Maxey confirms availability in the current Ford offer.', paths: ['new', 'used'], planIds: ['premium', 'extra', 'base', 'powertrain', 'premium-ev', 'extra-ev', 'base-ev'], planningOnly: true },
  { id: 'disappearing', label: 'Disappearing', help: 'The current agreement confirms availability and when the deductible may be waived.', paths: ['new', 'used'], planIds: ['premium', 'extra', 'base', 'powertrain', 'premium-ev', 'extra-ev', 'base-ev'], planningOnly: true },
];

export const isDeductibleAvailable = (option, { planId, planPath, termMiles } = {}) => {
  if (!option?.paths?.includes(planPath)) return false;
  if (option.planIds !== 'all' && !option.planIds?.includes(planId)) return false;
  if (planId === 'premium-plus-ev') return planPath === 'new' && option.id === '0';
  const miles = Number(termMiles || 0);
  if (planPath === 'new' && option.id === '200' && miles < 60000) return false;
  if (planPath === 'used' && option.id !== '100' && miles < 12000) return false;
  return true;
};

export const protectionOptions = [
  {
    id: 'first-day',
    title: 'Keep First-Day Rental',
    short: 'Ask to retain eligible rental support beginning on the first day of a covered repair. The current Ford offer confirms availability.',
    planIds: 'all',
    planPaths: ['new', 'used'],
    selectionMeaning: 'retain-benefit',
    planningOnly: true,
  },
  {
    id: 'enhanced-rental',
    title: 'Keep Enhanced Rental',
    short: 'Ask to retain the enhanced rental benefit. The current Ford offer confirms the daily amount, limits, and availability.',
    planIds: 'all',
    planPaths: ['new', 'used'],
    selectionMeaning: 'retain-benefit',
    planningOnly: true,
  },
  {
    id: 'key',
    title: 'Keep Key Services',
    short: 'Ask to retain eligible key-replacement assistance. The current Ford offer confirms eligibility and limits.',
    planIds: 'all',
    planPaths: ['new', 'used'],
    selectionMeaning: 'retain-benefit',
    planningOnly: true,
  },
  {
    id: 'lighting',
    title: 'Keep Interior / Exterior Lighting',
    short: 'Ask to retain eligible interior and exterior lighting coverage. The current Ford offer confirms the vehicle, plan, term, and covered lighting.',
    planIds: ['premium', 'premium-ev', 'premium-plus-ev'],
    planPaths: ['new', 'used'],
    selectionMeaning: 'retain-benefit',
    planningOnly: true,
  },
  {
    id: 'pickup-delivery',
    title: 'Add Pickup & Delivery',
    short: 'Ask whether eligible pickup-and-delivery support can be added. Distance, rental-benefit, and current-offer rules apply.',
    planIds: ['premium', 'premium-ev', 'premium-plus-ev'],
    planPaths: ['new'],
    selectionMeaning: 'add-benefit',
    planningOnly: true,
  },
];

export const isProtectionOptionAvailable = (option, { planId, planPath, termMonths, termMiles } = {}) => {
  if (!option?.planPaths?.includes(planPath)) return false;
  if (option.planIds !== 'all' && !option.planIds?.includes(planId)) return false;
  if (planPath === 'used' && option.id === 'enhanced-rental' && Number(termMiles || 0) < 12000) return false;
  if (planPath === 'used' && option.id === 'key' && Number(termMonths || 0) < 12) return false;
  if (planPath === 'used' && option.id === 'lighting' && Number(termMiles || 0) < 12000) return false;
  return true;
};

export const maintenanceChoices = [
  { id: 'none', title: 'No maintenance plan', text: 'Keep this request focused on mechanical protection.' },
  { id: 'premium-maintenance', title: 'Premium Maintenance Plan', text: 'Scheduled service, inspections, and selected wear items for eligible gas, diesel, or hybrid vehicles.' },
  { id: 'premium-maintenance-ev', title: 'Premium Maintenance EV', text: 'Scheduled inspections and eligible maintenance for electric vehicles.' },
];

export const maintenanceIntervals = [
  { value: 5000, label: 'Every 5,000 miles', text: 'Severe-service preference' },
  { value: 7500, label: 'Every 7,500 miles', text: 'Normal-service preference' },
  { value: 10000, label: 'Every 10,000 miles', text: 'Extended normal preference' },
];

export const contactPreferences = [
  { value: 'phone', label: 'Phone call' },
  { value: 'text', label: 'Text message' },
  { value: 'email', label: 'Email' },
];

export const formatTerm = (months) => {
  if (!months) return 'Select a term';
  if (months % 12 === 0) return `${months} months (${months / 12} ${months === 12 ? 'year' : 'years'})`;
  return `${months} months`;
};

export const formatMiles = (miles) => Number(miles || 0).toLocaleString();

export const findBestCombination = ({ matrix, planPath, inService, currentMileage, keepYears, annualMiles }) => {
  if (!matrix.months.length || !matrix.miles.length) return null;
  const ownershipMonths = Math.max(12, Number(keepYears || 0) * 12);
  const annual = Math.max(5000, Number(annualMiles || 0));
  let ageMonths = 0;
  if (planPath === 'new' && inService) {
    const start = new Date(`${inService}T12:00:00`);
    if (!Number.isNaN(start.getTime())) {
      const now = new Date();
      ageMonths = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());
    }
  }
  const targetMonths = planPath === 'new' ? ownershipMonths + ageMonths : ownershipMonths;
  const expectedAddedMiles = Math.round(annual * (ownershipMonths / 12));
  const targetMiles = planPath === 'new' ? Number(currentMileage || 0) + expectedAddedMiles : expectedAddedMiles;
  const candidates = [];
  matrix.months.forEach((months) => matrix.miles.forEach((miles) => {
    if (!matrix.isAvailable(months, miles)) return;
    const shortfall = Math.max(0, targetMonths - months) * 5000 + Math.max(0, targetMiles - miles) * 3;
    const extra = Math.max(0, months - targetMonths) * 80 + Math.max(0, miles - targetMiles);
    candidates.push({ months, miles, score: shortfall * 100 + extra });
  }));
  candidates.sort((a, b) => a.score - b.score || a.months - b.months || a.miles - b.miles);
  const best = candidates[0];
  return best ? { ...best, meetsGoal: best.months >= targetMonths && best.miles >= targetMiles, targetMonths, targetMiles } : null;
};

export const historicalMatrixNotice = matrixNotice;
