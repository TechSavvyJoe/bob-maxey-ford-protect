import base from './playwright.config.js';

// Run the same customer journey regressions in independent browser engines.
// WebKit coverage complements, but does not replace, real-device Safari QA.
export default {
  ...base,
  testMatch: 'quote.spec.js',
  use: { ...base.use, channel: undefined },
  projects: [
    { name: 'Firefox', use: { browserName: 'firefox' } },
    { name: 'WebKit', use: { browserName: 'webkit' } },
  ],
};
