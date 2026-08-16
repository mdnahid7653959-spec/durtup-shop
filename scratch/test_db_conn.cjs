const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://bbfusyiykxxrsnhqgzrh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZnVzeWl5a3h4cnNuaHFnenJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMzIyNTAsImV4cCI6MjEwMDkwODI1MH0.FCkYFlH9dlIa4z6TFHB0MTvOuBafYlFo4XxlR5lkkiQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("Testing Supabase connection...");
  try {
    const { data, error } = await supabase.from("profiles").select("count").limit(1);
    if (error) {
      console.error("Connection failed with error:", error);
    } else {
      console.log("Connection successful! Data received:", data);
    }
  } catch (err) {
    console.error("Connection failed with exception:", err);
  }
}

testConnection();
