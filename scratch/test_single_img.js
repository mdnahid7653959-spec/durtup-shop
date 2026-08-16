import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSingleImg() {
  const { data: p } = await supabase.from("products").select("id, name, sku").eq("sku", "MOH-3002").single();
  console.log("Product:", p);

  // Try insert
  const resInsert = await supabase.from("product_images").insert({
    product_id: p.id,
    image_url: "https://mohasagor.com.bd/public/storage/images/products/hPO6XHiuiSO3PveNv2BDBms204poSCtWW6abeG15.jpg",
    is_primary: true
  }).select();
  console.log("Insert result:", resInsert);

  // Try upsert with onConflict
  const resUpsert = await supabase.from("product_images").upsert({
    product_id: p.id,
    image_url: "https://mohasagor.com.bd/public/storage/images/products/hPO6XHiuiSO3PveNv2BDBms204poSCtWW6abeG15.jpg",
    is_primary: true
  }, { onConflict: "product_id, image_url" }).select();
  console.log("Upsert result:", resUpsert);
}

testSingleImg();
