"use server";

import { getBasecampClient } from "../basecamp";

export interface ProjectSummary {
  id: number;
  name: string;
  description?: string;
}

export interface ColumnSummary {
  id: number;
  title: string;
  boardTitle: string;
}

export interface TodolistSummary {
  id: number;
  title: string;
}

export async function listBasecampProjects(): Promise<ProjectSummary[]> {
  const client = await getBasecampClient();
  const projects = await client.projects.list();
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }));
}

export async function getProjectCardColumns(
  projectId: number,
): Promise<ColumnSummary[]> {
  const client = await getBasecampClient();
  const project = await client.projects.get(projectId);
  const boardDocks = project.dock?.filter((d) => d.name === "kanban_board") ?? [];
  if (boardDocks.length === 0) throw new Error("This project has no card table.");
  const tables = await Promise.all(boardDocks.map((d) => client.cardTables.get(d.id)));
  return tables.flatMap((table) =>
    (table.lists ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      boardTitle: table.title,
    })),
  );
}

export async function getProjectTodolists(
  projectId: number,
): Promise<TodolistSummary[]> {
  const client = await getBasecampClient();
  const project = await client.projects.get(projectId);
  const todosetDock = project.dock?.find((d) => d.name === "todoset");
  if (!todosetDock) throw new Error("This project has no to-do list.");
  const lists = await client.todolists.list(todosetDock.id);
  return lists.map((t) => ({ id: t.id, title: t.title }));
}
