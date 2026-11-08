import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SendDocumentForm } from "@/components/admin/documents/SendDocumentForm";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { saleRepository } from "@/features/sales/repository";
import { unitRepository } from "@/features/units/repository";

export const metadata = { title: "Send a document to clients" };

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

/** Add one file and send it to one or many clients' own pages (their app's Documents). */
export default async function SendDocumentPage({ searchParams }: PageProps) {
  const { ids } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "documents.upload") || !hasPermission(user.role, "customer.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to send documents to clients." />
      </div>
    );
  }

  const [customers, projects, sales, units] = await Promise.all([customerRepository.list(), projectRepository.list(), saleRepository.list(), unitRepository.list()]);
  const recipients = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      projectIds: Array.from(
        new Set([
          ...sales.filter((s) => s.customerId === c.id && s.status !== "cancelled").map((s) => s.projectId),
          ...units.filter((u) => u.customerId === c.id).map((u) => u.projectId),
        ]),
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <AdminPageHeader
        title="Send a document to clients"
        description="Add a PDF or picture, choose one client or many, and it appears in each client's own page."
        breadcrumbs={[{ label: "Documents", href: "/admin/documents" }, { label: "Send to clients" }]}
      />
      <SendDocumentForm
        recipients={recipients}
        projects={projects.map((p) => ({ value: p.id, label: p.name }))}
        initialPicked={(ids ?? "").split(",").map((s) => s.trim()).filter(Boolean)}
      />
    </>
  );
}
