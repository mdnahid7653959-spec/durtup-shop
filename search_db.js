import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Get all tables in public schema
  console.log("Searching database for 'RTR 160' or 'OFFAR'...");
  
  const tables = [
    "products", "categories", "orders", "sellers", "site_config", "layout_config", 
    "theme_config", "custom_sections", "site_settings"
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) continue;
      const str = JSON.stringify(data);
      if (str.includes("RTR 160") || str.includes("OFFAR")) {
        console.log(`Found match in table: ${table}`);
        console.dir(data, { depth: null });
      }
    } catch (e) {
      // ignore
    }
  }
}

run();
