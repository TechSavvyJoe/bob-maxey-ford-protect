# Release acceptance and remaining dependencies

## What this site does

This is a Ford Protect education and planning-request frontend, not a live rating engine or contract enrollment system. Customers can compare products, configure requests, decode public vehicle-description facts, and download branded proposals. The public preview never claims that a request was delivered without a complete accepted server receipt.

## Release gates

- `npm run check`: unit regressions, production build, complete generated routes, archived-product guards, bounded financing language and required-choice guards.
- `npm run test:browser`: public-page accessibility/image/reflow checks, required quote decisions, product-only journeys for each vehicle situation, VIN provenance, proposal preview, backend-disabled status and module-load recovery.
- GitHub Pages deployment runs these checks before publishing. A failed browser test prevents deployment.
- Review generated customer PDFs visually after changes to fonts, layouts or coverage data. Raw test output is not published with the site.

## September 2026 review priorities addressed

- Strict plan/term/mileage membership, powertrain/state compatibility, overlapping rental benefits and bundled EV maintenance.
- Historical used-plan matrices reconciled to the supplied September 2024 Michigan retail guide; current public Ford brochures used to narrow component examples.
- Inspection messages distinguish an estimate from confirmed Ford records and distinguish ESP used enrollment from CSP/specialty rules.
- Required mobile options remain visible instead of being hidden in sideways strips; nested dialogs have readable close controls and keyboard-accessible scroll areas.
- Missing PDF mileage, service frequency, selected benefits and notes restored; long text uses measured wrapping and licensed embedded fonts.
- Safer VIN cancellation and provenance, validated saved-draft retention, XML escaping and bounded consent/receipt handling.
- Exact route matching, meaningful missing-page recovery, consistent generated deep links and a deferred quote module.

## Verification snapshot: September 4, 2026

- 84 unit/regression tests passed, including term membership, product timing, inspections, VIN validation, draft privacy, consent, XML and PDF output models.
- 67 maintained browser checks passed against the production build using the GitHub Pages repository base path. Quote-specific checks were rerun after final VIN changes.
- Independent design review checked 28 public routes, 88 mobile product-topic states and 60 quote/dialog states across six viewports, including 320px phones and a 640 x 450 short window. The tested states had no unresolved axe A/AA findings, runtime errors or horizontal overflow.
- 22 generated PDF samples were checked for page/text bounds; representative proposal and guide pages were visually inspected. These are layout and content checks, not PDF/UA certification.
- Production dependency audit reported zero known vulnerabilities. This is not a guarantee against unknown vulnerabilities.

Primary Ford evidence includes the [additional-plan purchase timing page](https://fordprotect.ford.com/additional-plans), [current FAQ](https://fordprotect.ford.com/faq), [FL8250 agreement](https://fordprotect.ford.com/fl8250contract), [ExtraCARE brochure](https://fordprotect.ford.com/extendedserviceplan/index/downloadbrochure/careplan/extracare/), [BaseCARE brochure](https://fordprotect.ford.com/extendedserviceplan/index/downloadbrochure/careplan/basecare/) and [Continued Service Plan buyer guide](https://fordprotect.ford.com/media/brochure/ford/FR-CSP-Buyer-Guide-FINAL.pdf). Historical retail-guide data is identified as planning data, not a current offer. Public evidence does not establish that a particular dealer can enroll every displayed request today.

## Must be completed outside this frontend before accepting live customers

1. Bob Maxey approval of public privacy/terms, consent wording, retention, contact routing, Ford branding and marketing-media rights.
2. Authorized Ford vehicle/warranty records, current state-specific eligibility and pricing, enrollment and issued-contract delivery.
3. Secure dealership lead endpoint, DealerMail routing, server-side validation/abuse protection and verified delivery monitoring. Never place credentials in `VITE_*` settings.
4. If purchase/payment is added: payment-provider integration, disclosures, installment eligibility, operational ownership and reconciliation.
5. Real-device iOS/Android and assistive-technology acceptance by dealership stakeholders. Automated Chromium tests do not certify every browser/device or PDF accessibility.

Current advertised Ford rules and the historical guide are not interchangeable. RentalCARE, LeaseCARE and specialty options without confirmed current public offerings remain dealer-verification requests. The issued VIN/state-specific agreement controls coverage and expiration. An online estimate must never become a blanket inspection exemption or a guaranteed sellable combination.

No finite audit can establish that software is perfect. Release confidence comes from repeatable tests, visual review, explicit known dependencies and monitoring once the operational services are connected.
