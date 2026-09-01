import { protectionOptions } from './quoteData';

export const CRM_DESTINATION = 'internetleads@dealermail.com';
export const CRM_SOURCE = 'Bob Maxey Ford Protect Website - F&I Product Only Sale';

const xmlEscape = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const cleanLines = (lines) => lines.filter(Boolean).join('\n');

export function buildLeadComments(quote, plan) {
  const selectedOptions = quote.addOns?.length
    ? protectionOptions.filter((item) => quote.addOns.includes(item.id)).map((item) => item.title).join(', ')
    : 'None requested';
  const maintenance = quote.maintenanceId && quote.maintenanceId !== 'none'
    ? `${quote.maintenanceName || quote.maintenanceId}; preferred interval ${Number(quote.maintenanceInterval || 0).toLocaleString()} miles`
    : 'No maintenance plan requested';
  return cleanLines([
    'LEAD TYPE: F&I Product Only Sale',
    `LEAD SOURCE: ${CRM_SOURCE}`,
    `QUOTE ID: ${quote.id || 'Pending'}`,
    `STORE: Bob Maxey ${quote.store || 'Howell'}`,
    '',
    `VEHICLE: ${quote.year || ''} ${quote.make || ''} ${quote.model || ''}`.trim(),
    quote.vin ? `VIN: ${quote.vin}` : 'VIN: Not provided',
    `CURRENT MILEAGE: ${Number(quote.mileage || 0).toLocaleString()}`,
    `IN-SERVICE DATE: ${quote.inService || 'Unknown'}`,
    `POWERTRAIN / USE: ${quote.powertrain || 'Not provided'} / ${quote.usage || 'Not provided'}`,
    `SNOW-PLOW USE: ${quote.snowPlow || 'No'}`,
    `REGISTERED: ${quote.state || ''} ${quote.zip || ''}`.trim(),
    '',
    `COVERAGE PATH: ${quote.planPath === 'used' ? 'Used plan - term and mileage begin at contract signature/current odometer' : 'New plan - term and mileage measured from original in-service date/zero miles'}`,
    `PLAN: ${plan?.name || quote.planName || quote.planId || 'Not selected'}`,
    `TERM: ${quote.termMonths || 0} months${quote.termMonths ? ` (${quote.termMonths / 12} years)` : ''}`,
    `${quote.planPath === 'used' ? 'ADDITIONAL MILEAGE' : 'TOTAL ODOMETER LIMIT'}: ${Number(quote.termMiles || 0).toLocaleString()} miles`,
    `DEDUCTIBLE REQUEST: ${quote.deductible === 'disappearing' ? 'Disappearing deductible' : `$${quote.deductible || 100}`}`,
    `PLAN OPTIONS REQUESTED: ${selectedOptions}`,
    `MAINTENANCE: ${maintenance}`,
    quote.paymentPreference ? `PAYMENT PREFERENCE: ${quote.paymentPreference}` : '',
    '',
    `OWNERSHIP GOAL: Keep ${quote.keepYears || 0} years; approximately ${Number(quote.annualMiles || 0).toLocaleString()} miles/year`,
    `PREFERRED CONTACT: ${quote.preferredContact || 'phone'}`,
    quote.notes ? `CUSTOMER NOTES: ${quote.notes}` : '',
    '',
    'IMPORTANT: Website selection is a coverage request, not a final contract or price. Confirm current Ford eligibility, agreement, term, options, deductible, price, and state availability before sale.',
  ]);
}

export function createAdfXml({ quote, plan, pageUrl = '', referrer = '' }) {
  const customer = quote.customer || {};
  const now = new Date().toISOString();
  const comments = buildLeadComments(quote, plan);
  const phone = String(customer.phone || '').replace(/\D/g, '');
  const vehicleStatus = quote.planPath === 'new' ? 'new' : 'used';
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
        <phone type="voice" time="evening" preferredcontact="${quote.preferredContact === 'phone' ? '1' : '0'}">${xmlEscape(phone)}</phone>
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
      <vendorname>Bob Maxey ${xmlEscape(quote.store || 'Ford')}</vendorname>
      <contact>
        <name part="full" type="business">Ford Protect F&amp;I Team</name>
        <email>${CRM_DESTINATION}</email>
      </contact>
    </vendor>
    <provider>
      <name part="full" type="business">${xmlEscape(CRM_SOURCE)}</name>
      <service>F&amp;I Product Only Sale</service>
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
      destination: CRM_DESTINATION,
      leadType: 'F&I Product Only Sale',
      leadSource: CRM_SOURCE,
      quoteId: quote.id,
      xml,
    }),
  });
  if (!response.ok) throw new Error('The dealership lead connection did not accept this request.');
  return { configured: true, sent: true };
}
