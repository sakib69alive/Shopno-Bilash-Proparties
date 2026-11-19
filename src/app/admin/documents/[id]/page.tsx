import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteDocumentButton } from "@/components/admin/documents/DeleteDocumentButton";
import { formatDate } from "@/lib/format";
import { documentRepository } from "@/features/documents/repository";
import { resolveDocumentOwner } from "@/features/documents/resolveOwner";
import { userRepository } from "@/features/users/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

const OWNER_TYPE_LABEL: Record<string, string> = {
  company: "Company",
  project: "Project",
  unit: "Unit",
  customer: "Customer",
  shareholder: "Shareholder",
  landowner: "Landowner",
  vendor: "Vendor",
  transaction: "Transaction",
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle uppercase">{label}</p>
      <p className="text-body-sm text-fg mt-0.5">{value}</p>
    </div>
  );
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The download link is gated on `documents.view` (already required to
 * reach this page at all) — `visibility` further restricting who may
 * fetch `fileUrl` beyond that is a real gap this doesn't close (it would
 * need a portal-aware access model this step didn't touch), but every
 * role that can see this page today is staff, so it's not a live hole.
 */
export default async function AdminDocumentDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "documents.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this document." />
      </div>
    );
  }

  let document, owner, uploadedBy;
  try {
    document = await documentRepository.findById(id);
    owner = document ? await resolveDocumentOwner(document.ownerType, document.ownerId) : null;
    uploadedBy = document ? await userRepository.findById(document.uploadedBy) : null;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This document couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!document) notFound();

  const canManage = hasPermission(user.role, "documents.upload");
  const canDelete = hasPermission(user.role, "documents.delete");

  return (
    <>
      <AdminPageHeader
        title={document.name}
        breadcrumbs={[{ label: "Documents", href: "/admin/documents" }, { label: document.name }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={document.status} />
            {canManage && (
              <Link href={`/admin/documents/${document.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                <AdminText>{"Edit"}</AdminText>
              </Link>
            )}
            {canDelete && <DeleteDocumentButton id={document.id} name={document.name} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"File"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Type" value={document.type} />
            <Fact label="Category" value={document.category} />
            <Fact label="Version" value={String(document.version)} />
            <Fact label="Visibility" value={document.visibility} />
            <Fact label="Size" value={formatFileSize(document.fileSize)} />
          </div>
          <a
            href={document.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-body-sm text-accent hover:text-accent-strong transition-colors"
          >
            <AdminText>{"Open file →"}</AdminText>
          </a>
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Belongs To"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Owner Type" value={OWNER_TYPE_LABEL[document.ownerType] ?? document.ownerType} />
            <Fact label="Owner" value={owner?.label ?? "—"} />
          </div>
          {owner?.href && (
            <Link href={owner.href} className="text-body-sm text-accent hover:text-accent-strong transition-colors">
              <AdminText>{"View "}</AdminText>{OWNER_TYPE_LABEL[document.ownerType]?.toLowerCase() ?? document.ownerType} →
            </Link>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase">Upload</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Uploaded By" value={uploadedBy?.name ?? "—"} />
            <Fact label="Upload Date" value={formatDate(new Date(document.uploadDate))} />
          </div>
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(document.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(document.updatedAt))} />
          </div>
        </section>
      </div>
    </>
  );
}
