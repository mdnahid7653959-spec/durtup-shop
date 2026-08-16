import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:8080';
const SECRET_UNLOCK_URL = `${BASE_URL}/nahid/dreem/e/comarce/467265@/apple789@/dreem/project/contole`;

const ADMIN_ROUTES = [
  { name: 'Dashboard', path: '/admin/dashboard' },
  { name: 'Products List', path: '/admin/products' },
  { name: 'New Product Form', path: '/admin/products/new' },
  { name: 'Categories', path: '/admin/categories' },
  { name: 'Brands', path: '/admin/brands' },
  { name: 'Orders', path: '/admin/orders' },
  { name: 'Users', path: '/admin/users' },
  { name: 'Coupons', path: '/admin/coupons' },
  { name: 'Reviews', path: '/admin/reviews' },
  { name: 'CJ Dropshipping', path: '/admin/cj-settings' },
  { name: 'Sellers Management', path: '/admin/sellers' },
  { name: 'Shipping Rules', path: '/admin/shipping' },
  { name: 'Commission Rates', path: '/admin/commissions' },
  { name: 'Inventory & Stock', path: '/admin/inventory' },
  { name: 'Marketing & Banners', path: '/admin/marketing' },
  { name: 'Loyalty Program', path: '/admin/loyalty' },
  { name: 'Free Delivery Rules', path: '/admin/free-delivery' },
  { name: 'Reports & Analytics', path: '/admin/reports' },
  { name: 'Security & Audit', path: '/admin/security' },
  { name: 'CMS & Static Pages', path: '/admin/cms' },
  { name: 'Consignment Orders', path: '/admin/consignments' },
  { name: 'Warehouses', path: '/admin/warehouses' },
  { name: 'Home Bento Layout', path: '/admin/home-bento' },
  { name: 'Home Promos', path: '/admin/home-promos' },
  { name: 'Push Notifications', path: '/admin/push-notifications' },
  { name: 'Theme Builder', path: '/admin/theme-builder' },
  { name: 'Admin Settings', path: '/admin/settings' },
  { name: 'Staff Management', path: '/admin/staff' },
  { name: 'Seller Support', path: '/admin/seller-support' },
  { name: 'Media Studio', path: '/admin/studio' }
];

async function runE2ETest() {
  console.log('🚀 Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pageErrors = [];
  const consoleErrors = [];
  const networkFailures = [];

  page.on('pageerror', (err) => {
    console.error('❌ Page Error:', err.message);
    pageErrors.push(err.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out harmless extension/network logs if needed
      console.error('⚠️ Console Error:', text);
      consoleErrors.push(text);
    }
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      const url = res.url();
      // Ignore static assets 404s if any non-critical
      networkFailures.push({ url, status: res.status() });
    }
  });

  console.log('\n--- Step 1: Secret Session Unlock ---');
  console.log(`Navigating to ${SECRET_UNLOCK_URL}...`);
  await page.goto(SECRET_UNLOCK_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Wait for redirect to login
  await page.waitForFunction(() => window.location.pathname === '/admin/login', { timeout: 10000 });
  const gateUnlocked = await page.evaluate(() => sessionStorage.getItem('admin_gate_unlocked'));
  console.log(`✅ Session unlocked! sessionStorage admin_gate_unlocked: ${gateUnlocked}`);
  console.log(`Current URL: ${page.url()}`);

  console.log('\n--- Step 2: Admin Login ---');
  // Fill username & password
  await page.waitForSelector('input', { timeout: 10000 });
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].type('HI Admin');
    await inputs[1].type('Admin123456!#');
  } else {
    throw new Error('Login inputs not found');
  }

  // Click login button
  const submitButton = await page.$('button[type="submit"]') || await page.$('button');
  await submitButton.click();

  // Wait for navigation after login
  await page.waitForFunction(() => window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login', { timeout: 10000 });
  console.log(`✅ Logged in successfully! Redirected to: ${page.url()}`);

  const results = [];

  console.log('\n--- Step 3: Testing All 30 Admin Pages ---');
  for (let i = 0; i < ADMIN_ROUTES.length; i++) {
    const route = ADMIN_ROUTES[i];
    console.log(`\n Testing [${i + 1}/${ADMIN_ROUTES.length}] ${route.name} (${route.path})...`);
    
    const pageLogErrors = [];
    const pageConsoleErrors = [];
    const pageNetworkFailures = [];

    const pageErrHandler = (err) => pageLogErrors.push(err.message);
    const consoleErrHandler = (msg) => { if (msg.type() === 'error') pageConsoleErrors.push(msg.text()); };
    const responseHandler = (res) => { if (res.status() >= 400 && !res.url().includes('favicon')) pageNetworkFailures.push(`${res.status()} ${res.url()}`); };

    page.on('pageerror', pageErrHandler);
    page.on('console', consoleErrHandler);
    page.on('response', responseHandler);

    let status = 'PASSED';
    let details = [];

    try {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1500)); // Allow react query and renders to settle

      // Check if page redirected back to login or 404
      const currentUrl = page.url();
      if (currentUrl.includes('/admin/login')) {
        status = 'FAILED';
        details.push('Redirected to /admin/login (session lost)');
      } else if (currentUrl.includes('/404')) {
        status = 'FAILED';
        details.push('Redirected to 404');
      }

      // Check DOM elements
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes('Something went wrong') || bodyText.includes('Page Not Found') || bodyText.includes('An unexpected error occurred')) {
        status = 'FAILED';
        details.push('Error boundary or 404 message present in body');
      }

      // Count interactive elements
      const counts = await page.evaluate(() => {
        return {
          buttons: document.querySelectorAll('button').length,
          inputs: document.querySelectorAll('input, select, textarea').length,
          tables: document.querySelectorAll('table').length,
          cards: document.querySelectorAll('.rounded-lg, .card, [class*="card"]').length
        };
      });

      if (pageLogErrors.length > 0) {
        status = 'FAILED';
        details.push(`JS Errors: ${pageLogErrors.join('; ')}`);
      }

      if (pageConsoleErrors.length > 0) {
        // Filter out non-critical console errors if needed
        const criticalConsole = pageConsoleErrors.filter(e => !e.includes('Download the React DevTools'));
        if (criticalConsole.length > 0) {
          details.push(`Console Errors (${criticalConsole.length}): ${criticalConsole.slice(0, 3).join('; ')}`);
        }
      }

      if (pageNetworkFailures.length > 0) {
        details.push(`Network Issues: ${pageNetworkFailures.slice(0, 3).join('; ')}`);
      }

      results.push({
        index: i + 1,
        name: route.name,
        path: route.path,
        status,
        counts,
        details: details.join(' | ') || 'Rendered cleanly'
      });

      console.log(` Result: ${status === 'PASSED' ? '✅' : '❌'} ${status} - Elements: ${counts.buttons} buttons, ${counts.inputs} inputs, ${counts.tables} tables`);

    } catch (err) {
      console.error(` ❌ Exception visiting ${route.path}:`, err.message);
      results.push({
        index: i + 1,
        name: route.name,
        path: route.path,
        status: 'FAILED',
        counts: { buttons: 0, inputs: 0, tables: 0, cards: 0 },
        details: `Navigation Error: ${err.message}`
      });
    } finally {
      page.off('pageerror', pageErrHandler);
      page.off('console', consoleErrHandler);
      page.off('response', responseHandler);
    }
  }

  await browser.close();

  console.log('\n=========================================');
  console.log('📊 FINAL E2E TEST SUMMARY');
  console.log('=========================================');
  console.table(results.map(r => ({ Index: r.index, Page: r.name, Path: r.path, Status: r.status, Details: r.details })));

  const passedCount = results.filter(r => r.status === 'PASSED').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;
  console.log(`\nTotal: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

  fs.writeFileSync('e2e_results.json', JSON.stringify(results, null, 2));
  return results;
}

runE2ETest().catch(err => {
  console.error('Fatal Error running E2E test:', err);
  process.exit(1);
});
