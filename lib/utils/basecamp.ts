export function buildBasecampUrl(
  type: "BASECAMP_CARD" | "BASECAMP_TODO",
  projectId: string,
  subItemId: string
): string {
  const orgId = process.env.BASECAMP_ORG_ID;
  if (type === "BASECAMP_CARD") {
    return `https://3.basecamp.com/${orgId}/buckets/${projectId}/card_tables/columns/${subItemId}`;
  }
  return `https://3.basecamp.com/${orgId}/buckets/${projectId}/todolists/${subItemId}`;
}

export function getIdsFromBasecampURL(
  url: string,
): { projectId: string; subItemId: string } | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "3.basecamp.com" &&
      parsed.pathname.startsWith(`/${process.env.BASECAMP_ORG_ID}/buckets/`)
    ) {
      const parts = parsed.pathname.split("/");
      const ids = parts.reduce(
        (prev, part) => (Number.parseInt(part, 10) ? [...prev, part] : prev),
        [] as string[],
      );
      if (ids.length >= 3) {
        return { projectId: ids[1], subItemId: ids[2] };
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    // Invalid URL
  }
  return null;
}
