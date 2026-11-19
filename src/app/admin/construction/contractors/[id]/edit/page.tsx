import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ContractorForm } from "@/components/admin/construction/ContractorForm";
import { updateContractor } from "@/features/contractors/actions";
import { contractorRepository } from "@/features/contractors/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContractorPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "construction.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this contractor." />
      </div>
    );
  }

  const contractor = await contractorRepository.findById(id);
  if (!contractor) notFound();

  const boundAction = updateContractor.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={contractor.name}
        breadcrumbs={[
          { label: "Construction", href: "/admin/construction" },
          { label: "Contractors", href: "/admin/construction/contractors" },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <ContractorForm action={boundAction} contractor={contractor} submitLabel="Save Changes" />
      </div>
    </>
  );
}
