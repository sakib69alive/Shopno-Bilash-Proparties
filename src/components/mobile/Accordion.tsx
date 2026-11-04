"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Ids open on first render. */
  defaultOpen?: string[];
  /** Allow several items open at once; default is one at a time. */
  multiple?: boolean;
  /** "card" gives each item its own rounded surface; "plain" is a hairline-divided list. */
  variant?: "plain" | "card";
  className?: string;
}

/** Tap-to-expand rows. Collapsed content is `inert`, so its links can't be tabbed to while hidden. */
export function Accordion({ items, defaultOpen = [], multiple = false, variant = "plain", className }: AccordionProps) {
  const baseId = useId();
  const [open, setOpen] = useState<string[]>(defaultOpen);

  function toggle(id: string) {
    setOpen((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      return multiple ? [...current, id] : [id];
    });
  }

  return (
    <div className={cn(variant === "card" ? "flex flex-col gap-2.5" : "divide-border divide-y", className)}>
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        const buttonId = `${baseId}-${item.id}-button`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div
            key={item.id}
            className={cn(
              variant === "card" && "bg-surface-raised border-border rounded-[var(--m-radius-card)] border px-4",
            )}
          >
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left"
              >
                <span className="text-h4 min-w-0">{item.title}</span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "text-fg-subtle size-5 shrink-0 transition-transform duration-200 ease-[var(--ease-standard)]",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen || undefined}
              className={cn(
                "grid transition-[grid-template-rows] duration-[250ms] ease-[var(--ease-standard)]",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="pb-4">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
