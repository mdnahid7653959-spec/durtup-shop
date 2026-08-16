import puppeteer from 'puppeteer-core';

async function runMobile() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => window.scrollBy(0, 150));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scratch/mobile_screen.png' });
  await browser.close();
  console.log('Mobile screenshot saved');
}
runMobile();
