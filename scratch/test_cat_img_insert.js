import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: catData, error: catErr } = await supabase.from("categories").insert({
    name: "Test Cat",
    slug: "test-cat-" + Date.now()
  }).select();
  console.log("Cat test:", { catData, catErr });

  const { data: pData } = await supabase.from("products").select("id").limit(1).single();
  const { data: imgData, error: imgErr } = await supabase.from("product_images").insert({
    product_id: pData.id,
    image_url: "https://example.com/test.jpg",
    is_primary: true
  }).select();
  console.log("Img test:", { imgData, imgErr });

  // Clean up
  if (catData?.[0]?.id) await supabase.from("categories").delete().eq("id", catData[0].id);
  if (imgData?.[0]?.id) await supabase.from("product_images").delete().eq("id", imgData[0].id);
}

test();
