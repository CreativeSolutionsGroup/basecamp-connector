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
 * Returns a valid Basecamp access token, refreshing it if expired.
 * Requires basecamp_refresh_token to be set in the settings table (done via /setup OAuth flow).
 */
export async function getBasecampAccessToken(): Promise<string> {
  const [accessToken, refreshToken, expiresAt] = await Promise.all([
    getSetting("basecamp_access_token"),
    getSetting("basecamp_refresh_token"),
    getSetting("basecamp_token_expires_at"),
  ]);

  if (!refreshToken) {
    throw new Error(
      "Basecamp OAuth not configured. Complete setup at /setup first.",
    );
  }

  const isExpired = !expiresAt || Date.now() >= parseInt(expiresAt, 10);
  if (accessToken && !isExpired) return accessToken;

  const res = await fetch("https://launchpad.37signals.com/authorization/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      type: "refresh",
      refresh_token: refreshToken,
      client_id: process.env.BASECAMP_CLIENT_ID!,
      client_secret: process.env.BASECAMP_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basecamp token refresh failed: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const newExpiresAt = Date.now() + data.expires_in * 1000 - 60_000;

  const updates: Promise<void>[] = [
    setSetting("basecamp_access_token", data.access_token),
    setSetting("basecamp_token_expires_at", String(newExpiresAt)),
  ];
  if (data.refresh_token) {
    updates.push(setSetting("basecamp_refresh_token", data.refresh_token));
  }
  await Promise.all(updates);

  return data.access_token;
}

async function basecampFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getBasecampAccessToken();
  console.log(`Basecamp API request to ${url} with token ${token.slice(0, 4)}...`);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "BasecampConnector (creativesolutions@cedarville.edu)",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  return fetch(url, { ...options, headers });
}

/**
 * Tests that a Basecamp destination (card column or todolist) is reachable.
 * Returns the destination name on success.
 */
export async function testBasecampDestination(
  type: "BASECAMP_CARD" | "BASECAMP_TODO",
  projectId: string,
  subItemId: string,
): Promise<{ name: string }> {
  const accountId = await getSetting("basecamp_account_id");
  if (!accountId) {
    throw new Error(
      "Basecamp account ID not configured. Reconnect Basecamp at /setup.",
    );
  }

  const url =
    type === "BASECAMP_CARD"
      ? `https://3.basecampapi.com/${accountId}/buckets/${projectId}/card_tables/lists/${subItemId}/cards.json`
      : `https://3.basecampapi.com/${accountId}/buckets/${projectId}/todolists/${subItemId}/todos.json`;

  const res = await basecampFetch(url);

  if (res.status === 404) {
    throw new Error("Basecamp destination not found (404). Check the URL.");
  }
  if (res.status === 403) {
    throw new Error(
      "Access denied. Ensure the bot account has access to this project.",
    );
  }
  if (!res.ok) {
    throw new Error(`Basecamp API error: ${res.status}`);
  }

  const data = (await res.json()) as { name: string };
  return { name: data.name };
}

/**
 * Creates a card in a Basecamp card table column.
 */
export async function createBasecampCard(
  projectId: string,
  columnId: string,
  title: string,
  content: string,
): Promise<{ id: number; url: string }> {
  const accountId = await getSetting("basecamp_account_id");
  if (!accountId) {
    throw new Error(
      "Basecamp account ID not configured. Reconnect Basecamp at /setup.",
    );
  }

  const res = await basecampFetch(
    `https://3.basecampapi.com/${accountId}/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
    {
      method: "POST",
      body: JSON.stringify({ title, content }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create Basecamp card: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { id: number; app_url: string };
  return { id: data.id, url: data.app_url };
}

/**
 * Creates a todo in a Basecamp todolist.
 */
export async function createBasecampTodo(
  projectId: string,
  todolistId: string,
  content: string,
  description: string,
): Promise<{ id: number; url: string }> {
  const accountId = await getSetting("basecamp_account_id");
  if (!accountId) {
    throw new Error(
      "Basecamp account ID not configured. Reconnect Basecamp at /setup.",
    );
  }

  const res = await basecampFetch(
    `https://3.basecampapi.com/${accountId}/buckets/${projectId}/todolists/${todolistId}/todos.json`,
    {
      method: "POST",
      body: JSON.stringify({ content, description }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create Basecamp todo: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { id: number; app_url: string };
  return { id: data.id, url: data.app_url };
}
