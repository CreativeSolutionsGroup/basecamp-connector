import type { Connection } from "@prisma/client";

/**
 * Determines which connections should process a given form submission,
 * applying routing rules and exclusive-connection logic.
 *
 * A connection matches if:
 *  - it has no routingQuestionId (catch-all), OR
 *  - answersMap[routingQuestionId] === routingValue
 *
 * If any matching connection is marked exclusive, non-routed defaults
 * (connections without a routingQuestionId) are suppressed.
 */
export function getMatchingConnections(
  connections: Connection[],
  answersMap: Record<string, string>,
): Connection[] {
  const matching = connections.filter((c) => {
    if (!c.routingQuestionId) return true;
    return answersMap[c.routingQuestionId] === c.routingValue;
  });

  const exclusiveFired = matching.some((c) => c.exclusive);
  if (!exclusiveFired) return matching;

  // Suppress non-routed defaults when an exclusive connection matched
  return matching.filter((c) => c.routingQuestionId || c.exclusive);
}
