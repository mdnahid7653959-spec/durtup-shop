import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncProductImages() {
  console.log("1. Fetching products from Mohasagor API...");
  const creds = {
    api_key: "A8niclztH9JtzS4t",
    secret_key: "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
  };

  const res = await fetch("https://mohasagor.com.bd/api/reseller/product", {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0",
      "api-key": creds.api_key,
      "secret-key": creds.secret_key
    }
  });

  if (!res.ok) {
    console.error("Failed to fetch from Mohasagor:", res.status, res.statusText);
    return;
  }

  const data = await res.json();
  const rawProducts = data.products || [];
  console.log(`Received ${rawProducts.length} raw products from Mohasagor.`);

  // Get all existing products from DB
  const { data: dbProducts } = await supabase.from("products").select("id, sku");
  const productMap = new Map();
  (dbProducts || []).forEach(p => {
    if (p.sku) productMap.set(p.sku, p.id);
  });

  console.log(`Found ${productMap.size} matching products in Supabase DB.`);

  let insertedImages = 0;
  let skippedImages = 0;

  for (const raw of rawProducts) {
    const pCode = raw.product_code || raw.id;
    const sku = `MOH-${pCode}`;
    const productId = productMap.get(sku);
    const thumbnail = raw.thumbnail_img;

    if (!productId || !thumbnail) {
      skippedImages++;
      continue;
    }

    // Check if image already exists for this product
    const { data: existingImgs } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .limit(1);

    if (existingImgs && existingImgs.length > 0) {
      // Image already exists, skip
      skippedImages++;
      continue;
    }

    // Insert image directly using insert (NOT upsert with invalid onConflict)
    const { error: insertErr } = await supabase.from("product_images").insert({
      product_id: productId,
      image_url: thumbnail,
      is_primary: true
    });

    if (insertErr) {
      console.error(`Failed to insert image for product ${sku}:`, insertErr.message);
      skippedImages++;
    } else {
      insertedImages++;
    }
  }

  console.log(`\nProduct Images Sync Finished!`);
  console.log(`Inserted Images: ${insertedImages}`);
  console.log(`Skipped: ${skippedImages}`);
}

syncProductImages();
