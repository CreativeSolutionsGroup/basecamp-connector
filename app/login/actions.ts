"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function login(formData: FormData) {
  const password = formData.get("password") as string;

  if (!password || password !== process.env.APP_PASSWORD) {
    redirect("/login?error=1");
  }

  const hash = await sha256(process.env.APP_PASSWORD!);
  const cookieStore = await cookies();
  cookieStore.set("auth", hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect("/");
}
