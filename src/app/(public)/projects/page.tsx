import type { Metadata } from "next";
import { Suspense } from "react";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { ProjectsM } from "@/components/mobile/ProjectsM";
import { ProjectResults } from "@/components/project/ProjectResults";
import { ProjectsBridge } from "@/components/project/ProjectsBridge";
import { ProjectsEmptyState } from "@/components/project/ProjectsEmptyState";
import { ProjectsIntro } from "@/components/project/ProjectsIntro";
import { projectContentRepository } from "@/features/projectContent/repository";
import { unitContentRepository } from "@/features/unitContent/repository";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Every residential development Shopno Bilash Properties is currently planning, building or has delivered.",
};

/**
 * Reads `projectContentRepository` (Website CMS), not the static
 * `content/projects.ts` array directly — admin create/edit/delete now
 * reflects here. See that repository's own doc comment for the other
 * public surfaces (sitemap, search, portfolio strip, etc.) still on the
 * static file, a deliberate, documented gap.
 */
export default async function ProjectsPage() {
  const [projects, units] = await Promise.all([projectContentRepository.list(), unitContentRepository.list()]);

  const bridgeStats = {
    developmentCount: projects.length,
    cityCount: new Set(projects.map((p) => p.city)).size,
    activeCount: projects.filter((p) => p.status === "ongoing" || p.status === "near-completion").length,
  };

  return (
    <>
      <ProjectsM projects={projects} units={units} />
      <DesktopOnly>
      <ProjectsIntro />
      <ProjectsBridge stats={bridgeStats} />

      {projects.length === 0 ? (
        <ProjectsEmptyState />
      ) : (
        <Suspense fallback={null}>
          <ProjectResults projects={projects} />
        </Suspense>
      )}
      </DesktopOnly>
    </>
  );
}
