import { Rail } from "./Rail";

export interface Step {
  title: string;
  description?: string;
}

/** Numbered process steps in a swipe rail — replaces a tall vertical timeline on a phone. */
export function StepRail({ steps }: { steps: Step[] }) {
  return (
    <Rail>
      {steps.map((step, i) => (
        <div
          key={step.title}
          className="bg-surface-raised border-border w-[70vw] max-w-[280px] rounded-[var(--m-radius-card)] border p-4"
        >
          <span className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums">
            {i + 1}
          </span>
          <p className="text-h4 mt-3 leading-snug">{step.title}</p>
          {step.description && <p className="text-body-sm text-fg-muted mt-1.5">{step.description}</p>}
        </div>
      ))}
    </Rail>
  );
}
