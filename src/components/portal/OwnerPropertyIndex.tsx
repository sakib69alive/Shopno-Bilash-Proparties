import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { resolveOwnerContext } from "@/lib/ownerContext";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PropertyListPage } from "@/components/portal/PropertyListPage";
import { getOwnerUnits, getOwnerParking } from "@/features/ownerPortal/queries";

/**
 * `/portal/property` — an owner with exactly one unit is sent straight to
 * its detail page rather than shown a list of one; only a multi-property
 * owner sees the switcher (Prompt 1: "if an owner has multiple properties,
 * show a My Properties list… once selected, the whole portal context
 * reflects that property").
 */
export async function OwnerPropertyIndex({ base }: { base: string }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const context = resolveOwnerContext(user);
  if (!context) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState title="No property linked yet" description="Please contact Shopno Bilash Properties Ltd. to complete your account setup." />
      </div>
    );
  }

  const [units, parking] = await Promise.all([getOwnerUnits(context.ownerType, context.ownerId), getOwnerParking(context.ownerType, context.ownerId)]);
  // One flat and no parking: straight to the flat. With parking (or several flats) show the list, so the parking is seen too.
  if (units.length === 1 && parking.length === 0) {
    redirect(`${base}/property/${units[0].id}`);
  }

  return <PropertyListPage base={base} />;
}
