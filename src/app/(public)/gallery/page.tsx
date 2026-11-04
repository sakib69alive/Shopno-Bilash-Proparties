import type { Metadata } from "next";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { GalleryM } from "@/components/mobile/GalleryM";
import { GalleryClosingCTA } from "@/components/gallery/GalleryClosingCTA";
import { GalleryExplorer } from "@/components/gallery/GalleryExplorer";
import { GalleryIntro } from "@/components/gallery/GalleryIntro";
import { galleryRepository } from "@/features/gallery/repository";
import { projectContentRepository } from "@/features/projectContent/repository";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Architecture, construction and completed work from Shopno Bilash Properties — a visual record of our projects.",
};

export default async function GalleryPage() {
  const [items, projects] = await Promise.all([galleryRepository.list(), projectContentRepository.list()]);

  return (
    <>
      <GalleryM items={items} projects={projects} />
      <DesktopOnly>
        <GalleryIntro />
        <GalleryExplorer items={items} projects={projects} />
        <GalleryClosingCTA />
      </DesktopOnly>
    </>
  );
}
