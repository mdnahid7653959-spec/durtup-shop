/**
 * Seed the Mohasagor supplier integration record using the Edge Function
 * and create supplier_product_mappings for existing products
 */

const SUPABASE_URL = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";

async function invokeEdgeFunction(functionName, body) {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function supabaseRest(path, method = "GET", body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const opts = {
    method,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation,resolution=merge-duplicates" : "return=representation"
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function main() {
  console.log("\n🔧 Seeding Mohasagor Supplier Integration\n");

  // Step 1: Seed the supplier integration record using the Edge Function's seed action
  console.log("1. Seeding supplier_integrations record...");
  const seedRes = await invokeEdgeFunction("supplier-api", {
    action: "seed-supplier",
    supplierData: {
      id: "da929859-f7fa-4590-a3ad-f7012eac5b8c",
      name: "Mohasagor",
      company_name: "mohasagor.com.bd",
      api_base_url: "https://mohasagor.com.bd",
      api_version: "v1",
      auth_type: "apikey",
      credentials_encrypted: "mohasagor-hardcoded-creds",
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
        description_path: "details",
        create_order: "/api/reseller/order/create"
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
      is_active: true
    }
  });

  if (seedRes.data?.success) {
    console.log("   ✅ Supplier integration record seeded successfully");
  } else {
    console.log("   ⚠️ Seed response:", JSON.stringify(seedRes.data).substring(0, 200));
  }

  // Step 2: Create supplier_product_mappings for existing products with MOH-prefixed SKUs
  console.log("\n2. Creating supplier_product_mappings for existing products...");
  
  const { data: products } = await supabaseRest(
    "products?select=id,sku,name&status=eq.active&limit=100"
  );

  if (!products || products.length === 0) {
    console.log("   ⚠️ No active products found in DB");
    return;
  }

  console.log(`   Found ${products.length} active products`);

  let mappingsCreated = 0;
  for (const product of products) {
    // Extract supplier SKU from either MOH- prefix or the raw numeric ID
    let supplierSku = null;
    if (product.sku) {
      if (product.sku.startsWith("MOH-")) {
        supplierSku = product.sku.replace("MOH-", "");
      } else if (/^\d+$/.test(product.sku)) {
        supplierSku = product.sku;
      }
    }

    if (!supplierSku) {
      // Use numeric part of ID or the sku as-is
      supplierSku = product.sku || product.id;
    }

    const mapping = {
      product_id: product.id,
      supplier_id: "da929859-f7fa-4590-a3ad-f7012eac5b8c",
      supplier_sku: String(supplierSku),
      sync_status: "synced",
      last_synced_at: new Date().toISOString()
    };

    const { status } = await supabaseRest(
      "supplier_product_mappings?on_conflict=product_id",
      "POST",
      mapping
    );

    if (status >= 200 && status < 300) {
      mappingsCreated++;
    }
  }

  console.log(`   ✅ Created/updated ${mappingsCreated} supplier product mappings`);
  
  console.log("\n🎉 Done! Run 'node e2e_supplier_test.js' to verify.\n");
}

main().catch(console.error);
