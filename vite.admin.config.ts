import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Separate Vite config for building the Admin Panel as a standalone app.
// Usage: npx vite build --config vite.admin.config.ts
// Output: dist-admin/

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-admin",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "admin.html"),
    },
  },
  // IMPORTANT: Set your Supabase environment variables here or via .env
  // The admin app connects to the SAME backend as the main store.
  // Make sure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set.
});
