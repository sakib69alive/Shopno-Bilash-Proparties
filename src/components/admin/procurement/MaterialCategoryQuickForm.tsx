"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createMaterialCategory } from "@/features/procurement/materialCategoryActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" loading={pending}>
      Add Category
    </Button>
  );
}

export function MaterialCategoryQuickForm() {
  const [state, formAction] = useActionState(createMaterialCategory, {});
  const formRef = useRef<HTMLFormElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <PersistForm ref={formRef} state={state} action={formAction} className="flex flex-wrap items-end gap-2">
      <Input label="New Category" name="name" required placeholder="e.g. Electrical" className="h-9" />
      <Input label="Default Unit (optional)" name="defaultUnit" placeholder="e.g. Bag" className="h-9 w-36" />
      <Input label="Description (optional)" name="description" placeholder="e.g. OPC/PCC cement, all brands" className="h-9 flex-1" />
      <SubmitButton />
      {state.error && <p className="text-body-sm text-error">{state.error}</p>}
    </PersistForm>
  );
}
