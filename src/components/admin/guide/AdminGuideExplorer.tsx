"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, Download, HeartHandshake } from "lucide-react";
import type { GuideGroup } from "@/content/adminGuide";

export interface AdminGuideExplorerProps {
  groups: GuideGroup[];
}

function slugify(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * A real documentation page, not a marketing tour — every section maps
 * 1:1 to an actual sidebar item (`config/navigation.ts`) and describes
 * what it really does. Static anchor-link table of contents (no JS
 * scroll-spy) so it stays fast and works even before hydration; the
 * search box is the only interactive piece, filtering in place.
 */
export function AdminGuideExplorer({ groups }: AdminGuideExplorerProps) {
  const [search, setSearch] = useState("");

  /**
   * The browser's own print pipeline, not a PDF library — `window.print()`
   * with "Save as PDF" as the destination produces a real PDF with zero
   * added dependencies. Clears any active search first (and waits a tick
   * for that state to actually reach the DOM) so the export always
   * captures the full guide, never a filtered subset the admin happened
   * to be mid-search on.
   */
  function handleCopyGuide() {
    setSearch("");
    requestAnimationFrame(() => window.print());
  }

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            item.summary.toLowerCase().includes(query) ||
            item.details.some((d) => d.toLowerCase().includes(query)),
        ),
      }))
      .filter((group) => group.items.length > 0 || group.label.toLowerCase().includes(query));
  }, [groups, search]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="border-border bg-surface-raised top-20 flex shrink-0 flex-col gap-4 rounded-lg border p-4 print:hidden lg:sticky lg:max-h-[calc(100vh-6rem)] lg:w-64">
        <div className="relative">
          <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the guide"
            aria-label="Search the guide"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <nav aria-label="Guide sections" className="thin-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label}>
              <a href={`#${slugify(group.label)}`} className="text-label text-fg hover:text-accent uppercase transition-colors">
                {group.label}
              </a>
              <ul className="mt-1.5 flex flex-col gap-1 border-l pl-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={`#${slugify(group.label)}-${slugify(item.label)}`}
                      className="text-caption text-fg-subtle hover:text-accent block truncate transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleCopyGuide}
          className="border-border-strong text-body-sm text-fg hover:bg-surface flex shrink-0 items-center justify-center gap-2 rounded-md border py-2 transition-colors"
        >
          <Download aria-hidden className="size-4" />
          Copy this guide
        </button>

        <div className="border-border bg-surface flex flex-col items-center gap-2 rounded-lg border border-dashed p-5 text-center">
          <HeartHandshake aria-hidden className="text-accent size-6" />
          <p className="text-caption text-fg-subtle">Built on trust. Designed for the future.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-10">
        {filteredGroups.length === 0 ? (
          <p className="text-body-sm text-fg-subtle">No guide sections match &ldquo;{search}&rdquo;.</p>
        ) : (
          filteredGroups.map((group) => (
            <section key={group.label} id={slugify(group.label)} className="scroll-mt-20">
              <h2 className="text-h3 text-fg">{group.label}</h2>
              <p className="text-body-sm text-fg-subtle mt-1 max-w-2xl">{group.description}</p>

              <div className="mt-4 flex flex-col gap-4">
                {group.items.map((item) => (
                  <article
                    key={item.href}
                    id={`${slugify(group.label)}-${slugify(item.label)}`}
                    className="border-border bg-surface-raised scroll-mt-20 break-inside-avoid rounded-lg border p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-body text-fg font-medium">{item.label}</h3>
                      <Link
                        href={item.href}
                        className="text-caption text-accent hover:text-accent-strong flex shrink-0 items-center gap-1 transition-colors"
                      >
                        Open <ArrowRight aria-hidden className="size-3.5" />
                      </Link>
                    </div>
                    <p className="text-body-sm text-fg-muted mt-1.5">{item.summary}</p>
                    {item.details.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {item.details.map((detail, i) => (
                          <li key={i} className="text-body-sm text-fg-subtle flex gap-2">
                            <span aria-hidden className="text-accent mt-1.5 size-1 shrink-0 rounded-full bg-current" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
