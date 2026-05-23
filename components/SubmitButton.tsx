"use client";

import { useFormStatus } from "react-dom";

interface Props {
  label: string;
  loadingLabel?: string;
  className?: string;
}

export default function SubmitButton({ label, loadingLabel, className = "mt-6" }: Props) {
  const { pending } = useFormStatus();

  return (
    <button className={`btn btn-primary ml-auto ${className}`} type="submit" disabled={pending}>
      {pending && <span className="loading loading-spinner loading-sm" />}
      {pending ? (loadingLabel ?? label) : label}
    </button>
  );
}
