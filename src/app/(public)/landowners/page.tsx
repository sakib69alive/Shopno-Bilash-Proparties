import type { Metadata } from "next";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { LandownersM } from "@/components/mobile/LandownersM";
import { projectContentRepository } from "@/features/projectContent/repository";
import { DocumentsNeeded } from "@/components/partnership/DocumentsNeeded";
import { InvestmentSection } from "@/components/partnership/InvestmentSection";
import { JVProcess } from "@/components/partnership/JVProcess";
import { PartnershipEnquiry } from "@/components/partnership/PartnershipEnquiry";
import { PartnershipHero } from "@/components/partnership/PartnershipHero";
import { PartnershipStatement } from "@/components/partnership/PartnershipStatement";
import { ProjectOpportunities } from "@/components/partnership/ProjectOpportunities";
import { TrustTransparency } from "@/components/partnership/TrustTransparency";
import { TwoPaths } from "@/components/partnership/TwoPaths";
import { WhatWeBring } from "@/components/partnership/WhatWeBring";

export const metadata: Metadata = {
  title: "Landowners & Investment Partnerships",
  description:
    "Property development partnerships with Shopno Bilash Properties — for landowners considering a joint venture, and investors or development partners interested in real, project-specific opportunities.",
};

export default async function LandownersPage() {
  const projects = await projectContentRepository.list();

  return (
    <>
      <LandownersM projects={projects} />
      <DesktopOnly>
      <PartnershipHero />
      <PartnershipStatement />
      <TwoPaths />
      <JVProcess />
      <WhatWeBring />
      <InvestmentSection />
      <ProjectOpportunities />
      <TrustTransparency />
      <DocumentsNeeded />
      <PartnershipEnquiry />
      </DesktopOnly>
    </>
  );
}
