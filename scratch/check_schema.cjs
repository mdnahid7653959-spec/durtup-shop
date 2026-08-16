const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);

const url = urlMatch[1];
const key = keyMatch[1];

async function checkOpenAPI() {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const openapi = await res.json();
  const pvSchema = openapi.definitions.product_variants;
  console.log("product_variants schema properties:", Object.keys(pvSchema.properties));
}

checkOpenAPI();
