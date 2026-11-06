import type { ReactNode } from "react";

export function DashboardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-label text-fg-subtle mb-3 uppercase">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">{children}</div>
    </section>
  );
}
