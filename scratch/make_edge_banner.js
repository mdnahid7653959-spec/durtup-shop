import puppeteer from 'puppeteer-core';

async function makeEdgeToEdgeBanner() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  // Standard bento tile resolution: 800 x 580 (aspect ratio ~1.38)
  await page.setViewport({ width: 800, height: 580, deviceScaleFactor: 2 });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@600&family=Montserrat:wght@800;900&family=Plus+Jakarta+Sans:wght@800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 800px;
          height: 580px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(175deg, #f9961d 0%, #f47f15 40%, #e85f00 80%, #dc4e00 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* Ambient light aura */
        .aura {
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 350px;
          background: radial-gradient(ellipse at center, rgba(255, 200, 80, 0.6) 0%, rgba(255, 140, 20, 0) 70%);
          pointer-events: none;
        }

        /* 3D City background using the user's graphic */
        .city-layer {
          position: absolute;
          inset: 0;
          background-image: url("http://localhost:8080/hero-banner-durtu.png");
          background-size: cover;
          background-position: center;
          opacity: 0.95;
          transform: scale(1.05);
        }

        /* Vignette & soft contrast gradient to make text pop while keeping full background visible */
        .overlay-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%);
        }

        /* Content container */
        .content {
          position: relative;
          z-index: 10;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .script-text {
          font-family: 'Caveat', cursive;
          font-size: 52px;
          font-weight: 600;
          color: #ffffff;
          line-height: 1;
          letter-spacing: 1px;
          text-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0,0,0,0.3);
          transform: rotate(-3.5deg) translateY(6px);
          margin-bottom: 2px;
        }

        .main-brand {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 82px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -1.5px;
          line-height: 0.95;
          text-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 3px 6px rgba(0, 0, 0, 0.35);
        }
      </style>
    </head>
    <body>
      <div class="city-layer"></div>
      <div class="overlay-gradient"></div>
      <div class="aura"></div>
      <div class="content">
        <div class="script-text">everytng you need</div>
        <div class="main-brand">Durtu.shop</div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'public/hero-banner-full.png' });
  await browser.close();
  console.log('Saved hero-banner-full.png');
}

makeEdgeToEdgeBanner();
