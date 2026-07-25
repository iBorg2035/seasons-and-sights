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

export const maxDuration = 60;

const MODEL = process.env.XAI_MODEL?.trim() || "grok-4.5";

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
