import { cn } from "@/lib/utils";

const chipSelected = cn(
  "bg-[#08afd5] text-white border-[#08afd5] shadow-sm",
  "dark:shadow-[0_0_12px_rgba(8,175,213,0.35)]"
);

const chipUnselected = cn(
  "border-border/90 bg-background text-foreground hover:border-[#08afd5]/50",
  "dark:border-slate-500/70 dark:bg-slate-950/90 dark:hover:border-[#6edff3]/55 dark:hover:bg-slate-900/85"
);

/** Marka / influencer kayıt kartı kabuğu */
export const registerCardShell = cn(
  "p-6 md:p-7 rounded-2xl border-2 shadow-sm",
  "border-border/90 bg-card",
  "dark:border-slate-500/65 dark:bg-slate-900/95",
  "dark:shadow-lg dark:shadow-black/40 dark:ring-1 dark:ring-white/[0.08]"
);

/** Sektör / takipçi / kategori pill */
export function registerSelectChip(
  selected: boolean,
  opts: { variant?: "default" | "platform"; rounded?: "md" | "full"; className?: string } = {}
) {
  const { variant = "default", rounded = "md", className } = opts;
  const sel = selected ? chipSelected : chipUnselected;

  if (variant === "platform") {
    return cn(
      "w-full border-2 font-medium transition-colors flex items-center gap-3 rounded-md px-4 py-3 text-sm",
      sel,
      className
    );
  }

  if (rounded === "full") {
    return cn("border-2 font-medium transition-colors rounded-full px-3 py-1.5 text-xs", sel, className);
  }

  return cn("border-2 font-medium transition-colors rounded-md px-3 py-2 text-sm", sel, className);
}

export const registerSubmitClass = cn(
  "w-full h-11 font-semibold brand-btn-primary text-white",
  "shadow-md ring-1 ring-[#08afd5]/25 ring-offset-2 ring-offset-background",
  "dark:ring-[#6edff3]/20 dark:ring-offset-slate-950"
);

export const registerSuccessBanner = cn(
  "mb-5 rounded-lg border-2 px-4 py-3 text-sm",
  "border-emerald-200 bg-emerald-50 text-emerald-800",
  "dark:border-emerald-500/45 dark:bg-emerald-950/55 dark:text-emerald-200"
);

export const registerNestedPanel = cn(
  "p-3 rounded-xl border-2 space-y-3",
  "border-border/90 bg-muted/25",
  "dark:border-slate-500/60 dark:bg-slate-950/55"
);

export const registerInlineInput = cn(
  "flex-1 min-w-0 px-3 py-2 rounded-lg border-2 text-sm",
  "border-border/90 bg-background text-foreground placeholder:text-muted-foreground",
  "focus:outline-none focus:border-[#08afd5] dark:border-slate-500/70 dark:bg-slate-900/80",
  "dark:focus:border-[#6edff3]"
);
