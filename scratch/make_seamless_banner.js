import puppeteer from 'puppeteer-core';

async function makeBanner() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 860, deviceScaleFactor: 2 });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 1200px;
          height: 860px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #f7911e 0%, #f47e16 35%, #eb6607 70%, #df5400 100%);
          position: relative;
          overflow: hidden;
        }
        /* Left and right city background extensions */
        .city-bg-left {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 380px;
          background: url("http://localhost:8080/hero-banner-durtu.png") left center / cover no-repeat;
          filter: blur(12px) saturate(1.1);
          opacity: 0.5;
          transform: scale(1.3);
        }
        .city-bg-right {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          width: 380px;
          background: url("http://localhost:8080/hero-banner-durtu.png") right center / cover no-repeat;
          filter: blur(12px) saturate(1.1);
          opacity: 0.5;
          transform: scale(1.3);
        }
        .banner-wrap {
          position: relative;
          z-index: 2;
          width: 100%;
          padding: 0 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .banner {
          width: 100%;
          height: auto;
          display: block;
          filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.18));
        }
      </style>
    </head>
    <body>
      <div class="city-bg-left"></div>
      <div class="city-bg-right"></div>
      <div class="banner-wrap">
        <img class="banner" src="http://localhost:8080/hero-banner-durtu.png" />
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'public/hero-banner-durtu-perfect.png' });
  await browser.close();
  console.log('Saved clean banner v3');
}

makeBanner();
