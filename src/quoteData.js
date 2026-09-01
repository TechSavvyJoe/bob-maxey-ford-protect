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

const USED_MASTER = {
  6: [6000],
  12: [10000, 12000, 20000],
  24: [10000, 12000, 18000, 20000, 24000, 30000, 36000, 40000],
  36: [18000, 20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000],
  48: [20000, 24000, 30000, 36000, 40000, 48000, 50000, 60000, 75000],
  60: [30000, 40000, 48000, 50000, 60000, 75000],
  72: [40000, 50000, 60000, 75000],
};

const usedLimitForMileage = (mileage) => {
  if (mileage > 160000) return { maxMonths: 0, maxMiles: 0 };
  if (mileage > 140000) return { maxMonths: 24, maxMiles: 20000 };
  if (mileage > 120000) return { maxMonths: 24, maxMiles: 24000 };
  if (mileage > 100000) return { maxMonths: 48, maxMiles: 48000 };
  if (mileage > 80000) return { maxMonths: 60, maxMiles: 60000 };
  return { maxMonths: 72, maxMiles: 75000 };
};

export const getTermMatrix = ({ planId, planPath, mileage = 0 }) => {
  if (planPath === 'new') {
    const matrix = NEW_PLAN_MATRICES[planId] ?? NEW_PLAN_MATRICES.premium;
    return {
      months: matrix.months,
      miles: matrix.miles,
      isAvailable: matrix.isAvailable,
      mileageMode: 'total',
    };
  }

  const limit = usedLimitForMileage(Number(mileage || 0));
  const months = Object.keys(USED_MASTER).map(Number).filter((value) => value <= limit.maxMonths);
  const miles = [...new Set(months.flatMap((value) => USED_MASTER[value]))]
    .filter((value) => value <= limit.maxMiles)
    .sort((a, b) => a - b);

  return {
    months,
    miles,
    mileageMode: 'additional',
    isAvailable: (selectedMonths, selectedMiles) => (
      selectedMonths <= limit.maxMonths
      && selectedMiles <= limit.maxMiles
      && (USED_MASTER[selectedMonths] ?? []).includes(selectedMiles)
    ),
  };
};

export const deductibleOptions = [
  { id: '0', label: '$0', help: 'Lowest out-of-pocket amount where eligible.', paths: ['new'] },
  { id: '50', label: '$50', help: 'Lower deductible option where eligible.', paths: ['new', 'used'] },
  { id: '100', label: '$100', help: 'Standard deductible used in Ford plan materials.', paths: ['new', 'used'], recommended: true },
  { id: '200', label: '$200', help: 'Higher deductible that may reduce plan price.', paths: ['new', 'used'] },
  { id: 'disappearing', label: 'Disappearing', help: 'May be waived at the selling dealer when agreement rules are met.', paths: ['new', 'used'] },
];

export const protectionOptions = [
  {
    id: 'first-day',
    title: 'First-Day Rental',
    short: 'Rental assistance starts on the first day of a covered repair when agreement conditions are met.',
    planIds: 'all',
  },
  {
    id: 'enhanced-rental',
    title: 'Enhanced Rental',
    short: 'Request the higher rental benefit available for eligible plans and repairs.',
    planIds: 'all',
  },
  {
    id: 'key',
    title: 'Key Services',
    short: 'Eligible lost, stolen, damaged, or destroyed key support, subject to the agreement limit.',
    planIds: 'all',
  },
  {
    id: 'lighting',
    title: 'Interior / Exterior Lighting',
    short: 'Eligible factory-installed lighting option available with PremiumCARE paths.',
    planIds: ['premium', 'premium-ev', 'premium-plus-ev'],
  },
  {
    id: 'pickup-delivery',
    title: 'Pickup & Delivery',
    short: 'Request dealer pickup and delivery review where available; distance and First-Day Rental rules apply.',
    planIds: ['premium', 'premium-ev', 'premium-plus-ev'],
  },
];

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

export const historicalMatrixNotice = 'Term and mileage choices are organized from Ford’s September 2024 Michigan retail guide for planning only. Current availability, price, deductible, options, and eligibility require Bob Maxey confirmation.';
