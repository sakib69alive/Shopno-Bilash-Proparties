import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DocumentForm } from "@/components/admin/documents/DocumentForm";
import { customerRepository } from "@/features/customers/repository";
import { shareholderRepository } from "@/features/shareholders/repository";
import { landownerRepository } from "@/features/landowners/repository";

async function loadPeople() {
  const [customers, shareholders, landowners] = await Promise.all([customerRepository.list(), shareholderRepository.list(), landownerRepository.list()]);
  const opt = (xs: { id: string; name: string }[]) => xs.map((x) => ({ value: x.id, label: x.name })).sort((a, b) => a.label.localeCompare(b.label));
  return { customer: opt(customers), shareholder: opt(shareholders), landowner: opt(landowners) };
}

import { updateDocument } from "@/features/documents/actions";
import { documentRepository } from "@/features/documents/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDocumentPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "documents.upload")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this document." />
      </div>
    );
  }

  const document = await documentRepository.findById(id);
  if (!document) notFound();

  const boundAction = updateDocument.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={document.name}
        breadcrumbs={[
          { label: "Documents", href: "/admin/documents" },
          { label: document.name, href: `/admin/documents/${id}` },
          { label: "Edit" },
        ]}
      />
      <div className="p-4 sm:p-6">
        <DocumentForm action={boundAction} document={document} people={await loadPeople()} submitLabel="Save Changes" />
      </div>
    </>
  );
}
