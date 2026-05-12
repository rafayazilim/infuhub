import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";
import { ThemeProvider } from "@/components/theme-provider";
import { usePageTracking } from "@/hooks/usePageTracking";
import InfuhubMarketingSite from "./landing/InfuhubMarketingSite.jsx";
import RegistrationSelect from "./pages/RegistrationSelect";
import BrandRegister from "./pages/BrandRegister";
import InfluencerRegister from "./pages/InfluencerRegister";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import BrandDashboard from "./pages/brand/BrandDashboard";
import BrandDashboardNew from "./pages/brand/BrandDashboardNew";
import InfluencerDashboard from "./pages/influencer/InfluencerDashboard";
import InfluencerDashboardNew from "./pages/influencer/InfluencerDashboardNew";
import AdminPanel from "./pages/admin/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function MetaPixelRouteListener() {
  usePageTracking();
  return null;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="infuhub-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <MetaPixelRouteListener />
            <SeoHead />
            <Routes>
              <Route path="/" element={<InfuhubMarketingSite />} />
              <Route path="/influencerlar" element={<InfuhubMarketingSite />} />
              <Route path="/markalar-icin" element={<InfuhubMarketingSite />} />
              <Route path="/hakkimizda" element={<InfuhubMarketingSite />} />
              <Route path="/iletisim" element={<InfuhubMarketingSite />} />
              <Route path="/fiyatlandirma" element={<InfuhubMarketingSite />} />
              <Route path="/giris" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/sifremi-unuttum" element={<ForgotPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/email-dogrula" element={<VerifyEmail />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/kayit-sec" element={<RegistrationSelect />} />
              <Route path="/kayit/marka" element={<BrandRegister />} />
              <Route path="/kayit/influencer" element={<InfluencerRegister />} />
              {/* Protected routes - Old Dashboard */}
              <Route path="/marka/dashboard-old" element={<BrandDashboard />} />
              {/* Protected routes - New Dashboard */}
              <Route path="/marka/dashboard" element={<BrandDashboardNew />} />
              <Route path="/influencer/dashboard-old" element={<InfluencerDashboard />} />
              <Route path="/influencer/dashboard" element={<InfluencerDashboardNew />} />
              <Route path="/infuhubadminyonetim" element={<AdminPanel />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

