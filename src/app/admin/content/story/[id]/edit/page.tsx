import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MilestoneForm } from "@/components/admin/story/MilestoneForm";
import { updateMilestone } from "@/features/companyMilestones/actions";
import { companyMilestoneRepository } from "@/features/companyMilestones/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMilestonePage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit a Story entry." />
      </div>
    );
  }

  const milestone = await companyMilestoneRepository.findById(id);
  if (!milestone) notFound();

  const boundAction = updateMilestone.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={milestone.title}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Our Story", href: "/admin/content/story" },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <MilestoneForm action={boundAction} milestone={milestone} submitLabel="Save Changes" />
      </div>
    </>
  );
}
