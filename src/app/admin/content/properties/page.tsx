import Link from "next/link";
import { ListPlus, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { UnitContentAdminTable } from "@/components/admin/unitContent/UnitContentAdminTable";
import { unitContentRepository } from "@/features/unitContent/repository";
import { projectContentRepository } from "@/features/projectContent/repository";

/** List page for the Website CMS's Properties (Unit) domain — same shape as Projects CMS's list page. */
export default async function AdminUnitContentListPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; added?: string }>;
}) {
  const { project: initialProject, added } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to manage Properties content." />
      </div>
    );
  }

  const [units, projects] = await Promise.all([unitContentRepository.list(), projectContentRepository.list()]);
  const projectsBySlug = new Map(projects.map((p) => [p.slug, p]));
  // Grouped by project (in the projects' own order), each project's units in their chosen order.
  const projectRank = new Map(projects.map((p, i) => [p.slug, i]));
  const rows = units
    .map((u) => ({ ...u, projectName: projectsBySlug.get(u.projectSlug)?.name ?? u.projectSlug }))
    .sort((a, b) => (projectRank.get(a.projectSlug) ?? 9999) - (projectRank.get(b.projectSlug) ?? 9999));

  const canCreate = hasPermission(user.role, "content.create");
  const canDelete = hasPermission(user.role, "content.delete");
  const canUpdate = hasPermission(user.role, "content.update");

  return (
    <>
      <AdminPageHeader
        title="Properties"
        description="Individual units shown on the public Properties pages. Use the arrows to choose which come first within each project."
        breadcrumbs={[{ label: "Content", href: "/admin/content" }, { label: "Properties" }]}
        primaryAction={
          canCreate && (
            <div className="flex gap-2">
              <Link href="/admin/content/properties/bulk" className={buttonVariants({ variant: "outline", size: "md" })}>
                <ListPlus aria-hidden className="size-4" />
                Add in bulk
              </Link>
              <Link href="/admin/content/properties/new" className={buttonVariants({ size: "md" })}>
                <Plus aria-hidden className="size-4" />
                New Property
              </Link>
            </div>
          )
        }
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {added && (
          <p role="status" className="bg-success-soft text-success rounded-md px-3.5 py-3 text-sm">
            Added {added} {added === "1" ? "unit" : "units"}. Open any of them to add photos or a floor plan.
          </p>
        )}
        <UnitContentAdminTable
          units={rows}
          projects={projects.map((p) => ({ slug: p.slug, name: p.name }))}
          initialProject={initialProject}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      </div>
    </>
  );
}
