import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { MobileBottomNav } from "./MobileBottomNav";
import { PushNotificationInitializer } from "@/components/PushNotificationInitializer";

interface AppLayoutProps {
  children: ReactNode;
}

// Pages where mobile bottom nav should NOT appear
// (admin, seller dashboards, product details with dedicated sticky action bars, checkout)
const EXCLUDED_PATHS = [
  "/admin",
  "/seller",
  "/product/",
  "/cj-product",
  "/checkout",
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  
  // Specific checks to exclude mobile bottom nav
  const isProductDetail = path.startsWith("/product/") || path.startsWith("/cj-product") || path === "/product";
  const isCheckout = path === "/checkout" || path.startsWith("/checkout/");
  const isAdmin = path.startsWith("/admin");
  const isSeller = path.startsWith("/seller");

  const shouldShowMobileNav = !isProductDetail && !isCheckout && !isAdmin && !isSeller;

  return (
    <>
      <PushNotificationInitializer />
      {children}
      {shouldShowMobileNav && <MobileBottomNav />}
    </>
  );
}
