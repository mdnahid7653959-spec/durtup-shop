const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);

const url = urlMatch[1];
const key = keyMatch[1];

async function inspectProducts() {
  const res = await fetch(`${url}/rest/v1/products?select=id,slug,sku,name,status,product_images(image_url,is_primary)&limit=100`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const products = await res.json();
  console.log(`Total DB products: ${products.length}`);
  
  let noImageCount = 0;
  let hasImageCount = 0;

  for (const p of products) {
    const imgs = p.product_images || [];
    if (imgs.length === 0) {
      noImageCount++;
      console.log(`NO IMAGES: [${p.sku}] ${p.slug} -> "${p.name}"`);
    } else {
      hasImageCount++;
    }
  }

  console.log(`\nProducts with images: ${hasImageCount}`);
  console.log(`Products without images: ${noImageCount}`);
}

inspectProducts();
