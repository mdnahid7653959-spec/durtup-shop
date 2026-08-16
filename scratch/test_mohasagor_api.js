async function testMohasagor() {
  const apiKey = "A8niclztH9JtzS4t";
  const secretKey = "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8";

  console.log("Testing Mohasagor API fetch...");

  // Try with various headers & params
  const testConfigs = [
    { headers: { "Authorization": `ApiKey ${apiKey}` } },
    { headers: { "Authorization": `Bearer ${apiKey}` } },
    { headers: { "x-api-key": apiKey, "x-secret-key": secretKey } },
    { headers: { "api-key": apiKey } },
    { headers: { "API-KEY": apiKey, "SECRET-KEY": secretKey } },
    { headers: { "Authorization": `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}` } },
    { url: `https://mohasagor.com.bd/api/reseller/product?api_key=${apiKey}&secret_key=${secretKey}` },
    { url: `https://mohasagor.com.bd/api/reseller/product?key=${apiKey}` },
  ];

  for (let i = 0; i < testConfigs.length; i++) {
    const config = testConfigs[i];
    const url = config.url || "https://mohasagor.com.bd/api/reseller/product";
    const headers = {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0",
      ...(config.headers || {})
    };
    try {
      console.log(`\nAttempt ${i + 1}: URL: ${url}, headers:`, JSON.stringify(headers));
      const res = await fetch(url, { method: "GET", headers });
      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log("Response (first 500 chars):", text.slice(0, 500));
      if (res.ok) {
        console.log("SUCCESS!");
        try {
          const json = JSON.parse(text);
          console.log("Parsed JSON sample:", Array.isArray(json) ? `Array of ${json.length} items` : Object.keys(json));
        } catch (e) {}
        break;
      }
    } catch (err) {
      console.error("Error:", err.message);
    }
  }
}

testMohasagor();
