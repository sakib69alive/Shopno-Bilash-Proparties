import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { NewsArticleM } from "@/components/mobile/NewsArticleM";
import { projectContentRepository } from "@/features/projectContent/repository";
import { Container } from "@/components/ui/Container";
import { Divider } from "@/components/ui/Divider";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { findNewsArticleBySlug, newsRepository } from "@/features/news/repository";
import { projects } from "@/content/projects";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// No `generateStaticParams` — CMS Step 1 moved this domain to
// `newsRepository`, which admin can mutate at runtime (create/edit/delete
// in `/admin/content/news`). Static params generated at build time would
// only ever reflect that build's seed data, never a newly-created
// article, so this route renders on demand instead. `revalidatePath`
// calls in `features/news/actions.ts` still keep it reasonably cached
// between edits.

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await findNewsArticleBySlug(slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.date,
      images: [{ url: article.coverImage.src }],
    },
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await findNewsArticleBySlug(slug);

  if (!article) notFound();

  const liveProjects = await projectContentRepository.list();
  const project = article.projectSlug ? liveProjects.find((p) => p.slug === article.projectSlug) : undefined;
  const staticProject = article.projectSlug ? projects.find((p) => p.slug === article.projectSlug) : undefined;
  const allArticles = await newsRepository.list();
  const related = allArticles
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 2);

  return (
    <>
      <NewsArticleM article={article} project={project} related={related} />
      <DesktopOnly>
      <Section spacing="md">
        <Container size="narrow">
          <Reveal as="p" className="mb-6">
            <Link
              href="/news"
              className="text-label text-fg-subtle hover:text-fg inline-flex items-center gap-2 uppercase transition-colors"
            >
              <ArrowLeft aria-hidden className="size-3.5" />
              Back to News
            </Link>
          </Reveal>
          <Reveal delay={60} as="p" className="text-label text-fg-subtle mb-4 uppercase">
            {article.category} · {article.date}
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-display-l text-balance">{article.title}</h1>
          </Reveal>
        </Container>
      </Section>

      <Reveal delay={160}>
        <Container>
          <Media
            ratio="hero"
            radius="md"
            src={article.coverImage.src}
            alt={article.coverImage.alt}
            priority
            sizes="100vw"
          />
        </Container>
      </Reveal>

      <Section spacing="md">
        <Container size="narrow">
          <div className="flex flex-col gap-6">
            {article.content.map((paragraph, i) => (
              <Reveal key={i} delay={i * 40}>
                <p className="text-body-lg text-fg-muted">{paragraph}</p>
              </Reveal>
            ))}
          </div>

          {article.images && article.images.length > 0 && (
            <div className="mt-12 flex flex-col gap-6">
              {article.images.map((image) => (
                <Reveal key={image.src + image.alt}>
                  <Media ratio="wide" radius="md" src={image.src} alt={image.alt} sizes="100vw" />
                </Reveal>
              ))}
            </div>
          )}

          {staticProject && (
            <Reveal className="mt-16">
              <Divider />
              <Link
                href={`/projects/${staticProject.slug}`}
                className="group flex items-center justify-between gap-6 py-8"
              >
                <span>
                  <span className="text-label text-fg-subtle uppercase">Related Project</span>
                  <span className="text-h3 mt-1 block transition-colors duration-200 group-hover:text-accent">
                    {staticProject.name}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="text-fg-subtle size-5 shrink-0 transition-transform duration-200 ease-[var(--ease-standard)] group-hover:translate-x-1 group-hover:text-accent"
                />
              </Link>
              <Divider />
            </Reveal>
          )}
        </Container>
      </Section>

      {related.length > 0 && (
        <Section spacing="lg" background="surface">
          <Container size="narrow">
            <Reveal as="p" className="text-label text-fg-subtle mb-8 uppercase">
              More Stories
            </Reveal>
            <div className="flex flex-col gap-2">
              {related.map((story, i) => (
                <Reveal key={story.id} delay={i * 60}>
                  <Link
                    href={`/news/${story.slug}`}
                    className="group flex items-center justify-between gap-6 py-6 transition-[padding] duration-300 ease-[var(--ease-standard)] hover:pl-3"
                  >
                    <span>
                      <span className="text-label text-fg-subtle uppercase">
                        {story.category} · {story.date}
                      </span>
                      <span className="text-h3 mt-1 block transition-colors duration-200 group-hover:text-accent">
                        {story.title}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="text-fg-subtle size-5 shrink-0 transition-transform duration-200 ease-[var(--ease-standard)] group-hover:translate-x-1 group-hover:text-accent"
                    />
                  </Link>
                  <Divider />
                </Reveal>
              ))}
            </div>
          </Container>
        </Section>
      )}
      </DesktopOnly>
    </>
  );
}
