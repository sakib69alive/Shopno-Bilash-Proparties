import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Divider } from "@/components/ui/Divider";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { PROJECT_STATUS_LABEL, type Project, type ProjectStatus } from "@/content/projects";
import { UNIT_STATUS_LABEL, type Unit } from "@/content/units";
import { PARKING_TYPE_MAP } from "@/lib/parkingTypeIcons";
import { getProjectAvailability } from "@/lib/projectAvailability";
import { cn } from "@/lib/utils";

/** A plain-language rendering of the status enum — not project-specific data, just naming what the status means. */
const STATUS_NOTE: Record<ProjectStatus, string> = {
  upcoming: "Planning is underway; construction has not yet begun.",
  planning: "Currently in the planning and design phase.",
  ongoing: "Construction is actively underway.",
  "near-completion": "Nearing completion and handover.",
  completed: "Construction is complete and handed over.",
  "sold-out": "Fully sold — no units remain available.",
};

/**
 * Two short, visually distinct halves sharing one section: current status
 * (always shown — every project has one) and an availability preview
 * (only shown if the project actually carries unit/availability data) that
 * points toward the full property explorer rather than replicating it here.
 */
export function ProjectStatusAndAvailability({
  project,
  units = [],
  hasConstructionProgress = false,
}: {
  project: Project;
  /** Real units belonging to this project, if any exist yet — linked to directly rather than only via the generic explorer CTA. */
  units?: Unit[];
  /** Whether content/construction.ts has an entry for this project — gates the "View Construction Progress" link. */
  hasConstructionProgress?: boolean;
}) {
  const availability = getProjectAvailability(project, units);

  const hasParkingAvailability =
    project.availableParkingCar !== undefined ||
    project.totalParkingCar !== undefined ||
    project.availableParkingBike !== undefined ||
    project.totalParkingBike !== undefined;

  const hasAvailability =
    availability.available !== undefined ||
    availability.total !== undefined ||
    (project.unitTypes && project.unitTypes.length > 0) ||
    units.length > 0 ||
    hasParkingAvailability;

  return (
    <Section spacing="lg">
      <Container>
        <div className={hasAvailability ? "grid gap-12 lg:grid-cols-2 lg:gap-16" : undefined}>
          <Reveal>
            <p className="text-label text-fg-subtle mb-6 uppercase">Status</p>
            <p className="text-display-m">{PROJECT_STATUS_LABEL[project.status]}</p>
            <p className="text-body text-fg-muted mt-4 max-w-md">{STATUS_NOTE[project.status]}</p>
            {hasConstructionProgress && (
              <Link
                href={`/projects/${project.slug}/construction`}
                className="text-button text-accent mt-6 inline-flex items-center gap-2"
              >
                View Construction Progress <ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
          </Reveal>

          {hasAvailability && (
            <Reveal delay={100} className="lg:border-border lg:border-l lg:pl-16">
              <p className="text-label text-fg-subtle mb-6 uppercase">Availability</p>

              {availability.available !== undefined && (
                <p className="text-display-m text-accent">
                  {availability.available}
                  <span className="text-h3 text-fg-muted">
                    {" "}
                    / {availability.total ?? availability.available} units
                  </span>
                </p>
              )}

              {project.unitTypes && project.unitTypes.length > 0 && (
                <div className="mt-5">
                  <Divider />
                  <div className="flex flex-wrap gap-x-6 gap-y-2 py-4">
                    {project.unitTypes.map((type) => (
                      <span key={type} className="text-body-sm text-fg-muted">
                        {type}
                      </span>
                    ))}
                  </div>
                  <Divider />
                </div>
              )}

              {hasParkingAvailability && (
                <div className="mt-5">
                  <Divider />
                  <div className="flex flex-wrap gap-x-6 gap-y-3 py-4">
                    {(project.availableParkingCar !== undefined || project.totalParkingCar !== undefined) && (
                      <div className="flex items-center gap-2">
                        <PARKING_TYPE_MAP.car.icon aria-hidden className="text-fg-subtle size-4" />
                        <span className="text-body-sm text-fg-muted">
                          {project.availableParkingCar ?? 0}
                          {" / "}
                          {project.totalParkingCar ?? project.availableParkingCar ?? 0} {PARKING_TYPE_MAP.car.label} spaces
                        </span>
                      </div>
                    )}
                    {(project.availableParkingBike !== undefined || project.totalParkingBike !== undefined) && (
                      <div className="flex items-center gap-2">
                        <PARKING_TYPE_MAP.bike.icon aria-hidden className="text-fg-subtle size-4" />
                        <span className="text-body-sm text-fg-muted">
                          {project.availableParkingBike ?? 0}
                          {" / "}
                          {project.totalParkingBike ?? project.availableParkingBike ?? 0} {PARKING_TYPE_MAP.bike.label} spaces
                        </span>
                      </div>
                    )}
                  </div>
                  <Divider />
                </div>
              )}

              {units.length > 0 && (
                <div className="mt-5 flex flex-col gap-3">
                  {units.slice(0, 3).map((unit) => (
                    <Link
                      key={unit.id}
                      href={`/projects/${project.slug}/units/${unit.slug}`}
                      className="text-body-sm text-fg-muted hover:text-accent flex items-center justify-between border-b border-border pb-3 transition-colors"
                    >
                      <span>{unit.name}</span>
                      <span className="text-fg-subtle">{UNIT_STATUS_LABEL[unit.status]}</span>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                href={`/properties?project=${encodeURIComponent(project.slug)}`}
                className={cn(buttonVariants({ size: "lg" }), "mt-8 gap-2")}
              >
                Explore Available Units <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Reveal>
          )}
        </div>
      </Container>
    </Section>
  );
}
