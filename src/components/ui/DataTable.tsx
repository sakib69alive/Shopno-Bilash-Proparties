"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "./Checkbox";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  /** Right-aligns the column — for numeric/currency values. */
  align?: "left" | "right";
  className?: string;
}

export type SortDirection = "asc" | "desc";

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSortChange?: (key: string) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onRowClick?: (row: T) => void;
  className?: string;
}

/**
 * Structural foundation only — sorting/pagination/selection are plain
 * controlled props a page wires up as needed, not logic baked in here.
 * Horizontally scrolls on narrow viewports (ARCHITECTURE.md §15) rather
 * than shrinking text or breaking the table apart into an unrelated
 * mobile layout — every column stays reachable, just via a swipe.
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  loading,
  error,
  onRetry,
  emptyTitle = "No results found.",
  emptyDescription,
  emptyAction,
  sortKey,
  sortDirection,
  onSortChange,
  selectable,
  selectedIds,
  onSelectionChange,
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (loading) return <LoadingState label="Loading…" className="border-border rounded-lg border" />;
  if (error) {
    return (
      <ErrorState
        description={error}
        action={
          onRetry && (
            <button type="button" onClick={onRetry} className="text-button text-accent hover:text-accent-strong">
              Try again
            </button>
          )
        }
      />
    );
  }
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const allSelected = selectable && selectedIds && data.length > 0 && data.every((row) => selectedIds.has(getRowId(row)));

  function toggleAll() {
    if (!onSelectionChange || !selectedIds) return;
    onSelectionChange(allSelected ? new Set() : new Set(data.map(getRowId)));
  }

  function toggleRow(id: string) {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  const [firstCol, ...restCols] = columns;
  const sortableCols = columns.filter((c) => c.sortable);

  return (
    <>
      {/* Phone: every row becomes a card — the first column is the title, the rest are label/value lines.
          A wide table you have to swipe sideways is the worst thing to use one-handed. */}
      <div className={cn("flex flex-col gap-3 md:hidden", className)}>
        {onSortChange && sortableCols.length > 0 && (
          <label className="text-caption text-fg-subtle flex items-center justify-between gap-3 px-1">
            Sort by
            <select
              value={sortKey ?? ""}
              onChange={(e) => e.target.value && onSortChange(e.target.value)}
              className="border-border-strong bg-surface-raised text-fg h-10 rounded-full border px-4 text-sm"
            >
              {!sortKey && <option value="">—</option>}
              {sortableCols.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.header}
                  {sortKey === c.key ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {selectable && (
          <div className="px-1">
            <Checkbox label="Select all" checked={allSelected} onChange={toggleAll} />
          </div>
        )}
        {data.map((row) => {
          const id = getRowId(row);
          const selected = selectedIds?.has(id);
          const labelled = restCols.filter((c) => c.header.trim() !== "");
          const actions = restCols.filter((c) => c.header.trim() === "");
          return (
            <div
              key={id}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "bg-surface-raised border-border rounded-[var(--m-radius-card)] border p-4",
                onRowClick && "active:bg-surface cursor-pointer",
                selected && "bg-accent-soft/40 border-accent",
              )}
            >
              <div className="flex items-start gap-3">
                {selectable && (
                  <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                    <Checkbox label="Select row" className="sr-only" checked={selected} onChange={() => toggleRow(id)} />
                  </div>
                )}
                <div className="text-body min-w-0 flex-1 font-semibold break-words">{firstCol?.render(row)}</div>
              </div>
              {labelled.length > 0 && (
                <dl className="border-border mt-3 grid grid-cols-1 gap-y-2 border-t pt-3">
                  {labelled.map((col) => (
                    <div key={col.key} className="flex items-baseline justify-between gap-4">
                      <dt className="text-caption text-fg-subtle shrink-0">{col.header}</dt>
                      <dd className={cn("text-body-sm text-fg min-w-0 text-right break-words", col.align === "right" && "tabular-nums")}>
                        {col.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {actions.length > 0 && (
                <div onClick={(e) => e.stopPropagation()} className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {actions.map((col) => (
                    <div key={col.key}>{col.render(row)}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

    <div className={cn("border-border scrollbar-none hidden overflow-x-auto rounded-lg border md:block", className)}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-border bg-surface border-b">
            {selectable && (
              <th className="w-11 px-4 py-3">
                <Checkbox label="Select all rows" className="sr-only" checked={allSelected} onChange={toggleAll} />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "text-label text-fg-subtle px-3 py-3 whitespace-nowrap uppercase",
                  col.align === "right" && "text-right",
                  col.className,
                )}
              >
                {col.sortable && onSortChange ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(col.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-fg transition-colors",
                      col.align === "right" && "flex-row-reverse",
                    )}
                  >
                    {col.header}
                    {sortKey === col.key ? (
                      sortDirection === "asc" ? (
                        <ArrowUp aria-hidden className="size-3.5" />
                      ) : (
                        <ArrowDown aria-hidden className="size-3.5" />
                      )
                    ) : (
                      <ArrowUpDown aria-hidden className="size-3.5 opacity-40" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const id = getRowId(row);
            const selected = selectedIds?.has(id);
            return (
              <tr
                key={id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-border border-b last:border-b-0",
                  onRowClick && "cursor-pointer hover:bg-surface",
                  selected && "bg-accent-soft/40",
                )}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      label={`Select row`}
                      className="sr-only"
                      checked={selected}
                      onChange={() => toggleRow(id)}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "text-body-sm px-3 py-3 whitespace-nowrap text-fg",
                      col.align === "right" && "text-right tabular-nums",
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
