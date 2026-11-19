import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NewsArticleForm } from "@/components/admin/news/NewsArticleForm";
import { updateNewsArticle } from "@/features/news/actions";
import { newsRepository } from "@/features/news/repository";
import { projects } from "@/content/projects";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditNewsArticlePage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit News content." />
      </div>
    );
  }

  const article = await newsRepository.findById(id);
  if (!article) notFound();

  const boundAction = updateNewsArticle.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={article.title}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "News", href: "/admin/content/news" },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <NewsArticleForm action={boundAction} article={article} projects={projects} submitLabel="Save Changes" />
      </div>
    </>
  );
}
