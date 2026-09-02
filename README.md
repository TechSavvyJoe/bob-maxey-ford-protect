# Bob Maxey Ford Protect

Premium multi-page React/Vite customer experience for learning about and requesting eligible Ford Protect products through the Bob Maxey dealership network.

## Pages

- `/` - concise home page, vehicle quick-start and product-family gateway
- `/products` - concise Ford Protect product catalog organized by customer need
- `/products/:id` - complete on-site product guide with searchable coverage, benefits, eligibility, exclusions and claims guidance
- `/compare` - detailed mechanical and electric-vehicle plan comparisons plus specialty pathways
- `/eligibility` - new-plan, used-plan, EV, commercial-use and inspection guidance
- `/how-it-works` - six-step request-to-agreement process and payment guidance
- `/resources` - on-site help center, terminology, guides and FAQs

## Customer-facing product scope

- Mechanical: PremiumCARE, ExtraCARE, BaseCARE and PowertrainCARE
- Electric: PremiumCARE Plus EV, PremiumCARE EV, ExtraCARE EV and BaseCARE EV
- Maintenance: Premium Maintenance, Premium Maintenance EV and dealer-matched maintenance choices
- Continued coverage: Continued Service Plan Ultimate and Standard Plus
- Specialist requests: Diesel EngineCARE and RentalCARE where current Ford records and program rules allow

The public catalog intentionally excludes GAP, lease-only products and vehicle-care products that must be purchased at the original vehicle sale. Ford Blue Advantage and Lincoln CPO upgrade records remain archived in the source data for possible later use, but their pages and cards are hidden from customers.

## Current functional scope

- Working multi-page navigation without a full page reload
- Responsive desktop and mobile layouts
- Focused product catalog and searchable component coverage
- Internal product-detail pages with no links to outside pricing sites
- Mechanical and EV comparison modes
- Organized help center with direct routes to comparison, eligibility, process and product details
- Mechanical comparison with shared benefits separated from plan-level differences
- Payment guidance for eligible 0%-interest financing with a small down payment; the current offer confirms the exact down payment, number of payments, schedule, and first due date
- Six-step responsive quote studio with vehicle, protection, term/mileage, additional-product, customer and review stages
- After-sale product requests with full in-flow details and vehicle-specific review language
- Portrait customer proposal PDF with customer, vehicle, plan, coverage, options, inspection, payment and next-step details
- DealerMail ADF/XML lead output and a secure-endpoint handoff that reports success only after the configured endpoint accepts the lead
- Local saved-quote lookup, contact forms and policy/resource modals
- Official Ford Protect logos and locally hosted Ford marketing media

## Run locally

```powershell
npm install
npm run dev
```

Production build:

```powershell
npm run build
```

## GitHub Pages testing

The project includes a GitHub Actions workflow that builds and publishes the `main` branch to GitHub Pages. The Vite base path, navigation routes, locally hosted media and direct-page fallback are configured for a repository URL such as:

```text
https://YOUR-GITHUB-USER.github.io/bob-maxey-ford-protect/
```

After the repository is pushed to GitHub, select **GitHub Actions** as the Pages deployment source in the repository settings. Every later push to `main` will rebuild the test site automatically.

To test the Pages build locally in PowerShell:

```powershell
$env:GITHUB_REPOSITORY='YOUR-GITHUB-USER/bob-maxey-ford-protect'
npm run build
Remove-Item Env:GITHUB_REPOSITORY
```

## Production integrations still required

The prototype does not invent live prices or represent an issued contract. Production needs:

1. VIN decoding and Ford vehicle/warranty-record lookup
2. Ford Protect eligibility, plan, term, deductible and rating data
3. Bob Maxey pricing rules and dealership/store routing
4. Secure customer identity, disclosures, payment and installment-plan workflow
5. Authorized Ford contract enrollment and issued-contract confirmation
6. Production hosting and authentication for the configured CRM/DMS lead endpoint
7. Approved storage, email/SMS delivery, analytics and consent tracking
8. Locally hosted, compliance-approved agreement PDFs if Bob Maxey wants downloadable contracts on the site

## Official brand and content references

The Ford oval, Ford Protect lockup and product imagery under `public/assets/ford-official/` were sourced from current official Ford Protect pages for this local dealership prototype. Coverage summaries were aligned to current Ford Protect plan pages, brochures and FAQ materials. Key references:

- <https://fordprotect.ford.com/extended-service-plan>
- <https://fordprotect.ford.com/premium-maintenance-plan>
- <https://fordprotect.ford.com/continued-service-plan>
- <https://fordprotect.ford.com/faq>
- <https://fordprotect.ford.com/fl8250contract>

The Bob Maxey logo is the current dealer logo previously supplied from the Bob Maxey Ford website. Final public use of Ford trademarks, logos, product copy and marketing media requires Bob Maxey/Ford brand and compliance approval.

## Verification

- `npm run build` passes
- `npm audit --audit-level=high` reports 0 vulnerabilities
- Eight primary routes return HTTP 200 in browser QA
- No broken images, document-level horizontal overflow, console errors or page errors on tested desktop routes
- Product search, coverage search, category tabs, comparison modes, quote steps, product-detail popups, review disclosures and proposal generation were tested
- 390 px phone, 768 px tablet and 1024 px laptop layouts pass document-level overflow checks
- Product-detail and Resources pages contain no customer-facing external pricing links
- Native Playwright Chrome was used for screenshot and interaction QA because the Chrome extension browser-control runtime was unavailable
