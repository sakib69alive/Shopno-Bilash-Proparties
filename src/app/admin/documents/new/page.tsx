import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DocumentForm } from "@/components/admin/documents/DocumentForm";
import { createDocument } from "@/features/documents/actions";
import type { DocumentOwnerType } from "@/types/document";
import { customerRepository } from "@/features/customers/repository";
import { shareholderRepository } from "@/features/shareholders/repository";
import { landownerRepository } from "@/features/landowners/repository";

async function loadPeople() {
  const [customers, shareholders, landowners] = await Promise.all([customerRepository.list(), shareholderRepository.list(), landownerRepository.list()]);
  const opt = (xs: { id: string; name: string }[]) => xs.map((x) => ({ value: x.id, label: x.name })).sort((a, b) => a.label.localeCompare(b.label));
  return { customer: opt(customers), shareholder: opt(shareholders), landowner: opt(landowners) };
}


const OWNER_TYPES: DocumentOwnerType[] = ["company", "project", "unit", "customer", "shareholder", "landowner", "vendor", "transaction"];

interface PageProps {
  searchParams: Promise<{ ownerType?: string; ownerId?: string }>;
}

export default async function NewDocumentPage({ searchParams }: PageProps) {
  const { ownerType, ownerId } = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "documents.upload")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add a document." />
      </div>
    );
  }

  const defaultOwnerType = ownerType && (OWNER_TYPES as string[]).includes(ownerType) ? (ownerType as DocumentOwnerType) : undefined;

  return (
    <>
      <AdminPageHeader title="New Document" breadcrumbs={[{ label: "Documents", href: "/admin/documents" }, { label: "New" }]} />
      <div className="p-4 sm:p-6">
        <DocumentForm
          action={createDocument}
          submitLabel="Add Document"
          defaultOwnerType={defaultOwnerType}
          defaultOwnerId={ownerId}
          people={await loadPeople()}
        />
      </div>
    </>
  );
}
