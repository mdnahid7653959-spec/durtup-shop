async function inspectAllPrices() {
  const res = await fetch("https://mohasagor.com.bd/api/reseller/product", {
    headers: {
      "api-key": "A8niclztH9JtzS4t",
      "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
    }
  });
  const data = await res.json();
  const products = data.products || (Array.isArray(data) ? data : []);
  console.log("Total products:", products.length);

  for (let i = 0; i < 15; i++) {
    const p = products[i];
    console.log(`${p.id} | ${p.name.slice(0, 35).padEnd(35)} | price: ${p.price} | sale_price: ${p.sale_price}`);
  }
}
inspectAllPrices();
