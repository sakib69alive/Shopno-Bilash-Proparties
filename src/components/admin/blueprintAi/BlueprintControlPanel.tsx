"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { BlueprintRoomsField } from "@/components/admin/plan/BlueprintRoomsField";
import { FloorPlansEditor } from "@/components/admin/projects/FloorPlansEditor";
import type { BuildingFloorPlan } from "@/types/project";
import { BLUEPRINT_KIND_LABEL, BLUEPRINT_KIND_ORDER, type BlueprintKind, type Project } from "@/content/projects";
import { saveBlueprintSlot, saveBlueprintVisibility } from "@/features/blueprintControl/actions";
import { cn } from "@/lib/utils";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

function Status({ error, saved }: { error?: string; saved?: boolean }) {
  if (error) {
    return (
      <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p className="text-body-sm">{error}</p>
      </div>
    );
  }
  if (saved) {
    return (
      <p role="status" className="text-success text-body-sm flex items-center gap-1.5">
        <Check aria-hidden className="size-4" />
        Saved — the website already shows it.
      </p>
    );
  }
  return null;
}

/** One plan (Garage / Floor / Roof): the big preview + room-button editor on the left, "what the website does with it" on the right. */
function SlotForm({ project, kind }: { project: Project; kind: BlueprintKind }) {
  const current = project.blueprints?.find((b) => b.kind === kind);
  const [state, formAction] = useActionState(saveBlueprintSlot.bind(null, project.id, kind), {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* The plan's own settings sit in one slim bar ABOVE the editor, so the editor below gets the full page width. */}
      <div className="bg-surface border-border flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border px-4 py-3">
        <Switch
          name="show"
          label="Show this plan on the website"
          description={current ? "Off = hidden from visitors, file stays saved." : "Upload a plan below first."}
          defaultChecked={!(current?.hidden ?? false)}
          className="w-80"
        />
        {kind === "floor" ? (
          <div className="w-64">
            <Input label="Tab name" name="label" defaultValue={current?.label} placeholder="Typical floor (2–9)" />
          </div>
        ) : (
          <input type="hidden" name="label" value={current?.label ?? ""} />
        )}
        <div className="ml-auto flex items-center gap-4">
          <Status error={state.error} saved={state.saved} />
          <SaveButton label={`Save ${BLUEPRINT_KIND_LABEL[kind].toLowerCase()} plan`} />
        </div>
      </div>
      <BlueprintRoomsField
        label={`${BLUEPRINT_KIND_LABEL[kind]} plan — choose an SVG to replace it`}
        name="blueprint"
        removeName="removeBlueprint"
        roomsName="blueprintRooms"
        preset="building"
        currentSrc={current?.image.src}
        initial={current?.planRooms}
      />
      <div>
        <SaveButton label={`Save ${BLUEPRINT_KIND_LABEL[kind].toLowerCase()} plan`} />
      </div>
    </form>
  );
}

/** The two project-wide switches for the public page. */
function VisibilityForm({ project }: { project: Project }) {
  const [state, formAction] = useActionState(saveBlueprintVisibility.bind(null, project.id), {});
  return (
    <form action={formAction} className="bg-surface border-border grid grid-cols-[1fr_1fr_auto] items-start gap-6 rounded-xl border p-4">
      <Switch
        name="showBlueprints"
        label="Show the Building blueprints section"
        description="Off = visitors see no blueprints on this project's page. Nothing is deleted."
        defaultChecked={!(project.blueprintsHidden ?? false)}
      />
      <Switch
        name="showZoom"
        label="Show the Enlarge (zoom) button"
        description="Off = the plans still show, but can't be opened full screen."
        defaultChecked={!(project.blueprintZoomHidden ?? false)}
      />
      <div className="flex flex-col items-end gap-2">
        <SaveButton label="Save" />
        <Status error={state.error} saved={state.saved} />
      </div>
    </form>
  );
}

export interface ClientPlansData {
  /** The business project (not the website page) these client-app plans belong to. */
  projectId: string;
  plans: BuildingFloorPlan[];
}

export function ProjectWorkspace({ project, clientPlans }: { project: Project; clientPlans?: ClientPlansData }) {
  const [kind, setKind] = useState<BlueprintKind>("garage");
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h3">{project.name}</h2>
        <a href={`/projects/${project.slug}`} target="_blank" rel="noopener noreferrer" className="text-accent text-button inline-flex items-center gap-1.5">
          See it on the website <ExternalLink aria-hidden className="size-4" />
        </a>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-label text-fg-subtle uppercase">1 · Whole project</h3>
        <VisibilityForm key={project.id} project={project} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-label text-fg-subtle uppercase">2 · Plans</h3>
        <p className="text-body-sm text-fg-muted">Press a plan to edit it:</p>
        <div role="tablist" className="grid max-w-3xl grid-cols-3 gap-3">
          {BLUEPRINT_KIND_ORDER.map((k) => {
            const bp = project.blueprints?.find((b) => b.kind === k);
            const active = k === kind;
            const status = bp ? (bp.hidden ? "Hidden" : "Shown on website") : "Not uploaded yet";
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setKind(k)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border-2 px-5 py-3.5 text-left shadow-sm transition-all",
                  active ? "border-accent bg-accent text-accent-foreground shadow-md" : "border-border-strong bg-surface-raised hover:border-accent hover:shadow-md",
                )}
              >
                <span className="text-h4">{BLUEPRINT_KIND_LABEL[k]}</span>
                <span
                  className={cn(
                    "text-caption rounded-full px-2.5 py-0.5 font-semibold",
                    active ? "bg-white/20 text-accent-foreground" : bp ? (bp.hidden ? "bg-warning-soft text-fg" : "bg-success-soft text-success") : "bg-surface text-fg-subtle",
                  )}
                >
                  {status}
                </span>
              </button>
            );
          })}
        </div>
        {/* Every plan stays mounted (just hidden) so switching tabs never loses what was typed or marked. */}
        {BLUEPRINT_KIND_ORDER.map((k) => (
          <div key={`${project.id}-${k}`} hidden={k !== kind}>
            <SlotForm project={project} kind={k} />
          </div>
        ))}
      </section>

      {!clientPlans && (
        <section className="flex flex-col gap-2">
          <h3 className="text-label text-fg-subtle uppercase">3 · Client app plans &amp; parking bays</h3>
          <p className="bg-surface border-border text-body-sm text-fg-muted rounded-xl border px-4 py-3">
            No project in the business side (Admin → Projects) has the same name or address as &ldquo;{project.name}&rdquo;, so there are no client-app plans to edit here. Create that project, or give it the same name, and this section appears.
          </p>
        </section>
      )}

      {clientPlans && (
        <section className="flex flex-col gap-2">
          <h3 className="text-label text-fg-subtle uppercase">3 · Client app plans &amp; parking bays</h3>
          <p className="text-body-sm text-fg-muted">
            The plans owners see in their app: the ground floor, the typical floor, and so on. Upload an SVG, mark each flat, each room and each parking bay on it, and choose which floors use it.
          </p>
          <FloorPlansEditor projectId={clientPlans.projectId} initial={clientPlans.plans} />
        </section>
      )}
    </div>
  );
}

/**
 * Admin → Settings → Blueprint AI → Control panel (desktop). Pick a project on the left; on the right: first what the whole project
 * page does with its blueprints (section on/off, zoom button on/off), then each plan — Garage / Floor / Roof — with its preview,
 * room buttons and its own show/hide switch. Every switch reads "Show …": ON means visitors see it.
 */
export function BlueprintControlPanel({ projects, clientPlans = {} }: { projects: Project[]; clientPlans?: Record<string, ClientPlansData> }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id);
  if (projects.length === 0) return <p className="text-body-sm text-fg-muted">No website projects yet. Add one under Admin → Website → Projects first.</p>;
  const selected = projects.find((p) => p.id === selectedId) ?? projects[0];

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Projects" className="flex flex-wrap gap-2">
        {projects.map((p) => {
          const total = p.blueprints?.length ?? 0;
          const shown = p.blueprintsHidden ? 0 : (p.blueprints?.filter((b) => !b.hidden).length ?? 0);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              aria-current={p.id === selected.id ? "true" : undefined}
              className={cn(
                "flex min-w-48 flex-col rounded-lg border px-3.5 py-2.5 text-left transition-colors",
                p.id === selected.id ? "border-accent bg-accent-soft" : "border-border hover:bg-surface",
              )}
            >
              <span className="text-body-sm font-semibold">{p.name}</span>
              <span className="text-caption text-fg-subtle">
                {total === 0 ? "No plans yet" : `${total} ${total === 1 ? "plan" : "plans"} · ${shown} shown`}
                {p.blueprintZoomHidden ? " · no zoom" : ""}
              </span>
            </button>
          );
        })}
      </nav>
      <ProjectWorkspace key={selected.id} project={selected} clientPlans={clientPlans[selected.slug]} />
    </div>
  );
}
