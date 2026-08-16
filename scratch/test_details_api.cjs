const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);

const url = urlMatch[1];
const key = keyMatch[1];

async function testProductDetails() {
  const testIds = ["3523", "3497", "3495", "3002"];
  for (const id of testIds) {
    console.log(`\n--- Fetching details for Mohasagor Product ID: ${id} ---`);
    const res = await fetch(`${url}/functions/v1/supplier-api`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'get-product-details',
        supplierId: 'da929859-f7fa-4590-a3ad-f7012eac5b8c',
        payload: { productId: id }
      })
    });
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  }
}

testProductDetails();
