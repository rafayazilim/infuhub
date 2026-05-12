import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GlassCardProps {
  hover?: boolean;
  glow?: "primary" | "secondary" | "accent" | "none";
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  className,
  hover = true,
  glow = "none",
  children,
}) => {
  const glowClasses = {
    primary: "hover:shadow-[0_0_30px_hsl(210_100%_55%/0.3)]",
    secondary: "hover:shadow-[0_0_30px_hsl(215_95%_50%/0.3)]",
    accent: "hover:shadow-[0_0_30px_hsl(200_95%_50%/0.3)]",
    none: "",
  };

  return (
    <motion.div
      className={cn(
        "glass-card rounded-2xl p-6 transition-all duration-300",
        hover && "hover:scale-[1.02] hover:border-primary/30",
        glowClasses[glow],
        className
      )}
      whileHover={hover ? { y: -5 } : undefined}
    >
      {children}
    </motion.div>
  );
};
