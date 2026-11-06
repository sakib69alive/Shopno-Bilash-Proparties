import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatementStudio } from "@/components/admin/statements/StatementStudio";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { saleRepository } from "@/features/sales/repository";
import { unitRepository } from "@/features/units/repository";
import { loadLetterhead } from "@/features/statements/builders";
import { customerPaymentRepository } from "@/features/finance/repository";
import { formatBDT, formatDate } from "@/lib/format";

export const metadata = { title: "Statements & Notices" };

/**
 * Statements & Notices — branded PDF / image documents built from the real
 * records (client payment statement, project summary, daily report) or from
 * typed text (notices). Notices need only report access; anything showing money
 * needs finance access.
 */
interface PageProps {
  searchParams: Promise<{ paymentId?: string; customerId?: string }>;
}

export default async function StatementsPage({ searchParams }: PageProps) {
  const { paymentId, customerId } = await searchParams;
  const user = await getCurrentUser();
  const canFinance = !!user && hasPermission(user.role, "finance.view");
  if (!user || (!canFinance && !hasPermission(user.role, "reports.view"))) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create statements or notices." />
      </div>
    );
  }

  const [customers, projects, sales, units, payments] = canFinance
    ? await Promise.all([customerRepository.list(), projectRepository.list(), saleRepository.list(), unitRepository.list(), customerPaymentRepository.list()])
    : [[], [], [], [], []];

  const allProjects = canFinance ? projects : await projectRepository.list();

  return (
    <>
      <AdminPageHeader
        title="Statements & Notices"
        breadcrumbs={[{ label: "Reports", href: "/admin/finance/reports" }, { label: "Statements & Notices" }]}
      />
      <StatementStudio
        allowFinance={canFinance}
        letterhead={await loadLetterhead()}
        addresses={allProjects.map((p) => ({
          value: p.id,
          label: `${p.name} site — ${[p.address, p.area, p.city].filter(Boolean).join(", ")}`,
          address: [p.address, p.area, p.city].filter(Boolean).join(", "),
        }))}
        initial={{ paymentId, customerId }}
        payments={[...payments]
          .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
          .map((p) => ({ value: p.id, customerId: p.customerId, label: `${formatDate(new Date(p.date))} · ${formatBDT(p.amount.amount)} · ${p.category}` }))}
        customers={customers.map((c) => ({ value: c.id, label: c.name })).sort((a, b) => a.label.localeCompare(b.label))}
        projects={projects.map((p) => ({ value: p.id, label: p.name }))}
        sales={sales
          .filter((s) => s.status !== "cancelled")
          .map((s) => ({
            value: s.id,
            customerId: s.customerId,
            label: `${units.find((u) => u.id === s.unitId)?.unitNumber ?? "Flat"} — ${projects.find((p) => p.id === s.projectId)?.name ?? ""}`.replace(/ — $/, ""),
          }))}
      />
    </>
  );
}
