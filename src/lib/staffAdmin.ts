import { supabase } from "@/lib/firebaseAdapter";

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
  const { data, error } = await supabase.functions.invoke("staff-admin", {
    body,
    headers: token ? { "x-admin-token": token } : undefined,
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}
