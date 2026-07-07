import { createBasecampClient, isBasecampError } from "@37signals/basecamp";
import { refreshToken as sdkRefreshToken, isTokenExpired } from "@37signals/basecamp/oauth";
import type { OAuthToken } from "@37signals/basecamp";
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
  const [accessToken, storedRefreshToken, expiresAt] = await Promise.all([
    getSetting("basecamp_access_token"),
    getSetting("basecamp_refresh_token"),
    getSetting("basecamp_token_expires_at"),
  ]);

  if (!storedRefreshToken) {
    throw new Error(
      "Basecamp OAuth not configured. Complete setup at /setup first.",
    );
  }

  const token: OAuthToken = {
    accessToken: accessToken ?? "",
    refreshToken: storedRefreshToken,
    tokenType: "Bearer",
    expiresAt: expiresAt ? new Date(parseInt(expiresAt, 10)) : undefined,
  };

  if (accessToken && !isTokenExpired(token)) return accessToken;

  const newToken = await sdkRefreshToken({
    tokenEndpoint: "https://launchpad.37signals.com/authorization/token",
    refreshToken: storedRefreshToken,
    clientId: process.env.BASECAMP_CLIENT_ID!,
    clientSecret: process.env.BASECAMP_CLIENT_SECRET!,
    useLegacyFormat: true,
  });

  const newExpiresAt = newToken.expiresAt?.getTime()
    ?? Date.now() + (newToken.expiresIn ?? 7200) * 1000 - 60_000;

  const updates: Promise<void>[] = [
    setSetting("basecamp_access_token", newToken.accessToken),
    setSetting("basecamp_token_expires_at", String(newExpiresAt)),
  ];
  if (newToken.refreshToken) {
    updates.push(setSetting("basecamp_refresh_token", newToken.refreshToken));
  }
  await Promise.all(updates);

  return newToken.accessToken;
}

export async function getBasecampClient() {
  const accountId = await getSetting("basecamp_account_id");
  if (!accountId) {
    throw new Error(
      "Basecamp account ID not configured. Reconnect Basecamp at /setup.",
    );
  }
  return createBasecampClient({
    accountId,
    accessToken: getBasecampAccessToken,
    userAgent: "BasecampConnector (creativesolutions@cedarville.edu)",
  });
}

/**
 * Tests that a Basecamp destination (card column or todolist) is reachable.
 * Returns the destination name on success.
 */
export async function testBasecampDestination(
  type: "BASECAMP_CARD" | "BASECAMP_TODO",
  _projectId: string,
  subItemId: string,
): Promise<{ name: string }> {
  const client = await getBasecampClient();
  try {
    if (type === "BASECAMP_CARD") {
      const column = await client.cardColumns.get(parseInt(subItemId, 10));
      return { name: column.title };
    } else {
      const result = await client.todolists.get(parseInt(subItemId, 10));
      const title = "todolist" in result ? result.todolist.title : result.group.title;
      return { name: title };
    }
  } catch (err) {
    if (isBasecampError(err)) {
      if (err.code === "not_found") {
        throw new Error("Basecamp destination not found (404). Check the URL.");
      }
      if (err.code === "forbidden") {
        throw new Error(
          "Access denied. Ensure the bot account has access to this project.",
        );
      }
    }
    throw err;
  }
}

/**
 * Creates a card in a Basecamp card table column.
 */
export async function createBasecampCard(
  _projectId: string,
  columnId: string,
  title: string,
  content: string,
): Promise<{ id: number; url: string }> {
  const client = await getBasecampClient();
  const card = await client.cards.create(parseInt(columnId, 10), { title, content });
  return { id: card.id, url: card.app_url };
}

/**
 * Creates a todo in a Basecamp todolist.
 */
export async function createBasecampTodo(
  _projectId: string,
  todolistId: string,
  content: string,
  description: string,
): Promise<{ id: number; url: string }> {
  const client = await getBasecampClient();
  const todo = await client.todos.create(parseInt(todolistId, 10), { content, description });
  return { id: todo.id, url: todo.app_url };
}
