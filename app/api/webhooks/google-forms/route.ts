import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applyTemplate, applyPlainTemplate } from "@/lib/template";
import { createBasecampCard, createBasecampTodo } from "@/lib/basecamp";

interface WebhookAnswer {
  questionId: string;
  answer: string | string[];
}

interface WebhookBody {
  responseId: string;
  formId: string;
  submittedAt: string;
  answers: WebhookAnswer[];
}

export async function POST(req: NextRequest) {
  // Validate shared secret
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: WebhookBody;
  try {
    body = (await req.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { responseId, formId, answers } = body;
  if (!responseId || !formId || !Array.isArray(answers)) {
    return NextResponse.json(
      { error: "Missing required fields: responseId, formId, answers" },
      { status: 400 }
    );
  }

  // Look up the form with its connections
  const form = await db.form.findUnique({
    where: { formId },
    include: { connections: true },
  });

  if (!form) {
    return NextResponse.json(
      { error: `No form configured for formId: ${formId}` },
      { status: 422 }
    );
  }

  // Build a flat answers map for template substitution
  const answersMap: Record<string, string> = {};
  for (const { questionId, answer } of answers) {
    answersMap[questionId] = Array.isArray(answer) ? answer.join(", ") : String(answer);
  }

  const results: { connectionId: string; status: "sent" | "error"; error?: string }[] = [];

  for (const connection of form.connections) {
    // Apply routing rule if present
    if (connection.routingQuestionId) {
      const actual = answersMap[connection.routingQuestionId];
      if (actual !== connection.routingValue) {
        continue;
      }
    }

    const content = applyTemplate(connection.content, answersMap);
    const title = connection.title
      ? applyPlainTemplate(connection.title, answersMap)
      : form.title;

    try {
      if (connection.type === "BASECAMP_CARD") {
        await createBasecampCard(
          connection.basecampProjectId,
          connection.basecampSubItemId,
          title,
          content
        );
      } else {
        await createBasecampTodo(
          connection.basecampProjectId,
          connection.basecampSubItemId,
          title,
          content
        );
      }

      await db.response.create({
        data: {
          responseId,
          responseData: answersMap,
          connectionId: connection.id,
          formId: form.id,
        },
      });

      results.push({ connectionId: connection.id, status: "sent" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `Failed to send response ${responseId} via connection ${connection.id}:`,
        message
      );
      results.push({ connectionId: connection.id, status: "error", error: message });
    }
  }

  return NextResponse.json({ results });
}
