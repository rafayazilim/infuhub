import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import RegistrationSelect from "./pages/RegistrationSelect";
import BrandRegister from "./pages/BrandRegister";
import InfluencerRegister from "./pages/InfluencerRegister";
import Login from "./pages/Login";
import BrandDashboard from "./pages/brand/BrandDashboard";
import BrandDashboardNew from "./pages/brand/BrandDashboardNew";
import InfluencerDashboard from "./pages/influencer/InfluencerDashboard";
import InfluencerDashboardNew from "./pages/influencer/InfluencerDashboardNew";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="infuhub-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/giris" element={<Login />} />
              <Route path="/kayit-sec" element={<RegistrationSelect />} />
              <Route path="/kayit/marka" element={<BrandRegister />} />
              <Route path="/kayit/influencer" element={<InfluencerRegister />} />
              {/* Protected routes - Old Dashboard */}
              <Route path="/marka/dashboard-old" element={<BrandDashboard />} />
              {/* Protected routes - New Dashboard */}
              <Route path="/marka/dashboard" element={<BrandDashboardNew />} />
              <Route path="/influencer/dashboard-old" element={<InfluencerDashboard />} />
              <Route path="/influencer/dashboard" element={<InfluencerDashboardNew />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
