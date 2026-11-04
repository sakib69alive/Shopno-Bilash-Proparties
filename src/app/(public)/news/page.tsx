import type { Metadata } from "next";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { NewsM } from "@/components/mobile/NewsM";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { FeaturedStory } from "@/components/news/FeaturedStory";
import { NewsClosingCTA } from "@/components/news/NewsClosingCTA";
import { NewsHero } from "@/components/news/NewsHero";
import { StoryDiscovery } from "@/components/news/StoryDiscovery";
import { newsRepository } from "@/features/news/repository";

export const metadata: Metadata = {
  title: "News & Updates",
  description:
    "Project updates, construction milestones and news from Shopno Bilash Properties.",
};

/**
 * Reads from `newsRepository` (CMS Step 1), not `content/news.ts`
 * directly, so an article created/edited/deleted in `/admin/content/news`
 * shows up here without a rebuild — `revalidatePath("/news")` in
 * `features/news/actions.ts` keeps this page's cache in sync after every
 * mutation.
 */
export default async function NewsPage() {
  const newsArticles = await newsRepository.list();
  const featured = newsArticles.find((a) => a.featured) ?? newsArticles[0];
  const rest = newsArticles.filter((a) => a.id !== featured?.id);

  if (!featured) {
    return (
      <>
        <NewsM articles={newsArticles} />
        <DesktopOnly>
        <NewsHero />
        <Section spacing="lg">
          <Container size="narrow" className="text-center">
            <Reveal>
              <p className="text-h2">More stories are coming.</p>
              <p className="text-body text-fg-muted mt-4">
                We&rsquo;ll share project updates and news here as they happen.
              </p>
            </Reveal>
          </Container>
        </Section>
        <NewsClosingCTA />
        </DesktopOnly>
      </>
    );
  }

  return (
    <>
      <NewsM articles={newsArticles} />
      <DesktopOnly>
      <NewsHero />
      <FeaturedStory article={featured} />
      <StoryDiscovery articles={rest} />
      <NewsClosingCTA />
      </DesktopOnly>
    </>
  );
}
