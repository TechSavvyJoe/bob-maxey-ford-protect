import { protectionOptions } from './quoteData';
import { locations } from './data';
import { buildQuoteSnapshot } from './quoteOutput';

export const CRM_DESTINATION = 'internetleads@dealermail.com';
export const CRM_SOURCE = 'Bob Maxey Ford Protect Website';

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
    ? 'Planning protection before purchasing a vehicle from Bob Maxey'
    : 'Already owns the vehicle; requesting products eligible after the vehicle sale';
  return cleanLines([
    `LEAD TYPE: ${leadType}`,
    `LEAD SOURCE: ${leadSourceFor(quote)}`,
    `QUOTE ID: ${quote.id || 'Pending'}`,
    `STORE: ${store}`,
    `CUSTOMER JOURNEY: ${customerJourney}`,
    '',
    `VEHICLE: ${quote.year || ''} ${quote.make || ''} ${quote.model || ''}`.trim(),
    quote.vin ? `VIN: ${quote.vin}` : 'VIN: Not provided',
    `CURRENT MILEAGE: ${Number(quote.mileage || 0).toLocaleString()}`,
    `IN-SERVICE DATE: ${quote.inService || 'Unknown'}`,
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
  const vehicleStatus = quote.planPath === 'new' ? 'new' : 'used';
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

export async function submitCrmLead({ xml, quote }) {
  const endpoint = import.meta.env.VITE_CRM_LEAD_ENDPOINT;
  if (!endpoint) {
    return { configured: false, sent: false };
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leadType: leadTypeFor(quote),
      leadSource: leadSourceFor(quote),
      quoteId: quote.id,
      idempotencyKey: `ford-protect-${quote.id}`,
      xml,
    }),
  });
  if (!response.ok) throw new Error('The dealership lead connection did not accept this request.');
  const receipt = await response.json().catch(() => null);
  if (!receipt?.accepted) throw new Error('The dealership lead connection did not return an accepted receipt.');
  return { configured: true, sent: true, accepted: true, leadId: receipt.leadId || receipt.id || quote.id, receivedAt: receipt.receivedAt || new Date().toISOString() };
}
