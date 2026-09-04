export const VPIC_SOURCE_NAME = 'NHTSA vPIC';
export const VPIC_PRIVACY_URL = 'https://vpic.nhtsa.dot.gov/api/';
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

const API_ROOT = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended';

const clean = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized && !['0', 'Not Applicable', 'Not Reported', 'N/A'].includes(normalized) ? normalized : '';
};
const titleCase = (value) => clean(value).toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const joinUnique = (values, separator = ' · ') => [...new Set(values.map(clean).filter(Boolean))].join(separator);

export function normalizeVin(value) {
  // Ignore formatting separators, but never remove a VIN character or truncate
  // an overlong value into a different, apparently valid vehicle identifier.
  return String(value || '').toUpperCase().replace(/[\s-]/g, '');
}

export function powertrainFromVpic(result = {}) {
  const fuel = joinUnique([result.FuelTypePrimary, result.FuelTypeSecondary], ' / ');
  const electrification = clean(result.ElectrificationLevel);
  const description = `${fuel} ${electrification}`.toLowerCase();
  if (/plug-in hybrid|phev|hybrid electric|\bhybrid\b|hev/.test(description)) return 'Hybrid';
  if (/battery electric|bev|electric only|\belectric\b/.test(description)) return 'Electric';
  if (/diesel/.test(description)) return 'Diesel';
  if (/gasoline|flexible fuel|ethanol|natural gas|propane/.test(description)) return 'Gas';
  return '';
}

export function mapVpicVehicle(result = {}) {
  const make = clean(result.Make).toUpperCase() === 'FORD'
    ? 'Ford'
    : clean(result.Make).toUpperCase() === 'LINCOLN'
      ? 'Lincoln'
      : titleCase(result.Make);
  const engineDescription = joinUnique([
    clean(result.EngineModel),
    clean(result.DisplacementL) ? `${clean(result.DisplacementL)}L` : '',
    clean(result.EngineConfiguration),
    clean(result.EngineCylinders) ? `${clean(result.EngineCylinders)} cylinders` : '',
    clean(result.EngineHP) ? `${clean(result.EngineHP)} hp` : '',
    clean(result.Turbo) === 'Yes' ? 'Turbocharged' : '',
  ]);
  const transmission = joinUnique([
    clean(result.TransmissionStyle),
    clean(result.TransmissionSpeeds) ? `${clean(result.TransmissionSpeeds)} speeds` : '',
  ]);
  const plant = joinUnique([result.PlantCity, result.PlantState, result.PlantCountry], ', ');
  const fuelType = joinUnique([result.FuelTypePrimary, result.FuelTypeSecondary], ' / ');

  return {
    vin: normalizeVin(result.VIN),
    year: clean(result.ModelYear),
    make,
    model: clean(result.Model),
    trim: clean(result.Trim),
    series: clean(result.Series),
    bodyClass: clean(result.BodyClass),
    bodyCabType: clean(result.BodyCabType),
    driveType: clean(result.DriveType),
    fuelType,
    electrificationLevel: clean(result.ElectrificationLevel),
    powertrain: powertrainFromVpic(result),
    engineCylinders: clean(result.EngineCylinders),
    engineDisplacementL: clean(result.DisplacementL),
    engineModel: clean(result.EngineModel),
    engineConfiguration: clean(result.EngineConfiguration),
    engineHorsepower: clean(result.EngineHP),
    engineDescription,
    transmissionStyle: clean(result.TransmissionStyle),
    transmissionSpeeds: clean(result.TransmissionSpeeds),
    transmission,
    gvwr: clean(result.GVWR),
    doors: clean(result.Doors),
    vehicleType: clean(result.VehicleType),
    manufacturer: clean(result.Manufacturer),
    modelId: clean(result.ModelID),
    plantCity: clean(result.PlantCity),
    plantState: clean(result.PlantState),
    plantCountry: clean(result.PlantCountry),
    plant,
  };
}

const decodeError = (message, code = 'decode-failed') => Object.assign(new Error(message), { code });

export async function decodeVinWithVpic(vin, { fetchImpl = globalThis.fetch, timeoutMs = 12000, signal } = {}) {
  const normalizedVin = normalizeVin(vin);
  if (!VIN_PATTERN.test(normalizedVin)) throw decodeError('Enter a complete 17-character VIN before decoding.', 'invalid-vin');
  if (signal?.aborted) throw decodeError('VIN decoding was canceled.', 'aborted');
  if (typeof fetchImpl !== 'function') throw decodeError('VIN decoding is unavailable in this browser. Enter the vehicle details manually.', 'fetch-unavailable');

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.max(1000, timeoutMs));
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener?.('abort', abortFromCaller, { once: true });

  try {
    const response = await fetchImpl(`${API_ROOT}/${encodeURIComponent(normalizedVin)}?format=json`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    if (!response?.ok) throw decodeError('NHTSA VIN decoding is temporarily unavailable. Enter the vehicle details manually or try again.', 'service-unavailable');
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw decodeError('NHTSA returned an unreadable VIN response. Enter the vehicle details manually.', 'invalid-response');
    }
    if (controller.signal.aborted) throw decodeError(timedOut ? 'NHTSA VIN decoding timed out. Try again or enter the details manually.' : 'VIN decoding was canceled.', timedOut ? 'timeout' : 'aborted');
    const result = Array.isArray(payload?.Results) ? payload.Results[0] : null;
    if (!result || typeof result !== 'object') throw decodeError('NHTSA did not return vehicle details for this VIN.', 'no-result');

    const errorCode = String(result.ErrorCode ?? '').trim();
    if (!errorCode) throw decodeError('NHTSA returned vehicle facts without a validation status. Enter the details manually or try again.', 'invalid-response');
    if (errorCode && errorCode.split(',').some((code) => code.trim() !== '0')) {
      const detail = clean(result.ErrorText).replace(/^\d+(?:,\d+)*\s*-\s*/, '');
      throw decodeError(detail ? `NHTSA could not validate this VIN: ${detail}` : 'NHTSA could not validate this VIN. Check the characters and try again.', 'vin-not-validated');
    }

    const vehicle = mapVpicVehicle(result);
    if (vehicle.vin && vehicle.vin !== normalizedVin) throw decodeError('NHTSA returned details for a different VIN. Check the VIN and try again.', 'vin-mismatch');
    vehicle.vin = normalizedVin;
    if (!vehicle.year && !vehicle.make && !vehicle.model) throw decodeError('NHTSA validated the VIN but did not return usable vehicle details. Enter them manually.', 'no-vehicle-facts');
    return {
      status: 'success',
      source: VPIC_SOURCE_NAME,
      sourceUrl: VPIC_PRIVACY_URL,
      decodedAt: new Date().toISOString(),
      vehicle,
      message: 'Vehicle facts decoded by NHTSA. Review and edit them if needed; Ford records are still required for warranty and in-service information.',
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw decodeError(
        timedOut ? 'NHTSA VIN decoding timed out. Check your connection, try again, or enter the details manually.' : 'VIN decoding was canceled.',
        timedOut ? 'timeout' : 'aborted',
      );
    }
    if (error?.code) throw error;
    throw decodeError('The VIN could not be decoded while offline. Enter the vehicle details manually or try again when connected.', 'network-error');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener?.('abort', abortFromCaller);
  }
}
