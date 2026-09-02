import { ArrowRight, CircleHelp, FileText, MapPin, Scale, ShieldCheck } from 'lucide-react';
import Brand from './Brand';
import { locations } from '../data';

const resources = [
  ['Plan comparison', Scale, 'comparison'],
  ['Coverage guides', FileText, 'documents'],
  ['Vehicle eligibility', ShieldCheck, 'eligibility'],
  ['Frequently asked questions', CircleHelp, 'faq'],
];

function MichiganMap() {
  return (
    <svg className="michigan-map" viewBox="0 0 260 220" aria-label="Michigan location map" role="img">
      <path d="M101 22c16 5 29 3 39-3 7 11 19 16 33 15l12 18 18 11-7 14-21-1-10 16-18-6-10 9-19-4-12-14-19-7 2-15-15-8 8-12 20-1 8-14Z" />
      <path d="M160 99c16 4 30 17 35 33 4 14 0 25-4 35-3 10 3 19 4 31h-61c-4-12-10-19-19-28 12-4 22-11 25-21 4-14 0-26 4-38 4-9 9-12 16-12Z" />
      {[[171, 151], [156, 166], [182, 172], [167, 187]].map(([cx, cy], index) => <circle key={index} cx={cx} cy={cy} r="5" />)}
    </svg>
  );
}

export default function TrustFooter({ onQuote, onContact, onResource, compact = false }) {
  return (
    <>
      {!compact && <section className="road-band">
        <div className="road-band__media" aria-hidden="true" />
        <div className="page-shell road-band__content">
          <h2>Protected wherever<br />the road takes you.</h2>
          <span className="red-rule" />
          <p>Ford Protect provides dealer support through Ford and Lincoln dealerships across the United States, Canada and Mexico, subject to the final agreement.</p>
        </div>
      </section>}

      {!compact && <section className="locations-resources section" id="resources">
        <div className="page-shell locations-resources__grid">
          <div>
            <h2>Your Bob Maxey team</h2>
            <div className="location-list">
              {locations.map((location) => (
                <button key={location.name} type="button" onClick={() => onContact(location.name)}>
                  <MapPin /><span><strong>{location.name}</strong><small>{location.descriptor}</small></span><ArrowRight />
                </button>
              ))}
            </div>
          </div>
          <MichiganMap />
          <div>
            <h2>Resources</h2>
            <div className="resource-list">
              {resources.map(([label, Icon, key]) => (
                <button key={label} type="button" onClick={() => onResource(key)}><Icon /><span>{label}</span><ArrowRight /></button>
              ))}
            </div>
          </div>
        </div>
      </section>}

      {!compact && <section className="closing-cta">
        <div className="page-shell closing-cta__inner">
          <h2>Ready to protect what moves you?</h2>
          <div>
            <button className="button button--white" type="button" onClick={() => onQuote()}>Build My Quote <ArrowRight /></button>
            <button className="button button--outline-light" type="button" onClick={() => onContact()}>Talk to a Specialist <ArrowRight /></button>
          </div>
        </div>
      </section>}

      <footer className="site-footer">
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
          <p>Online quote selections are estimates until vehicle eligibility, current Ford Protect availability, Bob Maxey pricing, payment terms and contract issuance are confirmed.</p>
          <p>Ford, Lincoln and Ford Protect are trademarks of Ford Motor Company. The issued Ford Protect agreement controls coverage, exclusions, limits and claims decisions.</p>
        </div>
      </footer>
    </>
  );
}
