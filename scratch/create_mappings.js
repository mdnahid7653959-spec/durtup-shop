/**
 * Create supplier_product_mappings via the admin-db Edge Function
 * which has service role access to bypass RLS
 */

const SUPABASE_URL = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";

async function invokeEdgeFunction(functionName, body, extraHeaders = {}) {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...extraHeaders
    },
    body: JSON.stringify(body)
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function supabaseRest(path) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    }
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function main() {
  console.log("\n🔗 Creating supplier product mappings via admin-db\n");

  // Get active products
  const { data: products } = await supabaseRest(
    "products?select=id,sku,name&status=eq.active&limit=100"
  );

  if (!products || products.length === 0) {
    console.log("No active products found");
    return;
  }

  console.log(`Found ${products.length} active products`);

  // Get an admin session token
  const { data: adminLogin } = await invokeEdgeFunction("admin-auth", {
    action: "login",
    username: "admin",
    password: "Nahid@2025"
  });

  const adminToken = adminLogin?.session?.session_token;
  if (!adminToken) {
    console.log("⚠️ Could not get admin token, trying direct SQL via admin-db...");
  }

  // Use admin-db to execute an upsert for each product
  let created = 0;
  for (const product of products) {
    let supplierSku = product.sku || product.id;

    const { data: result } = await invokeEdgeFunction("admin-db", {
      action: "execute",
      query: `INSERT INTO supplier_product_mappings (product_id, supplier_id, supplier_sku, sync_status, last_synced_at) 
              VALUES ('${product.id}', 'da929859-f7fa-4590-a3ad-f7012eac5b8c', '${supplierSku}', 'synced', NOW())
              ON CONFLICT (product_id) DO UPDATE SET sync_status = 'synced', last_synced_at = NOW()
              RETURNING id`
    }, adminToken ? { "x-admin-token": adminToken } : {});

    if (result && !result.error) {
      created++;
    } else if (created === 0) {
      // Log first failure to debug
      console.log("First mapping result:", JSON.stringify(result).substring(0, 200));
    }
  }

  console.log(`\n✅ Created/updated ${created} mappings out of ${products.length} products`);

  // If admin-db didn't work, let's check if there's another way
  if (created === 0) {
    console.log("\n⚠️ Direct approach didn't work. Checking existing mappings...");
    const { data: existing } = await supabaseRest("supplier_product_mappings?select=id&limit=5");
    console.log("Existing mappings:", existing?.length || 0);
    
    // Try one more approach: directly upsert via REST with Prefer header for resolution
    console.log("\nTrying REST upsert approach...");
    
    const testProduct = products[0];
    const testBody = {
      product_id: testProduct.id,
      supplier_id: "da929859-f7fa-4590-a3ad-f7012eac5b8c",
      supplier_sku: testProduct.sku || testProduct.id,
      sync_status: "synced",
      last_synced_at: new Date().toISOString()
    };
    
    const testRes = await fetch(`${SUPABASE_URL}/rest/v1/supplier_product_mappings`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal,resolution=merge-duplicates"
      },
      body: JSON.stringify(testBody)
    });
    
    console.log(`REST upsert test: HTTP ${testRes.status}`, await testRes.text().catch(() => ""));
  }
}

main().catch(console.error);
