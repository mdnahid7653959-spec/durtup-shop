import puppeteer from 'puppeteer-core';

async function testScroll() {
  try {
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2' });
    
    // Screenshot before scroll
    await page.screenshot({ path: 'scratch/mobile_before_scroll.png' });

    // Scroll down 600px
    await page.evaluate(() => {
      window.scrollBy(0, 600);
    });

    // Wait a bit
    await new Promise(r => setTimeout(r, 500));

    // Screenshot after scroll
    await page.screenshot({ path: 'scratch/mobile_after_scroll.png' });

    await browser.close();
    console.log("Scroll screenshots saved");
  } catch (err) {
    console.error("Scroll test error:", err);
  }
}

testScroll();
