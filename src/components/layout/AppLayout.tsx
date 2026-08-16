import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { MobileBottomNav } from "./MobileBottomNav";
import { PushNotificationInitializer } from "@/components/PushNotificationInitializer";

interface AppLayoutProps {
  children: ReactNode;
}

// Pages where mobile bottom nav should NOT appear (admin, seller dashboards)
const EXCLUDED_PATHS = [
  "/admin",
  "/seller/dashboard",
  "/seller/products",
  "/seller/orders",
  "/seller/earnings",
  "/seller/analytics",
  "/seller/settings",
  "/seller/consignments",
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  
  // Check if current path should exclude mobile nav
  const shouldShowMobileNav = !EXCLUDED_PATHS.some(path => 
    location.pathname.startsWith(path)
  );

  return (
    <>
      <PushNotificationInitializer />
      {children}
      {shouldShowMobileNav && <MobileBottomNav />}
    </>
  );
}
