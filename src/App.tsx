import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, Component, ReactNode } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Install from "./pages/Install";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import Subscription from "./pages/Subscription";
import Onboarding from "./pages/Onboarding";
import { initializeTheme } from "./hooks/useTheme";
import { useAuth } from "./hooks/useAuth";
import { useAutoSync } from "./hooks/useAutoSync";
import { OfflineBanner } from "./components/OfflineBanner";
import { SubscriptionGate } from "./components/subscription/SubscriptionGate";
import { OnboardingGate } from "./components/onboarding/OnboardingGate";
import { queryClient, persister } from "./lib/queryClient";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Lazy load admin pages (hidden from regular users)
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

// Initialize theme on app load
initializeTheme();

// Error Boundary to catch render errors
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <RefreshCw className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Algo deu errado</h1>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            Ocorreu um erro inesperado. Por favor, recarregue a página.
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm">Autenticando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  // Ativa sincronização automática quando voltar online
  useAutoSync();

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      
      // Show user-friendly toast
      toast({
        title: "Erro de conexão",
        description: "Ocorreu um erro. Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
      
      // Prevent the default browser handling
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
    <>
      <OfflineBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/install" element={<Install />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <OnboardingGate>
                  <SubscriptionGate>
                    <Index />
                  </SubscriptionGate>
                </OnboardingGate>
              </ProtectedRoute>
            }
          />
          {/* Admin Routes - Hidden, separate slug */}
          <Route
            path="/admin-login"
            element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <AdminLogin />
              </Suspense>
            }
          />
          <Route
            path="/painel-admin"
            element={
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <AdminDashboard />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
      }}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </PersistQueryClientProvider>
  </ErrorBoundary>
);

export default App;
