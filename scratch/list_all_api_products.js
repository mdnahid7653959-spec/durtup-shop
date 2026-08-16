import fs from 'fs';
import https from 'https';

const apiUrl = "https://mohasagor.com.bd/api/reseller/product";
const options = {
  headers: {
    "api-key": "A8niclztH9JtzS4t",
    "secret-key": "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
  }
};

https.get(apiUrl, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const prods = json.products || (Array.isArray(json) ? json : []);
      console.log("Total API products:", prods.length);
      const summary = prods.map((p, idx) => ({
        idx,
        id: p.id,
        name: p.name,
        category: p.category || p.category_name,
        price: p.price,
        image: p.thumbnail_img || p.image || p.thumbnail || p.product_images?.[0]
      }));
      fs.writeFileSync('scratch/all_api_products.json', JSON.stringify(summary, null, 2));
      console.log("Saved to scratch/all_api_products.json");
    } catch (e) {
      console.error("Parse error:", e);
    }
  });
}).on('error', err => console.error("Request error:", err));
