import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { assetUrl } from './paths';
import { formatMiles, formatTerm, protectionOptions } from './quoteData';

const LETTER = [612, 792];
const C = {
  navy: rgb(0 / 255, 31 / 255, 73 / 255),
  deep: rgb(0 / 255, 19 / 255, 41 / 255),
  blue: rgb(0 / 255, 104 / 255, 217 / 255),
  pale: rgb(234 / 255, 243 / 255, 1),
  surface: rgb(245 / 255, 248 / 255, 252 / 255),
  ink: rgb(7 / 255, 27 / 255, 58 / 255),
  muted: rgb(92 / 255, 107 / 255, 128 / 255),
  line: rgb(220 / 255, 228 / 255, 238 / 255),
  white: rgb(1, 1, 1),
  green: rgb(0 / 255, 122 / 255, 88 / 255),
};

const safeText = (value = '') => String(value)
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/\u2026/g, '...')
  .replace(/[\u2022\u00B7]/g, '-')
  .replace(/\u00AE/g, '')
  .replace(/\u2122/g, '')
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

const fetchBytes = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load proposal asset: ${url}`);
  return response.arrayBuffer();
};

const wrap = (text, font, size, maxWidth) => {
  const paragraphs = safeText(text).split(/\n/);
  const lines = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let current = '';
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) current = candidate;
      else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    if (paragraphIndex < paragraphs.length - 1) lines.push('');
  });
  return lines;
};

const drawWrapped = (page, text, { x, y, width, size = 10, lineHeight = 13, font, color = C.ink, maxLines = 99 }) => {
  const lines = wrap(text, font, size, width).slice(0, maxLines);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
};

const truncateToWidth = (text, font, size, width) => {
  const clean = safeText(text);
  if (font.widthOfTextAtSize(clean, size) <= width) return clean;
  let shortened = clean;
  while (shortened.length > 1 && font.widthOfTextAtSize(`${shortened}...`, size) > width) shortened = shortened.slice(0, -1);
  return `${shortened.trim()}...`;
};

const drawRule = (page, y, x = 45, width = 522) => page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.7, color: C.line });

const drawPageNumber = (page, pageNumber, font) => {
  drawRule(page, 34);
  page.drawText('Bob Maxey Ford Protect - Customer proposal', { x: 45, y: 18, size: 7.5, font, color: C.muted });
  page.drawText(`${pageNumber} / 3`, { x: 535, y: 18, size: 7.5, font, color: C.muted });
};

const drawBrandHeader = (page, assets, fonts, label) => {
  page.drawRectangle({ x: 0, y: 730, width: 612, height: 62, color: C.white });
  const dealerScale = Math.min(112 / assets.dealer.width, 34 / assets.dealer.height);
  const protectScale = Math.min(92 / assets.protect.width, 29 / assets.protect.height);
  page.drawImage(assets.dealer, { x: 45, y: 744, width: assets.dealer.width * dealerScale, height: assets.dealer.height * dealerScale });
  page.drawLine({ start: { x: 171, y: 744 }, end: { x: 171, y: 778 }, thickness: 0.8, color: C.line });
  page.drawImage(assets.protect, { x: 185, y: 747, width: assets.protect.width * protectScale, height: assets.protect.height * protectScale });
  page.drawText(safeText(label).toUpperCase(), { x: 421, y: 756, size: 8, font: fonts.bold, color: C.blue });
  page.drawRectangle({ x: 0, y: 726, width: 612, height: 4, color: C.blue });
};

const drawLabelValue = (page, label, value, x, y, width, fonts) => {
  page.drawText(safeText(label).toUpperCase(), { x, y, size: 7, font: fonts.bold, color: C.blue });
  drawWrapped(page, value || 'Not provided', { x, y: y - 15, width, size: 10.5, lineHeight: 13, font: fonts.bold, color: C.ink, maxLines: 2 });
};

const drawBenefit = (page, x, y, title, text, fonts) => {
  page.drawCircle({ x: x + 9, y: y + 21, size: 9, color: C.blue });
  page.drawLine({ start: { x: x + 4.5, y: y + 21 }, end: { x: x + 8, y: y + 17.5 }, thickness: 1.6, color: C.white });
  page.drawLine({ start: { x: x + 8, y: y + 17.5 }, end: { x: x + 14.2, y: y + 24.5 }, thickness: 1.6, color: C.white });
  page.drawText(safeText(title), { x: x + 26, y: y + 24, size: 9, font: fonts.bold, color: C.ink });
  drawWrapped(page, text, { x: x + 26, y: y + 10, width: 102, size: 7.5, lineHeight: 9.5, font: fonts.regular, color: C.muted, maxLines: 3 });
};

const drawCoverageCard = (page, group, x, top, width, fonts) => {
  const height = 82;
  page.drawRectangle({ x, y: top - height, width, height, color: C.surface, borderColor: C.line, borderWidth: 0.7 });
  page.drawRectangle({ x, y: top - height, width: 4, height, color: C.blue });
  page.drawText(safeText(group.title), { x: x + 14, y: top - 19, size: 9.5, font: fonts.bold, color: C.ink });
  drawWrapped(page, group.summary || '', { x: x + 14, y: top - 34, width: width - 26, size: 7.1, lineHeight: 8, font: fonts.regular, color: C.muted, maxLines: 2 });
  (group.items || []).slice(0, 3).forEach((item, index) => {
    const y = top - 58 - index * 8;
    page.drawCircle({ x: x + 17, y: y + 2.2, size: 1.4, color: C.blue });
    page.drawText(truncateToWidth(item, fonts.regular, 6.8, width - 38), { x: x + 24, y, size: 6.8, font: fonts.regular, color: C.ink });
  });
  return top - height - 9;
};

export async function createProposalPdf({ quote, plan, detail }) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${quote.id} - Bob Maxey Ford Protect proposal`);
  pdf.setAuthor('Bob Maxey Ford Protect');
  pdf.setSubject('Ford Protect customer coverage proposal');
  pdf.setCreator('Bob Maxey Ford Protect Quote Studio');

  const [regular, bold, dealerBytes, protectBytes, roadBytes] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    fetchBytes(assetUrl('/assets/bob-maxey-logo.png')),
    fetchBytes(assetUrl('/assets/ford-official/ford-protect-logo.png')),
    fetchBytes(assetUrl('/assets/road-expedition.png')),
  ]);
  const fonts = { regular, bold };
  const assets = {
    dealer: await pdf.embedPng(dealerBytes),
    protect: await pdf.embedPng(protectBytes),
    road: await pdf.embedPng(roadBytes),
  };

  const customerName = [quote.customer?.firstName, quote.customer?.lastName].filter(Boolean).join(' ') || 'Ford owner';
  const vehicle = `${quote.year || ''} ${quote.make || ''} ${quote.model || ''}`.trim() || 'Vehicle to be confirmed';
  const deductible = quote.deductible === 'disappearing' ? 'Disappearing' : `$${quote.deductible || 100}`;
  const mileageLabel = quote.planPath === 'used' ? `${formatMiles(quote.termMiles)} additional miles` : `${formatMiles(quote.termMiles)} total miles`;
  const selectedOptions = protectionOptions.filter((item) => quote.addOns?.includes(item.id));

  const p1 = pdf.addPage(LETTER);
  drawBrandHeader(p1, assets, fonts, 'Personal coverage proposal');
  const roadWidth = 612;
  const roadHeight = roadWidth * (assets.road.height / assets.road.width);
  p1.drawImage(assets.road, { x: 0, y: 505, width: roadWidth, height: roadHeight });
  p1.drawRectangle({ x: 0, y: 505, width: 612, height: 88, color: C.deep, opacity: 0.82 });
  p1.drawText('PROTECT THE FORD YOU CHOSE.', { x: 45, y: 559, size: 21, font: bold, color: C.white });
  p1.drawText('A clear plan for the road ahead, backed by Ford and supported by Bob Maxey.', { x: 45, y: 538, size: 9.5, font: regular, color: C.white });
  p1.drawText(`Prepared for ${safeText(customerName)}`, { x: 45, y: 519, size: 8, font: bold, color: rgb(0.45, 0.78, 1) });

  p1.drawText('YOUR PROTECTION AT A GLANCE', { x: 45, y: 477, size: 8, font: bold, color: C.blue });
  p1.drawText(safeText(plan.name), { x: 45, y: 449, size: 24, font: bold, color: C.ink });
  drawWrapped(p1, plan.bestFor || detail?.bestFor || plan.description, { x: 45, y: 431, width: 522, size: 9, lineHeight: 12, font: regular, color: C.muted, maxLines: 2 });

  p1.drawRectangle({ x: 45, y: 310, width: 522, height: 92, color: C.surface, borderColor: C.line, borderWidth: 0.7 });
  drawLabelValue(p1, 'Vehicle', vehicle, 63, 382, 158, fonts);
  drawLabelValue(p1, 'Term', formatTerm(quote.termMonths), 237, 382, 132, fonts);
  drawLabelValue(p1, quote.planPath === 'used' ? 'Mileage added' : 'Odometer limit', mileageLabel, 385, 382, 130, fonts);
  drawRule(p1, 345, 63, 486);
  drawLabelValue(p1, 'Deductible', deductible, 63, 333, 118, fonts);
  drawLabelValue(p1, 'Coverage path', quote.planPath === 'used' ? 'Used vehicle plan' : 'New vehicle plan', 200, 333, 140, fonts);
  drawLabelValue(p1, 'Quote reference', quote.id, 370, 333, 150, fonts);

  p1.drawText('WHY OWNERS CHOOSE FORD PROTECT', { x: 45, y: 278, size: 8, font: bold, color: C.blue });
  p1.drawRectangle({ x: 45, y: 162, width: 522, height: 96, color: C.pale });
  drawBenefit(p1, 57, 195, 'Ford-backed', 'Coverage supported by Ford and serviced through participating dealers.', fonts);
  drawBenefit(p1, 192, 195, 'Roadside help', '24-hour roadside benefits are included where stated in the agreement.', fonts);
  drawBenefit(p1, 327, 195, 'Rental support', 'Selected rental benefits help keep you moving during covered repairs.', fonts);
  drawBenefit(p1, 462, 195, 'Transferable', 'Eligible remaining coverage may add value for a future owner.', fonts);

  p1.drawRectangle({ x: 45, y: 73, width: 522, height: 68, color: C.navy });
  p1.drawText('YOUR NEXT STEP', { x: 62, y: 118, size: 7.5, font: bold, color: rgb(0.45, 0.78, 1) });
  p1.drawText('A Bob Maxey specialist confirms eligibility and your exact price.', { x: 62, y: 96, size: 13, font: bold, color: C.white });
  p1.drawText('Nothing is final until you review and approve the issued agreement.', { x: 62, y: 80, size: 8, font: regular, color: C.white });
  drawPageNumber(p1, 1, regular);

  const p2 = pdf.addPage(LETTER);
  drawBrandHeader(p2, assets, fonts, 'Coverage detail');
  p2.drawText('WHAT YOUR SELECTED PLAN IS DESIGNED TO COVER', { x: 45, y: 695, size: 8, font: bold, color: C.blue });
  p2.drawText(safeText(plan.name), { x: 45, y: 666, size: 23, font: bold, color: C.ink });
  drawWrapped(p2, detail?.coverageModel || plan.description, { x: 45, y: 648, width: 522, size: 9, lineHeight: 12, font: regular, color: C.muted, maxLines: 3 });
  drawRule(p2, 612);
  const groups = detail?.coverageGroups?.length ? detail.coverageGroups : (plan.groups || []).map((title) => ({ title, summary: 'Coverage for eligible listed components in this system.', items: [] }));
  const leftGroups = groups.filter((_, index) => index % 2 === 0);
  const rightGroups = groups.filter((_, index) => index % 2 === 1);
  let leftY = 594;
  let rightY = 594;
  leftGroups.forEach((group) => { leftY = drawCoverageCard(p2, group, 45, leftY, 252, fonts); });
  rightGroups.forEach((group) => { rightY = drawCoverageCard(p2, group, 315, rightY, 252, fonts); });
  const lowestY = Math.min(leftY, rightY);
  if (lowestY > 76) {
    p2.drawText('Coverage shown is a planning summary. The issued agreement controls the exact covered components and exclusions.', { x: 45, y: 54, size: 7.5, font: regular, color: C.muted });
  }
  drawPageNumber(p2, 2, regular);

  const p3 = pdf.addPage(LETTER);
  drawBrandHeader(p3, assets, fonts, 'Options and next steps');
  p3.drawText('PERSONALIZED OPTIONS', { x: 45, y: 695, size: 8, font: bold, color: C.blue });
  p3.drawText('Built around how you plan to own your Ford.', { x: 45, y: 666, size: 22, font: bold, color: C.ink });
  p3.drawRectangle({ x: 45, y: 520, width: 522, height: 118, color: C.surface, borderColor: C.line, borderWidth: 0.7 });
  drawLabelValue(p3, 'Protection options requested', selectedOptions.length ? selectedOptions.map((item) => item.title).join(', ') : 'No optional benefits requested', 62, 616, 235, fonts);
  drawLabelValue(p3, 'Maintenance preference', quote.maintenanceId && quote.maintenanceId !== 'none' ? `${quote.maintenanceName}; every ${formatMiles(quote.maintenanceInterval)} miles` : 'No maintenance plan requested', 320, 616, 224, fonts);
  drawLabelValue(p3, 'Ownership goal', `${quote.keepYears} years; about ${formatMiles(quote.annualMiles)} miles per year`, 62, 564, 235, fonts);
  drawLabelValue(p3, 'Payment preference', quote.paymentPreference || 'Review available payment choices with the representative', 320, 564, 224, fonts);

  p3.drawText('WHAT TO EXPECT FROM BOB MAXEY', { x: 45, y: 489, size: 8, font: bold, color: C.blue });
  const steps = [
    ['1', 'Verify the vehicle', 'Confirm VIN, in-service date, current mileage, use, state, and Ford eligibility.'],
    ['2', 'Confirm the exact offer', 'Return the current Ford-eligible plan, term, deductible, options, and Bob Maxey price.'],
    ['3', 'Review before purchase', 'Read the agreement, payment schedule, cancellation terms, and state-specific provisions.'],
    ['4', 'Issue your coverage', 'Complete enrollment only after you choose and approve the final offer.'],
  ];
  steps.forEach(([number, title, text], index) => {
    const y = 442 - index * 58;
    p3.drawCircle({ x: 60, y: y + 11, size: 14, color: C.navy });
    p3.drawText(number, { x: number === '1' ? 57.5 : 56.5, y: y + 6.5, size: 10, font: bold, color: C.white });
    p3.drawText(title, { x: 84, y: y + 17, size: 10, font: bold, color: C.ink });
    drawWrapped(p3, text, { x: 84, y: y + 2, width: 450, size: 8, lineHeight: 10, font: regular, color: C.muted, maxLines: 2 });
  });

  p3.drawRectangle({ x: 45, y: 116, width: 522, height: 82, color: C.pale });
  p3.drawText('IMPORTANT PLAN INFORMATION', { x: 62, y: 177, size: 8, font: bold, color: C.blue });
  drawWrapped(p3, 'This proposal is not a service contract, current price, eligibility approval, or promise of coverage. Availability can vary by vehicle, mileage, in-service date, use, state, and Ford records. Maintenance, normal wear, pre-existing conditions, damage, misuse, modifications, and non-listed components may be excluded unless specifically covered. The executed Ford Protect agreement controls.', { x: 62, y: 159, width: 488, size: 7.7, lineHeight: 10, font: regular, color: C.ink, maxLines: 6 });

  p3.drawRectangle({ x: 45, y: 57, width: 522, height: 42, color: C.navy });
  p3.drawText(`Bob Maxey ${safeText(quote.store || 'Ford')} | Quote ${safeText(quote.id)}`, { x: 62, y: 79, size: 10, font: bold, color: C.white });
  p3.drawText('Prepared for a Ford Protect specialist review. Current dealer price will be provided separately.', { x: 62, y: 65, size: 7.5, font: regular, color: C.white });
  drawPageNumber(p3, 3, regular);

  return pdf.save();
}

export async function downloadProposalPdf(input) {
  const bytes = await createProposalPdf(input);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${input.quote.id || 'bob-maxey-ford-protect'}-proposal.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return bytes;
}
