"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { testBasecampDestination } from "../basecamp";

type ActionResult = { success: true } | { success: false; error: string };
type TestResult = { success: true; name: string } | { success: false; error: string };

export async function createConnection(formId: string): Promise<ActionResult> {
  try {
    await db.connection.create({
      data: {
        formId,
        type: "BASECAMP_CARD",
        content: "",
        basecampProjectId: "",
        basecampSubItemId: "",
      },
    });
    revalidatePath(`/form/${formId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to add connection" };
  }
}

export async function updateConnection(
  connectionId: string,
  formData: FormData
): Promise<ActionResult> {
  const type =
    formData.get("itemType") === "card" ? "BASECAMP_CARD" : "BASECAMP_TODO";
  const title = (formData.get("title") as string) ?? "";
  const content = (formData.get("content") as string) ?? "";
  const routingQuestionId =
    (formData.get("routingQuestionId") as string) || null;
  const routingValue = routingQuestionId
    ? (formData.get("routingValue") as string) || null
    : null;
  const exclusive = formData.get("exclusive") === "on";

  const basecampProjectId = (formData.get("basecampProjectId") as string) ?? "";
  const basecampSubItemId = (formData.get("basecampSubItemId") as string) ?? "";
  const basecampProjectName = (formData.get("basecampProjectName") as string) ?? "";
  const basecampSubItemName = (formData.get("basecampSubItemName") as string) ?? "";

  if (!basecampProjectId || !basecampSubItemId) {
    return { success: false, error: "No Basecamp destination selected." };
  }

  try {
    const connection = await db.connection.update({
      where: { id: connectionId },
      data: {
        type,
        basecampProjectId,
        basecampSubItemId,
        basecampProjectName,
        basecampSubItemName,
        title,
        content,
        routingQuestionId,
        routingValue,
        exclusive,
      },
    });
    revalidatePath(`/form/${connection.formId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save connection" };
  }
}

export async function testConnection(connectionId: string): Promise<TestResult> {
  const connection = await db.connection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) return { success: false, error: "Connection not found" };
  if (!connection.basecampProjectId || !connection.basecampSubItemId) {
    return {
      success: false,
      error: "Connection has no Basecamp URL saved. Save the connection first.",
    };
  }
  try {
    const result = await testBasecampDestination(
      connection.type,
      connection.basecampProjectId,
      connection.basecampSubItemId,
    );
    return { success: true, name: result.name };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Test failed",
    };
  }
}

export async function deleteConnection(
  connectionId: string
): Promise<ActionResult> {
  try {
    const connection = await db.connection.delete({
      where: { id: connectionId },
    });
    revalidatePath(`/form/${connection.formId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete connection" };
  }
}
