import { CreditCard, MapPin, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { modelsByMake, years } from '../data';

const initialVehicle = {
  year: '',
  make: '',
  model: '',
  mileage: '',
  zip: '',
};

export default function Hero({ onQuote, onCompare }) {
  const [vehicle, setVehicle] = useState(initialVehicle);
  const models = useMemo(() => modelsByMake[vehicle.make] ?? [], [vehicle.make]);

  const update = (field, value) => {
    setVehicle((current) => ({
      ...current,
      [field]: value,
      ...(field === 'make' ? { model: '' } : {}),
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    onQuote(vehicle);
  };

  const startWithVehicle = () => {
    document.getElementById('home-vehicle-start')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section className="hero" id="top">
      <div className="hero__media" aria-hidden="true" />
      <div className="page-shell hero__content">
        <div className="hero__copy reveal">
          <h1>Ford ownership,<br />protected.</h1>
          <p>Genuine Ford Protect coverage, personalized for your vehicle and backed by the people who know Ford best.</p>
          <div className="hero__actions">
            <button className="button button--primary button--large" type="button" onClick={startWithVehicle}>
              Start With My Vehicle <span aria-hidden="true">→</span>
            </button>
            <button className="button button--outline-light button--large" type="button" onClick={onCompare}>
              Compare Plans
            </button>
          </div>
          <div className="hero__trust" aria-label="Ford Protect benefits">
            <div><ShieldCheck /><span>Genuine<br />Ford Protect</span></div>
            <div><MapPin /><span>Nationwide dealer<br />acceptance</span></div>
            <div><CreditCard /><span>Flexible payment<br />options</span></div>
          </div>
        </div>
      </div>
      <form className="quote-dock page-shell" id="home-vehicle-start" onSubmit={submit}>
        <label>
          <span>Year</span>
          <select value={vehicle.year} onChange={(event) => update('year', event.target.value)}>
            <option value="">Select year</option>
            {years.map((year) => <option key={year}>{year}</option>)}
          </select>
        </label>
        <label>
          <span>Make</span>
          <select value={vehicle.make} onChange={(event) => update('make', event.target.value)}>
            <option value="">Select make</option>
            <option>Ford</option>
            <option>Lincoln</option>
          </select>
        </label>
        <label>
          <span>Model</span>
          <select value={vehicle.model} disabled={!vehicle.make} onChange={(event) => update('model', event.target.value)}>
            <option value="">Select model</option>
            {models.map((model) => <option key={model}>{model}</option>)}
          </select>
        </label>
        <label>
          <span>Current mileage</span>
          <input type="number" min="0" inputMode="numeric" placeholder="Enter mileage" value={vehicle.mileage} onChange={(event) => update('mileage', event.target.value)} />
        </label>
        <label>
          <span>ZIP code</span>
          <input type="text" inputMode="numeric" maxLength="5" placeholder="Enter ZIP code" value={vehicle.zip} onChange={(event) => update('zip', event.target.value.replace(/\D/g, ''))} />
        </label>
        <button className="button button--primary quote-dock__submit" type="submit">See My Options <span>→</span></button>
        <button className="quote-dock__vin" type="button" onClick={() => onQuote({ ...vehicle, focusVin: true })}>Or enter a VIN</button>
      </form>
    </section>
  );
}
