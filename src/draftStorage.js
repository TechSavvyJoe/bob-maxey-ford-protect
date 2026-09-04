export const DRAFT_STORAGE_KEY = 'bobMaxeyProtectQuotes';
export const DRAFT_SCHEMA_VERSION = 4;
export const DRAFT_TTL_DAYS = 30;

const MAX_DRAFTS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

const asArray = (value) => Array.isArray(value) ? value : [];
const asObject = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const text = (value, fallback = '', maxLength = 500) => typeof value === 'string' ? value.slice(0, maxLength) : fallback;
const numberOrNull = (value) => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;

const sanitizeProductSelections = (value) => Object.fromEntries(Object.entries(asObject(value))
  .filter(([id, selection]) => typeof id === 'string' && id.length <= 80 && selection && typeof selection === 'object' && !Array.isArray(selection))
  .slice(0, 20)
  .map(([id, selection]) => [id, {
    variantId: text(selection.variantId, '', 80),
    powertrain: text(selection.powertrain, '', 40),
    termMonths: numberOrNull(selection.termMonths),
    termMiles: numberOrNull(selection.termMiles),
    serviceInterval: numberOrNull(selection.serviceInterval),
    engineHours: numberOrNull(selection.engineHours),
    benefitAmount: numberOrNull(selection.benefitAmount),
    underlyingProductId: text(selection.underlyingProductId, '', 80),
    confirmed: selection.confirmed === true,
  }]));

export function createQuoteId(cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.getRandomValues) throw new Error('A secure browser is required to create a request reference.');
  const bytes = new Uint8Array(8);
  cryptoApi.getRandomValues(bytes);
  return `BMX-${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function safeParseJson(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Store planning choices only. Contact details, VIN, ZIP, notes and consent never persist. */
export function sanitizeDraft(quote = {}, now = new Date()) {
  const source = asObject(quote);
  const savedAt = text(source.savedAt) || now.toISOString();
  const parsedSavedAt = Date.parse(savedAt);
  const effectiveSavedAt = Number.isFinite(parsedSavedAt) ? new Date(parsedSavedAt).toISOString() : now.toISOString();
  const productSelections = sanitizeProductSelections(source.productSelections);

  return {
    draftSchemaVersion: DRAFT_SCHEMA_VERSION,
    id: text(source.id),
    savedAt: effectiveSavedAt,
    expiresAt: new Date(Date.parse(effectiveSavedAt) + DRAFT_TTL_DAYS * DAY_MS).toISOString(),
    purchaseContext: text(source.purchaseContext),
    vehicleSituation: text(source.vehicleSituation),
    transactionMethod: text(source.transactionMethod),
    year: text(source.year),
    make: text(source.make),
    model: text(source.model),
    mileage: text(source.mileage),
    purchaseDate: text(source.purchaseDate),
    state: text(source.state),
    usage: text(source.usage, 'Personal'),
    powertrain: text(source.powertrain, 'Gas'),
    snowPlow: text(source.snowPlow, 'No'),
    program: text(source.program),
    planPath: text(source.planPath),
    planId: text(source.planId),
    cspLevel: text(source.cspLevel),
    cspPriorCoverageStatus: text(source.cspPriorCoverageStatus),
    engineCareLevel: text(source.engineCareLevel),
    currentEngineHours: numberOrNull(source.currentEngineHours),
    termMonths: numberOrNull(source.termMonths),
    termMiles: numberOrNull(source.termMiles),
    deductible: text(source.deductible),
    addOns: asArray(source.addOns).filter((item) => typeof item === 'string'),
    planBenefitsDecision: text(source.planBenefitsDecision),
    requestedProductIds: asArray(source.requestedProductIds).filter((item) => typeof item === 'string'),
    productSelections,
    offRoadUnderlyingProductId: text(source.offRoadUnderlyingProductId, '', 80),
    additionalProductsDecision: text(source.additionalProductsDecision),
    maintenanceId: text(source.maintenanceId, 'none'),
    maintenanceName: text(source.maintenanceName),
    maintenanceInterval: numberOrNull(source.maintenanceInterval),
    keepYears: numberOrNull(source.keepYears),
    annualMiles: numberOrNull(source.annualMiles),
    paymentPreference: text(source.paymentPreference),
    store: text(source.store),
  };
}

const getStorage = (storage) => {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

export function loadDrafts(storage, now = new Date()) {
  const target = getStorage(storage);
  if (!target?.getItem) return [];
  let storedValue;
  try {
    storedValue = target.getItem(DRAFT_STORAGE_KEY);
  } catch {
    return [];
  }
  const parsed = safeParseJson(storedValue, []);
  const nowMs = now.getTime();
  const drafts = asArray(parsed)
    .map((draft) => sanitizeDraft(draft, now))
    .filter((draft) => draft.id && Date.parse(draft.expiresAt) > nowMs)
    .slice(0, MAX_DRAFTS);
  try {
    target.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Read-only or quota-limited storage should not make the quote flow unusable.
  }
  return drafts;
}

export function saveDraft(quote, storage, now = new Date()) {
  const target = getStorage(storage);
  if (!target?.setItem) return { saved: false, reason: 'storage-unavailable' };
  const draft = sanitizeDraft({ ...quote, savedAt: now.toISOString() }, now);
  const existing = loadDrafts(target, now);
  const next = [draft, ...existing.filter((item) => item.id !== draft.id)].slice(0, MAX_DRAFTS);
  try {
    target.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
    return { saved: true, draft, drafts: next };
  } catch {
    return { saved: false, reason: 'storage-unavailable' };
  }
}

export function deleteDraft(id, storage) {
  const target = getStorage(storage);
  if (!target?.setItem) return [];
  const next = loadDrafts(target).filter((draft) => draft.id !== id);
  try {
    target.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return next;
  }
  return next;
}

export function clearDrafts(storage) {
  const target = getStorage(storage);
  try {
    target?.removeItem?.(DRAFT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
