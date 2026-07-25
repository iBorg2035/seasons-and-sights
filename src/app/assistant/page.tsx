import { AssistantChat } from "@/components/AssistantChat";

export const metadata = {
  title: "Travel assistant",
  description:
    "Chat with a Grok-powered co-pilot that knows Seasons & Sights destinations, seasons, packing, visas, and trip health.",
};

export default function AssistantPage() {
  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Travel assistant
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          Ask in plain language where to go, when seasons line up, how to sequence
          a multi-stop trip, what to pack, or what visa notes apply. Answers are
          grounded in this app&apos;s curated data — not generic web guesses.
        </p>
      </section>

      <AssistantChat />

      <p className="mt-4 text-xs text-slate-400">
        Requires a server-side <code className="rounded bg-slate-100 px-1 dark:bg-zinc-800">XAI_API_KEY</code>.
        The assistant can read destinations and score trips; it cannot edit your
        saved trips yet — use My trips to apply suggestions.
      </p>
    </div>
  );
}
