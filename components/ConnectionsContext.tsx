"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

interface ConnectionsContextValue {
  dirtyIds: Set<string>;
  markDirty: (id: string) => void;
  markClean: (id: string) => void;
  registerSaver: (id: string, fn: () => Promise<void>) => void;
  unregisterSaver: (id: string) => void;
  saveAll: () => Promise<void>;
  isSavingAll: boolean;
}

const ConnectionsContext = createContext<ConnectionsContextValue | null>(null);

export function ConnectionsProvider({ children }: { children: React.ReactNode }) {
  const [dirtyIds, setDirtyIds] = useState(new Set<string>());
  const [isSavingAll, setIsSavingAll] = useState(false);
  const dirtyIdsRef = useRef(new Set<string>());
  const saversRef = useRef(new Map<string, () => Promise<void>>());

  const markDirty = useCallback((id: string) => {
    dirtyIdsRef.current.add(id);
    setDirtyIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markClean = useCallback((id: string) => {
    dirtyIdsRef.current.delete(id);
    setDirtyIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const registerSaver = useCallback((id: string, fn: () => Promise<void>) => {
    saversRef.current.set(id, fn);
  }, []);

  const unregisterSaver = useCallback((id: string) => {
    saversRef.current.delete(id);
  }, []);

  const saveAll = useCallback(async () => {
    const toSave = [...saversRef.current.entries()].filter(([id]) =>
      dirtyIdsRef.current.has(id)
    );
    if (toSave.length === 0) return;
    setIsSavingAll(true);
    try {
      await Promise.allSettled(toSave.map(([, fn]) => fn()));
    } finally {
      setIsSavingAll(false);
    }
  }, []);

  return (
    <ConnectionsContext.Provider
      value={{ dirtyIds, markDirty, markClean, registerSaver, unregisterSaver, saveAll, isSavingAll }}
    >
      {children}
    </ConnectionsContext.Provider>
  );
}

export function useConnections() {
  const ctx = useContext(ConnectionsContext);
  if (!ctx) throw new Error("useConnections must be used within ConnectionsProvider");
  return ctx;
}
