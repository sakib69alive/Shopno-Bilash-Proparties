import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";
import { cn } from "@/lib/utils";

export interface AdminPageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  /** A filter bar, tabs, or similar row rendered below the title block. */
  children?: ReactNode;
  className?: string;
}

/**
 * The one page-header shape every future Admin module page should reach
 * for (brief §9) — title/description on the left, actions on the right,
 * an optional filter/tab row underneath. Not a page layout itself: a
 * module page still renders its own content below this.
 *
 * On a phone the breadcrumb trail collapses into one "back" link to the
 * parent page (a full trail doesn't fit and nobody taps the middle of it),
 * and the action buttons drop under the title as their own full-width row.
 */
export function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  children,
  className,
}: AdminPageHeaderProps) {
  const parent = breadcrumbs && breadcrumbs.length > 1 ? [...breadcrumbs].slice(0, -1).reverse().find((b) => b.href) : undefined;

  return (
    <div className={cn("border-border border-b px-[var(--gutter)] py-4 sm:px-6 sm:py-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} className="mb-3 hidden sm:flex" />}
      {parent?.href && (
        <Link
          href={parent.href}
          className="text-fg-muted active:text-fg -ml-1 mb-2 inline-flex min-h-9 items-center gap-0.5 pr-3 text-sm font-medium sm:hidden"
        >
          <ChevronLeft aria-hidden className="size-4" />
          {parent.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-h2 text-balance">{title}</h1>
          {description && <p className="text-body-sm text-fg-muted mt-1 max-w-2xl">{description}</p>}
        </div>
        {(primaryAction || secondaryActions) && (
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto sm:shrink-0">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>
      {children && <div className="mt-4 sm:mt-5">{children}</div>}
    </div>
  );
}
