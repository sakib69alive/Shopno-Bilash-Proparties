import { Activity, Building, CalendarCheck, House, Landmark, Layers, MapPin, Ruler, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Divider } from "@/components/ui/Divider";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { PROJECT_STATUS_LABEL, type Project } from "@/content/projects";

/**
 * A spec-sheet, not a dashboard: only fields that actually exist on this
 * project render, each as a large value with a small label — no icons, no
 * cards, no invented placeholders for missing fields.
 */
export function ProjectFacts({ project }: { project: Project }) {
  const facts: { label: string; value: string; icon: LucideIcon }[] = [
    { label: "Location", value: project.location, icon: MapPin },
    { label: "Type", value: project.projectType, icon: Landmark },
    { label: "Status", value: PROJECT_STATUS_LABEL[project.status], icon: Activity },
    project.buildingType ? { label: "Building", value: project.buildingType, icon: Building } : null,
    project.floors ? { label: "Floors", value: String(project.floors), icon: Layers } : null,
    project.completionYear ? { label: "Completion", value: String(project.completionYear), icon: CalendarCheck } : null,
    project.totalUnits ? { label: "Total Units", value: String(project.totalUnits), icon: House } : null,
    project.area ? { label: "Area", value: project.area, icon: Ruler } : null,
  ].filter((f): f is { label: string; value: string; icon: LucideIcon } => f !== null);

  return (
    <>
      {/* Phone: compact tiles with icons — the tall spec sheet below is the desktop design. */}
      <section aria-label="Project facts" className="px-[var(--gutter)] py-6 lg:hidden">
        <dl className="bg-surface-raised border-border grid grid-cols-2 gap-x-3 gap-y-5 rounded-[var(--m-radius-hero)] border p-5">
          {facts.map(({ label, value, icon: Icon }, i) => (
            <div key={label} className={i === 0 ? "col-span-2 flex items-center gap-3" : "flex items-center gap-3"}>
              <span className="bg-accent-soft text-accent flex size-10 shrink-0 items-center justify-center rounded-full">
                <Icon aria-hidden className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <dt className="text-caption text-fg-subtle">{label}</dt>
                <dd className="mt-0.5 text-[0.9375rem] leading-snug font-semibold">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

    <Section spacing="md" background="surface" className="hidden lg:block">
      <Container>
        <Divider />
        <div className="flex flex-wrap">
          {facts.map((fact, i) => (
            <Reveal
              key={fact.label}
              delay={i * 40}
              className="border-border w-1/2 border-r py-8 pr-6 sm:w-1/3 lg:w-auto lg:flex-1 lg:border-r lg:last:border-r-0"
            >
              <p className="text-label text-fg-subtle mb-2 uppercase">{fact.label}</p>
              <p className="text-h3">{fact.value}</p>
            </Reveal>
          ))}
        </div>
        <Divider />
      </Container>
    </Section>
    </>
  );
}
