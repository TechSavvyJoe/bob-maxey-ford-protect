import { ArrowRight, Check, MapPin, ShieldCheck } from 'lucide-react';

export default function Hero({ onQuote, onCompare }) {
  return (
    <section className="hero hero--professional" id="top">
      <div className="hero__media" aria-hidden="true" />
      <div className="page-shell hero__content">
        <div className="hero__copy">
          <span className="hero__eyebrow">Genuine Ford Protect · Bob Maxey support</span>
          <h1>Protect your Ford<br /> for the road ahead.</h1>
          <p>Compare Ford-backed coverage, match it to your vehicle, and have Bob Maxey confirm the exact options and price.</p>
          <div className="hero__actions">
            <button className="button button--primary button--large" type="button" onClick={() => onQuote()}>
              Check my vehicle <ArrowRight />
            </button>
            <button className="button button--outline-light button--large" type="button" onClick={onCompare}>
              Compare coverage
            </button>
          </div>
          <div className="hero__trust" aria-label="Ford Protect benefits">
            <span><ShieldCheck /><b>Backed by Ford</b></span>
            <span><MapPin /><b>Dealer support in the U.S., Canada &amp; Mexico</b></span>
          </div>
        </div>
      </div>

      <div className="page-shell ownership-entry" aria-label="Choose how you are shopping">
        <div className="ownership-entry__intro">
          <small>START HERE</small>
          <strong>Which best describes you?</strong>
        </div>
        <button type="button" onClick={() => onQuote({ purchaseContext: 'owner' })}>
          <span><Check /><b>I already own a Ford</b></span>
          <small>See protection that may still be available after the sale.</small>
          <ArrowRight />
        </button>
        <button type="button" onClick={() => onQuote({ purchaseContext: 'shopping' })}>
          <span><Check /><b>I’m buying a vehicle from Bob Maxey</b></span>
          <small>Plan eligible protection before delivery or signing.</small>
          <ArrowRight />
        </button>
      </div>
    </section>
  );
}
