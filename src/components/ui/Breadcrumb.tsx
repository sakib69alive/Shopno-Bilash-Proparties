import { UiText } from "@/components/ui/UiLanguage";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  localize?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** The last item (current page) is never a link, even if it carries an `href`. */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight aria-hidden className="text-fg-subtle size-3.5" />}
              {item.href && !isLast ? (
                <Link href={item.href} className="text-caption text-fg-subtle hover:text-fg transition-colors">
                  <UiText>{item.label}</UiText>
                </Link>
              ) : (
                <span
                  className={cn("text-caption", isLast ? "text-fg" : "text-fg-subtle")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.localize ? <UiText>{item.label}</UiText> : item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
