import { createPrismaRepository } from "@/lib/prismaRepository";
import type { Repository } from "@/lib/repository";
import type { Unit } from "@/content/units";
import { sortByOrder } from "@/lib/sortOrder";

/**
 * Website CMS — Properties (public unit listings, `content/units.ts`'s
 * shape — not the internal `types/unit.ts` shape Admin Step 6 uses for
 * business data). Same pattern as Projects CMS. Backed by the real
 * database (`prisma/schema.prisma`) — see `src/lib/prismaRepository.ts`.
 * Seeded once, from the existing demo units, by `prisma/seed.ts`.
 *
 * The public `/properties` page (via `lib/propertiesAsync.ts`), the unit
 * detail page (`/projects/[slug]/units/[unitSlug]`), `/sitemap` +
 * `sitemap.xml`, `/saved` (`SavedPageContent`, now fed via a prop from its
 * Server Component parent instead of reading `lib/properties.ts` itself),
 * and search/route-titles (via `lib/siteNavDataAsync.ts`, see
 * `projectContent/repository.ts`'s doc comment) all read live data now.
 * Only `lib/properties.ts`'s sync `getPropertyListings()` still reads the
 * static file directly, kept for any caller that genuinely needs
 * synchronous access.
 */
const unitContentBase = createPrismaRepository<Unit>("unitContent");

/** `list()` returns units in the admin-chosen order (Admin → Website → Properties → arrows). */
export const unitContentRepository: Repository<Unit> = {
  ...unitContentBase,
  list: async () => sortByOrder(await unitContentBase.list()),
};

export async function findUnitContentBySlug(projectSlug: string, unitSlug: string): Promise<Unit | null> {
  const all = await unitContentRepository.list();
  return all.find((u) => u.slug === unitSlug && u.projectSlug === projectSlug) ?? null;
}

/** Same slugify convention as `features/news/repository.ts`'s `slugifyTitle`. */
export function slugifyUnitName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
