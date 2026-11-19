import { UiText } from "./UiLanguage";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Prev/next + page count only — no page-size selector or jump-to-page yet; add when a real table needs it. */
export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-4", className)}
    >
      <p className="text-caption text-fg-subtle">
        <UiText values={{ page, total: pageCount }}>{"Page {page} of {total}"}</UiText>
      </p>
      <div className="flex items-center gap-2">
        <IconButton
          icon={ChevronLeft}
          label="Previous page"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <IconButton
          icon={ChevronRight}
          label="Next page"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </nav>
  );
}
