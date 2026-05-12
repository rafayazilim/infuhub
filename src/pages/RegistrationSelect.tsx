import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const optionCardClass = cn(
  "h-full p-5 rounded-xl border-2 transition-all duration-200",
  "border-border/90 bg-card shadow-sm",
  "hover:border-[#08afd5]/45 hover:shadow-md",
  "dark:border-slate-500/70 dark:bg-slate-950/90",
  "dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
  "dark:hover:border-[#6edff3]/55 dark:hover:bg-slate-900/95 dark:hover:shadow-[0_0_0_1px_rgba(110,223,243,0.2)]"
);

const ctaClass = cn(
  "mt-auto flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white",
  "brand-btn-primary shadow-sm",
  "ring-1 ring-[#08afd5]/30 ring-offset-2 ring-offset-background dark:ring-[#6edff3]/25 dark:ring-offset-slate-950"
);

const RegistrationSelect = () => {
  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-14">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ArrowLeft size={16} />
          Ana sayfa
        </Link>

        <Card
          className={cn(
            "p-6 md:p-8 rounded-2xl border-2 shadow-sm",
            "border-border/90 bg-card",
            "dark:border-slate-500/65 dark:bg-slate-900/95",
            "dark:shadow-lg dark:shadow-black/50",
            "dark:ring-1 dark:ring-white/[0.08]"
          )}
        >
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Kayıt Türü Seçin</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Hesabınızı nasıl oluşturmak istediğinizi seçin.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <Link to="/kayit/marka" className="block group">
              <Card className={cn(optionCardClass, "flex flex-col")}>
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                    "bg-muted text-foreground",
                    "dark:bg-slate-800/90 dark:text-[#6edff3]",
                    "dark:ring-1 dark:ring-slate-500/70"
                  )}
                >
                  <Building2 size={20} strokeWidth={1.75} />
                </div>
                <h2 className="font-semibold text-lg mb-1 text-foreground">Marka</h2>
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  Kampanya oluşturarak influencer&apos;lara teklif gönderin.
                </p>
                <span className={ctaClass}>Marka Kaydı</span>
              </Card>
            </Link>

            <Link to="/kayit/influencer" className="block group">
              <Card className={cn(optionCardClass, "flex flex-col")}>
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                    "bg-muted text-foreground",
                    "dark:bg-slate-800/90 dark:text-[#6edff3]",
                    "dark:ring-1 dark:ring-slate-500/70"
                  )}
                >
                  <User size={20} strokeWidth={1.75} />
                </div>
                <h2 className="font-semibold text-lg mb-1 text-foreground">Influencer</h2>
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  Profil oluşturup markalardan iş birliği teklifleri alın.
                </p>
                <span className={ctaClass}>Influencer Kaydı</span>
              </Card>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegistrationSelect;
