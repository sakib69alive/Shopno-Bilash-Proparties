import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ShareholdingForm } from "@/components/admin/shareholders/ShareholdingForm";
import { createShareholding } from "@/features/shareholders/shareholdingActions";
import { shareholderRepository } from "@/features/shareholders/repository";
import { projectRepository } from "@/features/projects/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewShareholdingPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "shareholder.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add a shareholding." />
      </div>
    );
  }

  const [shareholder, projects] = await Promise.all([shareholderRepository.findById(id), projectRepository.list()]);
  if (!shareholder) notFound();

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"New Shareholding"}</AdminText>}
        breadcrumbs={[
          { label: "Shareholders", href: "/admin/shareholders" },
          { label: shareholder.name, href: `/admin/shareholders/${id}` },
          { label: "New Shareholding", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <ShareholdingForm action={createShareholding} shareholderId={id} projects={projects} submitLabel="Add Shareholding" />
      </div>
    </>
  );
}
