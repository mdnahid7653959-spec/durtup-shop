const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);

const url = urlMatch[1];
const key = keyMatch[1];

async function checkMappings() {
  const res = await fetch(`${url}/rest/v1/supplier_product_mappings?select=id,product_id,supplier_sku,sync_status&limit=30`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const mappings = await res.json();
  console.log("Mappings from DB:", JSON.stringify(mappings, null, 2));

  // Also query products table by slug
  const pRes = await fetch(`${url}/rest/v1/products?select=id,slug,sku,name&slug=eq.mohasagor-mens-stylish-casual-shirt-3497-497`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const pData = await pRes.json();
  console.log("Product with slug mohasagor-mens-stylish-casual-shirt-3497-497:", pData);
}

checkMappings();
