import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { Media } from "@/components/ui/Media";
import type { NewsArticle } from "@/content/news";
import type { Project } from "@/content/projects";
import { Rail } from "./Rail";
import { SectionHeading } from "./SectionHeading";

/**
 * Phone article page, made for reading: the cover photo, a category and date
 * line, a serif title, the excerpt as a lead, 17px body text with generous
 * line height, the article's extra photos as a swipe rail, a link to the
 * related project, and more stories from the same category. The top bar's
 * share button is the share action.
 */
export function NewsArticleM({
  article,
  project,
  related,
}: {
  article: NewsArticle;
  project?: Project;
  related: NewsArticle[];
}) {
  // The cover is already on show; any extra photo that repeats it is skipped.
  const extra = (article.images ?? []).filter((img) => img.src !== article.coverImage.src);

  return (
    <article className="flex flex-col gap-7 pt-3 pb-8 lg:hidden">
      <div className="px-[var(--gutter)]">
        <Media
          ratio="auto"
          src={article.coverImage.src}
          alt={article.coverImage.alt}
          sizes="(min-width: 768px) 90vw, 100vw"
          containerClassName="aspect-[4/3] rounded-[var(--m-radius-hero)]"
        />
      </div>

      <header className="px-[var(--gutter)]">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
          <span className="bg-accent-soft text-accent rounded-full px-3 py-1.5">{article.category}</span>
          <span className="text-fg-subtle">{article.date}</span>
        </p>
        <h1 className="font-serif-display mt-4 text-[2.375rem] leading-[1.05] text-balance">{article.title}</h1>
        <span aria-hidden className="bg-premium mt-5 block h-px w-12" />
        <p className="text-fg-muted mt-5 text-[1.125rem] leading-relaxed">{article.excerpt}</p>
      </header>

      <div className="flex flex-col gap-5 px-[var(--gutter)]">
        {article.content.map((paragraph, i) => (
          <p key={i} className="text-[1.0625rem] leading-[1.75]">
            {paragraph}
          </p>
        ))}
      </div>

      {extra.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Photos" />
          <Rail>
            {extra.map((img) => (
              <Media
                key={img.src}
                ratio="standard"
                src={img.src}
                alt={img.alt}
                sizes="(min-width: 640px) 320px, 80vw"
                containerClassName="w-[80vw] max-w-[320px] rounded-[var(--m-radius-card)]"
              />
            ))}
          </Rail>
        </section>
      )}

      {project && (
        <section className="px-[var(--gutter)]">
          <Link
            href={`/projects/${project.slug}`}
            className="bg-surface-raised border-border flex items-center gap-3.5 rounded-[var(--m-radius-card)] border p-4 transition-transform active:scale-[0.98]"
          >
            <span className="bg-accent-soft text-accent flex size-11 shrink-0 items-center justify-center rounded-full">
              <Building2 aria-hidden className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-caption text-fg-subtle block uppercase">Related project</span>
              <span className="font-display block truncate text-base font-semibold">{project.name}</span>
            </span>
            <ArrowRight aria-hidden className="text-fg-subtle size-5 shrink-0" />
          </Link>
        </section>
      )}

      {related.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading title="More stories" href="/news" />
          <ul className="flex flex-col gap-3 px-[var(--gutter)]">
            {related.map((story) => (
              <li key={story.id}>
                <Link
                  href={`/news/${story.slug}`}
                  className="bg-surface-raised border-border flex gap-3.5 rounded-[var(--m-radius-card)] border p-2.5 transition-transform active:scale-[0.98]"
                >
                  <Media
                    ratio="square"
                    src={story.coverImage.src}
                    alt={story.coverImage.alt}
                    sizes="104px"
                    containerClassName="size-[6.5rem] shrink-0 rounded-[calc(var(--m-radius-card)-0.5rem)]"
                  />
                  <div className="min-w-0 flex-1 py-1 pr-1">
                    <p className="text-caption text-fg-subtle uppercase">
                      {story.category} · {story.date}
                    </p>
                    <h3 className="font-display mt-1 line-clamp-3 text-[0.9375rem] leading-snug font-semibold">{story.title}</h3>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
