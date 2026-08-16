import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

const SECRET_KEY = "durtup-api-gateway-salt-secure-key-2026";
function encryptCredentials(credsObj) {
  try {
    const jsonStr = JSON.stringify(credsObj);
    const encoded = encodeURIComponent(jsonStr);
    let cipherText = "";
    for (let i = 0; i < encoded.length; i++) {
      const charCode = encoded.charCodeAt(i);
      const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      cipherText += String.fromCharCode(charCode ^ keyChar);
    }
    return btoa(cipherText);
  } catch (error) {
    console.error("Encryption failed:", error);
    return "";
  }
}

async function syncMohasagor() {
  console.log("1. Seeding Mohasagor Supplier Integration into DB...");
  const creds = {
    api_key: "A8niclztH9JtzS4t",
    secret_key: "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
  };
  const encryptedCreds = encryptCredentials(creds);

  const supplierPayload = {
    name: "Mohasagor",
    company_name: "mohasagor.com.bd",
    api_base_url: "https://mohasagor.com.bd",
    api_version: "v1",
    auth_type: "apikey",
    credentials_encrypted: encryptedCreds,
    endpoints_config: {
      product_list: "/api/reseller/product",
      category_list_path: "/api/reseller/category",
      response_root_path: "products",
      sku_path: "id",
      name_path: "name",
      price_path: "price",
      stock_path: "stock_quantity",
      image_path: "thumbnail_img",
      category_id_path: "category_id",
      category_name_path: "category",
      description_path: "details"
    },
    pricing_rules: {
      markup_type: "percentage",
      markup_value: 15,
      commission_margin: 5,
      min_profit: 50,
      max_profit: 999999,
      conversion_rate: 1,
      auto_round: false,
      round_to: 99
    },
    sync_interval: "1h",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: existing } = await supabase
    .from("supplier_integrations")
    .select("id")
    .eq("name", "Mohasagor")
    .maybeSingle();

  let supplierData;
  if (existing) {
    const { data, error } = await supabase
      .from("supplier_integrations")
      .update(supplierPayload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) {
      console.error("Failed to update supplier integration:", error);
      return;
    }
    supplierData = data;
  } else {
    const { data, error } = await supabase
      .from("supplier_integrations")
      .insert(supplierPayload)
      .select()
      .single();
    if (error) {
      console.error("Failed to insert supplier integration:", error);
      return;
    }
    supplierData = data;
  }

  console.log("Supplier integration ready. ID:", supplierData.id);

  console.log("2. Fetching products from Mohasagor API...");
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
    console.error("API Fetch failed:", res.status, res.statusText);
    return;
  }

  const rawData = await res.json();
  const rawProducts = rawData.products || [];
  console.log(`Fetched ${rawProducts.length} raw products from Mohasagor.`);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const item of rawProducts) {
    const sId = item.id;
    const sSku = `MOH-${item.product_code || item.id}`;
    const sName = item.name;
    const sPrice = parseFloat(item.sale_price || item.price || 0);
    const sRegularPrice = parseFloat(item.price || sPrice);
    const sDesc = item.details || "";
    const sImg = item.thumbnail_img || "";
    const sCategoryName = item.category || "General";
    const sSlug = item.slug ? `mohasagor-${item.slug}` : `mohasagor-product-${sId}`;

    if (!sName || !sPrice) {
      skippedCount++;
      continue;
    }

    // 1. Resolve Category
    let categoryId = null;
    if (sCategoryName) {
      const catSlug = sCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data: existingCat } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", catSlug)
        .maybeSingle();

      if (existingCat) {
        categoryId = existingCat.id;
      } else {
        const { data: newCat } = await supabase
          .from("categories")
          .insert({
            name: sCategoryName,
            slug: catSlug,
            is_active: true,
            description: "Imported from Mohasagor"
          })
          .select("id")
          .maybeSingle();
        if (newCat) categoryId = newCat.id;
      }
    }

    // 2. Pricing Calculation (15% markup + 5% commission)
    const markup = sPrice * 0.15;
    const commission = sPrice * 0.05;
    const sellingPrice = Math.round(sPrice + markup + commission);

    // 3. Upsert Product
    const productPayload = {
      name: sName,
      slug: sSlug,
      sku: sSku,
      regular_price: Math.max(sellingPrice, Math.round(sRegularPrice * 1.2)),
      discount_price: sellingPrice,
      stock_quantity: 50,
      description: sDesc,
      status: "active",
      seller_id: "mohasagor.com.bd",
      category_id: categoryId,
      free_shipping: false,
      is_featured: true,
      is_new_arrival: true
    };

    const { data: upsertedProduct, error: prodErr } = await supabase
      .from("products")
      .upsert(productPayload, { onConflict: "sku" })
      .select("id")
      .maybeSingle();

    if (prodErr || !upsertedProduct) {
      console.error("Product upsert failed for SKU:", sSku, prodErr?.message);
      skippedCount++;
      continue;
    }

    // 4. Product Image
    if (sImg) {
      await supabase.from("product_images").upsert({
        product_id: upsertedProduct.id,
        image_url: sImg,
        is_primary: true
      }, { onConflict: "product_id, image_url" });
    }

    // 5. Supplier Mapping Record
    await supabase.from("supplier_product_mappings").upsert({
      product_id: upsertedProduct.id,
      supplier_id: supplierData.id,
      supplier_sku: String(sId),
      sync_status: "synced",
      last_synced_at: new Date().toISOString()
    }, { onConflict: "product_id" });

    insertedCount++;
  }

  console.log(`Sync completed! Inserted/Updated: ${insertedCount}, Skipped: ${skippedCount}`);

  // Log to supplier sync logs
  await supabase.from("supplier_sync_logs").insert({
    supplier_id: supplierData.id,
    action_type: "product_sync",
    status: "success",
    response_time_ms: 1200,
    message: `Mohasagor Products Synced: ${insertedCount} products active.`,
    error_details: {}
  });
}

syncMohasagor();
