"use client";

import { UiText } from "./UiLanguage";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * A state-driven tab strip — unlike `ProjectWorkspaceTabs` (router-driven,
 * hardcoded to the project workspace), this is generic and reusable for
 * any page that needs tabbed sections without its own route per tab (e.g.
 * the Unit Detail page's Overview/Design/Ownership/Parking/Documents/
 * Financial sections). Visually matches `ProjectWorkspaceTabs`' underline
 * style for consistency across the admin panel.
 */
export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn("border-border -mb-px flex gap-5 overflow-x-auto border-b", className)}>
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              "text-body-sm shrink-0 border-b-2 px-0.5 pb-2.5 transition-colors",
              isActive ? "border-accent text-fg font-medium" : "border-transparent text-fg-subtle hover:text-fg",
            )}
          >
            <UiText>{item.label}</UiText>
          </button>
        );
      })}
    </div>
  );
}
