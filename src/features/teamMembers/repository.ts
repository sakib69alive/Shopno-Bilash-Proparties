import { createPrismaRepository } from "@/lib/prismaRepository";
import type { Repository } from "@/lib/repository";
import type { TeamMember } from "@/types/teamMember";

/** Admin-owned leadership/partners list, shown on the public Founder page below the Founder's own profile. */
export const teamMemberRepository: Repository<TeamMember> = createPrismaRepository<TeamMember>("teamMember");

/** Creation order (oldest first) — the order both the admin list and the public page read entries in, same reasoning as `listPolicyRulesOrdered`. */
export async function listTeamMembersOrdered(): Promise<TeamMember[]> {
  const rows = await teamMemberRepository.list();
  return [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
