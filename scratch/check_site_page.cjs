async function checkSitePage() {
  const res = await fetch("https://mohasagor.com.bd/product/electronic-dancing-robot-toy-for-kids-3434", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Page length:", text.length);
  
  // Search for any 490, 950, or prices in the HTML
  const lines = text.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('490') || line.includes('950') || line.includes('৳') || line.includes('Tk') || line.includes('price')) {
      if (line.length < 300) {
        console.log(`Line ${idx}: ${line.trim()}`);
      }
    }
  });
}
checkSitePage();
