---
name: building-floor-plans
description: "Whole-floor plan feature — one typical floor SVG shared by many floors, flats marked as polygons, owner's own flat lit up and others dimmed in the client app"
metadata:
  node_type: memory
  type: project
  originSessionId: f1f390a3-54d5-43aa-97fe-657f011f869e
  modified: 2026-11-06T12:25:58.213Z
---

`Project.floorPlans: BuildingFloorPlan[]` (types/project.ts): `{id, name, image, aspect, floors[], areas[{key, points[0..1]}]}`. `floors` empty = the "typical" plan for every floor no other plan claims; exceptions list floor numbers (ground = 0). No DB migration (Project is a JSON model).

Resolved in `lib/unitPlan.ts` `resolveUnitPlan(unit, project, floorNumber)`: custom `Unit.layoutImage` > floor plan (with `highlight`) > explicit unit type > auto type. The flat's area is matched by `unitPositionKeys` (1A → "A"), same convention as unit types. Callers MUST pass the floor number (`features/floors/floorNumbers.ts` gives floorId → number); without it only the typical plan is picked.

Admin: tab "Floor plans" on a project (`/admin/projects/[id]/floor-plans`, `FloorPlansEditor`, `features/projects/floorPlanActions.ts`): upload drawing, floors text ("0", "1-4"), type a flat code and click corners on the drawing. Client side: `components/portal/PlanHighlight.tsx` (`PlanHighlightLayer`) lays polygons over the plan using container-query units so it aligns on any screen; used by BlueprintPaper (detail page, list thumbnails), and HomeBlueprint (card uses `focus` zoom on the flat; full screen shows the whole floor).

**Why:** the user's real building has one typical floor drawing for several floors; clients should see their own flat among the others. User chose "admin draws the area on the plan" and "own flat bright, others dim".

**Demo:** `scripts/seed-demo-real-plan.ts` seeds "Shopno Heights" with ground + typical plans and rough A/B/C polygons traced by eye (user can redraw in the editor).

**Update (user feedback, 2026-11-06):** (1) No "Your flat" tag anywhere. (2) The client HOME card + its full-screen viewer must show ONLY the owner's own flat as if it had its own drawing (`PlanHighlightLayer` `only` + `focus`: img clipped to the flat polygon, no other flats, no overlay) — the whole-floor-with-highlight view stays only on My Property pages/list. (3) Editors: Ctrl+Z undoes last corner, Esc cancels, clicking a corner dot removes it (floor-plan editor and `BlueprintRoomsField`). (4) Flats AND parking bays can be selected by the SVG itself: `<polygon data-flat="A">` / `<polygon data-parking="P-01">` markers, read by `extractAreasFromSvg` (lib/planRooms.ts) on upload (`uploadFloorPlanImageAction` returns `areas`); `FlatArea.kind` is "flat" | "parking"; manual marking has a Flat/Parking selector. Parking bays are matched to `Parking.parkingNumber` via `normalizeAreaKey` and shown by `resolveParkingPlan` on My Properties ("My Parking") and the flat page's Parking section. Blueprint AI prompt rule 13 covers these markers.

**Update (round 3):** Room buttons belong on the client's My Property FLAT page (under the whole-floor plan with the owner's flat lit: `PropertyFloorPlan` uses `RoomStage` tone "midnight" + `emphasis` + `RoomPicker`), NOT on Home — the user said "I didn't ask to add it there" (Home keeps only the flat cut out, no buttons). Admin Floor plans editor now has a LIVE client preview beside it (`ClientPlanPreview`: My Property page + Home card, built from the real client components, fed the unsaved plan) and a per-plan `BuildingFloorPlan.view` = {tilt (any angle, shrinks to fit), zoom, x, y} applied at display time via `planViewTransform` (RoomStage `view` prop and `PlanHighlightLayer`; Home/framed views use tilt only). Not baked into the file; Reset button. Quarter turns stay as the baked Turn left/right buttons.

**Update (round 4):** Turn left/right/Flip on the floor-plan editor failed for the demo plan because it lives under `/uploads/` (not `/api/uploads/`) — `rotateFloorPlanImageAction` now accepts both. Each flat can also be turned on its own for the Home card: `FlatArea.turn` (degrees, any angle) set in `ClientPlanPreview`; `RoomStage` `turn` prop adds it to the plan-wide tilt on framed views and a quarter-turn swaps the card to a tall shape (root `container-type:size`, rotated box sized 100cqh × 100cqw). The user wants to check everything on a real phone; they asked for a short summary of all blueprint work (given in chat).
