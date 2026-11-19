import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LandownerForm } from "@/components/admin/landowners/LandownerForm";
import { updateLandowner } from "@/features/landowners/landownerActions";
import { landownerRepository } from "@/features/landowners/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLandownerPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "landowner.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this landowner." />
      </div>
    );
  }

  const landowner = await landownerRepository.findById(id);
  if (!landowner) notFound();

  const boundAction = updateLandowner.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={landowner.name}
        breadcrumbs={[
          { label: "Landowners", href: "/admin/landowners" },
          { label: landowner.name, href: `/admin/landowners/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <LandownerForm action={boundAction} landowner={landowner} submitLabel="Save Changes" />
      </div>
    </>
  );
}
