"use server";

import { db } from "@/lib/db";
import {
  getGoogleFormResponses,
  parseGoogleAnswers,
  type GoogleFormResponse,
} from "@/lib/google";
import { getMatchingConnections } from "@/lib/routing";
import { applyPlainTemplate } from "@/lib/template";
import { buildQuestionIdToItemIdMap } from "@/lib/utils/google";
import { createBasecampCard, createBasecampTodo } from "@/lib/basecamp";
import { revalidatePath } from "next/cache";

export interface MatchingConnectionStatus {
  connectionId: string;
  connectionTitle: string;
  sent: boolean;
}

export interface ResponseWithStatus {
  responseId: string;
  createTime: string;
  answersMap: Record<string, string>;
  matchingConnections: MatchingConnectionStatus[];
}

export async function getFormResponsesWithStatus(
  formId: string,
): Promise<ResponseWithStatus[]> {
  const form = await db.form.findUnique({
    where: { id: formId },
    include: { connections: true },
  });

  if (!form) throw new Error("Form not found");

  const [googleResponses, sentRecords] = await Promise.all([
    getGoogleFormResponses(form.formId),
    db.response.findMany({ where: { formId: form.id } }),
  ]);

  // Map from Responses API questionId → itemId (used by templates + DB)
  const keyMap = buildQuestionIdToItemIdMap(form.formFields);

  // O(1) lookup: "responseId:connectionId"
  const sentSet = new Set(
    sentRecords.map((r) => `${r.responseId}:${r.connectionId}`),
  );

  return [...googleResponses]
    .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
    .map((gr: GoogleFormResponse) => {
    const answersMap = parseGoogleAnswers(gr.answers, keyMap);
    const matching = getMatchingConnections(form.connections, answersMap);
    return {
      responseId: gr.responseId,
      createTime: gr.createTime,
      answersMap,
      matchingConnections: matching.map((c) => ({
        connectionId: c.id,
        connectionTitle: applyPlainTemplate(c.title || form.title, answersMap),
        sent: sentSet.has(`${gr.responseId}:${c.id}`),
      })),
    };
  });
}

export async function sendResponseToBasecamp(params: {
  formId: string;
  responseId: string;
  connectionId: string;
  title: string;
  content: string;
  responseData: Record<string, string>;
}): Promise<{ success: true; basecampUrl: string } | { success: false; error: string }> {
  const { formId, responseId, connectionId, title, content, responseData } =
    params;

  // Guard against double-sends
  const existing = await db.response.findFirst({
    where: { responseId, connectionId },
  });
  if (existing) {
    return { success: false, error: "Already sent to this connection." };
  }

  const [form, connection] = await Promise.all([
    db.form.findUnique({ where: { id: formId } }),
    db.connection.findUnique({ where: { id: connectionId } }),
  ]);

  if (!form) return { success: false, error: "Form not found." };
  if (!connection) return { success: false, error: "Connection not found." };

  try {
    let result: { id: number; url: string };

    if (connection.type === "BASECAMP_CARD") {
      result = await createBasecampCard(
        connection.basecampProjectId,
        connection.basecampSubItemId,
        title,
        content,
      );
    } else {
      // For todos: content = title (todo name), description = body HTML
      result = await createBasecampTodo(
        connection.basecampProjectId,
        connection.basecampSubItemId,
        title,
        content,
      );
    }

    await db.response.create({
      data: {
        responseId,
        responseData,
        connectionId,
        formId: form.id,
      },
    });

    revalidatePath(`/form/${formId}/responses`);
    revalidatePath(`/form/${formId}/responses/${responseId}`);

    return { success: true, basecampUrl: result.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
