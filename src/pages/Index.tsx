import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { LogoMarqueeSection } from "@/components/landing/LogoMarqueeSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { BrandsSection } from "@/components/landing/BrandsSection";
import { InfluencersSection } from "@/components/landing/InfluencersSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen text-gray-900 dark:text-white antialiased overflow-x-hidden bg-gradient-to-b from-[#f7fbff] via-[#fdf6fb] to-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(8,175,213,0.18),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(227,68,124,0.16),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(8,175,213,0.12),_transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(8,175,213,0.35)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>
      <Navbar />
      <HeroSection />
      <LogoMarqueeSection />
      <TrustSection />
      <ComparisonSection />
      <BrandsSection />
      <InfluencersSection />
      <HowItWorksSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
