const PUBLIC_BLUEPRINT = /^\/(?:api\/)?uploads\/((?:blueprints|projects|demo)\/(?![^/]*\.\.)[a-z0-9._-]+\.svg)$/i;

export function publicBlueprintPath(src: string): string | undefined {
  return PUBLIC_BLUEPRINT.exec(src)?.[1];
}

export function blueprintPreviewSrc(src: string, detail: boolean): string {
  const path = publicBlueprintPath(src);
  return path ? `/api/public/blueprint-preview?src=${encodeURIComponent(path)}&size=${detail ? "detail" : "card"}` : src;
}
