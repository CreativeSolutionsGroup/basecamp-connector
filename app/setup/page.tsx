import { db } from "@/lib/db";
import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";

const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: `${process.env.APP_URL}/api/auth/google`,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/forms.body.readonly",
      "https://www.googleapis.com/auth/forms.responses.readonly",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  }).toString();

async function getGoogleStatus() {
  const token = await db.setting.findUnique({
    where: { key: "google_refresh_token" },
  });
  return !!token?.value;
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const [googleConnected, { connected, error }] = await Promise.all([
    getGoogleStatus(),
    searchParams,
  ]);

  return (
    <div className="flex justify-center w-full h-full">
      <main className="w-2xl mt-4 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="btn btn-ghost btn-square">
            <IconChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Setup</h1>
        </div>
        {connected === "google" && (
          <div role="alert" className="alert alert-success">
            Google account connected successfully.
          </div>
        )}
        {error && (
          <div role="alert" className="alert alert-error">
            Error: {error.replace(/_/g, " ")}
          </div>
        )}

        {/* Google */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="card-title">Google Forms</h2>
                <p className="text-sm text-base-content/60">
                  Allows reading form field schemas via the Google Forms API.
                </p>
              </div>
              {googleConnected ? (
                <span className="badge badge-success badge-lg">Connected</span>
              ) : (
                <span className="badge badge-ghost badge-lg">
                  Not connected
                </span>
              )}
            </div>
            <div className="card-actions">
              <a href={GOOGLE_AUTH_URL} className="btn btn-primary btn-sm">
                {googleConnected ? "Reconnect Google" : "Connect Google"}
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
