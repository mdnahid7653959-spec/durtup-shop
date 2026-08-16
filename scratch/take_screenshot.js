import puppeteer from 'puppeteer-core';

async function capture() {
  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'scratch/latest_screen.png' });
    await browser.close();
    console.log("Screenshot saved successfully");
  } catch (err) {
    console.error("Screenshot error:", err);
  }
}

capture();
