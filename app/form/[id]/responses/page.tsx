import { getFormResponsesWithStatus } from "@/lib/actions/responses";
import { db } from "@/lib/db";
import { IconChevronLeft, IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const form = await db.form.findUnique({
    where: { id },
    include: { connections: true },
  });

  if (!form) {
    return (
      <div className="flex justify-center w-full">
        <main className="w-2xl mt-4">
          <div role="alert" className="alert alert-error">
            Form not found.
          </div>
        </main>
      </div>
    );
  }

  let responses;
  let fetchError: string | null = null;

  try {
    responses = await getFormResponsesWithStatus(id);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="flex justify-center w-full">
      <main className="w-2xl mt-4 mb-16">
        <div className="flex items-center gap-2">
          <Link href={`/form/${id}`} className="btn btn-ghost btn-square">
            <IconChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Responses</h1>
            <p className="text-sm text-base-content/60">{form.title}</p>
          </div>
        </div>

        {fetchError && (
          <div role="alert" className="alert alert-error mt-6">
            {fetchError}
          </div>
        )}

        {!fetchError && form.connections.length === 0 && (
          <div role="alert" className="alert alert-warning mt-6">
            No connections configured yet. Add connections to this form before
            reviewing responses.
          </div>
        )}

        {!fetchError && responses && responses.length === 0 && (
          <p className="text-base-content/50 text-sm mt-8">
            No responses submitted yet.
          </p>
        )}

        {!fetchError && responses && responses.length > 0 && (
          <div className="flex flex-col gap-3 mt-6">
            {responses.map((r) => (
              <div key={r.responseId} className="card bg-base-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm text-base-content/70">
                      Submitted{" "}
                      {new Date(r.createTime).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {r.matchingConnections.length === 0 ? (
                        <span className="badge badge-ghost badge-sm">
                          No matching connections
                        </span>
                      ) : (
                        r.matchingConnections.map((mc) => (
                          <span
                            key={mc.connectionId}
                            className={`badge badge-sm ${mc.sent ? "badge-success" : "badge-ghost"}`}
                          >
                            {mc.connectionTitle}
                            {mc.sent ? " ✓" : ""}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/form/${id}/responses/${r.responseId}`}
                    className="btn btn-sm btn-outline shrink-0"
                  >
                    <IconExternalLink className="w-4 h-4" />
                    Review &amp; Send
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
