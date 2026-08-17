import puppeteer from 'puppeteer-core';

async function testAllCategories() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const cats = ['fashion', 'home', 'beauty', 'watches', 'kids'];
  for (const cat of cats) {
    await page.goto(`http://localhost:8080/category/${cat}`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: `scratch/cat_${cat}_mobile.png` });
  }

  await browser.close();
}

testAllCategories();
