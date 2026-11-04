import type { Metadata } from "next";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { ServicesM } from "@/components/mobile/ServicesM";
import { ServiceChapter } from "@/components/services/ServiceChapter";
import { ServiceIndex } from "@/components/services/ServiceIndex";
import { ServicesEnquiryCTA } from "@/components/services/ServicesEnquiryCTA";
import { ServicesHero } from "@/components/services/ServicesHero";
import { ServicesPathways } from "@/components/services/ServicesPathways";
import { ServicesProcess } from "@/components/services/ServicesProcess";
import { ServicesRelatedProject } from "@/components/services/ServicesRelatedProject";
import { services } from "@/content/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Every way to work with Shopno Bilash Properties — property development, construction, sales, landowner partnerships, investment opportunities and project management.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  const featured = services.filter((s) => s.featured);
  const [propertyDevelopment, landownerPartnerships] = featured;

  return (
    <>
      <ServicesHero />
      <ServicesM />
      <DesktopOnly>
      <ServiceIndex />

      {propertyDevelopment && (
        <ServiceChapter service={propertyDevelopment} imagePosition="left" background="surface" />
      )}
      <ServicesRelatedProject />
      <ServicesProcess />

      {landownerPartnerships && (
        <ServiceChapter service={landownerPartnerships} imagePosition="right" background="bg" />
      )}

      <ServicesPathways />
      <ServicesEnquiryCTA />
      </DesktopOnly>
    </>
  );
}
