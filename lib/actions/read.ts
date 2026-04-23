"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { getItemsFromGoogleForm } from "../google";
import { getFormIDFromURL } from "../utils/google";
import { redirect } from "next/navigation";

export async function readData(formData: FormData) {
  const formUrl = formData.get("formUrl");

  if (typeof formUrl !== "string") {
    throw new Error("Form URL is required");
  }

  const formId = getFormIDFromURL(formUrl);

  if (!formId) {
    throw new Error("Invalid Google Form URL");
  }

  const form = await getItemsFromGoogleForm(formId);
  const formFields = form.items as unknown as Prisma.InputJsonValue;
  const dbForm = await db.form.upsert({
    where: { formId: formId },
    update: { title: form.info.title, formFields },
    create: {
      formId: formId,
      title: form.info.title,
      formFields,
    },
  });

  revalidatePath("/");
  redirect(`/form/${dbForm.id}?updated=true`);
}
