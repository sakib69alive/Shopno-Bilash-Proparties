import Link from "next/link";
import { cn } from "@/lib/utils";

/** Two tabs at the top of the Blueprint AI area: the AI prompts + checker, and the control panel for every project's plans. */
export function BlueprintAiTabs({ active }: { active: "prompts" | "control" | "distribution" }) {
  const tabs = [
    { key: "prompts", label: "Prompts & checker", href: "/admin/settings/blueprint-ai" },
    { key: "control", label: "Control panel", href: "/admin/settings/blueprint-ai/control" },
    { key: "distribution", label: "Distribution", href: "/admin/settings/blueprint-ai/distribution" },
  ] as const;
  return (
    <nav aria-label="Blueprint AI" className="bg-surface border-border inline-flex w-fit gap-1 rounded-full border p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn("text-body-sm rounded-full px-4 py-2 font-semibold transition-colors", t.key === active ? "bg-accent text-accent-foreground" : "text-fg-muted hover:text-fg")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
