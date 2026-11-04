import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { MobileOnly } from "@/components/mobile/MobileOnly";
import { PageSkeleton } from "@/components/mobile/Skeleton";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

/** Shown by Next.js only while a route segment is actually streaming in. */
export default function PublicLoading() {
  return (
    <>
      <MobileOnly>
        <PageSkeleton />
      </MobileOnly>
      <DesktopOnly>
        <LoadingScreen />
      </DesktopOnly>
    </>
  );
}
