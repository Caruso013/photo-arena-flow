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
import { useServiceWorker } from "@/hooks/useServiceWorker";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Contato from "./pages/Contato";
import AdminLogin from "./pages/AdminLogin";
import Fotografos from "./pages/Fotografos";
import Campaign from "./pages/Campaign";
import EventosProximos from "./pages/EventosProximos";
import FAQ from "./pages/FAQ";
import PaymentTest from "./pages/PaymentTest";
import NotFound from "./pages/NotFound";
import Overview from "./pages/dashboard/Overview";
import MyEvents from "./pages/dashboard/MyEvents";
import MyPhotos from "./pages/dashboard/MyPhotos";
import MyPurchases from "./pages/dashboard/MyPurchases";
import Financial from "./pages/dashboard/Financial";
import Profile from "./pages/dashboard/Profile";

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
        </Route>
        <Route path="/events" element={<Events />} />
        <Route path="/eventos-proximos" element={<EventosProximos />} />
        <Route path="/campaign/:id" element={<Campaign />} />
        <Route path="/contato" element={<Contato />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/fotografos" element={<Fotografos />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/payment-test" element={<PaymentTest />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
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
              </CartProvider>
            </SearchProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
