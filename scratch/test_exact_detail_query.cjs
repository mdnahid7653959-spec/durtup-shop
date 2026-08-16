const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);

const url = urlMatch[1];
const key = keyMatch[1];

async function testExactQuery() {
  const slug = "mohasagor-mens-stylish-casual-shirt-3497-497";
  
  // Exact query from ProductDetail.tsx
  const res = await fetch(`${url}/rest/v1/products?select=*,product_images(id,image_url,is_primary,sort_order),product_variants(id,product_id,attribute,variant),supplier_product_mappings(supplier_id,supplier_sku)&slug=eq.${encodeURIComponent(slug)}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const data = await res.json();
  console.log("ProductDetail query result for slug:", JSON.stringify(data, null, 2));
}

testExactQuery();
