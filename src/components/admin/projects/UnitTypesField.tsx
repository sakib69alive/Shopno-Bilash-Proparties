"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Media } from "@/components/ui/Media";
import type { UnitType } from "@/types/project";

interface Row {
  key: string;
  id: string;
  name: string;
  code: string;
  imageUrl: string;
}

let counter = 0;
const newKey = () => `row-${Date.now()}-${counter++}`;

/**
 * The project's shared blueprint designs ("Type A", "Type B"…). Each row is
 * one design: a name, the flat code it applies to ("A" → every 1A, 2A, 3A…
 * gets it automatically) and the blueprint image. Rows submit as parallel
 * same-named fields (`unitTypeId`, `unitTypeName`, `unitTypeCode`,
 * `unitTypeImageUrl`, `unitTypeImage`); the server action zips them back.
 * An individual flat can still carry its own custom plan from its edit page.
 */
export function UnitTypesField({ initial }: { initial?: UnitType[] }) {
  const [rows, setRows] = useState<Row[]>(
    (initial ?? []).map((t) => ({ key: t.id, id: t.id, name: t.name, code: t.positionCode ?? "", imageUrl: t.image ?? "" })),
  );

  function update(key: string, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-label text-fg-subtle uppercase">Blueprint types</h2>
        <p className="text-body-sm text-fg-muted mt-1.5">
          Most buildings repeat a few flat designs. Add each design once with the code that repeats on every floor (for example <b>A</b> for
          1A, 2A, 3A…) and every matching flat shows that blueprint automatically. A flat that differs can be given its own custom blueprint
          from its edit page.
        </p>
      </div>

      {rows.length === 0 && <p className="text-body-sm text-fg-subtle">No blueprint types yet.</p>}

      {rows.map((row, i) => (
        <fieldset key={row.key} className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4">
          <legend className="text-caption text-fg-subtle px-1 uppercase">Type {i + 1}</legend>
          <input type="hidden" name="unitTypeId" value={row.id} />
          <input type="hidden" name="unitTypeImageUrl" value={row.imageUrl} />

          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <Input
              label="Name"
              name="unitTypeName"
              value={row.name}
              onChange={(e) => update(row.key, { name: e.target.value })}
              placeholder="e.g. Type A — 3 bed corner"
            />
            <Input
              label="Flat code"
              name="unitTypeCode"
              value={row.code}
              onChange={(e) => update(row.key, { code: e.target.value })}
              placeholder="e.g. A"
              helperText="Same on every floor."
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {row.imageUrl && (
              <Media src={row.imageUrl} alt="" ratio="standard" radius="md" containerClassName="bg-bg w-full sm:w-40" sizes="160px" className="object-contain" />
            )}
            <div className="w-full min-w-0 sm:flex-1">
              <Input
                label="Blueprint image"
                name="unitTypeImage"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml,.svg"
                helperText={row.imageUrl ? "Leave empty to keep the current blueprint." : "JPG, PNG, WEBP or SVG — either one works. Upload only the layout drawing: no background, border or page colour."}
              />
            </div>
            <Button type="button" variant="ghost" onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}>
              <Trash2 aria-hidden className="size-4" />
              Remove
            </Button>
          </div>
        </fieldset>
      ))}

      <div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setRows((r) => [...r, { key: newKey(), id: "", name: "", code: "", imageUrl: "" }])}
        >
          <Plus aria-hidden className="size-4" />
          Add blueprint type
        </Button>
      </div>
    </div>
  );
}
