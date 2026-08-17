import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { MobileBottomNav } from "./MobileBottomNav";
import { PushNotificationInitializer } from "@/components/PushNotificationInitializer";

interface AppLayoutProps {
  children: ReactNode;
}

// Pages where mobile bottom nav should NOT appear
// (admin, seller dashboards, product details with dedicated sticky action bars, checkout, cart)
const EXCLUDED_PATHS = [
  "/admin",
  "/seller",
  "/product/",
  "/cj-product",
  "/checkout",
  "/cart",
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  
  // Check if current path should exclude mobile nav
  const shouldShowMobileNav = !EXCLUDED_PATHS.some((path) => {
    if (path.endsWith("/")) {
      return location.pathname.startsWith(path);
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  });

  return (
    <>
      <PushNotificationInitializer />
      {children}
      {shouldShowMobileNav && <MobileBottomNav />}
    </>
  );
}
