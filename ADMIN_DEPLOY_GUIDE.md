# Darzo Admin Panel — আলাদা Deploy Guide

## 📌 Overview

Admin Panel এখন আলাদাভাবে build ও deploy করা যাবে, কিন্তু এটি **একই backend (database, auth, edge functions)** ব্যবহার করবে যা main store ব্যবহার করে।

## 📂 Admin-Specific Files

| File | Purpose |
|------|---------|
| `admin.html` | Admin app HTML entry point |
| `src/admin-main.tsx` | Admin React entry point |
| `src/AdminApp.tsx` | Admin-only routes & providers |
| `vite.admin.config.ts` | Admin-specific Vite build config |

## 🚀 Build Steps

### 1. GitHub-এ Export করুন
Lovable Settings → GitHub → Connect & Create Repository

### 2. Clone ও Install
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
```

### 3. Environment Variables সেট করুন
Project root-এ `.env` ফাইল তৈরি করুন (বা existing `.env` ব্যবহার করুন):

```env
VITE_SUPABASE_URL=https://leacrldgjfsbjsqyjwdx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

> ⚠️ **Important:** Main store আর Admin app **একই** Supabase URL ও Key ব্যবহার করবে।

### 4. Admin App Build করুন
```bash
npx vite build --config vite.admin.config.ts
```

Output folder: `dist-admin/`

### 5. Deploy করুন

#### Option A: Vercel
```bash
npm i -g vercel
cd dist-admin
vercel --prod
```

#### Option B: Netlify
1. Netlify Dashboard → New Site → Deploy manually
2. `dist-admin` folder drag & drop করুন
3. Site settings → Build & deploy → Environment variables add করুন

#### Option C: Any Static Hosting
`dist-admin/` folder-এর contents যেকোনো static hosting-এ upload করুন (Cloudflare Pages, Firebase Hosting, etc.)

### 6. SPA Routing Fix
Admin app SPA (Single Page Application), তাই hosting-এ redirect rule add করতে হবে:

**Vercel** (`vercel.json`):
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/admin.html" }] }
```

**Netlify** (`_redirects` file in dist-admin):
```
/*    /admin.html   200
```

## 🔗 Custom Domain Setup

আপনার hosting provider-এ custom domain (e.g., `admin.darzo.com`) connect করুন।

## ✅ Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Main Store App    │     │   Admin Panel App    │
│   darzo.com         │     │   admin.darzo.com    │
│   (dist/)           │     │   (dist-admin/)      │
└────────┬────────────┘     └────────┬────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
           ┌─────────▼─────────┐
           │  Shared Backend   │
           │  (Supabase/Cloud) │
           │  - Database       │
           │  - Auth           │
           │  - Edge Functions │
           │  - Storage        │
           └───────────────────┘
```

## 🔒 Security Notes

- Admin app-এ `robots.txt`-এ `noindex, nofollow` সেট আছে
- Admin authentication সম্পূর্ণ server-side validated
- Session token server-এ verify হয়, localStorage manipulation কাজ করবে না
