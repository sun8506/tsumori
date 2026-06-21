const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const analytics = fs.readFileSync(path.join(root, 'js', 'analytics.js'), 'utf8');

assert.match(index, /G-MK4RPXLJH6/, 'GA4 measurement ID is missing');
assert.match(index, /js\/analytics\.js/, 'Analytics script is not loaded');
for (const consentType of ['ad_storage', 'ad_user_data', 'ad_personalization']) {
  assert.match(analytics, new RegExp(`${consentType}: 'denied'`), `${consentType} must default to denied`);
}
assert.match(analytics, /analytics_storage: 'granted'/, 'Analytics storage must be enabled automatically');
assert.match(analytics, /send_page_view: false/, 'Automatic page views must be disabled for SPA tracking');
assert.match(analytics, /addEventListener\('hashchange'/, 'Hash route changes must be tracked');
assert.match(analytics, /googletagmanager\.com\/gtag\/js/, 'Google tag loader is missing');
assert.doesNotMatch(analytics, /renderBanner|analytics-consent/, 'Analytics must not show a consent banner');

console.log('GA4 automatic collection and SPA tracking checks passed.');
