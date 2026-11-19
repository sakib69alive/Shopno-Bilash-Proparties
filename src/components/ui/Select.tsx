"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

/** Same visible-label/error pattern as <Input>, for a labelled form select (not the borderless filter-bar select). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, id, name, disabled, options, placeholder, value, defaultValue, ...props }, ref) => {
    const { t } = useUiLanguage();
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const messageId = error || helperText ? `${selectId}-message` : undefined;
    const isControlled = value !== undefined;
    const recordPicker = /Ids?$/.test(name ?? "");

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-label text-fg-muted">
          {t(label)}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            name={name}
            disabled={disabled}
            aria-invalid={!!error || undefined}
            aria-describedby={messageId}
            className={cn(
              "text-body h-11 w-full appearance-none rounded-md border border-border-strong bg-surface-raised px-3.5 pr-9 text-fg outline-none transition-colors duration-150",
              "focus:border-accent focus:ring-2 focus:ring-accent-soft",
              error && "border-error focus:border-error focus:ring-error-soft",
              disabled && "bg-disabled-bg text-disabled-fg border-border cursor-not-allowed",
              className,
            )}
            {...(isControlled ? { value: value ?? "" } : { defaultValue: defaultValue ?? "" })}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {t(placeholder)}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {recordPicker && opt.value ? opt.label : t(opt.label)}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="text-fg-subtle pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
          />
        </div>
        {(error || helperText) && (
          <p id={messageId} className={cn("text-body-sm", error ? "text-error" : "text-fg-subtle")}>
            {t(error || helperText || "")}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
