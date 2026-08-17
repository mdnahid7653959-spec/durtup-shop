async function checkApi() {
  try {
    const res = await fetch("https://mohasagor.com.bd/api/reseller/product", {
      headers: {
        "api-key": "A8niclztH9JtzS4t",
        "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
      }
    });
    const data = await res.json();
    const products = data.products || (Array.isArray(data) ? data : []);
    console.log("Total API products:", products.length);
    console.log("Sample 3 products directly from API:");
    for (let i = 0; i < Math.min(5, products.length); i++) {
      const p = products[i];
      console.log(`\nProduct #${i+1}:`);
      console.log(`  ID:`, p.id);
      console.log(`  Name:`, p.name);
      console.log(`  price:`, p.price);
      console.log(`  sale_price:`, p.sale_price);
      console.log(`  regular_price:`, p.regular_price);
      console.log(`  discount_price:`, p.discount_price);
      console.log(`  cost_price / reseller_price:`, p.reseller_price || p.cost_price || p.wholesale_price || p.buying_price);
      console.log(`  all keys with price in name:`, Object.keys(p).filter(k => k.toLowerCase().includes('price') || k.toLowerCase().includes('mrp') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('sale') || k.toLowerCase().includes('rate')));
      console.log(`  Full object preview:`, JSON.stringify(p, null, 2).slice(0, 400));
    }
  } catch (err) {
    console.error("API error:", err);
  }
}

checkApi();
