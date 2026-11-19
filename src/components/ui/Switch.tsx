import { UiText } from "./UiLanguage";
import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

/** A real `<input type="checkbox">` styled as a toggle — for an immediate on/off setting, not a form field that needs an explicit submit (use `Checkbox` for that). */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const switchId = id ?? generatedId;

    return (
      <label
        htmlFor={switchId}
        className={cn(
          "flex items-start justify-between gap-4",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          className,
        )}
      >
        <span className="flex flex-col">
          <span className="text-body-sm text-fg"><UiText>{label}</UiText></span>
          {description && <span className="text-caption text-fg-subtle mt-0.5"><UiText>{description}</UiText></span>}
        </span>
        <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center">
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            id={switchId}
            disabled={disabled}
            className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-full border border-border-strong bg-surface-raised transition-colors checked:border-accent checked:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed"
            {...props}
          />
          <span
            aria-hidden
            className="bg-fg-subtle pointer-events-none absolute left-0.5 size-5 rounded-full transition-transform duration-150 ease-[var(--ease-standard)] peer-checked:translate-x-5 peer-checked:bg-white"
          />
        </span>
      </label>
    );
  },
);
Switch.displayName = "Switch";
