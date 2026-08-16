import { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/utils/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { StaffProvider } from "@/contexts/StaffContext";
import { StaffProtectedRoute } from "@/components/staff/StaffProtectedRoute";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminGate, AdminSecretUnlock, ADMIN_SECRET_ROUTE } from "@/components/admin/AdminGate";
import { FacebookPixel } from "@/components/FacebookPixel";
import { AppLayout } from "@/components/layout/AppLayout";
import { NativeAppProvider } from "@/components/NativeAppProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";


// Eager load - critical pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Lazy load - less critical pages
const NotFound = lazy(() => import("./pages/NotFound"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const CJProductDetail = lazy(() => import("./pages/CJProductDetail"));
const CJProducts = lazy(() => import("./pages/CJProducts"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const Categories = lazy(() => import("./pages/Categories"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Account = lazy(() => import("./pages/Account"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Wallet = lazy(() => import("./pages/Wallet"));
const MyVouchers = lazy(() => import("./pages/MyVouchers"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const SearchPage = lazy(() => import("./pages/Search"));


// Info Pages - lazy load
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Returns = lazy(() => import("./pages/Returns"));
const Shipping = lazy(() => import("./pages/Shipping"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const Careers = lazy(() => import("./pages/Careers"));
const Press = lazy(() => import("./pages/Press"));
const Affiliate = lazy(() => import("./pages/Affiliate"));
const Seller = lazy(() => import("./pages/Seller"));
const SellerRegister = lazy(() => import("./pages/seller/SellerRegister"));
const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const SellerPending = lazy(() => import("./pages/seller/SellerPending"));
const SellerProducts = lazy(() => import("./pages/seller/SellerProducts"));
const SellerProductForm = lazy(() => import("./pages/seller/SellerProductForm"));
const SellerConsignments = lazy(() => import("./pages/seller/SellerConsignments"));
const SellerNewConsignment = lazy(() => import("./pages/seller/SellerNewConsignment"));
const SellerOrders = lazy(() => import("./pages/seller/SellerOrders"));
const SellerEarnings = lazy(() => import("./pages/seller/SellerEarnings"));
const SellerAnalytics = lazy(() => import("./pages/seller/SellerAnalytics"));
const SellerSettings = lazy(() => import("./pages/seller/SellerSettings"));
const SellerMessages = lazy(() => import("./pages/seller/SellerMessages"));
const SellerSupport = lazy(() => import("./pages/seller/SellerSupport"));
const BuyerMessages = lazy(() => import("./pages/Messages"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const IntellectualProperty = lazy(() => import("./pages/IntellectualProperty"));

// Eager load - critical Admin pages (prevents dynamic chunk fetch errors)
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import ProductForm from "./pages/admin/ProductForm";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminOrders from "./pages/admin/AdminOrders";

// Admin Pages - lazy load for extended modules
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

// Staff Portal
const StaffLogin = lazy(() => import("./pages/staff/StaffLogin"));
const StaffActivate = lazy(() => import("./pages/staff/StaffActivate"));
const StaffIndex = lazy(() => import("./pages/staff/StaffIndex"));
const StaffTasks = lazy(() => import("./pages/staff/StaffTasks"));
const StaffMessages = lazy(() => import("./pages/staff/StaffMessages"));
const StaffProfile = lazy(() => import("./pages/staff/StaffProfile"));
const StaffNotifications = lazy(() => import("./pages/staff/StaffNotifications"));
const StaffProducts = lazy(() => import("./pages/staff/StaffProducts"));
const StaffSellers = lazy(() => import("./pages/staff/StaffSellers"));

// Minimal loading fallback - instant display
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
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
            <AuthProvider>
              <ThemeProvider>
              <AdminAuthProvider>
                <StaffProvider>
                <CartProvider>
                  <WishlistProvider>
                    <AppLayout>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          {/* Public Routes - Eager loaded */}
                          <Route path="/" element={<Index />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/register" element={<Register />} />
                          
                          {/* Public Routes - Lazy loaded */}
                          <Route path="/forgot-password" element={<ForgotPassword />} />
                          <Route path="/reset-password" element={<ResetPassword />} />
                          <Route path="/products" element={<Products />} />
                          <Route path="/flash-sale" element={<Products />} />
                          <Route path="/new-arrivals" element={<Products />} />
                          <Route path="/free-shipping" element={<Products />} />
                          <Route path="/search" element={<SearchPage />} />

                          <Route path="/product/:slug" element={<ProductDetail />} />
                          <Route path="/product/cj/:id" element={<CJProductDetail />} />
                          <Route path="/products/cj" element={<CJProducts />} />
                          <Route path="/category/:slug" element={<CategoryPage />} />
                          <Route path="/categories" element={<Categories />} />
                          <Route path="/cart" element={<Cart />} />
                          <Route path="/checkout" element={<Checkout />} />
                          <Route path="/payment/callback" element={<PaymentCallback />} />
                          <Route path="/account" element={<Account />} />
                          <Route path="/profile" element={<Account />} />
                          <Route path="/orders" element={<Orders />} />
                          <Route path="/orders/:id" element={<OrderDetail />} />
                          <Route path="/wishlist" element={<Wishlist />} />
                          <Route path="/wallet" element={<Wallet />} />
                          <Route path="/vouchers" element={<MyVouchers />} />
                          <Route path="/notifications" element={<Notifications />} />
                          
                          {/* Info Pages */}
                          <Route path="/help" element={<HelpCenter />} />
                          <Route path="/returns" element={<Returns />} />
                          <Route path="/shipping" element={<Shipping />} />
                          <Route path="/track" element={<TrackOrder />} />
                          <Route path="/contact" element={<Contact />} />
                          <Route path="/about" element={<About />} />
                          <Route path="/careers" element={<Careers />} />
                          <Route path="/press" element={<Press />} />
                          <Route path="/affiliate" element={<Affiliate />} />
                          <Route path="/seller" element={<Seller />} />
                          <Route path="/seller/:id" element={<Seller />} />
                          <Route path="/seller/register" element={<SellerRegister />} />
                          <Route path="/seller/dashboard" element={<SellerDashboard />} />
                          <Route path="/seller/pending" element={<SellerPending />} />
                          <Route path="/seller/products" element={<SellerProducts />} />
                          <Route path="/seller/products/new" element={<SellerProductForm />} />
                          <Route path="/seller/products/:id" element={<SellerProductForm />} />
                          <Route path="/seller/consignments" element={<SellerConsignments />} />
                          <Route path="/seller/consignments/new" element={<SellerNewConsignment />} />
                          <Route path="/seller/orders" element={<SellerOrders />} />
                          <Route path="/seller/orders/:id" element={<SellerOrders />} />
                          <Route path="/seller/earnings" element={<SellerEarnings />} />
                          <Route path="/seller/analytics" element={<SellerAnalytics />} />
                          <Route path="/seller/settings" element={<SellerSettings />} />
                          <Route path="/seller/messages" element={<SellerMessages />} />
                          <Route path="/seller/support" element={<SellerSupport />} />
                          <Route path="/messages" element={<BuyerMessages />} />
                          <Route path="/messages/:conversationId" element={<BuyerMessages />} />
                          <Route path="/privacy" element={<Privacy />} />
                          <Route path="/terms" element={<Terms />} />
                          <Route path="/cookies" element={<Cookies />} />
                          <Route path="/ip" element={<IntellectualProperty />} />
                          
                          {/* Redirect common paths */}
                          <Route path="/deals" element={<Products />} />
                          <Route path="/new-arrivals" element={<Products />} />
                          <Route path="/flash-sale" element={<Products />} />
                          <Route path="/free-shipping" element={<Products />} />
                          
                          {/* Secret admin unlock URL — visiting this sets a session flag; all /admin/* routes 404 otherwise */}
                          <Route path={ADMIN_SECRET_ROUTE} element={<AdminSecretUnlock />} />

                          {/* Admin Login (gated) */}
                          <Route path="/admin/login" element={<AdminGate><AdminLogin /></AdminGate>} />
                          
                          
                          {/* Protected Admin Routes */}
                          <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                          <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                          <Route path="/admin/products" element={<AdminProtectedRoute><AdminProducts /></AdminProtectedRoute>} />
                          <Route path="/admin/products/new" element={<AdminProtectedRoute><ProductForm /></AdminProtectedRoute>} />
                          <Route path="/admin/products/:id" element={<AdminProtectedRoute><ProductForm /></AdminProtectedRoute>} />
                          <Route path="/admin/categories" element={<AdminProtectedRoute><AdminCategories /></AdminProtectedRoute>} />
                          <Route path="/admin/brands" element={<AdminProtectedRoute><AdminBrands /></AdminProtectedRoute>} />
                          <Route path="/admin/orders" element={<AdminProtectedRoute><AdminOrders /></AdminProtectedRoute>} />
                          <Route path="/admin/payments" element={<AdminProtectedRoute><AdminPayments /></AdminProtectedRoute>} />
                          <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
                          <Route path="/admin/customers" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
                          <Route path="/admin/coupons" element={<AdminProtectedRoute><AdminCoupons /></AdminProtectedRoute>} />
                          <Route path="/admin/reviews" element={<AdminProtectedRoute><AdminReviews /></AdminProtectedRoute>} />
                          <Route path="/admin/cj-settings" element={<AdminProtectedRoute><AdminCJSettings /></AdminProtectedRoute>} />
                          <Route path="/admin/supplier-integrations" element={<AdminProtectedRoute><AdminSupplierIntegrations /></AdminProtectedRoute>} />
                          <Route path="/admin/suppliers" element={<AdminProtectedRoute><AdminSupplierIntegrations /></AdminProtectedRoute>} />
                          <Route path="/admin/sellers" element={<AdminProtectedRoute><AdminSellers /></AdminProtectedRoute>} />
                          <Route path="/admin/shipping" element={<AdminProtectedRoute><AdminShipping /></AdminProtectedRoute>} />
                          <Route path="/admin/commissions" element={<AdminProtectedRoute><AdminCommissions /></AdminProtectedRoute>} />
                          <Route path="/admin/inventory" element={<AdminProtectedRoute><AdminInventory /></AdminProtectedRoute>} />
                          <Route path="/admin/marketing" element={<AdminProtectedRoute><AdminMarketing /></AdminProtectedRoute>} />
                          <Route path="/admin/loyalty" element={<AdminProtectedRoute><AdminLoyalty /></AdminProtectedRoute>} />
                          <Route path="/admin/free-delivery" element={<AdminProtectedRoute><AdminFreeDelivery /></AdminProtectedRoute>} />
                          <Route path="/admin/reports" element={<AdminProtectedRoute><AdminReports /></AdminProtectedRoute>} />
                          <Route path="/admin/analytics" element={<AdminProtectedRoute><AdminReports /></AdminProtectedRoute>} />
                          <Route path="/admin/security" element={<AdminProtectedRoute><AdminSecurity /></AdminProtectedRoute>} />
                          <Route path="/admin/activity-logs" element={<AdminProtectedRoute><AdminSecurity /></AdminProtectedRoute>} />
                          <Route path="/admin/cms" element={<AdminProtectedRoute><AdminCMS /></AdminProtectedRoute>} />
                          <Route path="/admin/consignments" element={<AdminProtectedRoute><AdminConsignments /></AdminProtectedRoute>} />
                          <Route path="/admin/warehouses" element={<AdminProtectedRoute><AdminWarehouses /></AdminProtectedRoute>} />
                          <Route path="/admin/home-bento" element={<AdminProtectedRoute><AdminHomeBento /></AdminProtectedRoute>} />
                          <Route path="/admin/home-promos" element={<AdminProtectedRoute><AdminHomePromos /></AdminProtectedRoute>} />
                          <Route path="/admin/push-notifications" element={<AdminProtectedRoute><AdminPushNotifications /></AdminProtectedRoute>} />
                          <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
                          <Route path="/admin/staff" element={<AdminProtectedRoute><AdminStaff /></AdminProtectedRoute>} />
                          <Route path="/admin/seller-support" element={<AdminProtectedRoute><AdminSellerSupport /></AdminProtectedRoute>} />
                          <Route path="/admin/returns" element={<AdminProtectedRoute><AdminReturns /></AdminProtectedRoute>} />
                          <Route path="/admin/wallet" element={<AdminProtectedRoute><AdminWallet /></AdminProtectedRoute>} />
                          <Route path="/admin/finance" element={<AdminProtectedRoute><AdminFinance /></AdminProtectedRoute>} />
                          <Route path="/admin/visual-editor" element={<AdminProtectedRoute><AdminVisualEditor /></AdminProtectedRoute>} />

                          {/* Staff Portal */}
                          <Route path="/staff/login" element={<StaffLogin />} />
                          <Route path="/staff/activate" element={<StaffActivate />} />
                          <Route path="/staff" element={<StaffProtectedRoute><StaffIndex /></StaffProtectedRoute>} />
                          <Route path="/staff/dashboard" element={<StaffProtectedRoute><StaffIndex /></StaffProtectedRoute>} />
                          <Route path="/staff/tasks" element={<StaffProtectedRoute><StaffTasks /></StaffProtectedRoute>} />
                          <Route path="/staff/messages" element={<StaffProtectedRoute><StaffMessages /></StaffProtectedRoute>} />
                          <Route path="/staff/profile" element={<StaffProtectedRoute><StaffProfile /></StaffProtectedRoute>} />
                          <Route path="/staff/notifications" element={<StaffProtectedRoute><StaffNotifications /></StaffProtectedRoute>} />
                          <Route path="/staff/products" element={<StaffProtectedRoute><StaffProducts /></StaffProtectedRoute>} />
                          <Route path="/staff/sellers" element={<StaffProtectedRoute><StaffSellers /></StaffProtectedRoute>} />
                          
                          {/* Catch-all */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </AppLayout>
                  </WishlistProvider>
                </CartProvider>
                </StaffProvider>
              </AdminAuthProvider>
              </ThemeProvider>
            </AuthProvider>
          </NativeAppProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
