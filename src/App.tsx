import { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/utils/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { StaffProvider } from "@/contexts/StaffContext";
import { StaffProtectedRoute } from "@/components/staff/StaffProtectedRoute";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
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
                <StaffProvider>
                <CartProvider>
                  <WishlistProvider>
                    <FacebookPixel />
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
                          <Route path="/products/:slug" element={<ProductDetail />} />
                          <Route path="/p/:slug" element={<ProductDetail />} />
                          <Route path="/item/:slug" element={<ProductDetail />} />
                          <Route path="/product/cj/:id" element={<CJProductDetail />} />
                          <Route path="/cj-product/:id" element={<CJProductDetail />} />
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
                          
                          {/* Admin routes are disabled on the storefront and return 404 (Admin hosted separately) */}
                          <Route path="/admin" element={<NotFound />} />
                          <Route path="/admin/*" element={<NotFound />} />

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
              </ThemeProvider>
            </AuthProvider>
          </NativeAppProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
