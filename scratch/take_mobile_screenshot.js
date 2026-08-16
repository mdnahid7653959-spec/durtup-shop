import puppeteer from 'puppeteer-core';

async function captureMobile() {
  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'scratch/mobile_header_logo.png' });
    await browser.close();
    console.log("Mobile screenshot saved successfully");
  } catch (err) {
    console.error("Screenshot error:", err);
  }
}

captureMobile();
