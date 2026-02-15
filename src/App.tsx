import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { SearchProvider } from "@/contexts/SearchContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import UploadManager from "@/components/UploadManager";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useWebVitals } from "@/hooks/useWebVitals";
import { lazy, Suspense } from "react";
import MaintenanceMode from "@/components/MaintenanceMode";

// 🔧 MODO MANUTENÇÃO - Altere para true para ativar
const MAINTENANCE_MODE = false;

// Páginas principais (carregamento imediato)
import Home from "./pages/Home";
import Events from "./pages/Events";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Organization auth
const OrganizationAuth = lazy(() => import("./pages/OrganizationAuth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Lazy loading para páginas secundárias
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PhotoHighlights = lazy(() => import("./pages/PhotoHighlights"));
const Cart = lazy(() => import("./pages/Cart"));
const Contato = lazy(() => import("./pages/Contato"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Fotografos = lazy(() => import("./pages/Fotografos"));
const Servicos = lazy(() => import("./pages/Servicos"));
const Campaign = lazy(() => import("./pages/Campaign"));

const FAQ = lazy(() => import("./pages/FAQ"));
const Sobre = lazy(() => import("./pages/Sobre"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const PaymentTest = lazy(() => import("./pages/PaymentTest"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutProcessing = lazy(() => import("./pages/CheckoutProcessing"));
const CheckoutFailure = lazy(() => import("./pages/CheckoutFailure"));

// Dashboard routes (lazy)
const Overview = lazy(() => import("./pages/dashboard/Overview"));
const MyEvents = lazy(() => import("./pages/dashboard/MyEvents"));
const MyPhotos = lazy(() => import("./pages/dashboard/MyPhotos"));
const MyPurchases = lazy(() => import("./pages/dashboard/MyPurchases"));
const MyFavorites = lazy(() => import("./pages/dashboard/MyFavorites"));
const FaceBackupManager = lazy(() => import("./pages/dashboard/FaceBackupManager"));
const Financial = lazy(() => import("./pages/dashboard/Financial"));
const Profile = lazy(() => import("./pages/dashboard/Profile"));
const PhotographerApplication = lazy(() => import("./pages/dashboard/PhotographerApplication"));

// Photographer routes (lazy)
const PhotographerEvents = lazy(() => import("./pages/dashboard/photographer/PhotographerEvents"));
const ManageEvent = lazy(() => import("./pages/dashboard/photographer/ManageEvent"));
const PhotographerEarnings = lazy(() => import("./pages/dashboard/photographer/PhotographerEarnings"));
const AlbumReports = lazy(() => import("./pages/dashboard/photographer/AlbumReports"));
const PhotographerSettings = lazy(() => import("./pages/dashboard/photographer/PhotographerSettings"));
const Goals = lazy(() => import("./pages/dashboard/photographer/Goals"));
const PayoutRequest = lazy(() => import("./pages/dashboard/photographer/PayoutRequest"));
const FeaturedPhotos = lazy(() => import("./pages/dashboard/photographer/FeaturedPhotos"));
const PixSettings = lazy(() => import("./pages/dashboard/photographer/PixSettings"));
const MyQRCode = lazy(() => import("./pages/dashboard/photographer/MyQRCode"));
const EventApplications = lazy(() => import("./pages/dashboard/photographer/EventApplications"));
const EventApplicationDetail = lazy(() => import("./pages/dashboard/photographer/EventApplicationDetail"));

// Admin routes (lazy)
const AdminOverview = lazy(() => import("./pages/dashboard/admin/Overview"));
const AdminEvents = lazy(() => import("./pages/dashboard/admin/Events"));
const AdminPhotographers = lazy(() => import("./pages/dashboard/admin/Photographers"));
const AdminUsers = lazy(() => import("./pages/dashboard/admin/Users"));
const AdminOrganizations = lazy(() => import("./pages/dashboard/admin/Organizations"));
const AdminFinancial = lazy(() => import("./pages/dashboard/admin/Financial"));
const AdminReports = lazy(() => import("./pages/dashboard/admin/Reports"));
const AdminConfigHub = lazy(() => import("./pages/dashboard/admin/ConfigHub"));
const AdminPlatformConfig = lazy(() => import("./pages/dashboard/admin/PlatformConfig"));
const AdminNotificationSettings = lazy(() => import("./pages/dashboard/admin/NotificationSettings"));
const AdminPermissionsManager = lazy(() => import("./pages/dashboard/admin/PermissionsManager"));
const AdminProgressiveDiscountManager = lazy(() => import("./pages/dashboard/admin/ProgressiveDiscountManager"));
const AdminCouponManagement = lazy(() => import("./pages/dashboard/admin/CouponManagement"));
const CacheManagement = lazy(() => import("./pages/dashboard/admin/CacheManagement"));
const AdminFeaturedEvents = lazy(() => import("./pages/dashboard/admin/FeaturedEvents"));
const PhotographerBalances = lazy(() => import("./pages/dashboard/admin/PhotographerBalances"));
const EventAttendance = lazy(() => import("./pages/dashboard/admin/EventAttendance"));
const MesarioManager = lazy(() => import("./pages/dashboard/admin/MesarioManager"));

// Mesario pages (lazy)
const MesarioLogin = lazy(() => import("./pages/MesarioLogin"));
const MesarioScanner = lazy(() => import("./pages/MesarioScanner"));

// Organization routes
const OrganizationRevenue = lazy(() => import("./pages/dashboard/OrganizationRevenue"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Não tentar novamente em erros 404
        if (error && 'status' in error && error.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

// Componente interno para usar hooks
const AppContent = () => {
  const { isSupported } = useServiceWorker();
  
  // Rastrear Web Vitals (CLS, INP, FCP, LCP, TTFB)
  useWebVitals({
    reportToConsole: import.meta.env.DEV,
    reportToSentry: import.meta.env.PROD,
  });

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/organization" element={<OrganizationAuth />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<Overview />} />
            <Route path="events" element={<MyEvents />} />
            <Route path="photos" element={<MyPhotos />} />
            <Route path="purchases" element={<MyPurchases />} />
            <Route path="favorites" element={<MyFavorites />} />
            <Route path="face-backup" element={<FaceBackupManager />} />
            <Route path="financial" element={<Financial />} />
            <Route path="profile" element={<Profile />} />
            <Route path="photographer-application" element={<PhotographerApplication />} />
            <Route path="admin" element={<AdminOverview />} />
            <Route path="admin/events" element={<AdminEvents />} />
            <Route path="admin/photographers" element={<AdminPhotographers />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/organizations" element={<AdminOrganizations />} />
            <Route path="admin/financial" element={<AdminFinancial />} />
            <Route path="admin/reports" element={<AdminReports />} />
            <Route path="admin/config" element={<AdminConfigHub />} />
            <Route path="admin/config/platform" element={<AdminPlatformConfig />} />
            <Route path="admin/config/notifications" element={<AdminNotificationSettings />} />
            <Route path="admin/config/permissions" element={<AdminPermissionsManager />} />
            <Route path="admin/progressive-discounts" element={<AdminProgressiveDiscountManager />} />
            <Route path="admin/coupons" element={<AdminCouponManagement />} />
            <Route path="admin/cache-management" element={<CacheManagement />} />
            <Route path="admin/featured-events" element={<AdminFeaturedEvents />} />
            <Route path="admin/photographer-balances" element={<PhotographerBalances />} />
            <Route path="photographer/events" element={<PhotographerEvents />} />
            <Route path="photographer/manage-event/:id" element={<ManageEvent />} />
            <Route path="photographer/photos" element={<MyPhotos />} />
            <Route path="photographer/featured" element={<FeaturedPhotos />} />
            <Route path="photographer/payout" element={<PayoutRequest />} />
            <Route path="photographer/earnings" element={<PhotographerEarnings />} />
            <Route path="photographer/album-reports" element={<AlbumReports />} />
            <Route path="photographer/goals" element={<Goals />} />
            <Route path="photographer/settings" element={<PhotographerSettings />} />
            <Route path="photographer/pix" element={<PixSettings />} />
            <Route path="photographer/qrcode" element={<MyQRCode />} />
            <Route path="photographer/applications" element={<EventApplications />} />
            <Route path="photographer/apply/:id" element={<EventApplicationDetail />} />
            <Route path="organization/revenue" element={<OrganizationRevenue />} />
            <Route path="admin/events/:id/attendance" element={<EventAttendance />} />
            <Route path="admin/mesarios" element={<MesarioManager />} />
          </Route>
          <Route path="/highlights" element={<PhotoHighlights />} />
          <Route path="/cart" element={<Cart />} />
          
          <Route path="/evento/:id" element={<Campaign />} />
          <Route path="/campaign/:id" element={<Campaign />} />
          <Route path="/E/:code" element={<Campaign />} />
          <Route path="/contato" element={<Contato />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/fotografos" element={<Fotografos />} />
          <Route path="/servicos" element={<Servicos />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/tutorial" element={<Tutorial />} />
          <Route path="/payment-test" element={<PaymentTest />} />
          <Route path="/mesario" element={<MesarioLogin />} />
          <Route path="/mesario/scanner" element={<MesarioScanner />} />
          <Route path="/checkout/processando" element={<CheckoutProcessing />} />
          <Route path="/checkout/sucesso" element={<CheckoutSuccess />} />
          <Route path="/checkout/falha" element={<CheckoutFailure />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

const App = () => {
  // 🔧 Se modo manutenção estiver ativo, exibir página de manutenção
  if (MAINTENANCE_MODE) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <MaintenanceMode />
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <AuthProvider>
              <SearchProvider>
                <CartProvider>
                  <Toaster />
                  <Sonner />
                  <AppContent />
                  
                  {/* Upload Manager - sempre visível quando há uploads */}
                  <UploadManager />
                </CartProvider>
              </SearchProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
