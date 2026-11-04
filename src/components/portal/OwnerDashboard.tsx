import Link from "next/link";
import {
  Home,
  Wallet,
  HardHat,
  FileText,
  Bell,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { Media } from "@/components/ui/Media";
import { ArchitecturalMotif } from "@/components/ui/ArchitecturalMotif";
import { Reveal } from "@/components/ui/Reveal";
import { OwnerHomeM } from "@/components/portal/OwnerHomeM";
import { AnimatedNumber } from "@/components/portal/AnimatedNumber";
import { AnimatedProgressLine } from "@/components/portal/AnimatedProgressLine";
import {
  PreviewCard,
  PreviewCardHeader,
} from "@/components/portal/PreviewCard";
import { formatBDT, formatDate } from "@/lib/format";
import { resolveUnitPlan } from "@/lib/unitPlan";
import type { Unit } from "@/types/unit";
import type { Project } from "@/types/project";
import type {
  OwnerOutstandingSummary,
  OwnerNextInstallment,
  OwnerProjectProgress,
  OwnerSaleSummary,
} from "@/features/ownerPortal/queries";
import type { Notification } from "@/types/notification";
import type { Document } from "@/types/document";

export interface OwnerDashboardProps {
  base: string;
  firstName: string;
  units: Unit[];
  primaryProject: Project | null;
  /** Every project the owner has a flat in — used for the blueprint card's project names. */
  projects: Project[];
  outstanding: OwnerOutstandingSummary;
  nextInstallment: OwnerNextInstallment | null;
  progress: OwnerProjectProgress[];
  documents: Document[];
  notifications: Notification[];
  /** The flat-purchase payments (price / received / remaining), customers only. */
  saleSummaries?: OwnerSaleSummary[];
}

const STATUS_LABEL: Record<OwnerNextInstallment["status"], string> = {
  upcoming: "Upcoming",
  due: "Due Soon",
  overdue: "Overdue",
  "partially-paid": "Partially Paid",
};

/** A larger, richer sibling of `PreviewCard` — for the two headline panels (Financial, Construction) that deserve more visual weight than the slim Documents/Notifications row below them. */
function StatPanel({
  href,
  icon: Icon,
  eyebrow,
  children,
  cta,
}: {
  href: string;
  icon: typeof Home;
  eyebrow: string;
  children: React.ReactNode;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group border-border bg-surface-raised relative flex flex-col justify-between gap-8 overflow-hidden rounded-2xl border p-7 shadow-sm transition-all duration-300 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-lg sm:p-9"
    >
      <div>
        <span className="text-label text-fg-subtle flex items-center gap-2 uppercase">
          <Icon aria-hidden className="size-4" />
          {eyebrow}
        </span>
        <div className="mt-5">{children}</div>
      </div>
      <div className="text-button text-accent flex items-center gap-1.5">
        {cta}
        <ArrowRight
          aria-hidden
          className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

/**
 * The shared home-screen for all three portal roles (customer/shareholder/
 * landowner) — one component, parameterized by already-resolved data
 * (never fetches itself). Visual overhaul pass: an editorial, image-led
 * hero (the primary property's real cover photo when one exists — never a
 * fabricated image, and an architectural-motif dark panel when it
 * doesn't, reusing the exact treatment the public login page already
 * established) replaces the old plain text header, then two large
 * Financial/Construction panels, then a slim secondary row — different
 * visual scales for different importance, per the brief.
 */
export function OwnerDashboard({
  base,
  firstName,
  units,
  primaryProject,
  projects,
  outstanding,
  nextInstallment,
  progress,
  documents,
  notifications,
  saleSummaries = [],
}: OwnerDashboardProps) {
  const unreadCount = notifications.filter(
    (n) => (n.status ?? (n.readAt ? "read" : "unread")) === "unread",
  ).length;
  const primaryUnit = units[0];
  const averageProgress =
    progress.length === 0
      ? null
      : Math.round(
          progress.reduce((s, p) => s + (p.averageProgress ?? 0), 0) /
            progress.filter((p) => p.averageProgress !== null).length || 0,
        );
  const percentPaid =
    outstanding.totalPayable > 0
      ? Math.round((outstanding.totalPaid / outstanding.totalPayable) * 100)
      : 0;
  const coverImage = primaryProject?.media?.coverImage;

  return (
    <>
      <OwnerHomeM
        base={base}
        firstName={firstName}
        units={units.map((u) => ({
          id: u.id,
          unitNumber: u.unitNumber,
          projectName:
            projects.find((p) => p.id === u.projectId)?.name ?? "Your property",
          layoutImage: resolveUnitPlan(
            u,
            projects.find((p) => p.id === u.projectId),
          ).src,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          sizeSqft: u.sizeSqft,
          facing: u.facing,
        }))}
        totalPayable={outstanding.totalPayable}
        totalPaid={outstanding.totalPaid}
        totalOutstanding={outstanding.totalOutstanding}
        percentPaid={percentPaid}
        nextInstallment={nextInstallment}
        built={progress.length === 0 ? null : (averageProgress ?? 0)}
        currentStage={progress[0]?.currentStageName ?? undefined}
        flatHidden={saleSummaries.length > 0 && saleSummaries.every((x) => !x.visible)}
      flatPayments={
        saleSummaries.filter((x) => x.visible).length === 0
          ? null
          : (() => {
              const shown = saleSummaries.filter((x) => x.visible);
              const price = shown.reduce((a, x) => a + x.price, 0);
              const paid = shown.reduce((a, x) => a + x.paid, 0);
              const last = shown.flatMap((x) => x.payments).sort((a, b) => b.date.localeCompare(a.date))[0];
              return {
                price,
                paid,
                remaining: Math.max(0, price - paid),
                percent: price > 0 ? Math.min(100, Math.round((paid / price) * 100)) : 0,
                last: last ? { amount: last.amount, date: last.date, method: last.method } : null,
                next: (() => {
                  const open = shown.flatMap((x) => x.installments).filter((i) => i.status !== "paid").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
                  return open[0] ? { amount: open[0].amount, dueDate: open[0].dueDate, status: open[0].status, left: open.length } : null;
                })(),
              };
            })()
      }
      documentCount={documents.length}
        unreadCount={unreadCount}
      />
      <div className="mx-auto hidden max-w-4xl flex-col gap-10 p-4 pb-16 sm:gap-12 sm:p-6 lg:flex lg:p-10">
        <Reveal>
          <Link
            href={units.length > 0 ? `${base}/property` : "#"}
            aria-disabled={units.length === 0}
            className="group border-border relative block h-[300px] overflow-hidden rounded-3xl border shadow-md sm:h-[380px]"
          >
            {coverImage ? (
              <div className="absolute inset-0">
                <Media
                  src={coverImage}
                  alt=""
                  ratio="auto"
                  containerClassName="h-full"
                  sizes="100vw"
                  priority
                  overlay
                  className="transition-transform duration-700 ease-[var(--ease-standard)] group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="bg-accent absolute inset-0 overflow-hidden">
                <div
                  aria-hidden
                  className="bg-premium/25 pointer-events-none absolute top-[-10%] right-[-5%] size-[320px] rounded-full blur-[90px]"
                />
                <ArchitecturalMotif
                  fit="cover"
                  className="absolute inset-x-0 bottom-0 h-[94%] w-full text-white/15"
                />
                <div className="from-accent-strong/70 via-accent-strong/15 absolute inset-0 bg-gradient-to-t to-transparent" />
              </div>
            )}

            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
              <p className="text-label uppercase text-white/60">Welcome back</p>
              <h1 className="text-display-xl mt-1 text-white">{firstName}</h1>
              {units.length > 0 ? (
                <p className="text-body-lg mt-2 text-white/85">
                  {units.length === 1
                    ? `${primaryProject?.name ?? "Your property"} · Unit ${primaryUnit.unitNumber}`
                    : `${units.length} properties across your account`}
                </p>
              ) : (
                <p className="text-body-lg mt-2 text-white/85">
                  No property is linked to your account yet.
                </p>
              )}
            </div>

            {units.length > 0 && (
              <span className="bg-fg/60 text-white absolute top-6 right-6 hidden items-center gap-1.5 rounded-full px-4 py-2 text-caption backdrop-blur-sm transition-colors group-hover:bg-fg/75 sm:flex">
                View Property
                <ArrowUpRight aria-hidden className="size-3.5" />
              </span>
            )}
          </Link>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Reveal>
            <StatPanel
              href={`${base}/payments`}
              icon={Wallet}
              eyebrow="Financial Position"
              cta="View Payments"
            >
              {outstanding.totalPayable === 0 ? (
                <p className="text-body text-fg-subtle">
                  No payment plan is active yet.
                </p>
              ) : (
                <>
                  <p className="text-display-m text-fg">
                    <AnimatedNumber
                      value={outstanding.totalOutstanding}
                      prefix="৳"
                    />
                  </p>
                  <p className="text-body-sm text-fg-muted mt-1.5">
                    Remaining of {formatBDT(outstanding.totalPayable)} total
                    {nextInstallment &&
                      ` · Next due ${formatDate(new Date(nextInstallment.dueDate))}`}
                  </p>
                  <div className="mt-5">
                    <AnimatedProgressLine percent={percentPaid} />
                    <p className="text-caption text-fg-subtle mt-2">
                      {percentPaid}% Paid
                    </p>
                  </div>
                  {nextInstallment && (
                    <p className="text-caption text-warning mt-3">
                      {STATUS_LABEL[nextInstallment.status]} ·{" "}
                      {formatBDT(nextInstallment.amount)}
                    </p>
                  )}
                </>
              )}
            </StatPanel>
          </Reveal>

          <Reveal delay={80}>
            <StatPanel
              href={`${base}/construction`}
              icon={HardHat}
              eyebrow="Construction Progress"
              cta="View Construction"
            >
              {progress.length === 0 ? (
                <p className="text-body text-fg-subtle">
                  No construction updates are available yet.
                </p>
              ) : (
                <>
                  <p className="text-display-m text-fg">
                    <AnimatedNumber value={averageProgress ?? 0} suffix="%" />
                  </p>
                  <p className="text-body-sm text-fg-muted mt-1.5">
                    {progress[0].currentStageName
                      ? `${progress[0].currentStageName} — Currently Underway`
                      : progress[0].projectName}
                  </p>
                  <div className="mt-5">
                    <AnimatedProgressLine percent={averageProgress ?? 0} />
                  </div>
                </>
              )}
            </StatPanel>
          </Reveal>
        </div>

        <Reveal className="grid grid-cols-2 gap-4">
          <PreviewCard href={`${base}/documents`}>
            <PreviewCardHeader icon={FileText} label="Documents" />
            <p className="text-h2 text-fg">{documents.length}</p>
            <p className="text-body-sm text-fg-muted">
              {documents.length === 0
                ? "No documents are available yet."
                : "Available to view"}
            </p>
          </PreviewCard>

          <PreviewCard href={`${base}/notifications`}>
            <PreviewCardHeader icon={Bell} label="Notifications" />
            <p className="text-h2 text-fg">{unreadCount}</p>
            <p className="text-body-sm text-fg-muted">
              {unreadCount === 0 ? "You're all caught up." : "Unread"}
            </p>
          </PreviewCard>
        </Reveal>
      </div>
    </>
  );
}
