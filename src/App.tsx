import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { UserRoleProvider } from "./components/UserRoleProvider";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import SettingsAdmin from "./pages/SettingsAdmin";
import { OrganizationsAdmin } from "./pages/OrganizationsAdmin";
import SuperAdminsAdmin from "./pages/SuperAdminsAdmin";
import { Signup } from "./pages/Signup";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import PostHogProvider from "./components/PostHogProvider";
import { CookiesProvider } from "react-cookie";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PostHogProvider>
      <CookiesProvider>  
        <TooltipProvider>
          <ThemeProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <UserRoleProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/dashboard" element={
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/settings" element={
                    <ProtectedRoute>
                      <SettingsAdmin />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/organizations" element={
                    <ProtectedRoute>
                      <OrganizationsAdmin />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/superadmins" element={
                    <ProtectedRoute>
                      <SuperAdminsAdmin />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </UserRoleProvider>
            </BrowserRouter>
          </ThemeProvider>
        </TooltipProvider>
      </CookiesProvider>
    </PostHogProvider>
  </QueryClientProvider>
);

export default App;
