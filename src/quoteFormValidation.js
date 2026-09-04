import { states } from './data.js';
import { VIN_PATTERN } from './vinDecoder.js';

export function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function vehicleFormErrors(quote, today) {
  const context = { 'new-purchase': 'shopping', 'used-purchase': 'shopping', 'owned-after-sale': 'owner' };
  const mileage = String(quote.mileage ?? '').trim();
  const validDate = (value) => isCalendarDate(value) && value <= today;
  return {
    purchaseContext: context[quote.vehicleSituation] === quote.purchaseContext && quote.purchaseContext ? '' : 'Choose your vehicle situation.',
    transactionMethod: quote.purchaseContext !== 'shopping' || ['finance', 'lease', 'cash', 'undecided'].includes(quote.transactionMethod) ? '' : 'Choose how you expect to complete the vehicle purchase.',
    vin: !quote.vin || VIN_PATTERN.test(quote.vin) ? '' : 'Enter a valid 17-character VIN (no I, O, or Q), or leave it blank for now.',
    year: /^\d{4}$/.test(String(quote.year)) && Number(quote.year) >= 1900 && Number(quote.year) <= Number(today.slice(0, 4)) + 1 ? '' : 'Choose a valid model year.',
    make: ['Ford', 'Lincoln'].includes(quote.make) ? '' : 'Choose Ford or Lincoln for this coverage request.',
    model: String(quote.model || '').trim() ? '' : 'Choose the vehicle model.',
    mileage: /^\d+$/.test(mileage) && Number(mileage) <= 500000 ? '' : 'Enter a whole-number odometer from 0 to 500,000 miles.',
    state: states.includes(quote.state) ? '' : 'Choose the registration state.',
    zip: /^\d{5}$/.test(quote.zip || '') ? '' : 'Enter a 5-digit ZIP code.',
    inService: quote.inService ? validDate(quote.inService) ? '' : 'Enter a real warranty start date that is not in the future.' : quote.inServiceUnknown ? '' : 'Enter the warranty start date or choose “I don’t know.”',
    purchaseDate: !quote.purchaseDate || validDate(quote.purchaseDate) ? '' : 'Enter a real purchase date that is not in the future.',
    usage: ['Personal', 'Business'].includes(quote.usage) ? '' : 'Choose personal or business use.',
    powertrain: ['Gas', 'Hybrid', 'Diesel', 'Electric'].includes(quote.powertrain) ? '' : 'Choose the powertrain.',
    snowPlow: ['No', 'Yes'].includes(quote.snowPlow) ? '' : 'Choose whether the vehicle uses a snow plow.',
  };
}
