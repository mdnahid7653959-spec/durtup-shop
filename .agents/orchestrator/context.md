# Project Context

## Project Name
Durtup Enterprise Marketplace Admin Panel

## Working Directories
- Orchestrator Working Dir: `C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\orchestrator`
- Project Root Dir: `C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp`
- User Request File: `C:\Users\nahid\.gemini\antigravity\scratch\instapic-mvp\.agents\ORIGINAL_REQUEST.md`

## Tech Stack
- Frontend: React, Vite, TypeScript, Tailwind CSS, Lucide icons, Shadcn UI / Radix UI.
- Backend / Database: Supabase PostgreSQL (`bbfusyiykxxrsnhqgzrh`), Supabase Auth, Supabase Storage, Supabase Realtime / Edge Functions.
- State Management / Data Fetching: TanStack React Query, Supabase JS Client (`@supabase/supabase-js`).

## Core Architecture Principles
1. Real Database Persistence: 100% CRUD operations execution against Supabase PostgreSQL backend. Zero mock fallbacks.
2. Enterprise Standards: Daraz, Alibaba, Amazon Marketplace, Shopee, Lazada feature parity for admin management.
3. Security & Integrity: Role-Based Access Control (RBAC), Row-Level Security (RLS) policies, Audit Logging, input validation.
4. Clean Build & Type Safety: Zero TypeScript compilation errors, zero Vite build warnings/errors, zero console runtime errors.
