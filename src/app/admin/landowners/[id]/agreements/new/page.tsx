import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AgreementForm } from "@/components/admin/landowners/AgreementForm";
import { createAgreement } from "@/features/landowners/agreementActions";
import { landownerRepository } from "@/features/landowners/repository";
import { projectRepository } from "@/features/projects/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewAgreementPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "landowner.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add an agreement." />
      </div>
    );
  }

  const [landowner, projects] = await Promise.all([landownerRepository.findById(id), projectRepository.list()]);
  if (!landowner) notFound();

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"New Agreement"}</AdminText>}
        breadcrumbs={[
          { label: "Landowners", href: "/admin/landowners" },
          { label: landowner.name, href: `/admin/landowners/${id}` },
          { label: "New Agreement", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <AgreementForm action={createAgreement} landownerId={id} projects={projects} submitLabel="Add Agreement" />
      </div>
    </>
  );
}
