import { Input } from "@/components/ui/Input";

/**
 * The two optional "see it for real" links on a project or unit form. Leave a
 * box empty and that option simply doesn't appear on the public page — no
 * empty button, no placeholder. Shared so projects and units say the same thing.
 */
export function MediaLinksFields({
  videoUrl,
  tour360Url,
  subject,
}: {
  videoUrl?: string;
  tour360Url?: string;
  /** "project" or "unit" — only used in the helper text. */
  subject: string;
}) {
  return (
    <fieldset className="border-border flex flex-col gap-5 rounded-md border p-4">
      <legend className="text-label px-1.5">Video &amp; 360° tour (optional)</legend>
      <p className="text-body-sm text-fg-muted -mt-1">
        Paste a link and visitors get a Video and/or 360° button on this {subject}&apos;s page and a small icon on its card.
        Leave a box empty and that option stays hidden.
      </p>
      <Input
        label="Video link"
        name="videoUrl"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        defaultValue={videoUrl}
        placeholder="https://www.youtube.com/watch?v=…"
        helperText="YouTube, Vimeo or Facebook video link, or a direct .mp4 file link."
      />
      <Input
        label="360° tour link"
        name="tour360Url"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        defaultValue={tour360Url}
        placeholder="https://my.matterport.com/show/?m=…"
        helperText="The full link of your 360° tour page (Matterport, Kuula, Google Street View, …). It opens inside our page."
      />
    </fieldset>
  );
}
