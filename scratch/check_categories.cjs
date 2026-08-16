const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);
const url = urlMatch[1];
const key = keyMatch[1];

async function check() {
  const res = await fetch(url + '/rest/v1/categories?select=id,name,slug,image_url', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const cats = await res.json();
  console.log('categories:', cats);
  
  const prodRes = await fetch(url + '/rest/v1/products?select=id,name,slug,category_id,product_images(image_url)&limit=30', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  const prods = await prodRes.json();
  console.log('sample prods:', prods.map(p => ({ name: p.name, img: p.product_images?.[0]?.image_url })));
}
check();
