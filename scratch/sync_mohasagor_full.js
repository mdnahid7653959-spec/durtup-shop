import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAllMohasagorProducts() {
  console.log("Fetching products from Mohasagor API...");
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
  console.log(`Total products received from Mohasagor: ${rawProducts.length}`);

  // Fetch existing categories to map
  const { data: existingCategories } = await supabase.from("categories").select("id, name, slug");
  const categoryMap = new Map();
  (existingCategories || []).forEach(c => categoryMap.set(c.slug, c.id));

  let insertedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < rawProducts.length; i++) {
    const p = rawProducts[i];
    const pId = p.id;
    const name = p.name;
    const originalPrice = parseFloat(p.price || p.sale_price || 0);
    const salePrice = parseFloat(p.sale_price || p.price || 0);
    const thumbnail = p.thumbnail_img;
    const catName = p.category || "General";
    const details = p.details || "";
    const pCode = p.product_code || p.id;
    const sku = `MOH-${pCode}`;
    const slug = p.slug ? `mohasagor-${p.slug}-${pId}` : `mohasagor-product-${pId}`;

    if (!name || !salePrice) {
      skippedCount++;
      continue;
    }

    // Category Resolution
    const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let categoryId = categoryMap.get(catSlug);
    if (!categoryId) {
      const { data: newCat, error: catErr } = await supabase
        .from("categories")
        .insert({
          name: catName,
          slug: catSlug,
          is_active: true,
          description: "Imported from Mohasagor"
        })
        .select("id")
        .maybeSingle();

      if (newCat) {
        categoryId = newCat.id;
        categoryMap.set(catSlug, categoryId);
      }
    }

    // Pricing rule calculation (15% markup + 5% profit margin)
    const markup = salePrice * 0.15;
    const commission = salePrice * 0.05;
    const finalPrice = Math.round(salePrice + markup + commission);
    const regularPrice = Math.max(finalPrice, Math.round(originalPrice * 1.25));

    const productPayload = {
      name,
      slug,
      sku,
      regular_price: regularPrice,
      discount_price: finalPrice,
      stock_quantity: 100,
      description: details,
      status: "active",
      seller_id: null,
      category_id: categoryId || null,
      free_shipping: false,
      is_featured: i < 20,
      is_best_seller: i < 15,
      is_new_arrival: true
    };

    const { data: insertedProduct, error: prodErr } = await supabase
      .from("products")
      .upsert(productPayload, { onConflict: "sku" })
      .select("id")
      .maybeSingle();

    if (prodErr || !insertedProduct) {
      console.error(`Failed inserting product SKU ${sku}:`, prodErr?.message);
      skippedCount++;
      continue;
    }

    // Insert Image
    if (thumbnail) {
      const { data: existingImg } = await supabase
        .from("product_images")
        .select("id")
        .eq("product_id", insertedProduct.id)
        .limit(1);

      if (!existingImg || existingImg.length === 0) {
        await supabase.from("product_images").insert({
          product_id: insertedProduct.id,
          image_url: thumbnail,
          is_primary: true
        });
      }
    }

    insertedCount++;
    if (insertedCount % 20 === 0) {
      console.log(`Progress: ${insertedCount}/${rawProducts.length} products synced...`);
    }
  }

  console.log(`\nSynchronization Finished Successfully!`);
  console.log(`Total Products Synced: ${insertedCount}`);
  console.log(`Skipped/Errors: ${skippedCount}`);
}

syncAllMohasagorProducts();
