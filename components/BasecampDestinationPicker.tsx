"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { IconChevronLeft, IconSearch } from "@tabler/icons-react";
import {
  listBasecampProjects,
  getProjectCardColumns,
  getProjectTodolists,
  type ProjectSummary,
  type ColumnSummary,
  type TodolistSummary,
} from "@/lib/actions/basecamp-browse";

interface Destination {
  projectId: string;
  subItemId: string;
  projectName: string;
  subItemName: string;
}

interface RecentProject {
  id: string;
  name: string;
}

export default function BasecampDestinationPicker({
  type,
  projectId,
  subItemId,
  projectName,
  subItemName,
  recentProjects,
  onChange,
}: {
  type: "BASECAMP_CARD" | "BASECAMP_TODO";
  projectId: string;
  subItemId: string;
  projectName: string;
  subItemName: string;
  recentProjects: RecentProject[];
  onChange: (dest: Destination) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"project" | "items">("project");
  const [allProjects, setAllProjects] = useState<ProjectSummary[] | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [subItems, setSubItems] = useState<(ColumnSummary | TodolistSummary)[] | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async () => {
    setStep("project");
    setSelectedProject(null);
    setSubItems(null);
    setSearch("");
    setError(null);
    dialogRef.current?.showModal();

    if (!allProjects) {
      setLoadingProjects(true);
      try {
        const projects = await listBasecampProjects();
        setAllProjects(projects);
      } catch {
        setError("Failed to load projects.");
      } finally {
        setLoadingProjects(false);
      }
    }
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [allProjects]);

  const selectProject = useCallback(
    async (project: ProjectSummary) => {
      setSelectedProject(project);
      setSubItems(null);
      setError(null);
      setStep("items");
      setLoadingItems(true);
      try {
        if (type === "BASECAMP_CARD") {
          const columns = await getProjectCardColumns(project.id);
          setSubItems(columns);
        } else {
          const lists = await getProjectTodolists(project.id);
          setSubItems(lists);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load items.");
      } finally {
        setLoadingItems(false);
      }
    },
    [type],
  );

  const selectItem = useCallback(
    (item: ColumnSummary | TodolistSummary) => {
      if (!selectedProject) return;
      onChange({
        projectId: String(selectedProject.id),
        subItemId: String(item.id),
        projectName: selectedProject.name,
        subItemName: item.title,
      });
      dialogRef.current?.close();
    },
    [selectedProject, onChange],
  );

  // Reset cached projects list when type changes so columns vs todolists reload correctly
  useEffect(() => {
    setSubItems(null);
    setSelectedProject(null);
  }, [type]);

  const filteredProjects = allProjects
    ? allProjects.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  const recentFiltered = recentProjects.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) &&
      allProjects?.some((p) => String(p.id) === r.id),
  );

  const hasDestination = projectId && subItemId;
  const displayLabel =
    projectName && subItemName
      ? `${projectName} → ${subItemName}`
      : hasDestination
        ? `Project ${projectId} → Item ${subItemId}`
        : null;

  const itemLabel = type === "BASECAMP_CARD" ? "column" : "to-do list";

  return (
    <>
      {/* Closed state display */}
      <div className="flex items-center gap-2 flex-wrap">
        {displayLabel ? (
          <span className="text-sm font-medium">{displayLabel}</span>
        ) : (
          <span className="text-sm text-base-content/50">Not set</span>
        )}
        <button
          type="button"
          onClick={open}
          className="btn btn-outline btn-xs"
        >
          Browse…
        </button>
      </div>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box w-full max-w-lg flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            {step === "items" && (
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                onClick={() => { setStep("project"); setSearch(""); }}
              >
                <IconChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="font-bold text-lg flex-1">
              {step === "project"
                ? "Choose a project"
                : `Choose a ${itemLabel} in "${selectedProject?.name}"`}
            </h3>
          </div>

          {error && (
            <div className="alert alert-error text-sm mb-3 py-2">{error}</div>
          )}

          {/* Search (project step only) */}
          {step === "project" && (
            <label className="input input-sm flex items-center gap-2 mb-3">
              <IconSearch className="w-4 h-4 opacity-50" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search projects…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="grow"
              />
            </label>
          )}

          {/* Content area */}
          <div className="overflow-y-auto flex-1 -mx-2 px-2">
            {step === "project" && (
              <>
                {loadingProjects && (
                  <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-md" />
                  </div>
                )}

                {!loadingProjects && recentFiltered.length > 0 && !search && (
                  <div className="mb-3">
                    <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1 px-1">
                      Recently used
                    </p>
                    {recentFiltered.map((r) => {
                      const proj = allProjects?.find((p) => String(p.id) === r.id);
                      if (!proj) return null;
                      return (
                        <ProjectRow
                          key={r.id}
                          project={proj}
                          onSelect={selectProject}
                        />
                      );
                    })}
                    {filteredProjects.length > 0 && (
                      <p className="text-xs text-base-content/50 uppercase tracking-wide mt-3 mb-1 px-1">
                        All projects
                      </p>
                    )}
                  </div>
                )}

                {!loadingProjects &&
                  filteredProjects
                    .filter(
                      (p) =>
                        search || !recentFiltered.some((r) => r.id === String(p.id)),
                    )
                    .map((p) => (
                      <ProjectRow key={p.id} project={p} onSelect={selectProject} />
                    ))}

                {!loadingProjects && allProjects && filteredProjects.length === 0 && (
                  <p className="text-sm text-base-content/50 text-center py-8">
                    No projects match &ldquo;{search}&rdquo;
                  </p>
                )}
              </>
            )}

            {step === "items" && (
              <>
                {loadingItems && (
                  <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-md" />
                  </div>
                )}
                {!loadingItems && subItems && subItems.length === 0 && (
                  <p className="text-sm text-base-content/50 text-center py-8">
                    No {itemLabel}s found in this project.
                  </p>
                )}
                {!loadingItems && subItems && type === "BASECAMP_CARD"
                  ? renderGroupedColumns(subItems as ColumnSummary[], selectItem)
                  : !loadingItems && subItems?.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectItem(item)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-base-300 transition-colors text-sm"
                      >
                        {item.title}
                      </button>
                    ))}
              </>
            )}
          </div>
        </div>

        {/* Click-outside to close — type="button" avoids nested-form invalid HTML */}
        <button
          type="button"
          className="modal-backdrop"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
        />
      </dialog>
    </>
  );
}

function renderGroupedColumns(
  columns: ColumnSummary[],
  onSelect: (item: ColumnSummary | TodolistSummary) => void,
) {
  const boards = [...new Set(columns.map((c) => c.boardTitle))];
  const multiBoard = boards.length > 1;
  return boards.map((boardTitle) => (
    <div key={boardTitle}>
      {multiBoard && (
        <p className="text-xs text-base-content/50 uppercase tracking-wide mt-3 mb-1 px-1">
          {boardTitle}
        </p>
      )}
      {columns
        .filter((c) => c.boardTitle === boardTitle)
        .map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => onSelect(col)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-base-300 transition-colors text-sm"
          >
            {col.title}
          </button>
        ))}
    </div>
  ));
}

function ProjectRow({
  project,
  onSelect,
}: {
  project: ProjectSummary;
  onSelect: (p: ProjectSummary) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(project)}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-base-300 transition-colors"
    >
      <p className="text-sm font-medium">{project.name}</p>
      {project.description && (
        <p className="text-xs text-base-content/50 truncate">{project.description}</p>
      )}
    </button>
  );
}
