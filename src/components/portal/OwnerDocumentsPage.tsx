import { FileText, Download, ShieldCheck, Clock, FolderOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { resolveOwnerContext } from "@/lib/ownerContext";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { DocumentStack } from "@/components/ui/DocumentStack";
import { formatDate } from "@/lib/format";
import { getOwnerDocuments } from "@/features/ownerPortal/queries";
import type { Document } from "@/types/document";

const HOW_IT_WORKS = [
  { icon: FolderOpen, title: "Shared By Your Team", description: "Agreements, receipts and approvals are added here as your project moves forward — nothing to upload yourself." },
  { icon: ShieldCheck, title: "Yours Alone", description: "Only documents tied to your own unit and account are ever visible here." },
  { icon: Clock, title: "Always Up To Date", description: "The moment a new document is shared, it appears in this list — no separate email or download link needed." },
];

/** Documents — a plain, real list of the owner's own visible documents; filtering/preview is deferred to a later Chapter 3 prompt. */
export async function OwnerDocumentsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const context = resolveOwnerContext(user);
  if (!context) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState title="No property linked yet" description="Please contact Shopno Bilash Properties Ltd. to complete your account setup." />
      </div>
    );
  }

  const documents = await getOwnerDocuments(context.ownerType, context.ownerId);
  return <OwnerDocumentsView documents={documents} />;
}

export function OwnerDocumentsView({ documents }: { documents: Document[] }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-6 lg:p-10">
      <div>
        <p className="text-label text-fg-subtle uppercase">Documents</p>
        <h1 className="text-display-m text-fg mt-2">
          {documents.length} Document{documents.length === 1 ? "" : "s"}
        </h1>
      </div>

      {documents.length === 0 ? (
        <EmptyState title="No documents are available yet" description="Documents shared with you will appear here." />
      ) : (
        <ul className="border-border bg-surface-raised divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
          {documents.map((doc) => (
            <li key={doc.id} className="hover:bg-surface flex items-center justify-between gap-3 p-5 transition-colors">
              <div className="flex items-center gap-3">
                <span className="bg-accent-soft text-accent flex size-10 shrink-0 items-center justify-center rounded-full">
                  <FileText className="size-4.5" aria-hidden />
                </span>
                <div>
                  <p className="text-body text-fg font-medium">{doc.name}</p>
                  <p className="text-caption text-fg-subtle mt-0.5">{doc.category} · {formatDate(new Date(doc.uploadDate))}</p>
                </div>
              </div>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg-muted hover:text-accent hover:bg-accent-soft flex size-10 shrink-0 items-center justify-center rounded-full transition-colors"
                aria-label={`Download ${doc.name}`}
              >
                <Download className="size-5" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="border-border bg-surface-raised mt-4 flex flex-col gap-8 rounded-2xl border p-6 sm:flex-row sm:items-center sm:gap-10 sm:p-8">
        <Reveal className="w-full max-w-[220px] shrink-0 self-center">
          <DocumentStack className="text-border-strong h-auto w-full" />
        </Reveal>
        <div className="flex flex-col gap-6">
          <p className="text-label text-fg-subtle uppercase">How Documents Work</p>
          {HOW_IT_WORKS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="bg-accent-soft text-accent flex size-9 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-body text-fg font-medium">{title}</p>
                <p className="text-body-sm text-fg-muted mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
