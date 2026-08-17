import { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/utils/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { StaffProvider } from "@/contexts/StaffContext";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { NativeAppProvider } from "@/components/NativeAppProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Core Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import ProductForm from "./pages/admin/ProductForm";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminOrders from "./pages/admin/AdminOrders";

// Extended Admin Modules
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCJSettings = lazy(() => import("./pages/admin/AdminCJSettings"));
const AdminSupplierIntegrations = lazy(() => import("./pages/admin/AdminSupplierIntegrations"));
const AdminSellers = lazy(() => import("./pages/admin/AdminSellers"));
const AdminShipping = lazy(() => import("./pages/admin/AdminShipping"));
const AdminCommissions = lazy(() => import("./pages/admin/AdminCommissions"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory"));
const AdminMarketing = lazy(() => import("./pages/admin/AdminMarketing"));
const AdminLoyalty = lazy(() => import("./pages/admin/AdminLoyalty"));
const AdminFreeDelivery = lazy(() => import("./pages/admin/AdminFreeDelivery"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSecurity = lazy(() => import("./pages/admin/AdminSecurity"));
const AdminCMS = lazy(() => import("./pages/admin/AdminCMS"));
const AdminConsignments = lazy(() => import("./pages/admin/AdminConsignments"));
const AdminWarehouses = lazy(() => import("./pages/admin/AdminWarehouses"));
const AdminHomeBento = lazy(() => import("./pages/admin/AdminHomeBento"));
const AdminHomePromos = lazy(() => import("./pages/admin/AdminHomePromos"));
const AdminPushNotifications = lazy(() => import("./pages/admin/AdminPushNotifications"));
const AdminReturns = lazy(() => import("./pages/admin/AdminReturns"));
const AdminSearchManagement = lazy(() => import("./pages/admin/AdminSearchManagement"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminStaff = lazy(() => import("./pages/admin/AdminStaff"));
const AdminSellerSupport = lazy(() => import("./pages/admin/AdminSellerSupport"));
const AdminWallet = lazy(() => import("./pages/admin/AdminWallet"));
const AdminVisualEditor = lazy(() => import("./pages/admin/AdminVisualEditor"));

// Enterprise Suite
import { EnterpriseSupplierCenter } from "./pages/admin/enterprise/EnterpriseSupplierCenter";
import { EnterpriseCMSBuilder } from "./pages/admin/enterprise/EnterpriseCMSBuilder";
import { EnterpriseAIStudio } from "./pages/admin/enterprise/EnterpriseAIStudio";
import { EnterpriseCampaigns } from "./pages/admin/enterprise/EnterpriseCampaigns";
import { EnterpriseShipping } from "./pages/admin/enterprise/EnterpriseShipping";
import { EnterpriseInventory } from "./pages/admin/enterprise/EnterpriseInventory";
import { EnterpriseSecurity } from "./pages/admin/enterprise/EnterpriseSecurity";
import { EnterpriseUserControl } from "./pages/admin/enterprise/EnterpriseUserControl";
import { EnterpriseWebsiteControl } from "./pages/admin/enterprise/EnterpriseWebsiteControl";
import { EnterpriseThemeBuilder } from "./pages/admin/enterprise/EnterpriseThemeBuilder";

const NotFound = lazy(() => import("./pages/NotFound"));

// Minimal Loading Fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

// Optimized QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <NativeAppProvider>
            <ThemeProvider>
              <AdminAuthProvider>
                <StaffProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Auth */}
                      <Route path="/login" element={<AdminLogin />} />
                      <Route path="/admin/login" element={<Navigate to="/login" replace />} />

                      {/* Default Root */}
                      <Route path="/" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                      <Route path="/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />

                      {/* Products */}
                      <Route path="/products" element={<AdminProtectedRoute><AdminProducts /></AdminProtectedRoute>} />
                      <Route path="/products/new" element={<AdminProtectedRoute><ProductForm /></AdminProtectedRoute>} />
                      <Route path="/products/:id" element={<AdminProtectedRoute><ProductForm /></AdminProtectedRoute>} />
                      <Route path="/admin/products" element={<Navigate to="/products" replace />} />
                      <Route path="/admin/products/new" element={<Navigate to="/products/new" replace />} />
                      <Route path="/admin/products/:id" element={<AdminProtectedRoute><ProductForm /></AdminProtectedRoute>} />

                      {/* Catalog & Taxonomy */}
                      <Route path="/categories" element={<AdminProtectedRoute><AdminCategories /></AdminProtectedRoute>} />
                      <Route path="/admin/categories" element={<Navigate to="/categories" replace />} />
                      <Route path="/brands" element={<AdminProtectedRoute><AdminBrands /></AdminProtectedRoute>} />
                      <Route path="/admin/brands" element={<Navigate to="/brands" replace />} />

                      {/* Orders & Returns */}
                      <Route path="/orders" element={<AdminProtectedRoute><AdminOrders /></AdminProtectedRoute>} />
                      <Route path="/admin/orders" element={<Navigate to="/orders" replace />} />
                      <Route path="/returns" element={<AdminProtectedRoute><AdminReturns /></AdminProtectedRoute>} />
                      <Route path="/admin/returns" element={<Navigate to="/returns" replace />} />

                      {/* Inventory & Logistics */}
                      <Route path="/inventory" element={<AdminProtectedRoute><AdminInventory /></AdminProtectedRoute>} />
                      <Route path="/admin/inventory" element={<Navigate to="/inventory" replace />} />
                      <Route path="/consignments" element={<AdminProtectedRoute><AdminConsignments /></AdminProtectedRoute>} />
                      <Route path="/admin/consignments" element={<Navigate to="/consignments" replace />} />
                      <Route path="/warehouses" element={<AdminProtectedRoute><AdminWarehouses /></AdminProtectedRoute>} />
                      <Route path="/admin/warehouses" element={<Navigate to="/warehouses" replace />} />
                      <Route path="/shipping" element={<AdminProtectedRoute><AdminShipping /></AdminProtectedRoute>} />
                      <Route path="/admin/shipping" element={<Navigate to="/shipping" replace />} />
                      <Route path="/free-delivery" element={<AdminProtectedRoute><AdminFreeDelivery /></AdminProtectedRoute>} />
                      <Route path="/admin/free-delivery" element={<Navigate to="/free-delivery" replace />} />

                      {/* Finance, Payments & Wallets */}
                      <Route path="/payments" element={<AdminProtectedRoute><AdminPayments /></AdminProtectedRoute>} />
                      <Route path="/admin/payments" element={<Navigate to="/payments" replace />} />
                      <Route path="/finance" element={<AdminProtectedRoute><AdminFinance /></AdminProtectedRoute>} />
                      <Route path="/admin/finance" element={<Navigate to="/finance" replace />} />
                      <Route path="/wallet" element={<AdminProtectedRoute><AdminWallet /></AdminProtectedRoute>} />
                      <Route path="/admin/wallet" element={<Navigate to="/wallet" replace />} />
                      <Route path="/commissions" element={<AdminProtectedRoute><AdminCommissions /></AdminProtectedRoute>} />
                      <Route path="/admin/commissions" element={<Navigate to="/commissions" replace />} />

                      {/* Users, Customers, Sellers, Staff */}
                      <Route path="/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
                      <Route path="/customers" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
                      <Route path="/admin/users" element={<Navigate to="/users" replace />} />
                      <Route path="/admin/customers" element={<Navigate to="/users" replace />} />
                      <Route path="/sellers" element={<AdminProtectedRoute><AdminSellers /></AdminProtectedRoute>} />
                      <Route path="/admin/sellers" element={<Navigate to="/sellers" replace />} />
                      <Route path="/staff" element={<AdminProtectedRoute><AdminStaff /></AdminProtectedRoute>} />
                      <Route path="/admin/staff" element={<Navigate to="/staff" replace />} />
                      <Route path="/seller-support" element={<AdminProtectedRoute><AdminSellerSupport /></AdminProtectedRoute>} />
                      <Route path="/admin/seller-support" element={<Navigate to="/seller-support" replace />} />

                      {/* Marketing & Promotion */}
                      <Route path="/marketing" element={<AdminProtectedRoute><AdminMarketing /></AdminProtectedRoute>} />
                      <Route path="/admin/marketing" element={<Navigate to="/marketing" replace />} />
                      <Route path="/coupons" element={<AdminProtectedRoute><AdminCoupons /></AdminProtectedRoute>} />
                      <Route path="/admin/coupons" element={<Navigate to="/coupons" replace />} />
                      <Route path="/loyalty" element={<AdminProtectedRoute><AdminLoyalty /></AdminProtectedRoute>} />
                      <Route path="/admin/loyalty" element={<Navigate to="/loyalty" replace />} />
                      <Route path="/home-promos" element={<AdminProtectedRoute><AdminHomePromos /></AdminProtectedRoute>} />
                      <Route path="/admin/home-promos" element={<Navigate to="/home-promos" replace />} />
                      <Route path="/home-bento" element={<AdminProtectedRoute><AdminHomeBento /></AdminProtectedRoute>} />
                      <Route path="/admin/home-bento" element={<Navigate to="/home-bento" replace />} />
                      <Route path="/push-notifications" element={<AdminProtectedRoute><AdminPushNotifications /></AdminProtectedRoute>} />
                      <Route path="/admin/push-notifications" element={<Navigate to="/push-notifications" replace />} />

                      {/* Content, Reviews & Visual Editor */}
                      <Route path="/cms" element={<AdminProtectedRoute><AdminCMS /></AdminProtectedRoute>} />
                      <Route path="/admin/cms" element={<Navigate to="/cms" replace />} />
                      <Route path="/reviews" element={<AdminProtectedRoute><AdminReviews /></AdminProtectedRoute>} />
                      <Route path="/admin/reviews" element={<Navigate to="/reviews" replace />} />
                      <Route path="/visual-editor" element={<AdminProtectedRoute><AdminVisualEditor /></AdminProtectedRoute>} />
                      <Route path="/admin/visual-editor" element={<Navigate to="/visual-editor" replace />} />

                      {/* Suppliers & Integrations */}
                      <Route path="/cj-settings" element={<AdminProtectedRoute><AdminCJSettings /></AdminProtectedRoute>} />
                      <Route path="/admin/cj-settings" element={<Navigate to="/cj-settings" replace />} />
                      <Route path="/supplier-integrations" element={<AdminProtectedRoute><AdminSupplierIntegrations /></AdminProtectedRoute>} />
                      <Route path="/suppliers" element={<AdminProtectedRoute><AdminSupplierIntegrations /></AdminProtectedRoute>} />
                      <Route path="/admin/supplier-integrations" element={<Navigate to="/supplier-integrations" replace />} />
                      <Route path="/admin/suppliers" element={<Navigate to="/supplier-integrations" replace />} />

                      {/* Analytics, Search & Security */}
                      <Route path="/reports" element={<AdminProtectedRoute><AdminReports /></AdminProtectedRoute>} />
                      <Route path="/analytics" element={<AdminProtectedRoute><AdminReports /></AdminProtectedRoute>} />
                      <Route path="/admin/reports" element={<Navigate to="/reports" replace />} />
                      <Route path="/admin/analytics" element={<Navigate to="/reports" replace />} />
                      <Route path="/search-management" element={<AdminProtectedRoute><AdminSearchManagement /></AdminProtectedRoute>} />
                      <Route path="/admin/search-management" element={<Navigate to="/search-management" replace />} />
                      <Route path="/security" element={<AdminProtectedRoute><AdminSecurity /></AdminProtectedRoute>} />
                      <Route path="/activity-logs" element={<AdminProtectedRoute><AdminSecurity /></AdminProtectedRoute>} />
                      <Route path="/admin/security" element={<Navigate to="/security" replace />} />
                      <Route path="/admin/activity-logs" element={<Navigate to="/security" replace />} />
                      <Route path="/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
                      <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />

                      {/* Enterprise Modules */}
                      <Route path="/enterprise/supplier-center" element={<AdminProtectedRoute><EnterpriseSupplierCenter /></AdminProtectedRoute>} />
                      <Route path="/enterprise/cms" element={<AdminProtectedRoute><EnterpriseCMSBuilder /></AdminProtectedRoute>} />
                      <Route path="/enterprise/ai-studio" element={<AdminProtectedRoute><EnterpriseAIStudio /></AdminProtectedRoute>} />
                      <Route path="/enterprise/campaigns" element={<AdminProtectedRoute><EnterpriseCampaigns /></AdminProtectedRoute>} />
                      <Route path="/enterprise/shipping" element={<AdminProtectedRoute><EnterpriseShipping /></AdminProtectedRoute>} />
                      <Route path="/enterprise/inventory" element={<AdminProtectedRoute><EnterpriseInventory /></AdminProtectedRoute>} />
                      <Route path="/enterprise/security" element={<AdminProtectedRoute><EnterpriseSecurity /></AdminProtectedRoute>} />
                      <Route path="/enterprise/users" element={<AdminProtectedRoute><EnterpriseUserControl /></AdminProtectedRoute>} />
                      <Route path="/enterprise/website" element={<AdminProtectedRoute><EnterpriseWebsiteControl /></AdminProtectedRoute>} />
                      <Route path="/enterprise/theme" element={<AdminProtectedRoute><EnterpriseThemeBuilder /></AdminProtectedRoute>} />

                      {/* Fallback */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </StaffProvider>
              </AdminAuthProvider>
            </ThemeProvider>
          </NativeAppProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
