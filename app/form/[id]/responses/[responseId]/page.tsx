import { db } from "@/lib/db";
import {
  getGoogleFormResponses,
  parseGoogleAnswers,
} from "@/lib/google";
import { getMatchingConnections } from "@/lib/routing";
import { applyTemplate, applyPlainTemplate } from "@/lib/template";
import { parseFormFields, buildQuestionIdToItemIdMap } from "@/lib/utils/google";
import ResponseDetailClient, {
  type ConnectionBlock,
} from "@/components/ResponseDetailClient";
import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";

export default async function ResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string; responseId: string }>;
}) {
  const { id, responseId } = await params;

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

  // Fetch all responses and find this one
  let googleResponse;
  let fetchError: string | null = null;

  try {
    const allResponses = await getGoogleFormResponses(form.formId);
    googleResponse = allResponses.find((r) => r.responseId === responseId);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  if (!fetchError && !googleResponse) {
    return (
      <div className="flex justify-center w-full">
        <main className="w-2xl mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href={`/form/${id}/responses`}
              className="btn btn-ghost btn-square"
            >
              <IconChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold">Response</h1>
          </div>
          <div role="alert" className="alert alert-error">
            Response not found.
          </div>
        </main>
      </div>
    );
  }

  const keyMap = buildQuestionIdToItemIdMap(form.formFields);
  const answersMap = parseGoogleAnswers(googleResponse?.answers, keyMap);
  const matchingConnections = getMatchingConnections(form.connections, answersMap);

  // Check which connections have already been sent
  const sentRecords = await db.response.findMany({
    where: { formId: form.id, responseId },
  });
  const sentSet = new Set(sentRecords.map((r) => r.connectionId));

  // Build connection blocks for the client component
  const connectionBlocks: ConnectionBlock[] = matchingConnections.map((c) => ({
    connectionId: c.id,
    connectionName: c.title || form.title,
    connectionType: c.type,
    initialTitle: applyPlainTemplate(c.title || form.title, answersMap),
    initialContent: applyTemplate(c.content, answersMap),
    alreadySent: sentSet.has(c.id),
  }));

  // Parse form fields for the answers reference table
  const formFields = parseFormFields(form.formFields);

  return (
    <div className="flex justify-center w-full">
      <main className="w-2xl mt-4 mb-16">
        <div className="flex items-center gap-2">
          <Link
            href={`/form/${id}/responses`}
            className="btn btn-ghost btn-square"
          >
            <IconChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Response</h1>
            <p className="text-sm text-base-content/60">
              {form.title} &mdash;{" "}
              {googleResponse &&
                new Date(googleResponse.createTime).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
            </p>
          </div>
        </div>

        {fetchError && (
          <div role="alert" className="alert alert-error mt-6">
            {fetchError}
          </div>
        )}

        {/* Raw answers reference */}
        {!fetchError && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-base-content/70 hover:text-base-content">
              View raw answers
            </summary>
            <div className="mt-2 card bg-base-200 p-4">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {formFields.map((field) => (
                    <tr key={field.questionId}>
                      <td className="text-base-content/70">{field.title}</td>
                      <td>{answersMap[field.questionId] ?? "—"}</td>
                    </tr>
                  ))}
                  {formFields.length === 0 &&
                    Object.entries(answersMap).map(([qId, val]) => (
                      <tr key={qId}>
                        <td className="font-mono text-xs text-base-content/50">
                          {qId}
                        </td>
                        <td>{val}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {!fetchError && matchingConnections.length === 0 && (
          <div role="alert" className="alert alert-warning mt-6">
            This response doesn&apos;t match any connections based on their
            routing rules.
          </div>
        )}

        {!fetchError && matchingConnections.length > 0 && (
          <ResponseDetailClient
            formId={id}
            responseId={responseId}
            responseData={answersMap}
            connectionBlocks={connectionBlocks}
          />
        )}
      </main>
    </div>
  );
}
