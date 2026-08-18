import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MobileBottomNav } from "./MobileBottomNav";
import { PushNotificationInitializer } from "@/components/PushNotificationInitializer";

interface AppLayoutProps {
  children: ReactNode;
}

// Pages where mobile bottom nav should NOT appear
// (admin, seller, staff portals, checkout)
export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  
  // Always scroll to top on page/route navigation
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, location.search]);

  // Specific checks to exclude mobile bottom nav
  const isCheckout = path === "/checkout" || path.startsWith("/checkout/");
  const isAdmin = path.startsWith("/admin");
  const isSeller = path.startsWith("/seller");
  const isStaff = path.startsWith("/staff");

  const shouldShowMobileNav = !isCheckout && !isAdmin && !isSeller && !isStaff;

  return (
    <>
      <PushNotificationInitializer />
      {children}
      {shouldShowMobileNav && <MobileBottomNav />}
    </>
  );
}

