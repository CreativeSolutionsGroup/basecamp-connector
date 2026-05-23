export interface ParsedFormField {
  questionId: string;
  title: string;
  type: "text" | "choice" | "date" | "time";
  options?: string[];
  sectionTitle?: string;
}

function getFieldTypeInfo(
  question: Record<string, unknown>
): Pick<ParsedFormField, "type" | "options"> {
  if (question.choiceQuestion) {
    const cq = question.choiceQuestion as { options: { value: string }[] };
    return { type: "choice", options: cq.options.map((o) => o.value) };
  }
  if (question.dateQuestion) return { type: "date" };
  if (question.timeQuestion) return { type: "time" };
  return { type: "text" };
}

export function parseFormFields(raw: unknown): ParsedFormField[] {
  if (!Array.isArray(raw)) return [];
  const fields: ParsedFormField[] = [];
  let currentSection: string | undefined = undefined;
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    if (item.pageBreakItem !== undefined) {
      currentSection = (item.title as string) || undefined;
      continue;
    }
    if (!item.itemId || !item.questionItem?.question) continue;
    fields.push({
      questionId: item.itemId as string,
      title: item.title as string,
      ...getFieldTypeInfo(item.questionItem.question),
      sectionTitle: currentSection,
    });
  }
  return fields;
}

/**
 * Builds a mapping from the Google Forms Responses API's questionId
 * to the itemId used by our system (and by the Apps Script webhook).
 *
 * The Responses API keys answers by question.questionId, but templates
 * and the DB use item.itemId (the same hex value Apps Script sends).
 */
export function buildQuestionIdToItemIdMap(rawItems: unknown): Map<string, string> {
  const map = new Map<string, string>();
  if (!Array.isArray(rawItems)) return map;
  for (const item of rawItems) {
    if (typeof item !== "object" || item === null) continue;
    const i = item as Record<string, unknown>;
    const itemId = i.itemId as string | undefined;
    const question = (
      i.questionItem as { question?: { questionId?: string } } | undefined
    )?.question;
    if (itemId && question?.questionId) {
      map.set(question.questionId, itemId);
    }
  }
  return map;
}

export function getFormIDFromURL(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "docs.google.com" &&
      parsed.pathname.startsWith("/forms/")
    ) {
      const parts = parsed.pathname.split("/");
      const formIndex = parts.findIndex((part) => part === "forms");
      if (formIndex !== -1 && parts.length > formIndex + 2) {
        return parts[formIndex + 2];
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    // Invalid URL
  }
  return null;
}