"use client";

import { useRef, useState } from "react";
import { IconTrash } from "@tabler/icons-react";
import { deleteForm } from "@/lib/actions/delete";
import { twMerge } from "tailwind-merge";

export default function DeleteFormButton({
  formId,
  onDeleted,
  ...props
}: {
  formId: string;
  onDeleted?: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setError(null);
    dialogRef.current?.showModal();
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteForm(formId);
      dialogRef.current?.close();
      onDeleted?.();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError("Failed to delete form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) dialogRef.current?.close();
  };

  return (
    <>
      <button onClick={openModal} {...props} className={twMerge("btn btn-circle ml-4", props.className)}>
        <IconTrash className="w-5 h-5 text-red-400" />
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Delete form?</h3>
          <p className="py-4 text-base-content/70">
            This will permanently delete the form and all its connections. This
            action cannot be undone.
          </p>
          {error && <p className="text-error text-sm mb-3">{error}</p>}
          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button disabled={loading}>close</button>
        </form>
      </dialog>
    </>
  );
}
