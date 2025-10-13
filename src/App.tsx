import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { SearchProvider } from "@/contexts/SearchContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import UploadManager from "@/components/UploadManager";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { lazy, Suspense } from "react";

// Páginas principais (carregamento imediato)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loading para páginas secundárias
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Events = lazy(() => import("./pages/Events"));
const Contato = lazy(() => import("./pages/Contato"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Fotografos = lazy(() => import("./pages/Fotografos"));
const Campaign = lazy(() => import("./pages/Campaign"));
const EventosProximos = lazy(() => import("./pages/EventosProximos"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Sobre = lazy(() => import("./pages/Sobre"));
const PaymentTest = lazy(() => import("./pages/PaymentTest"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutProcessing = lazy(() => import("./pages/CheckoutProcessing"));
const CheckoutFailure = lazy(() => import("./pages/CheckoutFailure"));

// Dashboard routes (lazy)
const Overview = lazy(() => import("./pages/dashboard/Overview"));
const MyEvents = lazy(() => import("./pages/dashboard/MyEvents"));
const MyPhotos = lazy(() => import("./pages/dashboard/MyPhotos"));
const MyPurchases = lazy(() => import("./pages/dashboard/MyPurchases"));
const Financial = lazy(() => import("./pages/dashboard/Financial"));
const Profile = lazy(() => import("./pages/dashboard/Profile"));
const PhotographerApplication = lazy(() => import("./pages/dashboard/PhotographerApplication"));

// Admin routes (lazy)
const AdminOverview = lazy(() => import("./pages/dashboard/admin/Overview"));
const AdminEvents = lazy(() => import("./pages/dashboard/admin/Events"));
const AdminPhotographers = lazy(() => import("./pages/dashboard/admin/Photographers"));
const AdminUsers = lazy(() => import("./pages/dashboard/admin/Users"));
const AdminOrganizations = lazy(() => import("./pages/dashboard/admin/Organizations"));
const AdminFinancial = lazy(() => import("./pages/dashboard/admin/Financial"));
const AdminReports = lazy(() => import("./pages/dashboard/admin/Reports"));

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

  return (
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<Overview />} />
            <Route path="events" element={<MyEvents />} />
            <Route path="photos" element={<MyPhotos />} />
            <Route path="purchases" element={<MyPurchases />} />
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
          </Route>
          <Route path="/events" element={<Events />} />
          <Route path="/eventos-proximos" element={<EventosProximos />} />
          <Route path="/campaign/:id" element={<Campaign />} />
          <Route path="/contato" element={<Contato />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/fotografos" element={<Fotografos />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/payment-test" element={<PaymentTest />} />
          <Route path="/checkout/processando" element={<CheckoutProcessing />} />
          <Route path="/checkout/sucesso" element={<CheckoutSuccess />} />
          <Route path="/checkout/falha" element={<CheckoutFailure />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
};

const App = () => (
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
                
                {/* PWA Install Prompt */}
                <PWAInstallPrompt />
              </CartProvider>
            </SearchProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
