import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { resolveOwnerContext } from "@/lib/ownerContext";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { PaymentProgressHero } from "@/components/portal/PaymentProgressHero";
import { NextPaymentCard } from "@/components/portal/NextPaymentCard";
import { InstallmentScheduleList } from "@/components/portal/InstallmentScheduleList";
import { PaymentHistoryList } from "@/components/portal/PaymentHistoryList";
import { AdjustmentsList } from "@/components/portal/AdjustmentsList";
import { formatBDT } from "@/lib/format";
import { SalePaymentsSection } from "@/components/portal/SalePaymentsSection";
import {
  getOwnerUnits,
  getOwnerProjects,
  getOwnerOutstanding,
  getOwnerNextInstallment,
  getOwnerInstallmentSchedule,
  getOwnerAdjustments,
  getOwnerPaymentHistory,
  getOwnerSaleSummaries,
} from "@/features/ownerPortal/queries";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-label text-fg-subtle mb-4 uppercase">{children}</p>;
}

/**
 * "All Properties" financial overview — Chapter 3 Prompt 3 §5/§19. Every
 * per-property row groups by project, not by unit: a `CostAllocation`
 * contribution is generated once per owner per project (see
 * `getOwnerUnitShares`'s doc comment), so an owner with two units in one
 * project genuinely shares one payment plan, not two independent ones —
 * showing it any other way would misstate what's actually owed.
 */
export async function OwnerPaymentsPage({ base }: { base: string }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const context = resolveOwnerContext(user);
  if (!context) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState
          title="No property is currently connected to your account."
          description="Please contact Shopno Bilash Properties Ltd. for assistance."
        />
      </div>
    );
  }

  const [
    units,
    projects,
    outstanding,
    nextInstallment,
    schedule,
    adjustments,
    payments,
    saleSummaries,
  ] = await Promise.all([
    getOwnerUnits(context.ownerType, context.ownerId),
    getOwnerProjects(context.ownerType, context.ownerId),
    getOwnerOutstanding(context.ownerType, context.ownerId),
    getOwnerNextInstallment(context.ownerType, context.ownerId),
    getOwnerInstallmentSchedule(context.ownerType, context.ownerId),
    getOwnerAdjustments(context.ownerType, context.ownerId),
    getOwnerPaymentHistory(context.ownerType, context.ownerId),
    getOwnerSaleSummaries(context.ownerType, context.ownerId),
  ]);
  // The flat payments are shown in full by the section above; the history below is the construction side only.
  const constructionPayments =
    saleSummaries.length > 0
      ? payments.filter((p) => p.category === "construction")
      : payments;

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const unitsByProject = new Map<string, typeof units>();
  for (const unit of units) {
    const list = unitsByProject.get(unit.projectId) ?? [];
    list.push(unit);
    unitsByProject.set(unit.projectId, list);
  }
  const propertyGroups = await Promise.all(
    Array.from(unitsByProject.entries()).map(
      async ([projectId, projectUnits]) => ({
        projectId,
        projectName: projectsById.get(projectId)?.name ?? "—",
        units: projectUnits,
        outstanding: await getOwnerOutstanding(
          context.ownerType,
          context.ownerId,
          projectId,
        ),
      }),
    ),
  );

  const hasAnyPlan = outstanding.totalPayable > 0;
  const hasAnything = hasAnyPlan || saleSummaries.length > 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 p-4 pb-16 sm:p-6 lg:p-10">
      <div>
        <p className="text-label text-fg-subtle uppercase">Payments</p>
        <h1 className="text-display-m text-fg mt-2">Financial Overview</h1>
        <p className="text-body text-fg-muted mt-1">
          All properties, combined.
        </p>
      </div>

      {!hasAnything ? (
        <EmptyState
          title="No payment plan is active yet"
          description="Once a payment plan is set up for your property, it will appear here."
        />
      ) : (
        <>
          <SalePaymentsSection summaries={saleSummaries} />

          {hasAnyPlan && (
            <>
              <Reveal>
                <PaymentProgressHero
                  totalPayable={outstanding.totalPayable}
                  totalPaid={outstanding.totalPaid}
                  totalOutstanding={outstanding.totalOutstanding}
                  overdueAmount={
                    outstanding.overdueCount > 0
                      ? schedule
                          .filter((s) => s.status === "overdue")
                          .reduce((sum, s) => sum + s.outstanding, 0)
                      : undefined
                  }
                />
              </Reveal>

              <Reveal>
                <SectionHeading>Next Payment</SectionHeading>
                <NextPaymentCard installment={nextInstallment} />
              </Reveal>

              {propertyGroups.length > 1 && (
                <Reveal>
                  <SectionHeading>My Properties</SectionHeading>
                  <ul className="border-border bg-surface-raised divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
                    {propertyGroups.map((group) => (
                      <li key={group.projectId}>
                        <Link
                          href={`${base}/payments/${group.units[0].id}`}
                          className="hover:bg-surface flex items-center justify-between gap-3 p-5 transition-colors"
                        >
                          <div>
                            <p className="text-body text-fg font-medium">
                              {group.projectName}
                            </p>
                            <p className="text-body-sm text-fg-muted mt-0.5">
                              {group.units.map((u) => u.unitNumber).join(", ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-body text-fg font-medium">
                              {formatBDT(group.outstanding.totalOutstanding)}
                            </p>
                            <ChevronRight
                              aria-hidden
                              className="text-fg-subtle size-4"
                            />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}

              <Reveal>
                <SectionHeading>Installment Schedule</SectionHeading>
                <InstallmentScheduleList installments={schedule} />
              </Reveal>

              {adjustments.length > 0 && (
                <Reveal>
                  <SectionHeading>Adjustments</SectionHeading>
                  <AdjustmentsList adjustments={adjustments} />
                </Reveal>
              )}

              {(constructionPayments.length > 0 ||
                saleSummaries.length === 0) && (
                <Reveal>
                  <SectionHeading>
                    {saleSummaries.length > 0
                      ? "Construction payments"
                      : "Payment History"}
                  </SectionHeading>
                  <PaymentHistoryList payments={constructionPayments} />
                </Reveal>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
