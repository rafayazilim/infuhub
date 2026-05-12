import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** type="password" iken şifreyi göster / gizle */
  showPasswordToggle?: boolean;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, error, type, value, defaultValue, onChange, showPasswordToggle, ...props }, ref) => {
    const [showPw, setShowPw] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(() => {
      if (value !== undefined && value !== null) return String(value).length > 0;
      if (defaultValue !== undefined && defaultValue !== null) return String(defaultValue).length > 0;
      return false;
    });

    React.useEffect(() => {
      if (value !== undefined && value !== null) {
        setHasValue(String(value).length > 0);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (value === undefined) {
        setHasValue(e.target.value.length > 0);
      }
      onChange?.(e);
    };

    const floated = isFocused || hasValue;
    const isPasswordField = type === "password";
    const inputType =
      showPasswordToggle && isPasswordField ? (showPw ? "text" : "password") : type;

    return (
      <div className="relative w-full">
        <input
          type={inputType}
          className={cn(
            "peer w-full h-14 px-4 pt-5 pb-2 rounded-xl text-foreground placeholder-transparent transition-all duration-300",
            "border-2 border-border/90 bg-muted/50",
            "dark:border-slate-500/75 dark:bg-slate-900/65",
            "focus:outline-none focus:border-[#08afd5] focus:bg-muted/70 dark:focus:border-[#6edff3] dark:focus:bg-slate-900/90",
            "hover:border-[#08afd5]/45 dark:hover:border-slate-400/70",
            error && "border-destructive focus:border-destructive dark:border-red-400/70",
            showPasswordToggle && isPasswordField && "pr-12",
            className
          )}
          ref={ref}
          placeholder={label}
          value={value}
          defaultValue={defaultValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleChange}
          {...props}
        />
        <motion.label
          className={cn(
            "absolute left-4 transition-all duration-200 pointer-events-none z-[1]",
            floated ? "text-xs text-[#08afd5] dark:text-[#6edff3]" : "text-muted-foreground"
          )}
          animate={{
            top: floated ? 8 : "50%",
            fontSize: floated ? "0.75rem" : "0.875rem",
            y: floated ? 0 : "-50%",
          }}
        >
          {label}
        </motion.label>
        {showPasswordToggle && isPasswordField ? (
          <button
            type="button"
            tabIndex={-1}
            className={cn(
              "absolute right-2 top-1/2 z-[2] -translate-y-1/2 rounded-lg p-2",
              "text-muted-foreground hover:text-[#08afd5] dark:hover:text-[#6edff3]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#08afd5]/50 dark:focus-visible:ring-[#6edff3]/40"
            )}
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Şifreyi gizle" : "Şifreyi göster"}
          >
            {showPw ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
          </button>
        ) : null}
        <AnimatePresence>
          {error && (
            <motion.span
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute -bottom-5 left-0 text-xs text-destructive"
            >
              {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
