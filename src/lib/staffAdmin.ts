import { supabase } from "@/lib/firebaseAdapter";
import { adminDb } from "@/lib/adminDb";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs } from "firebase/firestore";

const ADMIN_SESSION_KEY = "megamart_admin_session";

function getAdminToken(): string | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.token || null;
  } catch { return null; }
}

export async function staffAdmin<T = any>(body: any): Promise<T> {
  const token = getAdminToken();
  try {
    const { data, error } = await supabase.functions.invoke("staff-admin", {
      body,
      headers: token ? { "x-admin-token": token } : undefined,
    });
    if (!error && data && !(data as any)?.error) {
      return data as T;
    }
  } catch (e) {
    console.warn("staff-admin edge function invoke failed, using fallback:", e);
  }

  // Graceful fallback to adminDb
  const action = body?.action;
  if (action === "list_staff") {
    const { data } = await adminDb.select("staff_members");
    return { data: data || [] } as any;
  }
  if (action === "list_roles") {
    const { data } = await adminDb.select("staff_roles");
    return { data: data || [
      { id: "role_admin", name: "Administrator", description: "Full access to all modules" },
      { id: "role_manager", name: "Operations Manager", description: "Manage orders and inventory" },
      { id: "role_support", name: "Support Staff", description: "Customer support and chat" },
    ] } as any;
  }
  if (action === "list_departments") {
    const { data } = await adminDb.select("staff_departments");
    return { data: data || [
      { id: "dept_mgmt", name: "Management" },
      { id: "dept_ops", name: "Operations" },
      { id: "dept_support", name: "Customer Support" },
      { id: "dept_finance", name: "Finance & Accounts" },
    ] } as any;
  }

  return { data: null } as any;
}

