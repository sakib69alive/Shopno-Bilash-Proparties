import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { DocumentsAdminExplorer, type DocumentRow } from "@/components/admin/documents/DocumentsAdminExplorer";
import { documentRepository } from "@/features/documents/repository";
import { resolveDocumentOwner } from "@/features/documents/resolveOwner";

/**
 * Admin Step 12 — Documents Foundation. Reads `documentRepository` (the
 * internal `types/document.ts` shape — one polymorphic record type for
 * every owner kind). Full create/edit/delete for the document's metadata;
 * `fileUrl` is a URL field, not a real upload (see the audit's own Medium
 * finding on that — separate work).
 */
export default async function AdminDocumentsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "documents.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Documents." />
      </div>
    );
  }

  let rows: DocumentRow[];
  try {
    const documents = await documentRepository.list();
    rows = await Promise.all(
      documents.map(async (doc) => {
        const owner = await resolveDocumentOwner(doc.ownerType, doc.ownerId);
        return { ...doc, ownerLabel: owner.label, ownerHref: owner.href };
      }),
    );
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Documents couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canCreate = hasPermission(user.role, "documents.upload");
  const canDelete = hasPermission(user.role, "documents.delete");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Documents"}</AdminText>}
        description={<AdminText>{"Contracts, IDs, deeds, and every other file tied to a business record."}</AdminText>}
        primaryAction={
          canCreate && (
            <Link href="/admin/documents/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Document"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <DocumentsAdminExplorer documents={rows} canCreate={canCreate} canDelete={canDelete} />
      </div>
    </>
  );
}
