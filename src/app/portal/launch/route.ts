import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPortalHomePath, PORTAL_ROLES } from "@/config/roles";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !PORTAL_ROLES.includes(user.role)) redirect("/login");
  redirect(getPortalHomePath(user.role));
}
