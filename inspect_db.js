import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("--- SITE_SETTINGS ---");
  const { data, error } = await supabase
    .from("site_settings")
    .select("*");
  if (error) {
    console.error("Error reading site_settings:", error);
  } else {
    console.dir(data, { depth: null });
  }

  console.log("--- LAYOUT_CONFIG ---");
  const { data: layout } = await supabase
    .from("layout_config")
    .select("*");
  console.dir(layout, { depth: null });

  console.log("--- THEME_CONFIG ---");
  const { data: theme } = await supabase
    .from("theme_config")
    .select("*");
  console.dir(theme, { depth: null });
}

run();
