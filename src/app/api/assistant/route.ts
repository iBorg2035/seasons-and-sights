import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { xai } from "@ai-sdk/xai";
import { buildSystemPrompt } from "@/lib/assistant/system";
import { createAssistantTools } from "@/lib/assistant/tools";
import type { TripContextPayload } from "@/lib/assistant/types";
import { getServerUser } from "@/lib/supabase/server";
import { createRateLimiter } from "@/lib/rate-limit";

export const maxDuration = 60;

/**
 * Per-user spend cap. Generous enough that a real conversation never trips it
 * (each turn is one request), tight enough that a stuck retry loop or a shared
 * account can't run up a bill unattended. See rate-limit.ts on why this is a
 * dampener rather than a hard global bound.
 */
const rateLimit = createRateLimiter({ limit: 30, windowMs: 10 * 60 * 1000 });

const MODEL = process.env.XAI_MODEL?.trim() || "grok-4.5";

/**
 * Allowlist of emails permitted to use the assistant, comma-separated.
 *
 * This endpoint spends money per call, so it is NOT public. It fails closed:
 * an empty/unset allowlist disables the assistant entirely rather than
 * opening it up, so forgetting to configure it can never expose the endpoint.
 *
 * To open the assistant to every signed-in user later, replace the allowlist
 * check with a plain `user` check — but add rate limiting first, since the
 * allowlist is currently the only thing bounding spend.
 */
const ALLOWED_EMAILS = (process.env.ASSISTANT_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function parseTripContext(raw: unknown): TripContextPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (!Array.isArray(t.stops)) return null;
  const stops = t.stops
    .map((s) => {
      if (!Array.isArray(s) || s.length < 2) return null;
      const id = String(s[0] ?? "");
      const duration = Number(s[1]);
      if (!id || !Number.isFinite(duration)) return null;
      return [id, duration] as [string, number];
    })
    .filter((s): s is [string, number] => s != null);
  return {
    id: typeof t.id === "string" ? t.id : undefined,
    name: typeof t.name === "string" ? t.name : undefined,
    start: Number.isFinite(Number(t.start)) ? Number(t.start) : 0,
    stops,
    interests: Array.isArray(t.interests)
      ? (t.interests.filter((i) => typeof i === "string") as TripContextPayload["interests"])
      : undefined,
  };
}

export async function POST(req: Request) {
  if (!process.env.XAI_API_KEY?.trim()) {
    return Response.json(
      {
        error:
          "Assistant is not configured. Set XAI_API_KEY in the server environment (see .env.example).",
      },
      { status: 503 }
    );
  }

  // Access check runs before any model call, so an unauthorized request can
  // never cost anything.
  if (ALLOWED_EMAILS.length === 0) {
    return Response.json(
      {
        error:
          "The assistant is in limited testing and isn't open yet. Set ASSISTANT_ALLOWED_EMAILS to enable it.",
      },
      { status: 503 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return Response.json(
      { error: "Sign in to use the assistant." },
      { status: 401 }
    );
  }
  if (!ALLOWED_EMAILS.includes((user.email ?? "").toLowerCase())) {
    return Response.json(
      { error: "The assistant is in limited testing." },
      { status: 403 }
    );
  }

  // Keyed on the verified user id, not anything client-supplied, and still
  // ahead of the model call so a throttled request costs nothing.
  const limited = rateLimit(user.id);
  if (!limited.ok) {
    return Response.json(
      { error: "Too many assistant requests — give it a minute." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );
  }

  let body: { messages?: UIMessage[]; tripContext?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "messages array is required" },
      { status: 400 }
    );
  }

  // Cap history so long chats stay bounded.
  const recent = messages.slice(-30) as UIMessage[];
  const tripContext = parseTripContext(body.tripContext);

  try {
    const result = streamText({
      model: xai.responses(MODEL),
      system: buildSystemPrompt(tripContext),
      messages: await convertToModelMessages(recent),
      tools: createAssistantTools(tripContext),
      stopWhen: isStepCount(6),
      temperature: 0.5,
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Assistant failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
