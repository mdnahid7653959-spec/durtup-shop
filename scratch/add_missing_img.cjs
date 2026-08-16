const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const urlMatch = envText.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envText.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);

const url = urlMatch[1];
const key = keyMatch[1];

async function addMissingImage() {
  const productId = "84d2b68d-4b69-47c7-9c50-bfc99bd110cc";
  const imageUrl = "https://mohasagor.com.bd/public/storage/images/products/ULDhkGVA7Tv6fJxA3eD6G4DIPjEmOI7XLsOwftwX.jpg";
  
  const res = await fetch(`${url}/rest/v1/product_images`, {
    method: "POST",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({
      product_id: productId,
      image_url: imageUrl,
      is_primary: true,
      sort_order: 0
    })
  });
  
  const data = await res.json();
  console.log("Inserted image for MOH-3497:", data);
}

addMissingImage();
