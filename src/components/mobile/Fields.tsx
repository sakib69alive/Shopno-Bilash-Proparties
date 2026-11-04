"use client";

import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Phone form fields: a tall, soft field with a floating label (it sits in the
 * middle until you focus or type, then rises and shrinks), an optional round
 * icon on the left, and a green ring on focus. Text is 16px everywhere —
 * anything smaller makes iOS Safari zoom the page when a field is focused.
 */

const CONTROL =
  "peer bg-bg border-border-strong text-fg w-full rounded-[1.25rem] border px-4 text-base outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-transparent focus:placeholder:text-fg-subtle focus:border-accent focus:bg-surface-raised focus:ring-4 focus:ring-accent-soft aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error-soft";

const LABEL_BASE =
  "text-fg-subtle pointer-events-none absolute transition-all duration-200 ease-[var(--ease-standard)]";
// Rises when the field has focus or a value.
const LABEL_FLOAT_ON_FILL =
  "peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-accent peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:tracking-wide";

type BaseProps = { label: string; optional?: boolean; error?: string; icon?: LucideIcon };

function IconBadge({ icon: Icon, tall }: { icon?: LucideIcon; tall?: boolean }) {
  if (!Icon) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "bg-accent-soft text-accent pointer-events-none absolute left-3 flex size-10 items-center justify-center rounded-full",
        tall ? "top-3.5" : "top-1/2 -translate-y-1/2",
      )}
    >
      <Icon className="size-[18px]" />
    </span>
  );
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="text-error mt-2 px-1 text-sm">
      {error}
    </p>
  );
}

export function TextField({ label, optional, error, icon, className, id, ...props }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId();
  const inputId = id ?? generated;
  const errorId = `${inputId}-error`;
  return (
    <div>
      <div className="relative">
        <IconBadge icon={icon} />
        <input
          id={inputId}
          placeholder={props.placeholder ?? " "}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(CONTROL, "h-16 pt-5", icon && "pl-16", className)}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(LABEL_BASE, LABEL_FLOAT_ON_FILL, "top-1/2 -translate-y-1/2 text-base", icon ? "left-16" : "left-4")}
        >
          {label}
          {optional && <span className="font-normal"> · optional</span>}
        </label>
      </div>
      <ErrorText id={errorId} error={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  optional,
  error,
  icon,
  className,
  id,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generated = useId();
  const inputId = id ?? generated;
  const errorId = `${inputId}-error`;
  return (
    <div>
      <div className="relative">
        <IconBadge icon={icon} tall />
        <textarea
          id={inputId}
          placeholder={props.placeholder ?? " "}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(CONTROL, "min-h-32 resize-none pt-7 pb-3 leading-relaxed", icon && "pl-16", className)}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(LABEL_BASE, LABEL_FLOAT_ON_FILL, "top-[1.125rem] text-base", icon ? "left-16" : "left-4")}
        >
          {label}
          {optional && <span className="font-normal"> · optional</span>}
        </label>
      </div>
      <ErrorText id={errorId} error={error} />
    </div>
  );
}

export function SelectField({
  label,
  optional,
  error,
  icon,
  options,
  placeholder,
  className,
  id,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const generated = useId();
  const inputId = id ?? generated;
  const errorId = `${inputId}-error`;
  return (
    <div>
      <div className="relative">
        <IconBadge icon={icon} />
        <select
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(CONTROL, "h-16 appearance-none pt-5 pr-14", icon && "pl-16", className)}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {/* A select always shows a value, so its label always sits raised. */}
        <label
          htmlFor={inputId}
          className={cn(
            LABEL_BASE,
            "top-2.5 text-[11px] font-semibold tracking-wide peer-focus:text-accent",
            icon ? "left-16" : "left-4",
          )}
        >
          {label}
          {optional && <span className="font-normal"> · optional</span>}
        </label>
        <span
          aria-hidden
          className="bg-surface text-fg-muted pointer-events-none absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full"
        >
          <ChevronDown className="size-4" />
        </span>
      </div>
      <ErrorText id={errorId} error={error} />
    </div>
  );
}
