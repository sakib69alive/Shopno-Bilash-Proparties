import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickActionProps {
  label: string;
  icon: LucideIcon;
  href?: string;
  /** No `href`/disabled styling and no click target at all — brief §7: "do not make it appear functional." */
  comingSoon?: boolean;
}

export function QuickAction({ label, icon: Icon, href, comingSoon }: QuickActionProps) {
  const content = (
    <>
      <Icon aria-hidden className="size-4.5 shrink-0" />
      <span className="text-body-sm flex-1 text-left"><AdminText>{label}</AdminText></span>
      {comingSoon && <span className="text-caption bg-surface shrink-0 rounded px-1.5 py-0.5"><AdminText>{"Soon"}</AdminText></span>}
    </>
  );

  if (comingSoon || !href) {
    return (
      <div
        aria-disabled="true"
        className="text-fg-subtle/60 flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-fg transition-colors",
        "hover:bg-surface",
      )}
    >
      {content}
    </Link>
  );
}
