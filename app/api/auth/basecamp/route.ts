import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, discoverLaunchpad } from "@37signals/basecamp/oauth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/setup?error=${encodeURIComponent(error)}`, req.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/setup?error=missing_code", req.url));
  }

  let token;
  try {
    const config = await discoverLaunchpad();
    token = await exchangeCode({
      tokenEndpoint: config.tokenEndpoint,
      code,
      redirectUri: `${process.env.APP_URL}/api/auth/basecamp`,
      clientId: process.env.BASECAMP_CLIENT_ID!,
      clientSecret: process.env.BASECAMP_CLIENT_SECRET!,
      useLegacyFormat: true,
    });
  } catch (err) {
    console.error("Basecamp token exchange failed:", err);
    return NextResponse.redirect(
      new URL("/setup?error=token_exchange_failed", req.url),
    );
  }

  const expiresAt = token.expiresAt?.getTime()
    ?? Date.now() + (token.expiresIn ?? 7200) * 1000 - 60_000;

  // Fetch the account ID from the Basecamp authorization endpoint
  let accountId: string;
  try {
    const authRes = await fetch(
      "https://launchpad.37signals.com/authorization.json",
      {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      },
    );
    if (!authRes.ok) {
      throw new Error(`authorization.json returned ${authRes.status}`);
    }
    const authData = (await authRes.json()) as {
      accounts: { id: number; product: string }[];
    };
    const bcAccount = authData.accounts.find((a) => a.product === "bc3");
    if (!bcAccount) {
      throw new Error("No Basecamp 3 account found in authorization response");
    }
    accountId = String(bcAccount.id);
  } catch (err) {
    console.error("Failed to fetch Basecamp account ID:", err);
    return NextResponse.redirect(
      new URL("/setup?error=account_fetch_failed", req.url),
    );
  }

  await Promise.all([
    db.setting.upsert({
      where: { key: "basecamp_access_token" },
      update: { value: token.accessToken },
      create: { key: "basecamp_access_token", value: token.accessToken },
    }),
    db.setting.upsert({
      where: { key: "basecamp_refresh_token" },
      update: { value: token.refreshToken! },
      create: { key: "basecamp_refresh_token", value: token.refreshToken! },
    }),
    db.setting.upsert({
      where: { key: "basecamp_token_expires_at" },
      update: { value: String(expiresAt) },
      create: { key: "basecamp_token_expires_at", value: String(expiresAt) },
    }),
    db.setting.upsert({
      where: { key: "basecamp_account_id" },
      update: { value: accountId },
      create: { key: "basecamp_account_id", value: accountId },
    }),
  ]);

  return NextResponse.redirect(new URL("/setup?connected=basecamp", req.url));
}
