import { protectionOptions } from './quoteData.js';
import { locations } from './data.js';
import { buildQuoteSnapshot } from './quoteOutput.js';
import { CONTACT_CONSENT_TEXT, CONTACT_CONSENT_VERSION } from './consent.js';

export const CRM_DESTINATION = 'internetleads@dealermail.com';
export const CRM_SOURCE = 'Bob Maxey Ford Protect Website';
const DEFAULT_CRM_TIMEOUT_MS = 12000;

const leadTypeFor = (quote = {}) => quote.purchaseContext === 'shopping'
  ? 'Vehicle Purchase + F&I Product Interest'
  : 'F&I Product Only Sale';
const leadSourceFor = (quote = {}) => `${CRM_SOURCE} - ${leadTypeFor(quote)}`;

const xmlEscape = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const cleanLines = (lines) => lines.filter(Boolean).join('\n');

const productConfigurationText = (product) => {
  const configuration = product.configuration || {};
  const parts = [
    configuration.optionName,
    configuration.termLabel,
    configuration.mileageLabel,
    configuration.serviceIntervalLabel,
    configuration.engineHoursLabel,
    configuration.benefitAmountLabel,
  ].filter(Boolean);
  return parts.length ? `${product.name || product.title || product.id} — ${parts.join('; ')}` : (product.name || product.title || product.id);
};

export function buildLeadComments(quote, plan) {
  const snapshot = buildQuoteSnapshot({ quote, plan });
  const isEngineCare = snapshot.program === 'enginecare';
  const selectedOptions = !isEngineCare && quote.addOns?.length
    ? protectionOptions.filter((item) => quote.addOns.includes(item.id)).map((item) => item.title).join(', ')
    : 'None requested';
  const configuredMaintenance = snapshot.additionalProducts.find((item) => item.id === quote.maintenanceId);
  const maintenance = configuredMaintenance
    ? productConfigurationText(configuredMaintenance)
    : snapshot.maintenance.selected
      ? `${snapshot.maintenance.name}; ${snapshot.maintenance.intervalLabel}`
      : 'No maintenance plan requested';
  const additionalProductRows = snapshot.additionalProducts.filter((item) => item.id !== quote.maintenanceId);
  const additionalProducts = additionalProductRows.length
    ? additionalProductRows.map((item) => productConfigurationText(item)).join(' | ')
    : 'None requested';
  const isCsp = snapshot.program === 'csp';
  const termLines = isEngineCare
    ? [
      'COVERAGE PATH: Diesel EngineCARE specialist plan',
      `TERM: ${snapshot.coverage.term.label} (referenced maximum)`,
      `TOTAL MILEAGE LIMIT: ${snapshot.coverage.term.mileageLabel}`,
      `ENGINE HOUR LIMIT: ${snapshot.coverage.term.engineHoursLabel}`,
      `DEDUCTIBLE: ${snapshot.coverage.deductible.label}`,
      `SPECIALIST RECORD REVIEW: ${snapshot.coverage.inspection.message}`,
    ]
    : isCsp
    ? ['COVERAGE PATH: Continued Service Plan', 'TERM: Monthly', 'MILEAGE: No annual mileage limit', 'DEDUCTIBLE REQUEST: Confirmed with CSP offer', 'INSPECTION: Ford CSP guide states no enrollment inspection is required']
    : [
      `COVERAGE PATH: ${quote.planPath === 'used' ? 'Used plan - term and mileage begin at contract signature/current odometer' : 'New plan - term and mileage measured from original in-service date/zero miles'}`,
      `TERM: ${quote.termMonths || 0} months${quote.termMonths ? ` (${quote.termMonths / 12} years)` : ''}`,
      `${quote.planPath === 'used' ? 'ADDITIONAL MILEAGE' : 'TOTAL ODOMETER LIMIT'}: ${Number(quote.termMiles || 0).toLocaleString()} miles`,
      `DEDUCTIBLE REQUEST: ${quote.deductible === 'disappearing' ? 'Disappearing deductible' : `$${quote.deductible || 100}`}`,
      `INSPECTION: ${quote.inspection?.shortLabel || quote.inspection?.title || 'Ford record review required'}`,
    ];
  const store = locations.find((item) => item.name === quote.store)?.descriptor || quote.store || 'Bob Maxey Ford of Howell';
  const leadType = leadTypeFor(quote);
  const customerJourney = quote.purchaseContext === 'shopping'
    ? quote.vehicleSituation === 'new-purchase'
      ? 'Buying a new vehicle from Bob Maxey; planning products before delivery'
      : 'Buying a used vehicle from Bob Maxey; planning products before delivery'
    : 'Already owns the vehicle; requesting products eligible after the vehicle sale';
  const decoded = quote.decodedVehicle || {};
  const decodedFacts = [
    decoded.trim || decoded.series ? `TRIM / SERIES: ${[decoded.trim, decoded.series].filter(Boolean).join(' / ')}` : '',
    decoded.bodyClass ? `BODY CLASS: ${decoded.bodyClass}` : '',
    decoded.vehicleType ? `VEHICLE TYPE: ${decoded.vehicleType}` : '',
    decoded.manufacturer ? `MANUFACTURER: ${decoded.manufacturer}` : '',
    decoded.driveType ? `DRIVE TYPE: ${decoded.driveType}` : '',
    decoded.fuelType ? `NHTSA FUEL TYPE: ${decoded.fuelType}` : '',
    decoded.engineDescription ? `ENGINE: ${decoded.engineDescription}` : '',
    decoded.transmission ? `TRANSMISSION: ${decoded.transmission}` : '',
    decoded.gvwr ? `GVWR: ${decoded.gvwr}` : '',
    decoded.doors ? `DOORS: ${decoded.doors}` : '',
    decoded.plant ? `ASSEMBLY PLANT: ${decoded.plant}` : '',
    decoded.modelId ? `NHTSA MODEL ID: ${decoded.modelId}` : '',
  ].filter(Boolean);
  return cleanLines([
    `LEAD TYPE: ${leadType}`,
    `LEAD SOURCE: ${leadSourceFor(quote)}`,
    `QUOTE ID: ${quote.id || 'Pending'}`,
    `STORE: ${store}`,
    `CUSTOMER JOURNEY: ${customerJourney}`,
    `VEHICLE SITUATION: ${quote.vehicleSituation || 'Not selected'}`,
    '',
    `VEHICLE: ${quote.year || ''} ${quote.make || ''} ${quote.model || ''}`.trim(),
    quote.vin ? `VIN: ${quote.vin}` : 'VIN: Not provided',
    `CURRENT MILEAGE: ${Number(quote.mileage || 0).toLocaleString()}`,
    quote.vehicleSituation === 'owned-after-sale' ? `CUSTOMER VEHICLE PURCHASE DATE: ${quote.purchaseDate || quote.vehiclePurchaseDate || 'Unknown'}` : '',
    `IN-SERVICE DATE: ${quote.inService || 'Unknown'}`,
    quote.decodedVehicle ? 'VIN DATA SOURCE: NHTSA vPIC vehicle decode (does not provide Ford warranty or in-service records)' : '',
    ...decodedFacts,
    `POWERTRAIN / USE: ${quote.powertrain || 'Not provided'} / ${quote.usage || 'Not provided'}`,
    `SNOW-PLOW USE: ${quote.snowPlow || 'No'}`,
    `REGISTERED: ${quote.state || ''} ${quote.zip || ''}`.trim(),
    '',
    ...termLines.slice(0, 1),
    `${isEngineCare ? 'DIESEL ENGINECARE LEVEL' : 'PLAN'}: ${snapshot.coverage.planName}`,
    ...termLines.slice(1),
    isEngineCare ? '' : `PLAN OPTIONS REQUESTED: ${selectedOptions}`,
    `MAINTENANCE: ${maintenance}`,
    `ADDITIONAL PRODUCTS REQUESTED: ${additionalProducts}`,
    quote.paymentPreference ? `PAYMENT PREFERENCE: ${quote.paymentPreference}` : '',
    '',
    `OWNERSHIP GOAL: Keep ${quote.keepYears || 0} years; approximately ${Number(quote.annualMiles || 0).toLocaleString()} miles/year`,
    `PREFERRED CONTACT: ${quote.preferredContact || 'phone'}`,
    `CONTACT CONSENT: ${quote.consent ? 'Granted for this Ford Protect request' : 'Not granted'}`,
    quote.consent ? `CONTACT CONSENT VERSION: ${quote.consentVersion || CONTACT_CONSENT_VERSION}` : '',
    quote.consent ? `CONTACT CONSENT ACCEPTED AT: ${quote.consentAcceptedAt || 'Timestamp missing - do not process until confirmed'}` : '',
    quote.consent ? `CONTACT CONSENT TEXT: ${quote.consentText || CONTACT_CONSENT_TEXT}` : '',
    quote.notes ? `CUSTOMER NOTES: ${quote.notes}` : '',
    '',
    'IMPORTANT: Website selection is a coverage request, not a final contract or price. Confirm current Ford eligibility, warranty and inspection status, agreement, term, products, options, deductible, price, and state availability before sale.',
  ]);
}

export function createAdfXml({ quote, plan, pageUrl = '', referrer = '' }) {
  const customer = quote.customer || {};
  const now = new Date().toISOString();
  const comments = buildLeadComments(quote, plan);
  const phone = String(customer.phone || '').replace(/\D/g, '');
  const vehicleStatus = quote.vehicleSituation === 'new-purchase' ? 'new' : 'used';
  const leadType = leadTypeFor(quote);
  return `<?xml version="1.0" encoding="UTF-8"?>
<?adf version="1.0"?>
<adf>
  <prospect status="new">
    <id sequence="1" source="Bob Maxey Ford Protect">${xmlEscape(quote.id || '')}</id>
    <requestdate>${now}</requestdate>
    <vehicle interest="buy" status="${vehicleStatus}">
      <year>${xmlEscape(quote.year)}</year>
      <make>${xmlEscape(quote.make)}</make>
      <model>${xmlEscape(quote.model)}</model>
      ${quote.decodedVehicle?.trim ? `<trim>${xmlEscape(quote.decodedVehicle.trim)}</trim>` : ''}
      ${quote.vin ? `<vin>${xmlEscape(quote.vin)}</vin>` : ''}
      <odometer status="current" units="mi">${xmlEscape(quote.mileage || 0)}</odometer>
      <comments>${xmlEscape(comments)}</comments>
    </vehicle>
    <customer>
      <contact>
        <name part="first">${xmlEscape(customer.firstName)}</name>
        <name part="last">${xmlEscape(customer.lastName)}</name>
        <email preferredcontact="${quote.preferredContact === 'email' ? '1' : '0'}">${xmlEscape(customer.email)}</email>
        <phone type="cellphone" preferredcontact="${quote.preferredContact === 'phone' || quote.preferredContact === 'text' ? '1' : '0'}">${xmlEscape(phone)}</phone>
        <address>
          <city>${xmlEscape(customer.city)}</city>
          <regioncode>${xmlEscape(quote.state)}</regioncode>
          <postalcode>${xmlEscape(quote.zip)}</postalcode>
          <country>US</country>
        </address>
      </contact>
      <comments>${xmlEscape(comments)}</comments>
    </customer>
    <vendor>
      <vendorname>${xmlEscape(locations.find((item) => item.name === quote.store)?.descriptor || quote.store || 'Bob Maxey Ford of Howell')}</vendorname>
      <contact>
        <name part="full" type="business">Ford Protect F&amp;I Team</name>
        <email>${CRM_DESTINATION}</email>
      </contact>
    </vendor>
    <provider>
       <name part="full" type="business">${xmlEscape(leadSourceFor(quote))}</name>
      <service>${xmlEscape(leadType)}</service>
      <url>${xmlEscape(pageUrl)}</url>
      <id source="Referrer">${xmlEscape(referrer)}</id>
    </provider>
  </prospect>
</adf>`;
}

export function downloadLeadXml(xml, quoteId = 'ford-protect-quote') {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${quoteId}-dealermail-lead.xml`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function submitCrmLead({ xml, quote, timeoutMs = DEFAULT_CRM_TIMEOUT_MS, fetchImpl = globalThis.fetch, endpoint = import.meta.env?.VITE_CRM_LEAD_ENDPOINT }) {
  if (!endpoint) {
    return { configured: false, sent: false };
  }
  if (quote?.consent !== true
    || quote.consentVersion !== CONTACT_CONSENT_VERSION
    || quote.consentText !== CONTACT_CONSENT_TEXT
    || !Number.isFinite(Date.parse(quote.consentAcceptedAt || ''))) {
    throw new Error('Current contact permission is required before this request can be sent. Nothing was delivered.');
  }
  if (typeof xml !== 'string' || !xml.trim() || xml.length > 500000) {
    throw new Error('The request payload could not be prepared safely. Nothing was delivered.');
  }
  if (typeof fetchImpl !== 'function') throw new Error('The secure dealership connection is unavailable in this browser.');
  let endpointUrl;
  try {
    endpointUrl = new URL(endpoint, globalThis.location?.origin || 'https://localhost.invalid');
  } catch {
    throw new Error('The secure dealership connection is not configured correctly.');
  }
  if (import.meta.env?.DEV !== true && endpointUrl.protocol !== 'https:') throw new Error('The dealership connection must use HTTPS.');

  const controller = new AbortController();
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.max(1000, timeoutMs));
  try {
    const response = await fetchImpl(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify({
        leadType: leadTypeFor(quote),
        leadSource: leadSourceFor(quote),
        quoteId: quote.id,
        idempotencyKey: `ford-protect-${quote.id}`,
        consent: {
          granted: quote.consent === true,
          version: quote.consentVersion || CONTACT_CONSENT_VERSION,
          text: quote.consentText || CONTACT_CONSENT_TEXT,
          acceptedAt: quote.consentAcceptedAt || '',
        },
        xml,
      }),
    });
    if (!response.ok) throw new Error('The dealership lead connection did not accept this request.');
    const receipt = await response.json().catch(() => null);
    const accepted = receipt?.accepted === true;
    const leadId = typeof receipt?.leadId === 'string' ? receipt.leadId.trim() : typeof receipt?.id === 'string' ? receipt.id.trim() : '';
    const receivedAt = typeof receipt?.receivedAt === 'string' && Number.isFinite(Date.parse(receipt.receivedAt)) ? new Date(receipt.receivedAt).toISOString() : '';
    if (!accepted || !leadId || !receivedAt) throw new Error('The dealership connection did not return a complete accepted receipt. Nothing was marked sent.');
    return { configured: true, sent: true, accepted: true, leadId, receivedAt };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(timedOut ? 'The dealership connection timed out. Nothing was marked sent.' : 'The request was canceled before delivery was confirmed.');
    if (error instanceof TypeError) throw new Error('The dealership connection could not be reached. Nothing was marked sent. Check the connection and try again.');
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
