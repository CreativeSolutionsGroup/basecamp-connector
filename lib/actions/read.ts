"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "../db";
import { getItemsFromGoogleForm } from "../google";
import { getFormIDFromURL } from "../utils/google";
import { redirect } from "next/navigation";

export async function readData(formData: FormData) {
  const formUrl = formData.get("formUrl");
  const returnUrl = formData.get("returnUrl");
  const errorBase =
    typeof returnUrl === "string" && returnUrl ? returnUrl : "/new-form";

  if (typeof formUrl !== "string") {
    redirect(`${errorBase}?error=Form+URL+is+required`);
  }

  const formId = getFormIDFromURL(formUrl);

  if (!formId) {
    redirect(`${errorBase}?error=Invalid+Google+Form+URL`);
  }

  let form;
  try {
    form = await getItemsFromGoogleForm(formId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch form data";
    redirect(`${errorBase}?error=${encodeURIComponent(message)}`);
  }

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
