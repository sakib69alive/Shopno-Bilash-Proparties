import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AgreementForm } from "@/components/admin/landowners/AgreementForm";
import { updateAgreement } from "@/features/landowners/agreementActions";
import { landownerRepository, agreementRepository } from "@/features/landowners/repository";
import { projectRepository } from "@/features/projects/repository";

interface PageProps {
  params: Promise<{ agreementId: string }>;
}

export default async function EditAgreementPage({ params }: PageProps) {
  const { agreementId } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "landowner.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this agreement." />
      </div>
    );
  }

  const agreement = await agreementRepository.findById(agreementId);
  if (!agreement) notFound();

  const [landowner, projects] = await Promise.all([
    landownerRepository.findById(agreement.landownerId),
    projectRepository.list(),
  ]);
  if (!landowner) notFound();

  const boundAction = updateAgreement.bind(null, agreementId);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Edit Agreement"}</AdminText>}
        breadcrumbs={[
          { label: "Landowners", href: "/admin/landowners" },
          { label: landowner.name, href: `/admin/landowners/${landowner.id}` },
          { label: "Edit Agreement", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <AgreementForm action={boundAction} landownerId={landowner.id} agreement={agreement} projects={projects} submitLabel="Save Changes" />
      </div>
    </>
  );
}
