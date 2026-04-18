/**
 * Applies form answer substitution to a Trix-serialized HTML template.
 *
 * Field placeholders are stored as Trix content attachments:
 *   <figure class="attachment ...">
 *     <span class="field-chip">Title</span>
 *     <span class="field-chip__id">{{questionId}}</span>
 *     <figcaption class="attachment__caption"></figcaption>
 *   </figure>
 *
 * The entire <figure> is replaced with the answer value so no attachment
 * markup leaks into the final Basecamp card content.
 */
export function applyTemplate(
  html: string,
  answers: Record<string, string>
): string {
  // Replace chip <figure> blocks with the substituted answer
  let result = html.replace(
    /<figure\b[^>]*class="[^"]*attachment[^"]*"[^>]*>[\s\S]*?<\/figure>/g,
    (figureMatch) => {
      const idMatch = figureMatch.match(
        /<span[^>]*class="field-chip__id"[^>]*>\{\{([^}]+)\}\}<\/span>/
      );
      if (!idMatch) return figureMatch; // not a field chip, leave it
      const questionId = idMatch[1];
      const answer = answers[questionId];
      return answer !== undefined ? escapeHtml(answer) : `{{${questionId}}}`;
    }
  );

  // Defensive pass: replace any bare {{questionId}} from the old insertText path
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, questionId) => {
    const answer = answers[questionId];
    return answer !== undefined ? escapeHtml(answer) : match;
  });

  return result;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
