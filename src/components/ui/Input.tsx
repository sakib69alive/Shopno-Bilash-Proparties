"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

/** Label is always visible — placeholder text is never used as the only label. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, disabled, placeholder, ...props }, ref) => {
    const { t } = useUiLanguage();
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const messageId = error || helperText ? `${inputId}-message` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-label text-fg-muted">
          {t(label)}
        </label>
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={messageId}
          className={cn(
            "text-body h-11 rounded-md border border-border-strong bg-surface-raised px-3.5 text-fg outline-none transition-colors duration-150",
            "placeholder:text-fg-subtle",
            "focus:border-accent focus:ring-2 focus:ring-accent-soft",
            error && "border-error focus:border-error focus:ring-error-soft",
            disabled &&
              "bg-disabled-bg text-disabled-fg border-border cursor-not-allowed",
            className,
          )}
          placeholder={placeholder && t(placeholder)}
          {...props}
        />
        {(error || helperText) && (
          <p
            id={messageId}
            className={cn(
              "text-body-sm",
              error ? "text-error" : "text-fg-subtle",
            )}
          >
            {t(error || helperText || "")}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
