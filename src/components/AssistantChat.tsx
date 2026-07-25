"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useRef, useState, type FormEvent } from "react";
import type { TripContextPayload } from "@/lib/assistant/types";

const SUGGESTIONS_DEFAULT = [
  "Where is dry season in July for beaches under $80/day?",
  "Compare Kyoto and Tokyo for November",
  "Plan a 3-month SEA route starting in November",
  "What should I pack for Cusco in June?",
];

const SUGGESTIONS_TRIP = [
  "How healthy is this trip's season fit?",
  "Reorder my stops for better weather",
  "What should I pack for each stop?",
  "Any visa or health prep I should do?",
];

function messageText(
  message: { parts?: Array<{ type: string; text?: string }> }
): string {
  if (!message.parts?.length) return "";
  return message.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text as string)
    .join("");
}

function toolLabel(partType: string): string {
  if (!partType.startsWith("tool-")) return partType;
  const name = partType.slice(5);
  const labels: Record<string, string> = {
    searchDestinations: "Searching destinations",
    getDestination: "Loading destination",
    getPackingList: "Building packing list",
    getVisaInfo: "Checking visa notes",
    assessTrip: "Scoring trip health",
    planRoute: "Optimizing route",
    getLiveWeather: "Fetching live weather",
  };
  return labels[name] ?? name;
}

export function AssistantChat({
  tripContext,
  compact = false,
  className = "",
}: {
  tripContext?: TripContextPayload | null;
  compact?: boolean;
  className?: string;
}) {
  const tripRef = useRef(tripContext);
  tripRef.current = tripContext;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant",
        body: () => ({
          tripContext: tripRef.current ?? null,
        }),
      }),
    []
  );

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    id: tripContext?.id ? `trip-${tripContext.id}` : "assistant",
    transport,
  });

  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const suggestions = tripContext ? SUGGESTIONS_TRIP : SUGGESTIONS_DEFAULT;

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  function ask(text: string) {
    if (busy) return;
    void sendMessage({ text });
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-[var(--hairline)] bg-white/80 shadow-sm dark:bg-zinc-950/60 ${className}`}
    >
      {!compact && (
        <div className="border-b border-[var(--hairline)] px-4 py-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Travel assistant
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Powered by Grok · uses your curated seasons, sights, packing, and
            trip health data
            {tripContext?.name ? ` · focused on “${tripContext.name}”` : ""}
          </p>
        </div>
      )}

      <div
        className={`flex-1 space-y-3 overflow-y-auto px-4 py-4 ${
          compact ? "min-h-[280px] max-h-[420px]" : "min-h-[420px] max-h-[60vh]"
        }`}
      >
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {tripContext
                ? "Ask about this trip’s seasons, route order, packing, visas, or weather."
                : "Ask where to go, when seasons are right, how to sequence a route, or what to pack."}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-left text-xs font-medium text-teal-900 transition hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === "user";
          const text = messageText(message);
          const toolParts =
            message.parts?.filter((p) => p.type.startsWith("tool-")) ?? [];

          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? "bg-sky-800 text-white"
                    : "border border-[var(--hairline)] bg-slate-50 text-slate-800 dark:bg-zinc-900 dark:text-slate-100"
                }`}
              >
                {!isUser && toolParts.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {toolParts.map((part, i) => (
                      <span
                        key={`${message.id}-tool-${i}`}
                        className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                      >
                        {toolLabel(part.type)}
                      </span>
                    ))}
                  </div>
                )}
                {text ? (
                  <div className="whitespace-pre-wrap break-words">{text}</div>
                ) : (
                  !isUser &&
                  busy && (
                    <span className="text-slate-400">Thinking…</span>
                  )
                )}
              </div>
            </div>
          );
        })}

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error.message || "Something went wrong talking to the assistant."}
          </p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex gap-2 border-t border-[var(--hairline)] p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            tripContext
              ? "Ask about this trip…"
              : "Ask about destinations, seasons, packing…"
          }
          disabled={busy}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-100"
        />
        {busy ? (
          <button
            type="button"
            onClick={() => stop()}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:text-slate-200"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-xl bg-sky-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-900 disabled:opacity-40"
          >
            Send
          </button>
        )}
        {messages.length > 0 && !busy && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-zinc-700 dark:text-slate-300"
            title="Clear conversation"
          >
            Clear
          </button>
        )}
      </form>
    </div>
  );
}
