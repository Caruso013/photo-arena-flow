import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
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
import NotFound from "./pages/NotFound";

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
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/eventos-proximos" element={<EventosProximos />} />
        <Route path="/campaign/:id" element={<Campaign />} />
        <Route path="/contato" element={<Contato />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/fotografos" element={<Fotografos />} />
        <Route path="/faq" element={<FAQ />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <AppContent />
            
            {/* Upload Manager - sempre visível quando há uploads */}
            <UploadManager />
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
