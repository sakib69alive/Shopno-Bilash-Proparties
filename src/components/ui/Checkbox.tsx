import { UiText } from "./UiLanguage";
import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

/** A real `<input type="checkbox">` under the hood (native keyboard/screen-reader behavior for free) — only its visible box is custom-drawn. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          "flex items-start gap-3",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        )}
      >
        <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            disabled={disabled}
            className="peer absolute inset-0 m-0 size-5 cursor-pointer appearance-none rounded-[5px] border border-border-strong bg-surface-raised transition-colors checked:border-accent checked:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed"
            {...props}
          />
          <Check
            aria-hidden
            className="pointer-events-none relative size-3.5 text-transparent peer-checked:text-accent-foreground"
          />
        </span>
        <span className={cn("flex flex-col", className)}>
          <span className="text-body-sm text-fg"><UiText>{label}</UiText></span>
          {description && <span className="text-caption text-fg-subtle mt-0.5"><UiText>{description}</UiText></span>}
        </span>
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
