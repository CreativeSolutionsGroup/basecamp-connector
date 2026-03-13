import { Form } from "@/types/form";
import { db } from "./db";

async function getSetting(key: string): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * Returns a valid Google access token, refreshing it if expired.
 * Requires google_refresh_token to be set in the settings table (done via /setup OAuth flow).
 */
export async function getGoogleAccessToken(): Promise<string> {
  const [accessToken, refreshToken, expiresAt] = await Promise.all([
    getSetting("google_access_token"),
    getSetting("google_refresh_token"),
    getSetting("google_token_expires_at"),
  ]);

  if (!refreshToken) {
    throw new Error(
      "Google OAuth not configured. Complete setup at /setup first.",
    );
  }

  const isExpired = !expiresAt || Date.now() >= parseInt(expiresAt, 10);
  if (accessToken && !isExpired) return accessToken;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  // Subtract 60s so we refresh before the token actually expires
  const newExpiresAt = Date.now() + data.expires_in * 1000 - 60_000;

  await Promise.all([
    setSetting("google_access_token", data.access_token),
    setSetting("google_token_expires_at", String(newExpiresAt)),
  ]);

  return data.access_token;
}

export async function getItemsFromGoogleForm(formId: string): Promise<Form> {
  const accessToken = await getGoogleAccessToken();
  const res = await fetch(
    `https://forms.googleapis.com/v1/forms/${formId}?fields=info.title,items`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch form data from Google: ${text}`);
  }

  const data = (await res.json()) as Form;
  return data;
}
