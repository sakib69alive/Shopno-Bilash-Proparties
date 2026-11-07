"use client";

import { useState, useActionState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertTriangle, Building2, Car, Check, EyeOff, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { BlueprintPaper, BLUEPRINT_LIGHT_LINE_STYLE, BLUEPRINT_LIGHT_STYLE } from "@/components/portal/BlueprintPaper";
import { RoomStage } from "@/components/plan/RoomPlan";
import { FloorPlansEditor } from "@/components/admin/projects/FloorPlansEditor";
import { ProjectBlueprints } from "@/components/project/ProjectBlueprints";
import { ClientPlanPreview } from "@/components/admin/projects/ClientPlanPreview";
import { ProjectWorkspace } from "@/components/admin/blueprintAi/BlueprintControlPanel";
import { resolveParkingPlan, resolveUnitPlan } from "@/lib/unitPlan";
import { NEUTRAL_VIEW, type PlanView } from "@/lib/planRooms";
import { savePlanPlacementAction } from "@/features/projects/floorPlanActions";
import type { BuildingFloorPlan, FlatArea, UnitType } from "@/types/project";
import type { Project as PublicProject } from "@/content/projects";
import { saveClientDistribution, saveClientCustomPlan, saveParkingClient } from "@/features/blueprintControl/distributionActions";
import { cn } from "@/lib/utils";

export interface DistClient {
  unitId: string;
  unitNumber: string;
  floorNumber?: number;
  customerId: string;
  customerName: string;
  layoutImage?: string;
  unitTypeId?: string;
  planFloorPlanId?: string;
  hidePlan: boolean;
}

export interface DistProject {
  id: string;
  name: string;
  floorPlans: BuildingFloorPlan[];
  unitTypes: UnitType[];
  clients: DistClient[];
  /** The project's parking bays and who holds each (a client's id, or nobody). `otherOwner`: held by a shareholder / landowner, not a client. */
  parking: { id: string; number: string; ownerId?: string; otherOwner: boolean }[];
  /** The website project with the same slug, when there is one — its blueprints are what the public page shows. */
  publicProject: PublicProject | null;
}

interface Draft {
  planId: string;
  show: boolean;
}

type Audience = "clients" | "parking" | "website";

/** A numbered step heading — the page is a short top-to-bottom flow, so every block says where you are. */
function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="bg-accent text-accent-foreground text-label flex size-7 shrink-0 items-center justify-center rounded-full">{n}</span>
        <div>
          <h2 className="text-h4">{title}</h2>
          {hint && <p className="text-body-sm text-fg-muted mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="pl-10">{children}</div>
    </section>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

function floorsText(p: BuildingFloorPlan): string {
  return p.floors.length === 0 ? "every other floor" : `floor ${p.floors.join(", ")}`;
}

/** What a client currently gets, in one short phrase — shown on their card in the list. */
function summary(c: DistClient, d: Draft, plans: BuildingFloorPlan[]): { text: string; tone: "ok" | "off" } {
  if (!d.show) return { text: "Hidden from this client", tone: "off" };
  const chosen = plans.find((p) => p.id === d.planId);
  return { text: chosen ? `Gets: ${chosen.name}` : "Gets: automatic plan", tone: "ok" };
}

/** The full client-app editor for one whole-floor plan: both client views live, plus turn / tilt / zoom / shift — and a Save for the placement. */
interface PlanEdit {
  view: PlanView;
  homeView: PlanView;
  areas: FlatArea[];
}

function PlacementEditor({ projectId, plans, initialPlanId, flatKey }: { projectId: string; plans: BuildingFloorPlan[]; initialPlanId: string; flatKey?: string }) {
  const [planId, setPlanId] = useState(initialPlanId);
  // Each plan keeps its own unsaved tweaks, so hopping between plans never loses one.
  const [edits, setEdits] = useState<Record<string, PlanEdit>>({});
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; saved?: boolean } | null>(null);

  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const edit: PlanEdit = edits[plan.id] ?? { view: plan.view ?? { ...NEUTRAL_VIEW }, homeView: plan.homeView ?? { ...NEUTRAL_VIEW }, areas: plan.areas };
  const patch = (p: Partial<PlanEdit>) => {
    setEdits((prev) => ({ ...prev, [plan.id]: { ...edit, ...p } }));
    setResult(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {plans.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm font-semibold">Which plan are you adjusting?</p>
          <div role="tablist" className="flex flex-wrap gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === plan.id}
                onClick={() => {
                  setPlanId(p.id);
                  setResult(null);
                }}
                className={cn("text-body-sm rounded-full border px-4 py-1.5 font-semibold transition-colors", p.id === plan.id ? "border-accent bg-accent text-accent-foreground" : "border-border hover:bg-surface")}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <ClientPlanPreview
        key={plan.id}
        wide
        plan={{ image: plan.image, aspect: plan.aspect, areas: edit.areas, rooms: plan.rooms ?? [], view: edit.view }}
        homeView={edit.homeView}
        onHomeViewChange={(v) => patch({ homeView: v })}
        initialFlatKey={flatKey}
        onViewChange={(v) => patch({ view: v })}
        onAreasChange={(a) => patch({ areas: a })}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              setResult(await savePlanPlacementAction(projectId, plan.id, edit.view, edit.areas.map((a) => ({ kind: a.kind, key: a.key, turn: a.turn })), edit.homeView));
            })
          }
        >
          Save how the plan sits
        </Button>
        {result?.saved && (
          <span role="status" className="text-success text-body-sm flex items-center gap-1.5">
            <Check aria-hidden className="size-4" /> Saved.
          </span>
        )}
        {result?.error && (
          <span role="alert" className="text-error text-body-sm">
            {result.error}
          </span>
        )}
      </div>
      <p className="text-caption text-fg-subtle">&ldquo;{plan.name}&rdquo; is shared by every client who gets it, so how it sits (tilt, zoom, shift, turn) applies to all of them.</p>
    </div>
  );
}

/** The plain preview, for a client whose plan is a single flat plan (no whole floor to tilt or zoom). */
function SimplePreview({ src, source }: { src: string; source: string }) {
  return (
    <div className="flex flex-col gap-2">
      {/* The same recolouring the client app uses: the drawing's dark ink becomes white lines on the blue sheet (raw, it vanishes into the blue). */}
      <div style={BLUEPRINT_LIGHT_STYLE} className="border-border relative isolate aspect-[4/3] overflow-hidden rounded-xl border">
        {/* eslint-disable-next-line @next/next/no-img-element -- the plan being previewed */}
        <img src={src} alt="Client plan preview" draggable={false} style={BLUEPRINT_LIGHT_LINE_STYLE} className="absolute inset-0 size-full object-contain p-3 mix-blend-screen select-none" />
      </div>
      <p className="text-caption text-fg-subtle">{source === "custom" ? "This flat has its own plan." : "The shared plan for this kind of flat."} It has no whole floor to tilt or zoom.</p>
    </div>
  );
}

function ClientPreview({ project, client, draft }: { project: DistProject; client: DistClient; draft: Draft }) {
  const plan = resolveUnitPlan(
    { unitNumber: client.unitNumber, layoutImage: client.layoutImage, unitTypeId: client.unitTypeId, planFloorPlanId: draft.planId || undefined, hidePlanFromOwner: !draft.show },
    { unitTypes: project.unitTypes, floorPlans: project.floorPlans },
    client.floorNumber,
    { forOwner: true },
  );
  const floorPlan = plan.source === "floor-plan" && plan.highlight ? project.floorPlans.find((p) => p.image === plan.src) : undefined;

  if (!plan.src) {
    return (
      <div className="bg-surface border-border text-body-sm text-fg-muted flex items-center gap-2 rounded-xl border px-4 py-8">
        <EyeOff aria-hidden className="size-4 shrink-0" />
        {draft.show ? "No plan is set up for this flat yet. Pick a plan on the left, or add floor plans to the project." : "Hidden — this client will see no plan."}
      </div>
    );
  }
  if (floorPlan) return <PlacementEditor key={`${floorPlan.id}-${client.unitId}`} projectId={project.id} plans={project.floorPlans} initialPlanId={floorPlan.id} flatKey={plan.highlight?.mine[0]?.key} />;
  return <SimplePreview src={plan.src} source={plan.source} />;
}

/** Give this one client their own plan (SVG or picture), or remove it again. */
function CustomPlanForm({ client }: { client: DistClient }) {
  const [state, formAction] = useActionState(saveClientCustomPlan.bind(null, client.unitId), {});
  return (
    <form action={formAction} className="bg-surface border-border flex flex-col gap-3 rounded-xl border p-4">
      <div>
        <p className="text-body-sm font-semibold">Or give {client.customerName} a plan of their own</p>
        <p className="text-caption text-fg-subtle">
          {client.layoutImage ? "This flat has its own plan right now. It is used instead of the plan chosen above." : "Upload an SVG or picture made just for this flat. It is used instead of the project's floor plans."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" name="plan" accept=".svg,image/svg+xml,image/png,image/jpeg" className="text-body-sm border-border-strong bg-surface-raised min-w-0 flex-1 rounded-md border px-3 py-2" />
        <SaveButton label={client.layoutImage ? "Replace plan" : "Upload plan"} />
      </div>
      {client.layoutImage && (
        <label className="text-body-sm flex items-center gap-2">
          <input type="checkbox" name="remove" className="accent-accent" />
          Remove this flat&rsquo;s own plan (tick, then press the button above)
        </label>
      )}
      {state.error && (
        <p role="alert" className="text-error text-body-sm">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="text-success text-body-sm flex items-center gap-1.5">
          <Check aria-hidden className="size-4" /> Saved
        </p>
      )}
    </form>
  );
}

/** Everything about ONE client: which plan, whether they see it, and what it looks like in their app. */
function ClientPanel({ project, client, draft, onChange }: { project: DistProject; client: DistClient; draft: Draft; onChange: (d: Draft) => void }) {
  const [state, formAction] = useActionState(saveClientDistribution.bind(null, client.unitId), {});
  const plans = project.floorPlans;

  return (
    <div className="border-border flex flex-col gap-6 rounded-xl border p-5">
      <div>
        <h3 className="text-h3">{client.customerName}</h3>
        <p className="text-body-sm text-fg-muted">Flat {client.unitNumber}</p>
      </div>

      <div className="flex flex-col gap-6">
        <form action={formAction} className="bg-surface border-border flex flex-col gap-5 rounded-xl border p-4">
          <fieldset className="flex flex-wrap gap-2">
            <legend className="text-body-sm mb-2 font-semibold">Which plan should they get?</legend>
            {[{ id: "", name: "Automatic", note: "Picked by the flat's floor" }, ...plans.map((p) => ({ id: p.id, name: p.name, note: `Used on ${floorsText(p)}` }))].map((opt) => (
              <label key={opt.id || "auto"} className={cn("flex min-w-52 cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-2.5 transition-colors", draft.planId === opt.id ? "border-accent bg-accent-soft" : "border-border bg-surface-raised hover:bg-surface")}>
                <input type="radio" name="planId" value={opt.id} checked={draft.planId === opt.id} onChange={() => onChange({ ...draft, planId: opt.id })} className="accent-accent mt-1" />
                <span>
                  <span className="text-body-sm block font-semibold">{opt.name}</span>
                  <span className="text-caption text-fg-subtle">{opt.note}</span>
                </span>
              </label>
            ))}
            {plans.length === 0 && (
              <p className="text-caption text-fg-subtle">
                This project has no floor plans yet. <Link href={`/admin/projects/${project.id}/floor-plans`} className="text-accent underline">Add one here</Link>, then it shows up in this list.
              </p>
            )}
          </fieldset>

          <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
            <div className="w-72">
              <p className="text-body-sm mb-1 font-semibold">Should they see it?</p>
              <Switch name="show" label={draft.show ? "Yes — it shows in their app" : "No — hidden from them"} checked={draft.show} onChange={(e) => onChange({ ...draft, show: e.target.checked })} />
            </div>
            <div className="flex items-center gap-3">
              <SaveButton label="Save for this client" />
              {state.saved && (
                <span role="status" className="text-success text-body-sm flex items-center gap-1.5">
                  <Check aria-hidden className="size-4" /> Saved
                </span>
              )}
            </div>
          </div>
          {state.error && (
            <p role="alert" className="bg-error-soft text-error text-body-sm flex items-start gap-2 rounded-md px-3 py-2.5">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {state.error}
            </p>
          )}
          <p className="text-caption text-fg-subtle">Changes show in the preview below straight away, and reach the client once you press Save.</p>
        </form>

        <CustomPlanForm client={client} />

        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-body-sm font-semibold">How it looks in their app</p>
          <ClientPreview key={`${client.unitId}-${draft.planId}-${draft.show}`} project={project} client={client} draft={draft} />
        </div>
      </div>
    </div>
  );
}

function ParkingRow({ bay, clients, value, onChange }: { bay: DistProject["parking"][number]; clients: { id: string; name: string }[]; value: string; onChange: (customerId: string) => void }) {
  const [state, formAction] = useActionState(saveParkingClient.bind(null, bay.id), {});
  return (
    <form action={formAction} className="border-border bg-surface-raised flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
      <span className="text-body-sm w-20 font-semibold">{bay.number}</span>
      <select name="customerId" value={value} onChange={(e) => onChange(e.target.value)} className="border-border-strong bg-surface-raised text-body-sm h-10 min-w-0 flex-1 rounded-md border px-2">
        <option value="">Nobody (free)</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="flex w-24 items-center justify-end gap-2">
        {state.saved && <Check aria-label="Saved" className="text-success size-4" />}
        <SaveButton label="Save" />
      </div>
      {state.error && (
        <p role="alert" className="text-error text-caption">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Parking bays: who holds each bay, how the client sees their bays lit on the parking plan, and an editor to mark the bays on the plan. */
function ParkingPanel({ project }: { project: DistProject }) {
  const clientList = [...new Map(project.clients.map((c) => [c.customerId, { id: c.customerId, name: c.customerName }])).values()];
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [previewClient, setPreviewClient] = useState(clientList[0]?.id ?? "");
  const ownerOf = (b: DistProject["parking"][number]) => owners[b.id] ?? b.ownerId ?? "";
  const markedBays = project.floorPlans.reduce((n, p) => n + p.areas.filter((a) => a.kind === "parking").length, 0);
  const mine = project.parking.filter((b) => ownerOf(b) === previewClient).map((b) => ({ parkingNumber: b.number }));
  const parkingPlan = resolveParkingPlan(mine, { floorPlans: project.floorPlans });
  const who = clientList.find((c) => c.id === previewClient)?.name ?? "this client";

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-body-sm font-semibold">Who holds each bay?</p>
          {project.parking.length === 0 ? (
            <p className="bg-warning-soft text-body-sm rounded-md px-3.5 py-3">
              This project has no parking bays yet. <Link href={`/admin/projects/${project.id}/parking`} className="text-accent underline">Create them here</Link> (one by one or in bulk), then they appear in this list.
            </p>
          ) : (
            <div className="border-border overflow-hidden rounded-xl border">
              {project.parking.map((b) =>
                b.otherOwner ? (
                  <div key={b.id} className="border-border bg-surface flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
                    <span className="text-body-sm w-20 font-semibold">{b.number}</span>
                    <span className="text-body-sm text-fg-muted">Held by a shareholder or landowner (change it in Admin → Parking).</span>
                  </div>
                ) : (
                  <ParkingRow key={b.id} bay={b} clients={clientList} value={ownerOf(b)} onChange={(id) => setOwners((prev) => ({ ...prev, [b.id]: id }))} />
                ),
              )}
            </div>
          )}
          <p className="text-caption text-fg-subtle">Pick a client and press Save on that row. The preview on the right updates as you choose.</p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-body-sm flex items-center gap-2 font-semibold">
            How the parking plan looks for
            <select value={previewClient} onChange={(e) => setPreviewClient(e.target.value)} className="border-border-strong bg-surface-raised text-body-sm h-9 rounded-md border px-2 font-normal">
              {clientList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {markedBays === 0 ? (
            <p className="bg-warning-soft text-body-sm rounded-md px-3.5 py-3">No parking bay is marked on any plan yet. Mark them in the editor below (&ldquo;+ Parking bay&rdquo;), or give the SVG parking markers with the Blueprint AI prompt.</p>
          ) : parkingPlan ? (
            <div className="border-border overflow-hidden rounded-xl border">
              <BlueprintPaper src={parkingPlan.src} alt="Parking plan preview" className="aspect-[4/3]">
                <RoomStage src={parkingPlan.src} alt="Parking plan preview" plan={{ aspect: parkingPlan.highlight.aspect, rooms: [] }} tone="midnight" emphasis={{ mine: parkingPlan.highlight.mine, others: parkingPlan.highlight.others }} view={parkingPlan.highlight.view} selectedIds={[]} onSelect={() => {}} interactive={false} />
              </BlueprintPaper>
            </div>
          ) : (
            <p className="bg-surface border-border text-body-sm text-fg-muted rounded-xl border px-4 py-10">{who} has no bay yet, so there is nothing to light up. Give them one on the left.</p>
          )}
        </div>
      </div>

      <details className="border-border rounded-xl border">
        <summary className="text-body-sm cursor-pointer px-4 py-3 font-semibold">Edit the plans and mark each parking bay (upload an SVG, mark flats, bays and rooms)</summary>
        <div className="border-border border-t p-4">
          <FloorPlansEditor projectId={project.id} initial={project.floorPlans} />
        </div>
      </details>
    </div>
  );
}

/**
 * Admin → Settings → Blueprint AI → Distribution (desktop). A short top-to-bottom flow:
 *   1 · pick the project
 *   2 · pick who it is for — website visitors, or the project's clients
 *   3 · website: edit the public blueprints; clients: pick a client, choose their plan, switch it on/off, and see + adjust their view.
 */
export function BlueprintDistribution({ projects }: { projects: DistProject[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id);
  const [audience, setAudience] = useState<Audience>("clients");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const project = projects.find((p) => p.id === projectId) ?? projects[0];

  if (!project) return <p className="text-body-sm text-fg-muted">No projects yet.</p>;

  const draftOf = (c: DistClient): Draft => drafts[c.unitId] ?? { planId: c.planFloorPlanId ?? "", show: !c.hidePlan };
  const selected = project.clients.find((c) => c.unitId === selectedUnit) ?? project.clients[0];
  const pub = project.publicProject;
  const publicShown = !!pub && !pub.blueprintsHidden && (pub.blueprints ?? []).some((b) => !b.hidden);

  return (
    <div className="flex flex-col gap-8">
      <Step n={1} title="Choose a project">
        <nav aria-label="Projects" className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setProjectId(p.id);
                setSelectedUnit(null);
              }}
              aria-current={p.id === project.id ? "true" : undefined}
              className={cn("flex min-w-44 items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors", p.id === project.id ? "border-accent bg-accent-soft" : "border-border hover:bg-surface")}
            >
              <Building2 aria-hidden className="text-fg-subtle size-4 shrink-0" />
              <span>
                <span className="text-body-sm block font-semibold">{p.name}</span>
                <span className="text-caption text-fg-subtle">
                  {p.clients.length} {p.clients.length === 1 ? "client" : "clients"}
                </span>
              </span>
            </button>
          ))}
        </nav>
      </Step>

      <Step n={2} title="Who is it for?" hint="Website visitors and clients see different things, so you set them separately.">
        <div className="grid max-w-4xl grid-cols-3 gap-3">
          {(
            [
              { key: "clients", Icon: Users, title: "Clients (their app)", note: `${project.clients.length} ${project.clients.length === 1 ? "client has" : "clients have"} a flat here` },
              { key: "parking", Icon: Car, title: "Parking bays", note: `${project.parking.length} ${project.parking.length === 1 ? "bay" : "bays"} · ${project.parking.filter((b) => b.ownerId || b.otherOwner).length} given out` },
              { key: "website", Icon: Globe, title: "Website visitors", note: pub ? (publicShown ? "Blueprints are showing" : "Blueprints are hidden") : "No website page linked" },
            ] as const
          ).map(({ key, Icon, title, note }) => (
            <button
              key={key}
              type="button"
              onClick={() => setAudience(key)}
              aria-pressed={audience === key}
              className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors", audience === key ? "border-accent bg-accent-soft" : "border-border hover:bg-surface")}
            >
              <Icon aria-hidden className="text-accent size-5 shrink-0" />
              <span>
                <span className="text-body-sm block font-semibold">{title}</span>
                <span className="text-caption text-fg-subtle">{note}</span>
              </span>
            </button>
          ))}
        </div>
      </Step>

      {audience === "parking" ? (
        <Step n={3} title="Give parking bays to clients" hint="Choose who holds each bay. A client sees their own bays lit on the parking plan in their app.">
          <ParkingPanel key={project.id} project={project} />
        </Step>
      ) : audience === "website" ? (
        <Step n={3} title="Edit what website visitors see" hint="This is the Building blueprints section of the public project page. First how it looks now, then the editor.">
          {pub ? (
            <div className="flex flex-col gap-6">
              <div className="border-border overflow-hidden rounded-xl border">
                {publicShown ? (
                  <ProjectBlueprints blueprints={pub.blueprints} hidden={pub.blueprintsHidden} hideZoom={pub.blueprintZoomHidden} />
                ) : (
                  <p className="text-body-sm text-fg-muted px-4 py-8">Visitors see no blueprints on this project right now.</p>
                )}
              </div>
              <div className="border-border rounded-xl border p-5">
                <ProjectWorkspace key={pub.id} project={pub} />
              </div>
            </div>
          ) : (
            <p className="bg-warning-soft text-body-sm rounded-md px-3.5 py-3">This project has no matching website page (same address/slug), so there is nothing to show visitors.</p>
          )}
        </Step>
      ) : (
        <Step n={3} title="Choose a client" hint="Press a name. On the right you decide what they get and see how it looks.">
          {project.clients.length === 0 ? (
            <p className="text-body-sm text-fg-muted">No client has a flat in {project.name} yet.</p>
          ) : (
            <div className="grid grid-cols-[15rem_minmax(0,1fr)] items-start gap-6">
              <ul className="flex flex-col gap-2">
                {project.clients.map((c) => {
                  const s = summary(c, draftOf(c), project.floorPlans);
                  const isSel = selected?.unitId === c.unitId;
                  return (
                    <li key={c.unitId}>
                      <button
                        type="button"
                        onClick={() => setSelectedUnit(c.unitId)}
                        aria-current={isSel ? "true" : undefined}
                        className={cn("w-full rounded-lg border px-3.5 py-2.5 text-left transition-colors", isSel ? "border-accent bg-accent-soft" : "border-border hover:bg-surface")}
                      >
                        <span className="text-body-sm block font-semibold">{c.customerName}</span>
                        <span className="text-caption text-fg-subtle block">Flat {c.unitNumber}</span>
                        <span className={cn("text-caption mt-1 flex items-center gap-1 font-medium", s.tone === "off" ? "text-error" : "text-success")}>
                          {s.tone === "off" ? <EyeOff aria-hidden className="size-3.5" /> : <Check aria-hidden className="size-3.5" />}
                          {s.text}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {selected && <ClientPanel key={selected.unitId} project={project} client={selected} draft={draftOf(selected)} onChange={(d) => setDrafts((prev) => ({ ...prev, [selected.unitId]: d }))} />}
            </div>
          )}
        </Step>
      )}
    </div>
  );
}
