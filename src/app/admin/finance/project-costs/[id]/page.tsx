import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteProjectBudgetButton } from "@/components/admin/finance/DeleteProjectBudgetButton";
import { formatBDT, formatDate } from "@/lib/format";
import { projectBudgetRepository } from "@/features/finance/repository";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProject } from "@/lib/projectScope";

interface PageProps {
  params: Promise<{ id: string }>;
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "error" | "success" }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle uppercase">{label}</p>
      <p className={`text-body-sm mt-0.5 ${tone === "error" ? "text-error" : tone === "success" ? "text-success" : "text-fg"}`}>
        {value}
      </p>
    </div>
  );
}

/**
 * Variance (actual − budgeted) is computed for display only, never stored.
 */
export default async function AdminProjectBudgetDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this budget line." />
      </div>
    );
  }

  let budget, project;
  try {
    budget = await projectBudgetRepository.findById(id);
    project = budget ? await projectRepository.findById(budget.projectId) : null;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This budget line couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!budget) notFound();
  if (!canAccessProject(user, budget.projectId)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This budget line belongs to a project you don't have access to." />
      </div>
    );
  }

  const variance = budget.actual.amount - budget.budgeted.amount;
  const over = variance > 0;
  const canManage = hasPermission(user.role, "finance.manage");

  return (
    <>
      <AdminPageHeader
        title={budget.category}
        breadcrumbs={[{ label: "Project Finance", href: "/admin/finance/project-costs" }, { label: budget.category }]}
        secondaryActions={
          canManage && (
            <div className="flex items-center gap-2">
              <Link href={`/admin/finance/project-costs/${budget.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                <AdminText>{"Edit"}</AdminText>
              </Link>
              <DeleteProjectBudgetButton id={budget.id} category={budget.category} />
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Project"}</AdminText></h2>
          {project ? (
            <>
              <Fact label="Project" value={project.name} />
              <Link
                href={`/admin/projects/${project.id}`}
                className="text-body-sm text-accent hover:text-accent-strong transition-colors"
              >
                <AdminText>{"View project →"}</AdminText>
              </Link>
            </>
          ) : (
            <p className="text-body-sm text-fg-subtle"><AdminText>{"This project no longer exists."}</AdminText></p>
          )}
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Budget"}</AdminText></h2>
          <div className="grid grid-cols-3 gap-4">
            <Fact label="Budgeted" value={formatBDT(budget.budgeted.amount)} />
            <Fact label="Actual (Manual)" value={formatBDT(budget.actual.amount)} />
            <Fact
              label="Variance"
              value={`${over ? "+" : ""}${formatBDT(variance)}`}
              tone={over ? "error" : "success"}
            />
          </div>
          {project && (
            <p className="text-caption text-fg-subtle">
              &quot;Actual&quot; here is typed by hand, not calculated — for the live number from real Purchases, Expenses, and
              Contractor Payments, see{" "}
              <Link href={`/admin/projects/${project.id}/reports`} className="text-accent hover:text-accent-strong transition-colors">
                <AdminText>{"this project's Reports"}</AdminText>
              </Link>
              .
            </p>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Details"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Date" value={formatDate(new Date(budget.date))} />
            <Fact label="Reference" value={budget.reference ?? "—"} />
          </div>
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(budget.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(budget.updatedAt))} />
          </div>
        </section>
      </div>
    </>
  );
}
