"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { getIdsFromBasecampURL } from "../utils/basecamp";

type ActionResult = { success: true } | { success: false; error: string };

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
  const basecampUrl = formData.get("basecampUrl") as string;
  const type =
    formData.get("itemType") === "card" ? "BASECAMP_CARD" : "BASECAMP_TODO";
  const content = (formData.get("content") as string) ?? "";
  const routingQuestionId =
    (formData.get("routingQuestionId") as string) || null;
  const routingValue = routingQuestionId
    ? (formData.get("routingValue") as string) || null
    : null;

  const ids = getIdsFromBasecampURL(basecampUrl);
  if (!ids) return { success: false, error: "Invalid Basecamp URL" };

  try {
    const connection = await db.connection.update({
      where: { id: connectionId },
      data: {
        type,
        basecampProjectId: ids.projectId,
        basecampSubItemId: ids.subItemId,
        content,
        routingQuestionId,
        routingValue,
      },
    });
    revalidatePath(`/form/${connection.formId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save connection" };
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
