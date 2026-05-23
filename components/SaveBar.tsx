"use client";

import { useEffect } from "react";
import { useConnections } from "./ConnectionsContext";

export default function SaveBar() {
  const { dirtyIds, saveAll, isSavingAll } = useConnections();
  const isDirty = dirtyIds.size > 0;

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = function (...args) {
      if (window.confirm("You have unsaved changes. Leave without saving?")) {
        originalPushState(...args);
      }
    };

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.history.pushState = originalPushState;
    };
  }, [isDirty]);

  if (!isDirty && !isSavingAll) return null;

  const count = dirtyIds.size;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-base-300 bg-base-100/95 backdrop-blur-sm shadow-lg">
      <div className="flex items-center justify-between max-w-2xl mx-auto px-4 py-3">
        <p className="text-sm text-base-content/60">
          {count === 1 ? "1 unsaved connection" : `${count} unsaved connections`}
        </p>
        <button
          onClick={saveAll}
          disabled={isSavingAll}
          className="btn btn-primary btn-sm"
        >
          {isSavingAll && <span className="loading loading-spinner loading-xs" />}
          {isSavingAll ? "Saving…" : "Save All"}
        </button>
      </div>
    </div>
  );
}
