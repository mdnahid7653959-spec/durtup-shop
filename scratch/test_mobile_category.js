import puppeteer from 'puppeteer-core';

async function testMobileCategory() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:8080/category/electronics', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'scratch/category_electronics_mobile_view.png' });

  await page.goto('http://localhost:8080/categories', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'scratch/categories_tab_mobile_view.png' });

  await browser.close();
}

testMobileCategory();
