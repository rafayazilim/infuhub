import React from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Building2, LogOut } from "lucide-react";
import { GlowButton } from "@/components/ui/GlowButton";

const BrandDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Marka Dashboard</h1>
              <p className="text-muted-foreground">Hoş geldin, {user.name}</p>
            </div>
            <GlowButton variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Çıkış Yap
            </GlowButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Kampanya</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aktif Kampanya</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Eski Kampanyalar</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Kampanyalarım</h2>
            <p className="text-muted-foreground">Henüz kampanya oluşturmadınız.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BrandDashboard;

