import puppeteer from 'puppeteer-core';

async function capture() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // Test 1: /categories page
  await page.goto('http://localhost:8080/categories', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'scratch/categories_page_mobile.png' });

  // Test 2: /category/electronics
  await page.goto('http://localhost:8080/category/electronics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'scratch/category_electronics_mobile.png' });

  await browser.close();
  console.log('Screenshots captured');
}

capture();
