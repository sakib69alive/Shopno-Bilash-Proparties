import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const j = (r: any) => (typeof r.data === "string" ? JSON.parse(r.data) : r.data);
  const pid = "dfbdb243-c3bf-4068-a8fb-3bcf7545d1f2";
  const proj = j(await (p as any).project.findUnique({ where: { id: pid } }));
  const units = (await (p as any).unit.findMany()).map(j).filter((u: any) => u.projectId === pid);
  const parking = (await (p as any).parking.findMany()).map(j).filter((u: any) => u.projectId === pid);
  console.log(JSON.stringify({ cover: proj.media?.coverImage, gallery: proj.media?.gallery?.length, plans: proj.floorPlans?.map((f: any) => [f.name, f.floors, f.areas.length]), flats: units.length, withLandowner: units.filter((u: any) => u.landownerAllocationId).length, parking: parking.length, parkOwned: parking.filter((x: any) => x.ownerId).length, bikes: parking.filter((x: any) => x.type === "bike").length }));
})();
