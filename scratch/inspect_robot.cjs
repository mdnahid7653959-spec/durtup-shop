async function inspectRobot() {
  const res = await fetch("https://mohasagor.com.bd/api/reseller/product", {
    headers: {
      "api-key": "A8niclztH9JtzS4t",
      "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
    }
  });
  const data = await res.json();
  const products = data.products || (Array.isArray(data) ? data : []);
  console.log("Total API products:", products.length);
  
  const matches = products.filter(p => 
    p.id == 3434 || 
    p.product_code == 3434 || 
    (p.slug && p.slug.includes("3434")) || 
    (p.slug && p.slug.includes("robot")) || 
    (p.name && p.name.toLowerCase().includes("robot")) ||
    (p.name && p.name.toLowerCase().includes("dancing"))
  );
  
  console.log("Matching products in API:", JSON.stringify(matches, null, 2));

  // Let's also check if there is an endpoint for single product or reseller price vs retail price on mohasagor.com.bd
  try {
    const directRes = await fetch("https://mohasagor.com.bd/product/electronic-dancing-robot-toy-for-kids-3434");
    if (directRes.ok) {
      const html = await directRes.text();
      // find price patterns in html
      const priceMatches = html.match(/৳\s*[\d,]+|price[^<]*[\d,]+/gi);
      console.log("Prices found on mohasagor.com.bd page:", priceMatches?.slice(0, 10));
    } else {
      console.log("Direct page status:", directRes.status);
    }
  } catch (e) {
    console.log("Page fetch err:", e.message);
  }
}

inspectRobot();
