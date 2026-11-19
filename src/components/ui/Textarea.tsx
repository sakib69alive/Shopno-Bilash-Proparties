"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
}

/** Same visible-label/error pattern as <Input>, for multi-line fields. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, disabled, placeholder, rows = 4, ...props }, ref) => {
    const { t } = useUiLanguage();
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const messageId = error || helperText ? `${textareaId}-message` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={textareaId} className="text-label text-fg-muted">
          {t(label)}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={messageId}
          className={cn(
            "text-body resize-y rounded-md border border-border-strong bg-surface-raised px-3.5 py-3 text-fg outline-none transition-colors duration-150",
            "placeholder:text-fg-subtle",
            "focus:border-accent focus:ring-2 focus:ring-accent-soft",
            error && "border-error focus:border-error focus:ring-error-soft",
            disabled && "bg-disabled-bg text-disabled-fg border-border cursor-not-allowed",
            className,
          )}
          placeholder={placeholder && t(placeholder)}
          {...props}
        />
        {(error || helperText) && (
          <p id={messageId} className={cn("text-body-sm", error ? "text-error" : "text-fg-subtle")}>
            {t(error || helperText || "")}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
