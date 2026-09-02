import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import Brand from './Brand';
import { locations } from '../data';

export default function TrustFooter({ onQuote, onContact, onResource, compact = false }) {
  return (
    <>
      {!compact && (
        <section className="dealer-support-band">
          <div className="page-shell dealer-support-band__inner">
            <div><ShieldCheck /><span><small>BOB MAXEY FORD PROTECT</small><h2>Ford-backed protection. Local guidance when you need it.</h2></span></div>
            <div className="dealer-support-band__locations">{locations.map((location) => <button key={location.name} type="button" onClick={() => onContact(location.name)}><MapPin /><span><strong>{location.name}</strong><small>{location.descriptor}</small></span></button>)}</div>
            <button className="button button--primary" type="button" onClick={() => onQuote()}>Check my vehicle <ArrowRight /></button>
          </div>
        </section>
      )}

      <footer className="site-footer site-footer--professional">
        <div className="page-shell site-footer__top">
          <Brand light />
          <nav aria-label="Footer links">
            <button type="button" onClick={() => onResource('privacy')}>Privacy</button>
            <button type="button" onClick={() => onResource('terms')}>Terms</button>
            <button type="button" onClick={() => onResource('accessibility')}>Accessibility</button>
            <button type="button" onClick={() => onContact()}>Contact</button>
          </nav>
        </div>
        <div className="page-shell site-footer__legal">
          <p>Your online selections are a coverage request. Final eligibility, availability, pricing and agreement terms are confirmed before purchase.</p>
          <p>Ford, Lincoln and Ford Protect are trademarks of Ford Motor Company. The issued Ford Protect agreement controls coverage, exclusions, limits and claims decisions.</p>
        </div>
      </footer>
    </>
  );
}
