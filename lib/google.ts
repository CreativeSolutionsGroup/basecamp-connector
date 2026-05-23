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
    if (res.status === 403) {
      throw new Error(
        "The bot account doesn't have access to this form. Share the form with the bot account and try again.",
      );
    }
    if (res.status === 404) {
      throw new Error(
        "Form not found. Check that the URL is correct and the form hasn't been deleted.",
      );
    }
    const text = await res.text();
    throw new Error(`Failed to fetch form data from Google: ${text}`);
  }

  const data = (await res.json()) as Form;
  return data;
}

export interface GoogleFormAnswer {
  questionId: string;
  textAnswers?: { answers: { value: string }[] };
  choiceAnswers?: { answers: { value: string }[] };
}

export interface GoogleFormResponse {
  responseId: string;
  createTime: string;
  answers?: Record<string, GoogleFormAnswer>;
}

/**
 * Fetches all responses for a Google Form.
 * Returns an empty array if no responses exist (the API omits the key entirely).
 * TODO: handle nextPageToken for forms with >5000 responses.
 */
export async function getGoogleFormResponses(
  formId: string,
): Promise<GoogleFormResponse[]> {
  const accessToken = await getGoogleAccessToken();
  const res = await fetch(
    `https://forms.googleapis.com/v1/forms/${formId}/responses`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(
        "The bot account doesn't have access to this form's responses. Share the form with the bot account and try again.",
      );
    }
    if (res.status === 404) {
      throw new Error(
        "Form not found. Check that the URL is correct and the form hasn't been deleted.",
      );
    }
    const text = await res.text();
    throw new Error(`Failed to fetch form responses from Google: ${text}`);
  }

  const data = (await res.json()) as { responses?: GoogleFormResponse[] };
  return data.responses ?? [];
}

/**
 * Flattens the Google Forms Responses API answer map into a plain
 * Record<itemId, string>, joining multi-value answers with ", ".
 *
 * The Responses API keys answers by question.questionId, which differs
 * from the item.itemId used by templates and the Apps Script webhook.
 * Pass keyMap (built with buildQuestionIdToItemIdMap) to remap keys to
 * item IDs so that template substitution works correctly.
 */
export function parseGoogleAnswers(
  answers: Record<string, GoogleFormAnswer> | undefined,
  keyMap?: Map<string, string>,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!answers) return map;
  for (const [questionId, answer] of Object.entries(answers)) {
    const values =
      answer.textAnswers?.answers.map((a) => a.value) ??
      answer.choiceAnswers?.answers.map((a) => a.value) ??
      [];
    const key = keyMap?.get(questionId) ?? questionId;
    map[key] = values.join(", ");
  }
  return map;
}
