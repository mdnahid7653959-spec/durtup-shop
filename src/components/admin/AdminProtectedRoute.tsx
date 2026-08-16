import { ReactNode, useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Loader2 } from "lucide-react";
import { isAdminGateUnlocked } from "./AdminGate";
import NotFound from "@/pages/NotFound";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { isAuthenticated, loading, validateSession } = useAdminAuth();
  const location = useLocation();
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const hasValidated = useRef(false);

  // Security gate: unless the secret unlock URL was visited this session, pretend the route doesn't exist.
  if (!isAdminGateUnlocked()) return <NotFound />;

  useEffect(() => {
    // Only validate once per mount, not on every render
    if (loading || hasValidated.current) return;

    const validate = async () => {
      hasValidated.current = true;
      if (isAuthenticated) {
        try {
          const valid = await validateSession();
          setIsValid(valid);
        } catch (error) {
          console.error('Admin session validation error:', error);
          setIsValid(false);
        }
      } else {
        setIsValid(false);
      }
      setValidating(false);
    };
    
    validate();
  }, [loading, isAuthenticated]); // Remove validateSession from deps

  if (loading || validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  // If periodic validation (in AdminAuthContext) logs the admin out,
  // redirect immediately instead of relying on the one-time isValid flag.
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isValid) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
