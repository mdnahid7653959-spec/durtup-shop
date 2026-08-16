const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);

const url = urlMatch[1];
const key = keyMatch[1];

async function fixMissingImages() {
  // Fetch all products with product_images
  const res = await fetch(`${url}/rest/v1/products?select=id,name,sku,slug,product_images(id,image_url)&limit=100`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const products = await res.json();
  
  const missingImgs = products.filter(p => !p.product_images || p.product_images.length === 0);
  console.log(`Products missing images: ${missingImgs.length}`);
  for (const p of missingImgs) {
    console.log(`- SKU: ${p.sku}, Name: ${p.name}`);
  }
}

fixMissingImages();
