export const comparisonRows = [
  'Engine',
  'Transmission',
  'Drive axle (front & rear)',
  'Steering',
  'Brakes',
  'Front suspension',
  'Electrical',
  'Climate control',
  'High-tech components',
  'Audio & safety systems',
];

export const planData = [
  {
    id: 'premium',
    name: 'PremiumCARE',
    count: '1,000+',
    label: 'Most comprehensive',
    bestFor: 'Drivers who want Ford Protect’s broadest mechanical and high-tech coverage.',
    description: 'Covers parts and labor for more than 1,000 key components, including advanced technology and major vehicle systems.',
    groups: ['Engine', 'Transmission', 'High-tech', 'Steering', 'Climate control', 'Electrical'],
    examples: ['Factory-installed turbocharger or supercharger', 'Water pump and fuel injectors', 'Steering gear and power steering components', 'Air conditioning and heating components', 'Selected cameras, sensors and electronic modules'],
    features: [true, true, true, true, true, true, true, true, true, true],
  },
  {
    id: 'extra',
    name: 'ExtraCARE',
    count: '113',
    label: 'Enhanced protection',
    bestFor: 'Drivers who want broader coverage for the systems that affect drivability and daily comfort.',
    description: 'Adds protection beyond core powertrain components for many steering, braking, electrical, climate and high-tech items.',
    groups: ['Engine', 'Transmission', 'High-tech', 'Steering', 'Climate control', 'Electrical'],
    examples: ['Major engine and transmission components', 'Steering and braking components', 'Selected electrical components', 'Selected air conditioning and heating components', 'Selected high-tech components'],
    features: [true, true, true, true, true, true, true, true, true, false],
  },
  {
    id: 'base',
    name: 'BaseCARE',
    count: '84',
    label: 'Essential protection',
    bestFor: 'Drivers looking for practical protection across major mechanical systems.',
    description: 'Focused coverage for major engine, transmission, drive axle and selected vehicle-system components.',
    groups: ['Engine', 'Transmission', 'Drive axle', 'Steering', 'Brakes', 'Electrical'],
    examples: ['Major engine and transmission components', 'Front- and rear-wheel-drive axle components', 'Selected steering and brake components', 'Selected front suspension components', 'Selected electrical and climate components'],
    features: [true, true, true, true, true, true, true, true, false, false],
  },
  {
    id: 'powertrain',
    name: 'PowertrainCARE',
    count: '29',
    label: 'Core protection',
    bestFor: 'Drivers who want protection centered on the most critical powertrain systems.',
    description: 'Protection for critical engine, transmission and front- and rear-wheel-drive components.',
    groups: ['Engine', 'Transmission', 'Drive axle'],
    examples: ['Selected internally lubricated engine parts', 'Selected transmission components', 'Front-wheel-drive axle components', 'Rear-wheel-drive axle components', 'Seals and gaskets for covered repairs where listed'],
    features: [true, true, true, false, false, false, false, false, false, false],
  },
];

export const mechanicalCoverageDetails = [
  {
    id: 'engine',
    title: 'Engine & fuel delivery',
    intro: 'Every mechanical plan starts with core engine protection. The higher levels add more fuel-delivery, cooling and electronic engine items.',
    plans: {
      premium: { covered: true, summary: 'Broad engine and fuel-system protection. PremiumCARE is exclusionary: covered failures are included unless an item is excluded by the agreement.', examples: ['Internally lubricated parts, cylinder block and cylinder heads', 'Factory-installed turbocharger or supercharger', 'Gas and diesel injectors, fuel lines and fuel tank', 'PCM module, radiator and radiator fan'] },
      extra: { covered: true, summary: 'Adds engine-management and fuel-delivery items beyond the lower levels.', examples: ['Gas and diesel fuel injectors and lines', 'Diesel lift pump and engine mounts', 'Fuel tank and metal fuel lines', 'Radiator and radiator fan'] },
      base: { covered: true, summary: 'Covers core engine components and selected additional engine items.', examples: ['Internally lubricated parts, block and heads', 'Factory-installed turbocharger or supercharger', 'Diesel injector pump and metal fuel lines', 'Oil pump, water pump, timing chain and thermostat'] },
      powertrain: { covered: true, summary: 'Core engine protection only; fuel-injection components are not listed under PowertrainCARE.', examples: ['Internally lubricated parts, block and heads', 'Factory-installed turbocharger or supercharger', 'Oil pump, water pump, timing chain and thermostat', 'Manifolds, flywheel, seals and gaskets'] },
    },
  },
  {
    id: 'transmission',
    title: 'Transmission & transfer case',
    intro: 'All four plans include the core transmission and transfer-case components. Higher plans add more external control and related pieces.',
    plans: {
      premium: { covered: true, summary: 'The broadest transmission list, including core internals and additional related components.', examples: ['Internally lubricated parts and torque converter', 'Transfer case including internal parts', 'Transmission module, linkage and mounts', 'Transmission case, seals and gaskets'] },
      extra: { covered: true, summary: 'Adds external transmission control and mounting items beyond the core list.', examples: ['Internally lubricated parts and torque converter', 'Transfer case including internal parts', 'External transmission module and mounts', 'Transmission vacuum module'] },
      base: { covered: true, summary: 'Core transmission and transfer-case protection.', examples: ['Internally lubricated parts', 'Torque converter', 'Transfer case including internal parts', 'Transmission case, seals and gaskets'] },
      powertrain: { covered: true, summary: 'Core transmission and transfer-case protection.', examples: ['Internally lubricated parts', 'Torque converter', 'Transfer case including internal parts', 'Transmission case, seals and gaskets'] },
    },
  },
  {
    id: 'drive-axle',
    title: 'Drive axle & four-wheel-drive hardware',
    intro: 'Each mechanical level includes the principal front- and rear-drive axle components shown in Ford’s comparison.',
    plans: {
      premium: { covered: true, summary: 'Includes the shared drive-axle components, with broader coverage governed by PremiumCARE exclusions.', examples: ['Axle shafts and driveshaft', '4x4 front/rear axle housings with internal parts', 'AWD final-drive/rear axle housings with internal parts', 'U-joints, CV joints, seals and gaskets'] },
      extra: { covered: true, summary: 'Includes the principal axle, housing and driveline components.', examples: ['Axle shafts and driveshaft', '4x4/AWD drive axle housings with internal parts', 'Locking rings for four-wheel drive', 'U-joints, CV joints, seals and gaskets'] },
      base: { covered: true, summary: 'Includes the principal axle, housing and driveline components.', examples: ['Axle shafts and driveshaft', '4x4/AWD drive axle housings with internal parts', 'Locking rings for four-wheel drive', 'U-joints, CV joints, seals and gaskets'] },
      powertrain: { covered: true, summary: 'Includes the principal axle, housing and driveline components.', examples: ['Axle shafts and driveshaft', '4x4/AWD drive axle housings with internal parts', 'Locking rings for four-wheel drive', 'U-joints, CV joints, seals and gaskets'] },
    },
  },
  {
    id: 'steering',
    title: 'Steering',
    intro: 'Steering starts at BaseCARE; it is not listed under PowertrainCARE.',
    plans: {
      premium: { covered: true, summary: 'Broad steering coverage, subject to PremiumCARE exclusions.', examples: ['Steering gear housing and internal parts', 'Power steering pump/electric power steering actuator', 'Steering column, shaft, linkages and couplings', 'Control valve, cooler and metal lines'] },
      extra: { covered: true, summary: 'Includes the principal steering-system components.', examples: ['Steering gear housing and internal parts', 'Power steering pump/electric power steering actuator', 'Column lock and idler arm', 'Control valve, cooler and metal lines'] },
      base: { covered: true, summary: 'Includes the principal steering-system components.', examples: ['Steering gear housing and internal parts', 'Power steering pump/electric power steering actuator', 'Column lock and idler arm', 'Control valve, cooler and metal lines'] },
      powertrain: { covered: false, summary: 'Steering components are not listed under PowertrainCARE.', examples: [] },
    },
  },
  {
    id: 'brakes',
    title: 'Brakes',
    intro: 'BaseCARE adds the fundamental brake-system components; ExtraCARE and PremiumCARE add more electronic brake support.',
    plans: {
      premium: { covered: true, summary: 'Broad brake-system coverage, subject to PremiumCARE exclusions.', examples: ['Anti-lock brake module and sensor', 'Power brake booster, calipers and master cylinder', 'Brake lines, fittings and parking-brake components', 'Wheel cylinders, self-adjusters and related hardware'] },
      extra: { covered: true, summary: 'Adds anti-lock brake module/sensor and ETA pump hose assembly to core brake coverage.', examples: ['Anti-lock brake module and sensor', 'Power brake booster, calipers and master cylinder', 'ETA pump hose assembly', 'Brake lines, fittings and parking-brake components'] },
      base: { covered: true, summary: 'Covers the core hydraulic and mechanical brake components listed in the plan.', examples: ['Power brake booster, calipers and master cylinder', 'Combination valve', 'Brake lines, fittings and parking-brake components', 'Wheel cylinders, self-adjusters and related hardware'] },
      powertrain: { covered: false, summary: 'Brake components are not listed under PowertrainCARE.', examples: [] },
    },
  },
  {
    id: 'suspension',
    title: 'Suspension',
    intro: 'BaseCARE and ExtraCARE list front-suspension components. PremiumCARE also lists broader front and rear suspension coverage.',
    plans: {
      premium: { covered: true, summary: 'Adds rear-suspension and selected advanced suspension components beyond the front-suspension list.', examples: ['Front control arms, ball joints, tie rods and stabilizer bar', 'MacPherson struts and load-leveler suspension system', 'Roll stability control', 'Front and rear suspension component coverage shown in Ford information'] },
      extra: { covered: true, summary: 'Front-suspension coverage; rear-suspension coverage is not listed at this level.', examples: ['Upper/lower ball joints', 'Upper/lower control arms and bushings', 'Spindle supports and stabilizer bar', 'Tie rods and linkage/bushings'] },
      base: { covered: true, summary: 'Front-suspension coverage; rear-suspension coverage is not listed at this level.', examples: ['Upper/lower ball joints', 'Upper/lower control arms and bushings', 'Spindle supports and stabilizer bar', 'Tie rods and linkage/bushings'] },
      powertrain: { covered: false, summary: 'Suspension components are not listed under PowertrainCARE.', examples: [] },
    },
  },
  {
    id: 'electrical',
    title: 'Electrical',
    intro: 'BaseCARE covers core electrical components. PremiumCARE adds a much broader set of factory-installed electrical and convenience items.',
    plans: {
      premium: { covered: true, summary: 'The broadest electrical list, including many factory-installed lighting, convenience and four-wheel-drive controls.', examples: ['Alternator, starter motor, fuel pump and wiring harnesses', 'Factory-installed LED/HID lighting components where listed', 'Power mirrors, power running boards and rear sunshade', 'Control Trac/Intelligent 4WD systems and power accessory items'] },
      extra: { covered: true, summary: 'Includes the core electrical list used for day-to-day drivability.', examples: ['Alternator, starter motor and voltage regulator', 'Fuel pump, ignition switch and electronic ignition module', 'Wiper motors, radiator fan relay and wiring harnesses', 'Heated-backglass electrical components only'] },
      base: { covered: true, summary: 'Includes the core electrical list used for day-to-day drivability.', examples: ['Alternator, starter motor and voltage regulator', 'Fuel pump, ignition switch and electronic ignition module', 'Wiper motors, radiator fan relay and wiring harnesses', 'Heated-backglass electrical components only'] },
      powertrain: { covered: false, summary: 'Electrical components are not listed under PowertrainCARE.', examples: [] },
    },
  },
  {
    id: 'climate',
    title: 'Air conditioning & heating',
    intro: 'BaseCARE provides the core A/C component list. ExtraCARE adds more automatic-climate and heating-system components.',
    plans: {
      premium: { covered: true, summary: 'Broad climate-system coverage, subject to PremiumCARE exclusions.', examples: ['A/C compressor, condenser and evaporator', 'Automatic temperature control', 'Heater blower motor, control assembly and heater core', 'Clutch, bearings, seals, field coil and pulley'] },
      extra: { covered: true, summary: 'Adds automatic-climate and heating components beyond the core A/C list.', examples: ['A/C accumulator and automatic temperature control', 'Heater blower motor, control assembly and heater core', 'A/C compressor, condenser and evaporator', 'Clutch, bearings, seals, field coil and pulley'] },
      base: { covered: true, summary: 'Covers the core A/C components listed in the plan.', examples: ['A/C compressor, condenser and evaporator', 'A/C clutch, bearings and clutch switch', 'A/C compressor head and seals', 'Field coil and pulley'] },
      powertrain: { covered: false, summary: 'Air-conditioning and heating components are not listed under PowertrainCARE.', examples: [] },
    },
  },
  {
    id: 'high-tech',
    title: 'High-tech & convenience features',
    intro: 'High-tech coverage starts at ExtraCARE. PremiumCARE extends the list to more driver-assistance, camera, security and connected features.',
    plans: {
      premium: { covered: true, summary: 'The broadest high-tech list, including many factory-installed driver-assistance and connected components where listed.', examples: ['Blind Spot Information, cross-traffic and reverse-sensing systems', 'Reverse camera, automatic parking and adaptive cruise systems', 'SYNC/MyFord Touch components where listed', 'Keyless entry, power windows/locks/seats and rain-sensing wipers'] },
      extra: { covered: true, summary: 'Selected convenience and high-tech components; advanced audio/visual and many driver-assistance items are not listed at this level.', examples: ['Adaptive cruise control and selected electronic air suspension', 'Electronic instrument cluster', 'Keyless entry and Securicode keyless entry', 'Power window motors/regulators, locks and seat motors'] },
      base: { covered: false, summary: 'High-tech and convenience components are not listed under BaseCARE.', examples: [] },
      powertrain: { covered: false, summary: 'High-tech and convenience components are not listed under PowertrainCARE.', examples: [] },
    },
  },
  {
    id: 'premium-only',
    title: 'Audio, safety & emissions',
    intro: 'These are the clearest PremiumCARE-only categories in Ford’s published comparison.',
    plans: {
      premium: { covered: true, summary: 'PremiumCARE lists factory-installed audio, selected safety restraints and broad emissions components, subject to exclusions.', examples: ['Factory-installed radio, speakers and rear entertainment components', 'Airbag sensors, safety canopy and safety-belt components', 'EGR, EVAP, oxygen sensors and variable cam timing components', 'DEF/reductant system components where listed; catalyst excluded'] },
      extra: { covered: false, summary: 'Audio, safety-restraint and emissions categories are not listed under ExtraCARE.', examples: [] },
      base: { covered: false, summary: 'Audio, safety-restraint and emissions categories are not listed under BaseCARE.', examples: [] },
      powertrain: { covered: false, summary: 'Audio, safety-restraint and emissions categories are not listed under PowertrainCARE.', examples: [] },
    },
  },
];

export const evPlanData = [
  {
    id: 'premium-plus-ev',
    name: 'PremiumCARE Plus EV',
    count: '1,000+',
    label: 'Coverage + maintenance',
    bestFor: 'EV owners who want comprehensive component protection bundled with scheduled maintenance.',
    description: 'Combines PremiumCARE EV with Premium Maintenance EV for covered repairs, inspections, scheduled maintenance and selected wear items.',
    groups: ['Drive motors', 'Electrical', 'High-tech', 'Steering', 'Climate control', 'Maintenance'],
  },
  {
    id: 'premium-ev',
    name: 'PremiumCARE EV',
    count: '1,000+',
    label: 'Comprehensive EV protection',
    bestFor: 'EV owners who want broad protection for eligible drive, electrical and high-tech components.',
    description: 'Broad Ford Protect coverage for eligible EV motors, electrical, high-tech, steering, braking, suspension and climate components.',
    groups: ['Drive motors', 'Electrical', 'High-tech', 'Steering', 'Brakes', 'Climate control'],
  },
  {
    id: 'extra-ev',
    name: 'ExtraCARE EV',
    count: '113',
    label: 'Enhanced EV protection',
    bestFor: 'EV owners looking for protection on selected systems that affect performance and drivability.',
    description: 'Covers selected EV systems and components that influence drivability and overall vehicle performance.',
    groups: ['Drive motors', 'Electrical', 'Steering', 'Brakes', 'Climate control'],
  },
  {
    id: 'base-ev',
    name: 'BaseCARE EV',
    count: '84',
    label: 'Essential EV protection',
    bestFor: 'EV owners seeking focused coverage on eligible major vehicle systems.',
    description: 'Essential Ford Protect coverage for selected EV drivability and performance components.',
    groups: ['Drive motors', 'Electrical', 'Steering', 'Brakes'],
  },
];

export const productCategories = [
  {
    id: 'mechanical',
    label: 'Mechanical coverage',
    title: 'Ford Protect Extended Service Plans',
    intro: 'Four levels of Ford-backed protection for covered repairs after the New Vehicle Limited Warranty.',
    image: '/assets/ford-official/ford-why-plan.png',
    imageAlt: 'Ford Expedition from official Ford Protect marketing media',
    products: planData,
  },
  {
    id: 'electric',
    label: 'Electric vehicles',
    title: 'Ford Protect for electric vehicles',
    intro: 'EV-specific coverage paths for eligible electric drive, electrical, high-tech and vehicle systems.',
    image: '/assets/ford-official/ford-why-2.png',
    imageAlt: 'Driver charging a Ford electric vehicle from official Ford Protect media',
    products: evPlanData,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    title: 'Maintenance and continued coverage',
    intro: 'Plan ahead for scheduled service, selected wear items and a continued-coverage path after an existing plan.',
    image: '/assets/ford-official/ford-maintenance-wide.png',
    imageAlt: 'Ford service technician from official Ford Protect marketing media',
    products: [
      {
        id: 'premium-maintenance',
        name: 'Premium Maintenance Plan',
        count: '$0',
        countLabel: 'deductible on covered maintenance',
        label: 'Gas, diesel & hybrid',
        bestFor: 'Owners who want scheduled maintenance and selected wear items bundled into one plan.',
        description: 'Covers routine inspections, preventive care and selected wear items based on the vehicle’s scheduled maintenance guide.',
        groups: ['Oil & filter', 'Multi-point inspections', 'Tire rotations', 'Brake pads', 'Wiper blades', 'Selected wear items'],
        examples: ['Engine oil and filter changes', 'Multi-point inspections', 'Tire rotations', 'Brake pads and linings', 'Shock absorbers and struts', 'Spark plugs, belts, coolant hoses and clamps', 'Wiper blades'],
      },
      {
        id: 'premium-maintenance-ev',
        name: 'Premium Maintenance EV',
        count: 'EV',
        countLabel: 'scheduled maintenance plan',
        label: 'Electric vehicles',
        bestFor: 'EV owners who want scheduled service visits and selected wear-item coverage.',
        description: 'Scheduled maintenance for eligible Ford and competitive-make EVs, including inspections and selected wear items.',
        groups: ['Multi-point inspections', 'Tire rotations', 'Cabin filter', 'Brake pads', 'Wiper blades', 'Washer fluid'],
        examples: ['Multi-point inspections', 'Tire rotations', 'Cabin air filter replacement at scheduled intervals', 'Brake pads and linings', 'Shock absorbers and struts', 'Wiper blades and washer-fluid top-offs'],
      },
      {
        id: 'continued-service',
        name: 'Continued Service Plan',
        count: 'CSP',
        countLabel: 'continued coverage path',
        label: 'After existing coverage',
        bestFor: 'Eligible owners nearing the end of an existing Ford Protect plan.',
        description: 'A Ford Protect path designed to continue protection after an eligible Ford Protect plan expires.',
        groups: ['Ultimate plan', 'Standard Plus plan', 'Major systems', 'Rental benefits', 'Ford parts & service'],
        examples: ['Engine and transmission', 'Electrical systems', 'Steering and braking', 'Suspension and drive axle', 'Climate and selected high-tech systems'],
        dealerAssisted: true,
      },
    ],
  },
  {
    id: 'vehicle-care',
    label: 'Vehicle care',
    title: 'Additional protection from Ford Protect',
    intro: 'Dealer-sold products for tires, wheels, dents, glass, appearance and theft deterrence. Availability varies by vehicle and state.',
    image: '/assets/ford-official/triplecare.png',
    imageAlt: 'Ford F-150 used for Ford Protect TripleCARE Plus marketing',
    products: [
      { id: 'tirecare', name: 'TireCARE Plus', label: 'Tires & wheels', bestFor: 'Road-hazard protection for eligible tires and wheels.', description: 'Helps cover eligible tire and wheel damage caused by covered road hazards, with available off-road options on eligible vehicles.', groups: ['Tire repair', 'Tire replacement', 'Wheel repair', 'Wheel replacement', 'Road hazards'], image: '/assets/ford-official/tirecare.png', dealerAssisted: true },
      { id: 'dentcare', name: 'DentCARE', label: 'Paintless dent repair', bestFor: 'Owners who want help addressing eligible minor dents and dings.', description: 'Paintless dent-repair coverage for eligible minor body-panel dents and dings without conventional body repair.', groups: ['Minor dents', 'Door dings', 'Paintless repair', 'Dealer-assisted service'], image: '/assets/ford-official/dentcare.png', dealerAssisted: true },
      { id: 'windshieldcare', name: 'WindshieldCARE', label: 'Chips & cracks', bestFor: 'Owners who want convenient repair of eligible windshield chips and cracks.', description: 'Coverage for repair of eligible minor windshield chips and cracks. Contract terms define size, number and service limits.', groups: ['Chip repair', 'Minor crack repair', 'Windshield service'], image: '/assets/ford-official/windshieldcare.png', dealerAssisted: true },
      { id: 'windshieldcare-ev', name: 'WindshieldCARE Plus EV', label: 'EV glass protection', bestFor: 'Eligible EV owners seeking enhanced windshield-related protection.', description: 'A Ford Protect glass-protection path designed for eligible electric vehicles; exact benefits depend on the agreement.', groups: ['EV windshield', 'Repair benefits', 'Agreement-defined coverage'], image: '/assets/ford-official/windshieldcare.png', dealerAssisted: true },
      { id: 'triplecare', name: 'TripleCARE Plus', label: 'Three-part vehicle care', bestFor: 'Owners who want tire-and-wheel, dent and windshield protection together.', description: 'Combines three high-use vehicle-care benefits in one dealer-sold Ford Protect product. Coverage and provider vary by state.', groups: ['Tire & wheel', 'Paintless dent repair', 'Windshield repair', 'Available off-road option'], image: '/assets/ford-official/triplecare.png', dealerAssisted: true },
      { id: 'surfacecare', name: 'SurfaceCARE', label: 'Interior & exterior', bestFor: 'Owners who want agreement-defined protection for eligible vehicle surfaces.', description: 'Helps protect eligible interior and exterior surfaces against specified damage listed in the final agreement.', groups: ['Interior surfaces', 'Exterior surfaces', 'Agreement-defined benefits'], image: '/assets/ford-official/surfacecare.png', dealerAssisted: true },
      { id: 'theftcare', name: 'TheftCARE', label: 'Theft deterrence', bestFor: 'Owners seeking a theft-deterrent and limited reimbursement benefit.', description: 'Uses traceable identification and warning labels, with an agreement-defined limited benefit if the vehicle is stolen.', groups: ['Traceable identification', 'Warning labels', 'Limited reimbursement benefit'], image: '/assets/ford-official/theftcare.png', dealerAssisted: true },
    ],
  },
  {
    id: 'specialty',
    label: 'Certified & commercial',
    title: 'Dealer-assisted Ford Protect pathways',
    intro: 'Specialty vehicles and certified pre-owned programs need record-level eligibility review before plan selection.',
    image: '/assets/ford-official/ford-why-3.png',
    imageAlt: 'Ford Ranger on an off-road trail from official Ford Protect media',
    products: [
      { id: 'fba-upgrade', name: 'Ford Blue Advantage Upgrade', label: 'Certified Ford vehicles', bestFor: 'Eligible Gold or Blue Certified vehicles requiring additional term, mileage or component coverage.', description: 'Upgrade coverage may add component protection or extend time and mileage beyond the included certified coverage.', groups: ['Gold Certified', 'Blue Certified', 'Ford eligibility review', 'Term and mileage options'], dealerAssisted: true },
      { id: 'lincoln-cpo', name: 'Lincoln CPO Upgrade', label: 'Certified Lincoln vehicles', bestFor: 'Eligible Lincoln Certified Pre-Owned vehicles requiring longer PremiumCARE protection.', description: 'An L-CPO upgrade can provide eligible certified Lincoln vehicles with longer term and/or mileage coverage.', groups: ['Lincoln CPO', 'PremiumCARE upgrade', 'Dealer verification'], dealerAssisted: true },
      { id: 'commercial', name: 'Commercial Vehicle Coverage', label: 'Business-use vehicles', bestFor: 'Eligible work vehicles, fleets and business-use units that need commercial rating.', description: 'Commercial use changes eligibility and rating. Bob Maxey verifies vehicle class, use, mileage, hours and equipment before quoting.', groups: ['Business use', 'Fleet use', 'Vehicle class', 'Mileage or hours', 'Equipment review'], dealerAssisted: true },
      { id: 'incomplete', name: 'Incomplete Vehicle Coverage', label: 'Upfit vehicles', bestFor: 'Chassis cabs and other vehicles completed by an upfitter or final-stage manufacturer.', description: 'Eligibility can depend on original chassis configuration, final-stage completion and installed equipment.', groups: ['Chassis cab', 'Upfit review', 'Final-stage manufacturer', 'Commercial rating'], dealerAssisted: true },
      { id: 'medium-duty', name: 'Medium-Duty Coverage', label: 'Eligible medium-duty trucks', bestFor: 'Medium-duty Ford vehicles that require a dedicated plan and usage review.', description: 'Bob Maxey confirms model, GVWR class, commercial use, mileage, hours and available terms before enrollment.', groups: ['Medium duty', 'GVWR class', 'Mileage or hours', 'Usage review'], dealerAssisted: true },
    ],
  },
];

// Bob Maxey's online library is intentionally limited to products that can be
// considered after the original vehicle sale. GAP, lease-only products and
// dealer products Ford identifies as time-of-sale-only are not presented as
// purchase paths here.
export const afterSaleProductCategories = productCategories.filter((category) => category.id !== 'vehicle-care');

export const fordBenefits = [
  { title: '100% backed by Ford', text: 'A genuine Ford Protect plan is backed by Ford Motor Company.', image: '/assets/ford-official/ford-backed.png' },
  { title: 'Ford-authorized service', text: 'Covered repairs use Ford-authorized parts and factory-trained technicians.', image: '/assets/ford-official/ford-authorized-parts.png' },
  { title: 'Dealer support across North America', text: 'Service support is available through Ford and Lincoln dealers in the U.S., Canada and Mexico.', image: '/assets/ford-official/ford-nationwide.png' },
  { title: '24-hour roadside assistance', text: 'Eligible plans include towing and other roadside benefits subject to contract limits.', image: '/assets/ford-official/ford-roadside.png' },
  { title: 'Rental vehicle benefits', text: 'Eligible covered repairs can include rental support, subject to the selected plan.', image: '/assets/ford-official/ford-rental.png' },
  { title: 'Transferable coverage', text: 'Eligible remaining coverage may transfer to a subsequent owner; a transfer fee may apply.', image: '/assets/ford-official/ford-transferable.png' },
  { title: 'Flexible payment options', text: 'Ford Protect advertises interest-free installment options up to 30 months on eligible purchases.', image: '/assets/ford-official/ford-financing.png' },
];

export const faqItems = [
  ['Is this really a Ford-backed service plan?', 'Yes. Ford Protect Extended Service Plans are backed by Ford Motor Company. Bob Maxey is the franchised dealer selling and assisting with the plan.'],
  ['Where can I use Ford Protect coverage?', 'Ford Protect identifies dealer support across Ford and Lincoln dealerships in the United States, Canada and Mexico. The final contract controls service eligibility and benefits.'],
  ['Does PremiumCARE cover a factory-installed turbocharger?', 'Ford’s current PremiumCARE component information lists the factory-installed turbocharger or supercharger unit among covered engine components. Final coverage depends on the contract, failure and vehicle eligibility.'],
  ['When does coverage begin?', 'For a new-plan agreement, time is generally measured from the original in-service date and mileage from zero. Used-plan agreements can use different start rules. Bob Maxey confirms the correct plan type before purchase.'],
  ['Can I buy coverage for an electric vehicle?', 'Yes. Ford Protect currently offers PremiumCARE Plus EV, PremiumCARE EV, ExtraCARE EV and BaseCARE EV, plus Premium Maintenance EV for eligible vehicles.'],
  ['Is the high-voltage EV battery covered?', 'The high-voltage battery has its own manufacturer warranty and is generally not eligible for Ford Protect extended-warranty coverage. The final agreement and vehicle warranty record control.'],
  ['Can I choose a deductible and term?', 'Available years, mileage limits and deductible choices depend on vehicle age, mileage, plan, state, use and Ford eligibility. The quote flow shows only combinations available for the verified vehicle.'],
  ['Are rental and roadside benefits included?', 'Eligible Ford Protect plans include roadside and rental benefits, with limits that vary by plan and agreement. Optional enhanced benefits may also be available.'],
  ['Can a business, snow-plow or upfit vehicle be covered?', 'Possibly. Commercial use, snow-plow use, incomplete vehicles and medium-duty vehicles require a dedicated eligibility and rating review.'],
  ['Can I cancel or transfer my plan?', 'Ford Protect plans can have cancellation and transfer provisions, fees and state-specific rules. Bob Maxey will provide the agreement that applies to the selected plan before purchase.'],
  ['Why is my online price not final yet?', 'The production site must verify Ford vehicle records, eligibility, current plan rates, state rules and Bob Maxey’s selling price before checkout. This prototype does not connect to those live systems.'],
];

export const modelsByMake = {
  Ford: [
    'Bronco', 'Bronco Sport', 'Edge AWD', 'Escape AWD', 'Expedition 4WD',
    'Explorer 4WD', 'F-150 2WD', 'F-150 4WD', 'F-150 Lightning', 'Maverick',
    'Mustang', 'Mustang Mach-E', 'Ranger', 'Super Duty', 'Transit',
  ],
  Lincoln: ['Aviator', 'Corsair', 'MKC', 'MKZ', 'Nautilus', 'Navigator'],
};

export const states = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

export const locations = [
  { name: 'Howell', descriptor: 'Bob Maxey Ford of Howell' },
  { name: 'Fowlerville', descriptor: 'Bob Maxey Ford of Fowlerville' },
  { name: 'Detroit', descriptor: 'Bob Maxey Ford Detroit' },
  { name: 'Lincoln', descriptor: 'Bob Maxey Lincoln' },
];

export const years = Array.from({ length: 12 }, (_, index) => String(new Date().getFullYear() + 1 - index));
