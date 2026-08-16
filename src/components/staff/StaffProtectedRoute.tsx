import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStaff } from "@/contexts/StaffContext";
import { Loader2 } from "lucide-react";

export function StaffProtectedRoute({ children, permission }: { children: ReactNode; permission?: string }) {
  const { user, loading: authLoading } = useAuth();
  const { loading, isStaff, can } = useStaff();
  const location = useLocation();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/staff/login" state={{ from: location }} replace />;
  if (!isStaff) return <Navigate to="/staff/login" replace />;
  if (permission && !can(permission)) return <Navigate to="/staff" replace />;

  return <>{children}</>;
}
