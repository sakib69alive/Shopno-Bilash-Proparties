import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import type { NewsArticle } from "@/content/news";

/** The dominant story — large image, large headline, never inside a card. */
export function FeaturedStory({ article }: { article: NewsArticle }) {
  return (
    <Section spacing="md">
      <Container>
        <Reveal>
          <Link href={`/news/${article.slug}`} className="group block">
            <Media
              ratio="hero"
              radius="md"
              overlay
              src={article.coverImage.src}
              alt={article.coverImage.alt}
              sizes="100vw"
              className="transition-transform duration-500 ease-[var(--ease-standard)] group-hover:scale-[1.02]"
              caption={<span className="text-label uppercase">{article.category}</span>}
            />
            <div className="mt-8 max-w-3xl">
              <p className="text-label text-fg-subtle uppercase">
                {article.category} · {article.date}
              </p>
              <h1 className="text-display-l mt-4 text-balance transition-colors duration-200 group-hover:text-accent">
                {article.title}
              </h1>
              <p className="text-body-lg text-fg-muted mt-5 max-w-xl">{article.excerpt}</p>
              <span className="text-button text-accent mt-6 inline-flex items-center gap-2">
                Read More
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform duration-200 ease-[var(--ease-standard)] group-hover:translate-x-1"
                />
              </span>
            </div>
          </Link>
        </Reveal>
      </Container>
    </Section>
  );
}
