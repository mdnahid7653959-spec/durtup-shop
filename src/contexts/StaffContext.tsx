import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/lib/firebaseAdapter";
import { useAuth } from "@/contexts/AuthContext";

export interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  role_id: string | null;
  status: string;
  monthly_salary: number | null;
  joining_date: string | null;
  avatar_url: string | null;
}

interface StaffRoleInfo {
  id: string;
  name: string;
  dashboard_key: string;
  default_permissions: string[];
  department_name?: string;
}

interface StaffContextValue {
  loading: boolean;
  isStaff: boolean;
  staff: StaffMember | null;
  role: StaffRoleInfo | null;
  permissions: Set<string>;
  can: (key: string) => boolean;
  refresh: () => Promise<void>;
}

const StaffContext = createContext<StaffContextValue | undefined>(undefined);

export function StaffProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [role, setRole] = useState<StaffRoleInfo | null>(null);
  const [extra, setExtra] = useState<string[]>([]);

  const load = async () => {
    if (!user) { setStaff(null); setRole(null); setExtra([]); setLoading(false); return; }
    setLoading(true);
    const { data: sm } = await supabase.from("staff_members").select("*").eq("user_id", user.id).maybeSingle();
    if (!sm || sm.status !== "active") {
      setStaff(null); setRole(null); setExtra([]); setLoading(false); return;
    }
    setStaff(sm as any);
    if (sm.role_id) {
      const { data: r } = await supabase
        .from("staff_roles")
        .select("id, name, dashboard_key, default_permissions, staff_departments(name)")
        .eq("id", sm.role_id).maybeSingle();
      if (r) setRole({
        id: r.id, name: r.name, dashboard_key: r.dashboard_key,
        default_permissions: (r.default_permissions as any) || [],
        department_name: (r as any).staff_departments?.name,
      });
    }
    const { data: perms } = await supabase.from("staff_permissions").select("permission_key").eq("staff_id", sm.id);
    setExtra((perms || []).map((p) => p.permission_key));
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) load(); /* eslint-disable-next-line */ }, [user?.id, authLoading]);

  const permissions = useMemo(() => {
    const s = new Set<string>();
    role?.default_permissions?.forEach((k) => s.add(k));
    extra.forEach((k) => s.add(k));
    return s;
  }, [role, extra]);

  const value: StaffContextValue = {
    loading: authLoading || loading,
    isStaff: !!staff,
    staff,
    role,
    permissions,
    can: (k) => permissions.has(k),
    refresh: load,
  };

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used within StaffProvider");
  return ctx;
}
