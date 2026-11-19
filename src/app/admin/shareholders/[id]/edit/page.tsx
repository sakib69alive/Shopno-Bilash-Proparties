import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ShareholderForm } from "@/components/admin/shareholders/ShareholderForm";
import { updateShareholder } from "@/features/shareholders/shareholderActions";
import { shareholderRepository } from "@/features/shareholders/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditShareholderPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "shareholder.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this shareholder." />
      </div>
    );
  }

  const shareholder = await shareholderRepository.findById(id);
  if (!shareholder) notFound();

  const boundAction = updateShareholder.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={shareholder.name}
        breadcrumbs={[
          { label: "Shareholders", href: "/admin/shareholders" },
          { label: shareholder.name, href: `/admin/shareholders/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <ShareholderForm action={boundAction} shareholder={shareholder} submitLabel="Save Changes" />
      </div>
    </>
  );
}
