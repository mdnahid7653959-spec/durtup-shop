const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);

const url = urlMatch[1];
const key = keyMatch[1];

async function checkProducts() {
  const res = await fetch(`${url}/rest/v1/products?select=id,slug,name,sku,product_images(image_url)&limit=20`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const products = await res.json();
  console.log("Products from DB:");
  console.log(JSON.stringify(products, null, 2));
}

checkProducts();
