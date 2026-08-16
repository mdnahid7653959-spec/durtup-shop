import puppeteer from 'puppeteer-core';
import { exec } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const UNLOCK_URL = 'http://localhost:8080/nahid/dreem/e/comarce/467265@/apple789@/dreem/project/contole';

async function main() {
  console.log('🚀 Launching Browser and Performing Automated Login...');

  // 1. Force start Chrome or default browser via Windows Start
  exec(`start chrome "${UNLOCK_URL}"`);

  // 2. Launch Puppeteer connected or direct headful instance
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox']
    });
  } catch (e) {
    console.log('Chrome path fallback to Edge...');
    browser = await puppeteer.launch({
      executablePath: EDGE_PATH,
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox']
    });
  }

  const page = (await browser.pages())[0] || (await browser.newPage());
  
  console.log('📍 Unlocking Secret Gate Path...');
  await page.goto(UNLOCK_URL, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  console.log('🔑 Entering Admin Credentials...');
  await page.waitForSelector('#username', { timeout: 10000 });
  await page.type('#username', 'HI Admin', { delay: 50 });
  await page.type('#password', 'Admin123456!#', { delay: 50 });

  console.log('🚀 Submitting Login Form...');
  await page.click('button[type="submit"]');

  await new Promise(r => setTimeout(r, 3000));
  console.log('✅ Successfully Logged in to Admin Dashboard!');
}

main().catch(console.error);
