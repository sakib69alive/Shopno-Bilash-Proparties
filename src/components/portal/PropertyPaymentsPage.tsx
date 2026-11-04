import { notFound } from "next/navigation";
import { Car } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { resolveOwnerContext } from "@/lib/ownerContext";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { PropertySwitcher } from "@/components/portal/PropertySwitcher";
import { PaymentProgressHero } from "@/components/portal/PaymentProgressHero";
import { NextPaymentCard } from "@/components/portal/NextPaymentCard";
import { InstallmentScheduleList } from "@/components/portal/InstallmentScheduleList";
import { PropertyTimeline, type PropertyMilestone } from "@/components/portal/PropertyTimeline";
import { PaymentHistoryList } from "@/components/portal/PaymentHistoryList";
import { AdjustmentsList } from "@/components/portal/AdjustmentsList";
import { SalePriceBreakdown } from "@/components/portal/SalePriceBreakdown";
import { formatBDT } from "@/lib/format";
import { SalePaymentsSection } from "@/components/portal/SalePaymentsSection";
import {
  getOwnerUnitDetail,
  getOwnerUnits,
  getOwnerProjects,
  getOwnerOutstanding,
  getOwnerNextInstallment,
  getOwnerInstallmentSchedule,
  getOwnerAdjustments,
  getOwnerPaymentHistory,
  getOwnerUnitShares,
  getOwnerSaleSummaries,
  type OwnerInstallmentRow,
} from "@/features/ownerPortal/queries";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-label text-fg-subtle mb-4 uppercase">{children}</p>;
}

function installmentToMilestone(row: OwnerInstallmentRow): PropertyMilestone {
  return {
    label: row.label,
    date: row.dueDate,
    state: row.status === "paid" ? "done" : row.status === "upcoming" ? "upcoming" : "current",
  };
}

/**
 * Chapter 3 Prompt 3 — the property-scoped Financial Detail Page. Every
 * figure comes from the existing Chapter 2 cost-allocation/installment
 * engine (`lib/contributionStatus.ts`) via `features/ownerPortal/queries.ts`
 * — this page formats and presents, it never recomputes what's owed.
 */
export async function PropertyPaymentsPage({ base, unitId }: { base: string; unitId: string }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const context = resolveOwnerContext(user);
  if (!context) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState title="No property is currently connected to your account." description="Please contact Shopno Bilash Properties Ltd. for assistance." />
      </div>
    );
  }

  const detail = await getOwnerUnitDetail(context.ownerType, context.ownerId, unitId);
  if (!detail) notFound();

  const { unit, project, building, floor, parking, sale } = detail;

  const [allUnits, ownerProjects, outstanding, nextInstallment, schedule, adjustments, payments, unitShares, allSaleSummaries] = await Promise.all([
    getOwnerUnits(context.ownerType, context.ownerId),
    getOwnerProjects(context.ownerType, context.ownerId),
    getOwnerOutstanding(context.ownerType, context.ownerId, unit.projectId),
    getOwnerNextInstallment(context.ownerType, context.ownerId, unit.projectId),
    getOwnerInstallmentSchedule(context.ownerType, context.ownerId, unit.projectId),
    getOwnerAdjustments(context.ownerType, context.ownerId, unit.projectId),
    getOwnerPaymentHistory(context.ownerType, context.ownerId, unit.projectId),
    getOwnerUnitShares(context.ownerType, context.ownerId, unit.projectId),
    getOwnerSaleSummaries(context.ownerType, context.ownerId),
  ]);
  const saleSummaries = allSaleSummaries.filter((x) => x.unitId === unit.id);
  const constructionPayments = saleSummaries.length > 0 ? payments.filter((p) => p.category === "construction") : payments;

  const projectNameById = new Map(ownerProjects.map((p) => [p.id, p.name]));
  const switcherItems = allUnits.map((u) => ({ unitId: u.id, unitNumber: u.unitNumber, projectName: projectNameById.get(u.projectId) ?? "—" }));
  const sisterUnits = allUnits.filter((u) => u.projectId === unit.projectId && u.id !== unit.id);
  const milestones = schedule.map(installmentToMilestone);
  const parkingWithValue = parking.filter((p) => !!p.value?.amount);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 p-4 pb-16 sm:p-6 lg:p-10">
      <PropertySwitcher base={base} section="payments" items={switcherItems} activeUnitId={unit.id} />

      <div>
        <p className="text-label text-fg-subtle uppercase">
          {project?.name ?? "—"}
          {building?.name ? ` · ${building.name}` : ""}
          {floor?.label ? ` · ${floor.label}` : ""}
        </p>
        <h1 className="text-display-m text-fg mt-2">Financial Overview</h1>
        <p className="text-body text-fg-muted mt-1">Unit {unit.unitNumber}</p>
      </div>

      {sisterUnits.length > 0 && (
        <p className="text-caption text-fg-subtle bg-surface rounded-xl p-4">
          These figures are your combined construction payment plan for this project, shared across {sisterUnits.length + 1} properties you own here
          ({[unit, ...sisterUnits].map((u) => u.unitNumber).join(", ")}).
          {(() => {
            const share = unitShares.find((s) => s.unitId === unit.id);
            return share ? ` This unit's own share is ${formatBDT(share.payableAmount)}.` : "";
          })()}
        </p>
      )}

      <SalePaymentsSection summaries={saleSummaries} />

      <Reveal>
        <PaymentProgressHero
          totalPayable={outstanding.totalPayable}
          totalPaid={outstanding.totalPaid}
          totalOutstanding={outstanding.totalOutstanding}
          overdueAmount={outstanding.overdueCount > 0 ? schedule.filter((s) => s.status === "overdue").reduce((sum, s) => sum + s.outstanding, 0) : undefined}
        />
      </Reveal>

      <Reveal>
        <SectionHeading>Next Payment</SectionHeading>
        <NextPaymentCard installment={nextInstallment} />
      </Reveal>

      {sale && (
        <Reveal>
          <SectionHeading>Property Price</SectionHeading>
          <SalePriceBreakdown sale={sale} />
        </Reveal>
      )}

      {parkingWithValue.length > 0 && (
        <Reveal>
          <SectionHeading>Parking</SectionHeading>
          <ul className="border-border bg-surface-raised divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
            {parkingWithValue.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-5">
                <span className="text-body text-fg flex items-center gap-2">
                  <Car aria-hidden className="text-fg-subtle size-4" />
                  {p.parkingNumber}
                </span>
                <span className="text-body text-fg font-medium">{formatBDT(p.value!.amount)}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}

      {milestones.length > 0 && (
        <Reveal>
          <SectionHeading>Installment Timeline</SectionHeading>
          <PropertyTimeline milestones={milestones} />
        </Reveal>
      )}

      <Reveal>
        <SectionHeading>Installment Schedule</SectionHeading>
        {schedule.length === 0 ? (
          <EmptyState title="No installments have been scheduled yet" description="Your installment plan will appear here once it's set up." />
        ) : (
          <InstallmentScheduleList installments={schedule} />
        )}
      </Reveal>

      {adjustments.length > 0 && (
        <Reveal>
          <SectionHeading>Adjustments</SectionHeading>
          <AdjustmentsList adjustments={adjustments} />
        </Reveal>
      )}

      {(constructionPayments.length > 0 || saleSummaries.length === 0) && (
        <Reveal>
          <SectionHeading>{saleSummaries.length > 0 ? "Construction payments" : "Payment History"}</SectionHeading>
          <PaymentHistoryList payments={constructionPayments} />
        </Reveal>
      )}
    </div>
  );
}
