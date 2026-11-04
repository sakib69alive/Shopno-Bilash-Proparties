import { cn } from "@/lib/utils";

/** A pulsing placeholder block — size and shape come from `className`. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-surface animate-pulse rounded-md", className)} />;
}

/** The phone layout's generic loading state: a title line and a few photo cards. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-6 px-[var(--gutter)] py-5">
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="aspect-[4/3] w-full rounded-[var(--m-radius-card)]" />
      ))}
    </div>
  );
}
