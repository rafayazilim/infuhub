import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, error, type, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    return (
      <div className="relative w-full">
        <input
          type={type}
          className={cn(
            "peer w-full h-14 px-4 pt-5 pb-2 rounded-xl bg-muted/50 border-2 border-border text-foreground placeholder-transparent transition-all duration-300",
            "focus:outline-none focus:border-primary focus:bg-muted/70",
            "hover:border-primary/50",
            error && "border-destructive focus:border-destructive",
            className
          )}
          ref={ref}
          placeholder={label}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleChange}
          {...props}
        />
        <motion.label
          className={cn(
            "absolute left-4 transition-all duration-200 pointer-events-none",
            isFocused || hasValue
              ? "top-2 text-xs text-primary"
              : "top-1/2 -translate-y-1/2 text-muted-foreground"
          )}
          animate={{
            top: isFocused || hasValue ? 8 : "50%",
            fontSize: isFocused || hasValue ? "0.75rem" : "0.875rem",
            y: isFocused || hasValue ? 0 : "-50%",
          }}
        >
          {label}
        </motion.label>
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
