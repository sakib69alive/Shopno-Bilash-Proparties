import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { NewsAdminTable } from "@/components/admin/news/NewsAdminTable";
import { newsRepository } from "@/features/news/repository";

/** List page for the first real CMS domain (CMS Step 1: News). Same authenticate → authorize shape every admin page in this app follows, checked again here even though AdminLayout already gates the whole `/admin/*` tree — a staff role without `content.view` still shouldn't see this one page. */
export default async function AdminNewsListPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to manage News content." />
      </div>
    );
  }

  const articles = await newsRepository.list();
  const canCreate = hasPermission(user.role, "content.create");
  const canDelete = hasPermission(user.role, "content.delete");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"News"}</AdminText>}
        description={<AdminText>{"Articles shown on the public News page, newest first."}</AdminText>}
        breadcrumbs={[{ label: "Content", href: "/admin/content" }, { label: "News", localize: true }]}
        primaryAction={
          canCreate && (
            <Link href="/admin/content/news/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Article"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <NewsAdminTable articles={articles} canDelete={canDelete} />
      </div>
    </>
  );
}
