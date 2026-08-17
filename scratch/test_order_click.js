import puppeteer from 'puppeteer-core';

async function testOrderClick() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  await page.goto('http://localhost:8080/category/electronics', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  // Find and click the first "অর্ডার করুন" button
  const orderButtons = await page.$$('button');
  let clicked = false;
  for (const btn of orderButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('অর্ডার করুন')) {
      console.log('Found button with text:', text);
      await btn.click();
      clicked = true;
      break;
    }
  }

  if (clicked) {
    await new Promise(r => setTimeout(r, 2000));
    console.log('Navigated URL after click:', page.url());
    await page.screenshot({ path: 'scratch/after_order_click.png' });
  } else {
    console.log('Button not found');
  }

  await browser.close();
}

testOrderClick();
