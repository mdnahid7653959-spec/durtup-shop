# Milestone 0 Audit Report: Build System, Scripts & Project Infrastructure

**Project Path**: `C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp`  
**Audit Date**: 2026-07-31  
**Agent**: Explorer (Milestone 0 - Infrastructure Audit)

---

## 1. Executive Summary

This audit evaluates the build system, entry points, TypeScript configurations, environment variables, utility scripts, and deployment configurations of the Durtup / Darzo Enterprise Marketplace project.

### Key Audit Findings:
1. **Dual Build Architecture**: The repository supports two build modes:
   - **Unified App (Default)**: `npm run build` executes `vite build` using `vite.config.ts` with `index.html` -> `src/main.tsx` (`App.tsx`), producing output in `dist/`. This includes both the main e-commerce storefront and gated admin routes.
   - **Standalone Admin App**: Configured via `vite.admin.config.ts` with `admin.html` -> `src/admin-main.tsx` (`AdminApp.tsx`), producing output in `dist-admin/`.
2. **Package Script Gap**: `package.json` lacks an explicit `"build:admin"` script for building the standalone admin panel (`npx vite build --config vite.admin.config.ts`), despite `ADMIN_DEPLOY_GUIDE.md` documenting this workflow.
3. **Build Pipeline & Type Safety**: `npm run build` does not currently invoke `tsc --noEmit` before `vite build`. Manual execution of `npx tsc --noEmit` verified 0 TypeScript compilation errors.
4. **TypeScript Configuration Inclusion Gap**: `tsconfig.node.json` explicitly includes `vite.config.ts` but omits `vite.admin.config.ts`, `tailwind.config.ts`, and `postcss.config.js`.
5. **Environment Configuration**: Key variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) are properly configured in `.env` and consumed via `src/integrations/supabase/client.ts`.
6. **Utility Scripts Structure**: Active verification scripts (`run_e2e_verification.js`, `auto_open_login.js`, `visible_live_test.js`, `search_functions.js`) are fully implemented and functional. Several historical migration/audit utility scripts (`fix_admin_rls.js`, `run_migrations.js`, `test_all_functions.js`, `test_product_creation.js`, `test_routes.js`, `update_admin_pass.js`, `verify_db.js`, `live_browser_audit.js`) are currently stubbed out/emptied.

---

## 2. Comprehensive File & Configuration Analysis

### 2.1 `package.json`
- **Metadata**: Name `vite_react_shadcn_ts`, version `0.0.0`, type `module`.
- **Scripts Audit**:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview"
  }
  ```
  - **Defect/Gap**: Missing `"build:admin": "vite build --config vite.admin.config.ts"`.
  - **Defect/Gap**: `build` does not run `tsc` type checking.
- **Dependencies**: React 18.3.1, `@supabase/supabase-js` ^2.110.7, `@tanstack/react-query` ^5.83.0, Radix UI primitives, Lucide React, Tailwind CSS, Zod 4.4.3.
- **Capacitor Mobile Dependencies**: `@capacitor/android`, `@capacitor/ios`, `@capacitor/core` ^8.0.x.

### 2.2 Vite Configurations

| Configuration File | Entry Point HTML | Root TSX Entry | Root App Component | Output Directory | Key Plugins |
|---|---|---|---|---|---|
| `vite.config.ts` | `index.html` | `src/main.tsx` | `App.tsx` | `dist/` | `react()`, `componentTagger()`, `mcpPlugin()` |
| `vite.admin.config.ts` | `admin.html` | `src/admin-main.tsx` | `AdminApp.tsx` | `dist-admin/` | `react()` |

- **`vite.config.ts` Details**:
  - Server port set to `8080`, host `::`.
  - Path alias: `@` -> `./src`.
  - Includes `@lovable.dev/mcp-js` plugin for Supabase development integration.
- **`vite.admin.config.ts` Details**:
  - `outDir`: `"dist-admin"`, `emptyOutDir: true`.
  - `rollupOptions.input`: `path.resolve(__dirname, "admin.html")`.
  - Excludes `componentTagger()` and `mcpPlugin()`.

### 2.3 HTML Entry Points

- **`index.html`**:
  - Title: `Darzo.com - Shop Millions of Products at Best Prices`
  - Manifest: `/manifest.json`
  - Fonts: Google Fonts (Bebas Neue, Barlow, Playfair Display, Cormorant Garamond, JetBrains Mono, Caveat, Inter).
  - Script Tag: `<script type="module" src="/src/main.tsx"></script>`
  - Service Worker: Registers `/sw.js`.
- **`admin.html`**:
  - Title: `Darzo Admin Panel`
  - Meta Tags: `<meta name="robots" content="noindex, nofollow" />` (protects admin indexing).
  - Manifest: `/admin-manifest.json`
  - Script Tag: `<script type="module" src="/src/admin-main.tsx"></script>`

### 2.4 TypeScript Configurations

- **`tsconfig.json`**:
  - Project references to `tsconfig.app.json` and `tsconfig.node.json`.
  - Path alias `@/*` -> `./src/*`.
  - Options: `allowJs: true`, `noImplicitAny: false`, `strictNullChecks: false`, `skipLibCheck: true`.
- **`tsconfig.app.json`**:
  - Target `ES2020`, module `ESNext`, `moduleResolution: bundler`, `noEmit: true`, `strict: false`.
  - Includes: `["src"]`.
- **`tsconfig.node.json`**:
  - Target `ES2022`, `lib: ["ES2023"]`, `moduleResolution: bundler`, `strict: true`.
  - Includes: `["vite.config.ts"]`.
  - **Gap**: `vite.admin.config.ts` is not included in `tsconfig.node.json`.

---

## 3. Environment Variables Audit (`.env`)

File location: `.env`
```env
VITE_SUPABASE_PROJECT_ID="bbfusyiykxxrsnhqgzrh"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1... (anon JWT)"
VITE_SUPABASE_URL="https://bbfusyiykxxrsnhqgzrh.supabase.co"
```

### Integration Check:
In `src/integrations/supabase/client.ts`:
- `const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;`
- `const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;`
- Client creation uses `createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ...)`.
- Correctly handles new opaque Supabase keys as well as legacy JWT keys.

---

## 4. Root Utility Scripts Audit

| Script Name | Purpose / Functionality | Status / Notes |
|---|---|---|
| `run_e2e_verification.js` | Complete Puppeteer E2E suite. Unlocks secret route `/nahid/dreem/e/comarce/467265@/apple789@/dreem/project/contole`, logs in at `/admin/login` (`HI Admin` / `Admin123456!#`), tests 30 admin pages, outputs `e2e_results.json`. | Active & Functional |
| `auto_open_login.js` | Automated browser script to launch Chrome/Edge, unlock secret gate, auto-fill login credentials. | Active |
| `visible_live_test.js` | Headful Puppeteer script with `slowMo: 80` for visible desktop screen test execution. | Active |
| `search_functions.js` | Utility script scanning `src/` for `functions.invoke` calls to verify Edge Function invocations. | Active |
| `ADMIN_DEPLOY_GUIDE.md` | Documentation for building and deploying standalone admin app (`dist-admin/`) to Vercel/Netlify. | Active |
| `fix_admin_rls.js` | Stubbed artifact (`// RLS fix completed`) | Stubbed |
| `run_migrations.js` | Stubbed artifact (`// Migration script cleanup completed`) | Stubbed |
| `test_all_functions.js` | Stubbed artifact (`// Step-by-step functional checks completed`) | Stubbed |
| `test_product_creation.js` | Stubbed artifact (`// Product creation test complete`) | Stubbed |
| `test_routes.js` | Stubbed artifact (`// Route audit test completed`) | Stubbed |
| `update_admin_pass.js` | Stubbed artifact (`// Password updated`) | Stubbed |
| `verify_db.js` | Stubbed artifact (`// DB verification completed`) | Stubbed |
| `live_browser_audit.js` | Stubbed artifact (`// Live browser audit completed`) | Stubbed |

---

## 5. Deployment & Mobile Infrastructure Configurations

### 5.1 Vercel Configuration (`vercel.json`)
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/:path*", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```
- Configured for single main app deployment (`dist/`).
- SPA fallback rewrite redirects all routes (`/:path*`) to `/index.html`.

### 5.2 Capacitor Mobile Configuration (`capacitor.config.ts`)
- `appId`: `com.megamart.app`
- `appName`: `Darzo`
- `webDir`: `dist`
- Configured for cross-platform Android and iOS builds with custom splash screen and status bar branding (`#f97316`).

---

## 6. Verification Results

1. **TypeScript Typecheck**:
   - Command: `npx tsc --noEmit`
   - Output: Success (0 errors).
2. **Main Application Build**:
   - Command: `npm run build` (`vite build`)
   - Output: Success (~35 seconds), generated production assets in `dist/`.
3. **Standalone Admin Application Build**:
   - Command: `npx vite build --config vite.admin.config.ts`
   - Output: Tested and verified.

---

## 7. Actionable Recommendations for Subsequent Milestones

1. **Add Admin Build Script to `package.json`**:
   - Add `"build:admin": "vite build --config vite.admin.config.ts"` to `package.json` `scripts`.
2. **Integrate Typechecking into Build Script**:
   - Update `"build"` script to `"tsc --noEmit && vite build"` to prevent broken builds.
3. **Update `tsconfig.node.json`**:
   - Expand `include` array in `tsconfig.node.json` to `["vite.config.ts", "vite.admin.config.ts"]`.
4. **Cleanup Root Directory**:
   - Remove or archive empty 1-liner stub scripts (`fix_admin_rls.js`, `run_migrations.js`, etc.) into a `scripts/archive/` folder if no longer needed.
