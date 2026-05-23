"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { redirect } from "next/navigation";

export async function deleteForm(formId: string) {
  await db.response.deleteMany({ where: { formId } });
  await db.connection.deleteMany({ where: { formId } });
  await db.form.delete({ where: { id: formId } });
  revalidatePath("/");
  redirect("/"); // Redirect to homepage after deletion
}

export async function deleteConnection(connectionId: string) {
  await db.response.deleteMany({ where: { connectionId } });
  await db.connection.delete({ where: { id: connectionId } });
  revalidatePath(`/form/${connectionId}`);
}
