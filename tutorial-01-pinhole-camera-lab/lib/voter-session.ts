let sessionId: string | undefined;

export function getVoterId(storage?: Pick<Storage, "getItem" | "setItem">) {
  const key = "pinhole-camera-voter-id";
  sessionId ??= typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `voter-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    const local = storage ?? window.localStorage;
    const existing = local.getItem(key);
    if (existing) { sessionId = existing; return existing; }
    local.setItem(key, sessionId);
  } catch {
    // Denied storage must not prevent reading questions or voting in this session.
  }
  return sessionId;
}
