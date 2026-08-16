import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectImages() {
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      sku,
      product_images (id, image_url, is_primary)
    `)
    .limit(15);

  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  console.log(`Fetched ${products?.length} products:\n`);
  for (const p of products) {
    console.log(`ID: ${p.id}`);
    console.log(`Name: ${p.name}`);
    console.log(`SKU: ${p.sku}`);
    console.log(`Images:`, p.product_images);
    console.log("-".repeat(50));
  }
}

inspectImages();
