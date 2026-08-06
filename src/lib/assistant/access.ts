import { getServerUser } from "@/lib/supabase/server";
import type { RateLimitResult } from "@/lib/rate-limit";

/**
 * The gate every model-spending route in this app shares: xAI configured,
 * caller allowlisted, caller under their rate limit.
 *
 * Extracted rather than left copy-pasted per route, because a security check
 * duplicated twice is a check that silently drifts — someone tightens the
 * allowlist logic in one route and not the other. Every check here runs
 * before anything that could spend money, mirroring the original ordering in
 * `/api/assistant` exactly: config, then allowlist, then who's calling, then
 * rate limit.
 *
 * Messages are supplied by the caller rather than templated, so each route
 * keeps its own exact wording — this module owns the control flow and the
 * status codes, not the copy.
 */

export interface AccessMessages {
  /** XAI_API_KEY is unset. */
  unconfigured: string;
  /** The allowlist itself is empty — the feature was never opened up. */
  notOpen: string;
  /** No signed-in user. */
  signIn: string;
  /** Signed in, but not on the allowlist. */
  forbidden: string;
  /** Over the rate limit. */
  throttled: string;
}

export type AccessResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

function allowedEmails(): string[] {
  return (process.env.ASSISTANT_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAssistantAccess(
  rateLimit: (key: string) => RateLimitResult,
  messages: AccessMessages
): Promise<AccessResult> {
  if (!process.env.XAI_API_KEY?.trim()) {
    return {
      ok: false,
      response: Response.json({ error: messages.unconfigured }, { status: 503 }),
    };
  }

  // Fails closed: an empty/unset allowlist disables the feature rather than
  // opening it up, so forgetting to configure it can never expose the route.
  if (allowedEmails().length === 0) {
    return {
      ok: false,
      response: Response.json({ error: messages.notOpen }, { status: 503 }),
    };
  }

  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: messages.signIn }, { status: 401 }),
    };
  }
  if (!allowedEmails().includes((user.email ?? "").toLowerCase())) {
    return {
      ok: false,
      response: Response.json({ error: messages.forbidden }, { status: 403 }),
    };
  }

  // Keyed on the verified user id, not anything client-supplied, and still
  // ahead of the model call so a throttled request costs nothing.
  const limited = rateLimit(user.id);
  if (!limited.ok) {
    return {
      ok: false,
      response: Response.json(
        { error: messages.throttled },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      ),
    };
  }

  return { ok: true, userId: user.id };
}
