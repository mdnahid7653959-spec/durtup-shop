async function checkA9() {
  const res = await fetch("https://mohasagor.com.bd/api/reseller/product", {
    headers: {
      "api-key": "A8niclztH9JtzS4t",
      "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
    }
  });
  const data = await res.json();
  const products = data.products || (Array.isArray(data) ? data : []);
  const a9 = products.find(p => p.id == 87 || (p.name && p.name.includes("A9")));
  console.log("A9 in API:", JSON.stringify(a9, null, 2));
}
checkA9();
