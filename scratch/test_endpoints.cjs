async function testEndpoints() {
  const endpoints = [
    "https://mohasagor.com.bd/api/reseller/product/3434",
    "https://mohasagor.com.bd/api/reseller/product/434",
    "https://mohasagor.com.bd/api/product/3434",
    "https://mohasagor.com.bd/api/product/electronic-dancing-robot-toy-for-kids-3434",
    "https://mohasagor.com.bd/api/reseller/product-details/3434",
    "https://mohasagor.com.bd/api/reseller/product-details/434",
    "https://mohasagor.com.bd/api/v1/product/3434"
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          "api-key": "A8niclztH9JtzS4t",
          "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
        }
      });
      console.log(`URL: ${url} -> Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Response:`, JSON.stringify(data).slice(0, 300));
      }
    } catch (e) {
      console.log(`URL: ${url} -> Error: ${e.message}`);
    }
  }
}

testEndpoints();
