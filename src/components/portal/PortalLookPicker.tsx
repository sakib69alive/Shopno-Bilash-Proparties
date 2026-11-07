"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { setPortalLookAction } from "@/features/ownerPortal/lookActions";
import { cn } from "@/lib/utils";

type Look = "cream" | "blue" | "grid";

const OPTIONS: { value: Look; title: string; note: string; swatch: string }[] = [
  { value: "cream", title: "Cream", note: "Plain cream background", swatch: "bg-[#efe7d6]" },
  { value: "blue", title: "Blue", note: "Plain blue background", swatch: "bg-[#1d5aa6]" },
  {
    value: "grid",
    title: "Blue grid",
    note: "Blue with a drafting grid",
    swatch: "bg-[#1d5aa6] [background-image:linear-gradient(rgb(255_255_255/0.28)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.28)_1px,transparent_1px)] [background-size:10px_10px]",
  },
];

/** Three buttons — Cream, Blue or Blue grid — for how the floor plan looks on the Home screen. Saves straight away. */
export function PortalLookPicker({ initial }: { initial: Look }) {
  const router = useRouter();
  const [look, setLook] = useState<Look>(initial);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function choose(next: Look) {
    if (next === look) return;
    const previous = look;
    setLook(next); // instant — the save follows
    setError(null);
    startTransition(async () => {
      const result = await setPortalLookAction(next);
      if (result.error) {
        setLook(previous);
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Floor plan look" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        {OPTIONS.map((option) => {
          const active = look === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(option.value)}
              className={cn(
                "relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors [-webkit-tap-highlight-color:transparent]",
                active ? "border-accent bg-accent-soft" : "border-border-strong bg-surface-raised hover:border-fg-subtle",
              )}
            >
              <span className={cn(option.swatch, "border-border h-10 w-full rounded-lg border")} aria-hidden />
              <span>
                <span className="text-body-sm text-fg block font-semibold">{option.title}</span>
                <span className="text-caption text-fg-muted block">{option.note}</span>
              </span>
              {active && (
                <span aria-hidden className="bg-accent text-accent-foreground absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-body-sm text-error mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
