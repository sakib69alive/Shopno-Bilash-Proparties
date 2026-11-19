"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { Media } from "@/components/ui/Media";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { buttonVariants } from "@/components/ui/Button";
import { deleteGalleryItem } from "@/features/gallery/actions";
import { GALLERY_CATEGORIES, type GalleryItem } from "@/content/gallery";
import { cn } from "@/lib/utils";

export interface GalleryAdminGridProps {
  items: GalleryItem[];
  canDelete: boolean;
}

/** A real photo grid, not a data table — this is the one admin list where the thumbnails themselves ARE the content, so the UI should look like one. */
export function GalleryAdminGrid({ items, canDelete }: GalleryAdminGridProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(item: GalleryItem) {
    if (!window.confirm(`Delete "${item.title ?? item.category}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteGalleryItem(item.id);
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesSearch = !query || (item.title?.toLowerCase().includes(query) ?? false) || item.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [items, search, category]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="No gallery images yet"
        description="Upload the first image to publish it on the public Gallery page."
        action={
          <Link href="/admin/content/gallery/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
            <Plus aria-hidden className="size-4" />
            <AdminText>{"New Image"}</AdminText>
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or category"
            aria-label="Search gallery"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={adminCopy("Filter by category")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          <option value="all"><AdminText>{"All categories"}</AdminText></option>
          {GALLERY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-caption text-fg-subtle shrink-0">
          {filtered.length} of {items.length} image{items.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No images match your search" description="Try a different title or category filter." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <div key={item.id} className="group border-border bg-surface-raised overflow-hidden rounded-lg border">
              <Media
                src={item.image.src}
                alt={item.image.alt}
                ratio="square"
                sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw"
                overlay
                caption={
                  <span className="text-caption bg-black/40 inline-block rounded px-1.5 py-0.5 backdrop-blur-sm">{item.category}</span>
                }
              />
              <div className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="text-body-sm text-fg truncate font-medium">{item.title ?? item.category}</p>
                  <p className="text-caption text-fg-subtle">{item.date ?? "No date"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <Link href={`/admin/content/gallery/${item.id}/edit`}>
                    <IconButton icon={Pencil} label={`Edit ${item.title ?? item.category}`} size="sm" />
                  </Link>
                  {canDelete && (
                    <IconButton
                      icon={Trash2}
                      label={`Delete ${item.title ?? item.category}`}
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDelete(item)}
                      className="hover:text-error"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
