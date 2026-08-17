const fs = require('fs');

async function checkSiteFull() {
  const res = await fetch("https://mohasagor.com.bd/product/electronic-dancing-robot-toy-for-kids-3434", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });
  const text = await res.text();
  fs.writeFileSync('scratch/mohasagor_page.html', text);
  console.log("Saved HTML. Looking for matches...");
  
  // Look for any numbers followed by currency or price tags
  const matches = text.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/span>/gi) ||
                  text.match(/class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\//gi) ||
                  text.match(/৳[\s\d,.]+/g);
  console.log("Matches:", matches);
}
checkSiteFull();
