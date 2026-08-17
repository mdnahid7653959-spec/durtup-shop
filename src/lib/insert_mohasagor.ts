import { firebaseDb as supabase } from "./firebaseAdapter";
import { encryptCredentials } from "./crypto";

async function run() {
  const creds = {
    api_key: "A8niclztH9JtzS4t",
    secret_key: "2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8"
  };
  const encryptedCreds = encryptCredentials(creds);

  const payload = {
    name: "Mohasagor",
    company_name: "mohasagor.com.bd",
    api_base_url: "https://mohasagor.com.bd",
    api_version: "v1",
    auth_type: "apikey",
    credentials_encrypted: encryptedCreds,
    endpoints_config: {
      product_list: "/api/reseller/product",
      category_list_path: "/api/reseller/category",
      response_root_path: "",
      sku_path: "id",
      name_path: "name",
      price_path: "price",
      stock_path: "stock_quantity",
      image_path: "thumbnail_image",
      category_id_path: "category_id",
      category_name_path: "category",
      description_path: "description"
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

  const { data, error } = await supabase
    .from("supplier_integrations")
    .upsert(payload);

  if (error) {
    console.error("Error inserting Mohasagor supplier:", error);
  } else {
    console.log("Mohasagor supplier inserted successfully:", data);
  }
}

run().catch(console.error);
