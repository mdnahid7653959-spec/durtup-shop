const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);
const url = urlMatch[1];
const key = keyMatch[1];

async function check() {
  const res = await fetch(`${url}/rest/v1/products?select=id,slug,name,regular_price,discount_price,sku,supplier_product_mappings(*)`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const products = await res.json();
  console.log('Total in Supabase:', products.length);
  const a9 = products.find(p => (p.name && p.name.includes('A9')) || (p.slug && p.slug.includes('87')) || p.id == '87');
  console.log('A9 in Supabase:', a9);

  // Check Mohasagor API
  try {
    const mRes = await fetch('https://mohasagor.com.bd/api/reseller/product', {
      headers: {
        'api-key': 'A8niclztH9JtzS4t',
        'secret-key': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8'
      }
    });
    const mData = await mRes.json();
    const mProducts = mData.products || (Array.isArray(mData) ? mData : []);
    console.log('Total from Mohasagor API:', mProducts.length);
    const mA9 = mProducts.find(p => (p.name && p.name.includes('A9')) || p.id == 87);
    console.log('A9 in Mohasagor API:', JSON.stringify(mA9, null, 2));
  } catch (e) {
    console.log('Mohasagor fetch err:', e.message);
  }
}
check();
