import { notFound } from "next/navigation";
import {
  Ruler,
  BedDouble,
  Bath,
  DoorOpen,
  Compass,
  Building2,
  Home,
  Car,
  MapPin,
  ExternalLink,
  Wallet,
  HardHat,
  FileText,
} from "lucide-react";
import { PARKING_TYPE_MAP } from "@/lib/parkingTypeIcons";
import { getCurrentUser } from "@/lib/auth";
import { resolveOwnerContext } from "@/lib/ownerContext";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { PropertyGallery } from "@/components/portal/PropertyGallery";
import { PropertyFloorPlan } from "@/components/portal/PropertyFloorPlan";
import { RememberHomeFlat } from "@/components/portal/RememberHomeFlat";
import { PropertySwitcher } from "@/components/portal/PropertySwitcher";
import { PropertyTimeline, type PropertyMilestone } from "@/components/portal/PropertyTimeline";
import { AnimatedNumber } from "@/components/portal/AnimatedNumber";
import { AnimatedProgressLine } from "@/components/portal/AnimatedProgressLine";
import { PreviewCard, PreviewCardHeader } from "@/components/portal/PreviewCard";
import { formatBDT, formatDate } from "@/lib/format";
import { OWNER_UNIT_STATUS_LABEL, OWNER_FACING_LABEL, OWNERSHIP_SOURCE_LABEL } from "@/lib/ownerFriendlyLabels";
import {
  getOwnerUnitDetail,
  getOwnerUnits,
  getOwnerProjects,
  getOwnerOutstanding,
  getOwnerNextInstallment,
  getOwnerConstructionProgress,
  getOwnerDocuments,
  type OwnerUnitDetail,
} from "@/features/ownerPortal/queries";
import type { OwnerType } from "@/types/finance/costAllocation";
import type { Project } from "@/types/project";
import { resolveUnitPlan, resolveParkingPlan } from "@/lib/unitPlan";
import { BlueprintPaper } from "@/components/portal/BlueprintPaper";

function Feature({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="border-border text-fg-muted flex size-10 shrink-0 items-center justify-center rounded-full border">
        <Icon aria-hidden className="size-4" />
      </span>
      <div>
        <p className="text-caption text-fg-subtle">{label}</p>
        <p className="text-body-sm text-fg font-medium">{value}</p>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-label text-fg-subtle mb-4 uppercase">{children}</p>;
}

/** Prompt 2 §18 — every milestone here is only pushed when real data backs it; nothing is invented. */
function buildTimeline(ownerType: OwnerType, detail: OwnerUnitDetail, averageProgress: number | null): PropertyMilestone[] {
  const milestones: PropertyMilestone[] = [];

  if (ownerType === "customer" && detail.booking) {
    milestones.push({ label: "Property Reserved", date: detail.booking.bookingDate, state: "done" });
  }
  if (ownerType === "customer" && detail.sale) {
    milestones.push({ label: "Sale Completed", date: detail.sale.saleDate, state: "done" });
  }
  if (detail.ownershipRecord) {
    milestones.push({
      label: `Ownership Confirmed${detail.ownershipRecord.source ? ` — ${OWNERSHIP_SOURCE_LABEL[detail.ownershipRecord.source]}` : ""}`,
      date: detail.ownershipRecord.startDate,
      state: "done",
    });
  }

  const projectDone = detail.project?.status === "completed" || detail.project?.status === "ready";
  if (projectDone) {
    milestones.push({ label: "Construction", state: "done" });
    milestones.push({ label: "Completion", date: detail.project?.handoverDate ?? detail.project?.expectedCompletionDate, state: "done" });
  } else {
    if (averageProgress !== null) {
      milestones.push({ label: `Construction — ${averageProgress}% Complete`, state: "current" });
    }
    milestones.push({ label: "Completion", date: detail.project?.expectedCompletionDate, state: "upcoming" });
  }

  return milestones;
}

function mapsLink(project: Project | null): string | null {
  if (!project?.latitude || !project?.longitude) return null;
  return `https://www.google.com/maps?q=${project.latitude},${project.longitude}`;
}

/**
 * Prompt 2 — the premium "My Property" showcase. Everything below is
 * derived from Chapter 2's real data via `getOwnerUnitDetail` and its
 * companions; nothing here is a second source of truth, and ownership is
 * re-verified server-side by `getOwnerUnitDetail` itself (a guessed/typed
 * unit id belonging to another owner resolves to `null`, never leaks).
 */
export async function PropertyDetailPage({ base, unitId }: { base: string; unitId: string }) {
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

  const { unit, project, building, floor, parking, ownershipRecord } = detail;
  const plan = resolveUnitPlan(unit, project, floor?.floorNumber, { forOwner: true });
  const parkingPlan = resolveParkingPlan(parking, project);

  const [allUnits, ownerProjects, outstanding, nextInstallment, constructionProgress, documents] = await Promise.all([
    getOwnerUnits(context.ownerType, context.ownerId),
    getOwnerProjects(context.ownerType, context.ownerId),
    getOwnerOutstanding(context.ownerType, context.ownerId, unit.projectId),
    getOwnerNextInstallment(context.ownerType, context.ownerId, unit.projectId),
    getOwnerConstructionProgress(context.ownerType, context.ownerId),
    getOwnerDocuments(context.ownerType, context.ownerId, unit.id),
  ]);

  const thisProjectProgress = constructionProgress.find((p) => p.projectId === unit.projectId) ?? null;
  const galleryImages = (unit.galleryImages ?? []).map((src) => ({ src, alt: `${unit.unitNumber} photo` }));
  const timeline = buildTimeline(context.ownerType, detail, thisProjectProgress?.averageProgress ?? null);
  const maps = mapsLink(project);

  const projectNameById = new Map(ownerProjects.map((p) => [p.id, p.name]));
  const switcherItems = allUnits.map((u) => ({ unitId: u.id, unitNumber: u.unitNumber, projectName: projectNameById.get(u.projectId) ?? "—" }));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 p-4 pb-16 sm:p-6 lg:p-10">
      <PropertySwitcher base={base} section="property" items={switcherItems} activeUnitId={unit.id} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        {galleryImages.length > 0 ? (
          <PropertyGallery images={galleryImages} />
        ) : (
          <Reveal>
            <EmptyState title="No photos available yet" description="Images for this property will appear here once added." />
          </Reveal>
        )}

        <Reveal delay={80} className="flex flex-col justify-center gap-6">
          <div>
            <p className="text-label text-fg-subtle uppercase">
              {project?.name ?? "—"}
              {building?.name ? ` · ${building.name}` : ""}
              {floor?.label ? ` · Floor ${floor.floorNumber}` : ""}
            </p>
            <h1 className="text-display-l text-fg mt-2">Unit {unit.unitNumber}</h1>
            <span className="bg-accent-soft text-accent text-label mt-3 inline-flex items-center rounded-full px-3 py-1 uppercase">
              {OWNER_UNIT_STATUS_LABEL[unit.status]}
            </span>
          </div>

          <div className="border-premium/30 grid grid-cols-2 gap-4 border-t pt-6">
            <Feature icon={Ruler} label="Area" value={`${unit.sizeSqft.toLocaleString()} sqft`} />
            <Feature icon={BedDouble} label="Bedrooms" value={String(unit.bedrooms)} />
            <Feature icon={Bath} label="Bathrooms" value={String(unit.bathrooms)} />
            <Feature icon={DoorOpen} label="Balconies" value={String(unit.balconies)} />
            {unit.facing && <Feature icon={Compass} label="Facing" value={OWNER_FACING_LABEL[unit.facing]} />}
            {project?.propertyType && <Feature icon={Home} label="Type" value={project.propertyType} />}
            {floor && <Feature icon={Building2} label="Floor" value={floor.label} />}
            {unit.parkingSpaces > 0 && <Feature icon={Car} label="Parking Spaces" value={String(unit.parkingSpaces)} />}
          </div>
        </Reveal>
      </div>

      <RememberHomeFlat unitId={unit.id} />
      <PropertyFloorPlan src={plan.src} highlight={plan.highlight} unitLabel={`Unit ${unit.unitNumber}`} />

      <Reveal>
        <SectionHeading>Parking</SectionHeading>
        {parking.length === 0 ? (
          <p className="text-body-sm text-fg-muted">No parking space is currently assigned to this property.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {parking.map((p) => {
              const ParkingIcon = p.type ? PARKING_TYPE_MAP[p.type].icon : Car;
              return (
                <span key={p.id} className="border-border text-body-sm text-fg inline-flex items-center gap-2 rounded-full border px-4 py-2">
                  <ParkingIcon aria-hidden className="text-fg-subtle size-4" />
                  {p.parkingNumber}
                  {p.type && <span className="text-fg-subtle">· {PARKING_TYPE_MAP[p.type].label}</span>}
                </span>
              );
            })}
          </div>
        )}
        {parkingPlan && (
          // The parking level with this owner's own bays lit and the other bays dimmed.
          <BlueprintPaper src={parkingPlan.src} alt="Parking plan" highlight={parkingPlan.highlight} className="border-border mt-4 aspect-[4/3] rounded-2xl border" />
        )}
      </Reveal>

      <Reveal>
        <SectionHeading>Ownership</SectionHeading>
        <div className="border-border bg-surface-raised grid grid-cols-1 gap-y-5 rounded-2xl border p-6 shadow-sm sm:grid-cols-3 sm:p-7">
          <div>
            <p className="text-caption text-fg-subtle uppercase">Owner</p>
            <p className="text-body text-fg mt-1 font-medium">{user.name}</p>
          </div>
          <div>
            <p className="text-caption text-fg-subtle uppercase">Property</p>
            <p className="text-body text-fg mt-1 font-medium">
              {project?.name ?? "—"} · {unit.unitNumber}
            </p>
          </div>
          <div>
            <p className="text-caption text-fg-subtle uppercase">Status</p>
            <p className="text-body text-fg mt-1 font-medium">{OWNER_UNIT_STATUS_LABEL[unit.status]}</p>
          </div>
          {ownershipRecord && (
            <div>
              <p className="text-caption text-fg-subtle uppercase">Ownership Since</p>
              <p className="text-body text-fg mt-1 font-medium">{formatDate(new Date(ownershipRecord.startDate))}</p>
            </div>
          )}
        </div>
      </Reveal>

      {timeline.length > 0 && (
        <Reveal>
          <SectionHeading>Property Timeline</SectionHeading>
          <PropertyTimeline milestones={timeline} />
        </Reveal>
      )}

      {project && (
        <Reveal>
          <SectionHeading>The Project</SectionHeading>
          <div className="bg-surface rounded-2xl p-6 sm:p-8">
            <p className="text-h3 text-fg">{project.name}</p>
            {project.description && <p className="text-body text-fg-muted mt-3 max-w-2xl">{project.description}</p>}

            <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-4">
              {project.propertyType && <Feature icon={Home} label="Type" value={project.propertyType} />}
              {project.expectedCompletionDate && (
                <Feature icon={HardHat} label="Expected Completion" value={formatDate(new Date(project.expectedCompletionDate))} />
              )}
            </div>

            {project.address && (
              <div className="border-border mt-7 flex items-start justify-between gap-4 border-t pt-6">
                <div className="flex items-start gap-3">
                  <MapPin aria-hidden className="text-fg-subtle mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="text-body text-fg font-medium">{project.address}</p>
                    <p className="text-body-sm text-fg-muted mt-0.5">{[project.area, project.city].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
                {maps && (
                  <a
                    href={maps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-button text-accent hover:text-accent-strong inline-flex shrink-0 items-center gap-1.5"
                  >
                    <ExternalLink aria-hidden className="size-3.5" />
                    Map
                  </a>
                )}
              </div>
            )}
          </div>
        </Reveal>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Reveal>
          <PreviewCard href={`${base}/construction/${unit.id}`}>
            <PreviewCardHeader icon={HardHat} label="Construction" />
            {!thisProjectProgress || thisProjectProgress.averageProgress === null ? (
              <p className="text-body-sm text-fg-subtle">No construction updates are available yet.</p>
            ) : (
              <>
                <p className="text-h2 text-fg">
                  <AnimatedNumber value={thisProjectProgress.averageProgress} suffix="%" />
                </p>
                {thisProjectProgress.currentStageName && <p className="text-body-sm text-fg-muted">{thisProjectProgress.currentStageName}</p>}
                <AnimatedProgressLine percent={thisProjectProgress.averageProgress} />
              </>
            )}
          </PreviewCard>
        </Reveal>

        <Reveal delay={60}>
          <PreviewCard href={`${base}/payments/${unit.id}`}>
            <PreviewCardHeader icon={Wallet} label="Payment Status" />
            {outstanding.totalPayable === 0 ? (
              <p className="text-body-sm text-fg-subtle">No payment plan is active yet.</p>
            ) : (
              <>
                <p className="text-h2 text-fg">{formatBDT(outstanding.totalOutstanding)}</p>
                <p className="text-body-sm text-fg-muted">
                  {nextInstallment ? `Next due ${formatDate(new Date(nextInstallment.dueDate))}` : "You're all caught up"}
                </p>
              </>
            )}
          </PreviewCard>
        </Reveal>

        <Reveal delay={120}>
          <PreviewCard href={`${base}/documents`}>
            <PreviewCardHeader icon={FileText} label="Documents" />
            <p className="text-h2 text-fg">{documents.length}</p>
            <p className="text-body-sm text-fg-muted">{documents.length === 0 ? "No documents are available yet." : "Available to view"}</p>
          </PreviewCard>
        </Reveal>
      </div>
    </div>
  );
}
