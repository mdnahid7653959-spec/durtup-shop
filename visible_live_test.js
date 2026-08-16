import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const UNLOCK_URL = 'https://durtup.shop/nahid/dreem/e/comarce/467265@/apple789@/dreem/project/contole';

async function startVisibleLiveBrowser() {
  console.log('🌐 Opening Visible Google Chrome Browser on your PC screen...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: null,
    slowMo: 80, // Slows down operations by 80ms so every action is visible to the user
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-position=0,0'
    ]
  });

  const page = (await browser.pages())[0] || (await browser.newPage());

  console.log('📍 Navigating to Secret Gate Unlock Path...');
  await page.goto(UNLOCK_URL, { waitUntil: 'networkidle2' });

  await new Promise(r => setTimeout(r, 1500));

  console.log('🔑 Entering Admin Username...');
  await page.waitForSelector('#username', { timeout: 10000 });
  await page.click('#username');
  await page.type('#username', 'HI Admin', { delay: 100 });

  console.log('🔑 Entering Admin Password...');
  await page.click('#password');
  await page.type('#password', 'Admin123456!#', { delay: 100 });

  await new Promise(r => setTimeout(r, 1000));

  console.log('🚀 Clicking Sign In...');
  await page.click('button[type="submit"]');

  await new Promise(r => setTimeout(r, 3000));

  console.log('✅ Logged into Admin Dashboard live on your screen!');

  // Keep browser open so user can watch and interact
}

startVisibleLiveBrowser().catch(console.error);
