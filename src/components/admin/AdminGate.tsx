import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import NotFound from "@/pages/NotFound";

export const ADMIN_GATE_KEY = "admin_gate_session_token_v2";

export const ADMIN_SECRET_PREFIX =
  "/nahid/dreem/e/comarce/467265@/apple789@/dreem/project";
export const ADMIN_SECRET_SLUG = "contole";
export const ADMIN_SECRET_PATH = `${ADMIN_SECRET_PREFIX}/${ADMIN_SECRET_SLUG}`;
export const ADMIN_SECRET_ROUTE = `${ADMIN_SECRET_PREFIX}/:unlockCode/*`;

/**
 * Checks if the current browser tab session has unlocked the admin gate.
 * Strictly uses temporary sessionStorage (no permanent localStorage bypass).
 */
export function isAdminGateUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Clear any legacy insecure localStorage keys
    localStorage.removeItem("admin_gate_unlocked");
    localStorage.removeItem(ADMIN_GATE_KEY);

    const token = sessionStorage.getItem(ADMIN_GATE_KEY);
    return Boolean(token && token.startsWith("gate_unlocked_"));
  } catch {
    return false;
  }
}

/**
 * Unlocks the admin gate for the current tab session only.
 */
export function unlockAdminGate(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("admin_gate_unlocked");
    localStorage.removeItem(ADMIN_GATE_KEY);
    sessionStorage.setItem(ADMIN_GATE_KEY, `gate_unlocked_${Date.now()}`);
  } catch {}
}

/**
 * Locks the admin gate and clears all session gate tokens.
 */
export function lockAdminGate(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ADMIN_GATE_KEY);
    sessionStorage.removeItem("admin_gate_unlocked");
    localStorage.removeItem("admin_gate_unlocked");
    localStorage.removeItem(ADMIN_GATE_KEY);
  } catch {}
}

/**
 * Route component mounted ONLY at the secret URL.
 * Unlocks the gate for this tab and navigates to the login screen.
 */
export function AdminSecretUnlock() {
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    unlockAdminGate();
    setReady(true);
  }, [location.pathname]);

  if (!ready) return null;
  return <Navigate to="/admin/login" replace state={{ from: location, gateUnlocked: true }} />;
}

/**
 * Wrapper for admin routes to guard them from direct access.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  if (!isAdminGateUnlocked()) {
    return <NotFound />;
  }
  return <>{children}</>;
}
