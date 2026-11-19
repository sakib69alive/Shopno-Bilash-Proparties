import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PageContentForm } from "@/components/admin/pages/PageContentForm";
import { updatePageContent } from "@/features/pages/actions";
import { pageContentRepository } from "@/features/pages/repository";
import type { PageContentId } from "@/content/legal";

interface PageProps {
  params: Promise<{ id: string }>;
}

const VALID_IDS: PageContentId[] = ["privacy", "terms", "disclaimer", "cookies"];

function isPageContentId(value: string): value is PageContentId {
  return (VALID_IDS as string[]).includes(value);
}

export default async function EditPageContentPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit Pages content." />
      </div>
    );
  }

  if (!isPageContentId(id)) notFound();

  const page = await pageContentRepository.findById(id);
  if (!page) notFound();

  const boundAction = updatePageContent.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={page.title}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Pages", href: "/admin/content/pages" },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <PageContentForm action={boundAction} page={page} />
      </div>
    </>
  );
}
