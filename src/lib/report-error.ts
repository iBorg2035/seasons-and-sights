// Lightweight, dependency-free error reporting. Sends events to Sentry's
// modern envelope endpoint only when NEXT_PUBLIC_SENTRY_DSN is set — otherwise
// a no-op. Keeps the app deploy-safe with zero added dependencies; set the DSN
// to turn monitoring on.

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

function endpoint(): string | null {
  if (!DSN) return null;
  try {
    const u = new URL(DSN);
    const projectId = u.pathname.replace(/^\//, "");
    if (!u.username || !projectId) return null;
    // Modern envelope endpoint (the legacy /store/ one is deprecated).
    return `${u.protocol}//${u.host}/api/${projectId}/envelope/?sentry_key=${u.username}&sentry_version=7`;
  } catch {
    return null;
  }
}

export function reportError(error: unknown, context?: Record<string, unknown>) {
  const url = endpoint();
  if (!url) return;
  const err = error instanceof Error ? error : new Error(String(error));
  const eventId = (crypto.randomUUID?.() ?? `${Date.now()}`).replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: "error",
    exception: { values: [{ type: err.name, value: err.message }] },
    extra: { stack: err.stack, ...context },
    request:
      typeof location !== "undefined" ? { url: location.href } : undefined,
  };
  // Sentry envelope: header line, item header line, then the event payload.
  const body = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");
  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never let reporting throw */
  }
}

/** Register global handlers for uncaught errors and promise rejections. */
export function initErrorReporting() {
  if (!endpoint() || typeof window === "undefined") return;
  window.addEventListener("error", (e) =>
    reportError(e.error ?? e.message, { kind: "window.error" })
  );
  window.addEventListener("unhandledrejection", (e) =>
    reportError(e.reason, { kind: "unhandledrejection" })
  );
}
