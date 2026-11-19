import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { IconButton } from "@/components/ui/IconButton";
import { pageContentRepository } from "@/features/pages/repository";
import type { PageContentId } from "@/content/legal";

const PUBLIC_PATH: Record<PageContentId, string> = {
  privacy: "/privacy",
  terms: "/terms",
  disclaimer: "/disclaimer",
  cookies: "/cookies",
};

/**
 * No "New Page"/delete here on purpose — the four legal pages are a fixed
 * set (see `features/pages/repository.ts`), so this is a list of what
 * exists to edit, not a create-a-new-record flow.
 */
export default async function AdminPagesListPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to manage Pages content." />
      </div>
    );
  }

  const pages = await pageContentRepository.list();
  const canUpdate = hasPermission(user.role, "content.update");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Pages"}</AdminText>}
        description={<AdminText>{"Static legal pages shown on the public website."}</AdminText>}
        breadcrumbs={[{ label: "Content", href: "/admin/content" }, { label: "Pages", localize: true }]}
      />
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
        {pages.map((page) => (
          <div key={page.id} className="border-border bg-surface-raised flex flex-col gap-3 rounded-lg border p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={PUBLIC_PATH[page.id]} target="_blank" className="text-h4 text-fg hover:text-accent transition-colors">
                  {page.title}
                </Link>
                <p className="text-caption text-fg-subtle mt-1">
                  {page.sections.length} section{page.sections.length === 1 ? "" : "s"} · Last updated {page.lastUpdated}
                </p>
              </div>
              {canUpdate && (
                <Link href={`/admin/content/pages/${page.id}/edit`} className="shrink-0">
                  <IconButton icon={Pencil} label={`Edit ${page.title}`} size="sm" />
                </Link>
              )}
            </div>
            <p className="text-body-sm text-fg-muted line-clamp-3">{page.intro}</p>
            <Link
              href={PUBLIC_PATH[page.id]}
              target="_blank"
              className="text-caption text-accent hover:text-accent-strong mt-auto transition-colors"
            >
              <AdminText>{"View live page →"}</AdminText>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
