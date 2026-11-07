import { createPrismaRepository } from "@/lib/prismaRepository";
import type { Repository } from "@/lib/repository";
import type { Project } from "@/content/projects";
import { sortByOrder } from "@/lib/sortOrder";

/**
 * Website CMS — Projects. Same pattern as CMS Step 1 (News): the public
 * `content/projects.ts` shape (not the internal `types/project.ts` shape
 * Admin Steps 5+ use for business data) is now backed by a repository, so
 * admin can create/edit/delete what the public Projects pages show.
 * Backed by the real database (`prisma/schema.prisma`) — see
 * `src/lib/prismaRepository.ts`. Seeded once, from the existing demo
 * entries, by `prisma/seed.ts` — not from this module, so nothing resets
 * the moment the server restarts; only *editing* moves data away from what
 * the seed inserted.
 *
 * ⚠ Known, documented gap, same honesty as CMS Step 1's: the public
 * `/projects` list, `/projects/[slug]` detail page, `/sitemap` +
 * `sitemap.xml`, the homepage portfolio strip, the gallery lightbox's
 * project captions, the landowners partnership page, the contact form's
 * project dropdown, the services "related project" widget, and the
 * construction pages (`/construction` and `/projects/[slug]/construction`)
 * all read from here now, with matching `revalidatePath` calls on every
 * mutation. `lib/searchIndex.ts` and `lib/routeTitles.ts` also now read
 * live data — not from here directly, but via `lib/siteNavDataAsync.ts`,
 * fetched once by `(public)/layout.tsx` and passed down as props to the
 * Client Components that need it (`SearchOverlay`/`SitePageLoader`),
 * since neither can `await` a repository call itself. Only
 * `lib/properties.ts`'s sync `getPropertyListings()` still reads
 * `content/projects.ts` directly, kept for any caller that genuinely needs
 * synchronous access — see that file's own doc comment.
 */
const projectContentBase = createPrismaRepository<Project>("projectContent");

/** `list()` returns projects in the admin-chosen order (Admin → Website → Projects → arrows), so every public page that lists them follows it. */
export const projectContentRepository: Repository<Project> = {
  ...projectContentBase,
  list: async () => sortByOrder(await projectContentBase.list()),
};

export async function findProjectContentBySlug(slug: string): Promise<Project | null> {
  const all = await projectContentRepository.list();
  return all.find((p) => p.slug === slug) ?? null;
}

/** Same slugify convention as `features/news/repository.ts`'s `slugifyTitle`. */
export function slugifyProjectName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
