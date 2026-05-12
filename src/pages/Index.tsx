import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { CTASection } from "@/components/landing/CTASection";
import ScrollReveal from "@/components/ui/ScrollReveal";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        
        {/* Scroll Reveal Section */}
        <section className="relative overflow-hidden">
          <div className="container mx-auto px-4">
            <ScrollReveal
              baseOpacity={0.2}
              enableBlur={true}
              baseRotation={5}
              blurStrength={10}
              containerClassName=""
              textClassName="text-white"
              rotationEnd="center center"
              wordAnimationEnd="center center"
            >
              Influencer marketing sadece bir trend mi? Hayır! Markaların unutulmaması için doğru influencer'ları bulması mı gerekiyor? Evet! İNFUHUB ile AI destekli akıllı eşleştirme sayesinde markanız doğru kitleye ulaşır, influencer'lar gerçek değerlerini bulur. Unutulmamak için doğru eşleşmeyi seçin!
            </ScrollReveal>
          </div>
        </section>

        <StatsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
