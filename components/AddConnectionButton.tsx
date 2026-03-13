"use client";

import { useTransition } from "react";
import { IconPlus } from "@tabler/icons-react";
import { createConnection } from "@/lib/actions/connection";
import { useToast } from "./ToastProvider";

export default function AddConnectionButton({ formId }: { formId: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await createConnection(formId);
      if (!result.success) toast({ type: "error", message: result.error });
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="btn btn-sm btn-outline gap-1"
    >
      <IconPlus className="w-4 h-4" />
      {pending ? "Adding…" : "Add Connection"}
    </button>
  );
}
