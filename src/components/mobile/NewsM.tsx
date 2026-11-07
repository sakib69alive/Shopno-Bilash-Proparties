"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { NEWS_CATEGORIES, type NewsArticle } from "@/content/news";
import { TabRail } from "./TabRail";
import { EmptyCard } from "./EmptyCard";

/**
 * Phone News page: a serif opening, one large lead story (the one marked
 * featured, else the newest), category chips for the categories that really
 * have articles, then the rest as compact rows with a thumbnail. Reading is
 * on the article page; this page is for choosing what to read.
 */
export function NewsM({ articles }: { articles: NewsArticle[] }) {
  const [category, setCategory] = useState("All");

  const lead = articles.find((a) => a.featured) ?? articles[0];
  const rest = articles.filter((a) => a.id !== lead?.id);
  const categories = NEWS_CATEGORIES.filter((c) => rest.some((a) => a.category === c));
  const visible = category === "All" ? rest : rest.filter((a) => a.category === category);

  return (
    <div className="flex flex-col gap-8 pt-6 pb-8 lg:hidden">
      <section className="px-[var(--gutter)]">
        <p className="hero-in text-label text-fg-subtle uppercase" style={{ animationDelay: "0ms" }}>
          News &amp; updates
        </p>
        <h1 className="font-serif-display hero-in mt-3 text-[2.75rem] leading-[1.02] text-balance" style={{ animationDelay: "100ms" }}>
          Stories from our projects and our company.
        </h1>
        <span aria-hidden className="bg-premium hero-in mt-6 block h-px w-12" />
      </section>

      {!lead ? (
        <div className="px-[var(--gutter)]">
          <EmptyCard
            icon={Newspaper}
            title="More stories are coming"
            description="We'll share project updates and news here as they happen."
            action={{ label: "Explore projects", href: "/projects" }}
          />
        </div>
      ) : (
        <>
          <section className="px-[var(--gutter)]">
            <Link
              href={`/news/${lead.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-[var(--m-radius-hero)] transition-transform duration-150 active:scale-[0.985]"
            >
              <Media
                ratio="auto"
                src={lead.coverImage.src}
                alt={lead.coverImage.alt}
                sizes="(min-width: 768px) 90vw, 100vw"
                containerClassName="absolute inset-0"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />
              <span className="absolute top-4 left-4 rounded-full border border-white/25 bg-black/35 text-white px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
                {lead.featured ? "Featured" : "Latest"} · {lead.category}
              </span>
              <div className="absolute inset-x-5 bottom-5 text-white">
                <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">{lead.date}</p>
                <h2 className="font-serif-display mt-2 text-[2rem] leading-[1.08] text-balance">{lead.title}</h2>
                <p className="mt-3 line-clamp-2 text-[0.9375rem] leading-relaxed text-white/75">{lead.excerpt}</p>
                <span className="bg-bg text-fg mt-5 inline-flex h-12 items-center gap-3 rounded-full pr-1.5 pl-5 text-sm font-semibold">
                  Read story
                  <span className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-full">
                    <ArrowRight aria-hidden className="size-4" />
                  </span>
                </span>
              </div>
            </Link>
          </section>

          {rest.length > 0 && (
            <section className="flex flex-col gap-4">
              {categories.length > 1 && (
                <TabRail
                  label="News category"
                  value={category}
                  onValueChange={setCategory}
                  tabs={[{ value: "All", label: "All", count: rest.length }, ...categories.map((c) => ({ value: c, label: c, count: rest.filter((a) => a.category === c).length }))]}
                />
              )}
              <ul className="flex flex-col gap-3 px-[var(--gutter)]">
                {visible.map((article, i) => (
                  <Reveal as="li" key={article.id} delay={Math.min(i, 3) * 60}>
                    <Link
                      href={`/news/${article.slug}`}
                      className="bg-surface-raised border-border flex gap-3.5 rounded-[var(--m-radius-card)] border p-2.5 transition-transform active:scale-[0.98]"
                    >
                      <Media
                        ratio="square"
                        src={article.coverImage.src}
                        alt={article.coverImage.alt}
                        sizes="104px"
                        containerClassName="size-[6.5rem] shrink-0 rounded-[calc(var(--m-radius-card)-0.5rem)]"
                      />
                      <div className="min-w-0 flex-1 py-1 pr-1">
                        <p className="text-caption text-fg-subtle uppercase">
                          {article.category} · {article.date}
                        </p>
                        <h3 className="font-display mt-1 line-clamp-3 text-[0.9375rem] leading-snug font-semibold">{article.title}</h3>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </ul>
              {visible.length === 0 && <p className="text-fg-muted px-[var(--gutter)] text-sm">Nothing in this category yet.</p>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
