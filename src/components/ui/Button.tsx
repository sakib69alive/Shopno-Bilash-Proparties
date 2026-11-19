import { UiText } from "@/components/ui/UiLanguage";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "text-button inline-flex items-center justify-center gap-2 rounded-md transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-standard)] active:scale-[0.97] disabled:pointer-events-none disabled:active:scale-100 disabled:bg-disabled-bg disabled:text-disabled-fg",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-foreground hover:bg-accent-strong active:bg-accent-strong",
        secondary:
          "bg-surface text-fg hover:bg-border border border-border-strong",
        outline:
          "bg-transparent text-fg border border-border-strong hover:bg-surface",
        ghost: "bg-transparent text-fg hover:bg-surface",
        text: "bg-transparent text-accent hover:text-accent-strong underline-offset-4 hover:underline px-0 h-auto",
        destructive: "bg-error text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5",
        lg: "h-13 px-6 text-base",
        icon: "h-11 w-11 shrink-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      disabled,
      iconLeft,
      iconRight,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          iconLeft
        )}
        {typeof children === "string" ? <UiText>{children}</UiText> : children}
        {!loading && iconRight}
      </button>
    );
  },
);
Button.displayName = "Button";
