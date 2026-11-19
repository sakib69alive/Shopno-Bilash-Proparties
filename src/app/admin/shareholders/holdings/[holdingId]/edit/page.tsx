import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ShareholdingForm } from "@/components/admin/shareholders/ShareholdingForm";
import { updateShareholding } from "@/features/shareholders/shareholdingActions";
import { shareholderRepository, shareholdingRepository } from "@/features/shareholders/repository";
import { projectRepository } from "@/features/projects/repository";

interface PageProps {
  params: Promise<{ holdingId: string }>;
}

export default async function EditShareholdingPage({ params }: PageProps) {
  const { holdingId } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "shareholder.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this shareholding." />
      </div>
    );
  }

  const holding = await shareholdingRepository.findById(holdingId);
  if (!holding) notFound();

  const [shareholder, projects] = await Promise.all([
    shareholderRepository.findById(holding.shareholderId),
    projectRepository.list(),
  ]);
  if (!shareholder) notFound();

  const boundAction = updateShareholding.bind(null, holdingId);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Edit Shareholding"}</AdminText>}
        breadcrumbs={[
          { label: "Shareholders", href: "/admin/shareholders" },
          { label: shareholder.name, href: `/admin/shareholders/${shareholder.id}` },
          { label: "Edit Shareholding", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <ShareholdingForm action={boundAction} shareholderId={shareholder.id} holding={holding} projects={projects} submitLabel="Save Changes" />
      </div>
    </>
  );
}
