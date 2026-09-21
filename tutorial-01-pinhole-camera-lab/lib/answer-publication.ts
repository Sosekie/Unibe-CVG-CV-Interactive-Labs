type PublicationChange = { published: boolean } & ({ scope: "all" } | { questionId: string });

export function parsePublicationChange(value: unknown, validIds: readonly string[]): PublicationChange | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (typeof payload.published !== "boolean") return null;
  if (payload.scope === "all" && payload.questionId === undefined) return { scope: "all", published: payload.published };
  if (payload.scope !== undefined || typeof payload.questionId !== "string") return null;
  const questionId = payload.questionId.trim();
  return validIds.includes(questionId) ? { questionId, published: payload.published } : null;
}
