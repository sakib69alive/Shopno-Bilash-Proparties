import type { Project } from "@/content/projects";

export function getHomeFeaturedProjects(projects: Project[], ids?: readonly string[] | null): Project[] {
  if (ids == null) {
    return [...projects.filter((project) => project.featured), ...projects.filter((project) => !project.featured)].slice(0, 4);
  }

  const projectsById = new Map(projects.map((project) => [project.id, project]));
  return [...new Set(ids)].flatMap((id) => projectsById.get(id) ?? []);
}
