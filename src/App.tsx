import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Login from "@/pages/Login";
import DashboardHome from "@/pages/DashboardHome";
import Conversations from "@/pages/Conversations";
import Broadcasts from "@/pages/Broadcasts";
import PackingPage from "@/pages/PackingPage";
import NotFound from "@/pages/NotFound";
import Debug from "@/pages/Debug";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BusinessProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <DashboardHome />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <DashboardHome />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/conversations"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Conversations />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/broadcasts"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Broadcasts />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/packing"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <PackingPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/debug" element={<Debug />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </BusinessProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
