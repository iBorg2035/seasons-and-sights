import { generateObject } from "ai";
import { xai } from "@ai-sdk/xai";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limit";
import { requireAssistantAccess } from "@/lib/assistant/access";
import { CURRENCY_CODES, type CurrencyCode } from "@/lib/money";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";

export const maxDuration = 30;

const MODEL = process.env.XAI_MODEL?.trim() || "grok-4.5";

/**
 * A separate bucket from the chat assistant's — a vision call is heavier and
 * used differently (a handful of scans per travel day, not a back-and-forth
 * conversation), so it gets its own budget rather than competing with chat
 * turns for the same allowance.
 */
const rateLimit = createRateLimiter({ limit: 20, windowMs: 10 * 60 * 1000 });

const ACCESS_MESSAGES = {
  unconfigured:
    "Receipt scanning is not configured. Set XAI_API_KEY in the server environment (see .env.example).",
  notOpen:
    "Receipt scanning is in limited testing and isn't open yet. Set ASSISTANT_ALLOWED_EMAILS to enable it.",
  signIn: "Sign in to scan receipts.",
  forbidden: "Receipt scanning is in limited testing.",
  throttled: "Too many receipt scans — give it a minute.",
};

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"]);
/** The client compresses well under this; anything larger is malformed, not
 *  a legitimate large photo, and is rejected before it can spend on a call. */
const MAX_BYTES = 8 * 1024 * 1024;

const ReceiptSchema = z.object({
  /** False when the photo isn't a receipt or purchase total at all. */
  found: z.boolean(),
  merchant: z.string().nullable(),
  /** Plain digits with at most one decimal point, no symbol or separators —
   *  e.g. "250000" or "12.50" — so it feeds straight into the same parser
   *  that validates typed input. */
  amount: z.string().nullable(),
  currency: z
    .enum(CURRENCY_CODES as [CurrencyCode, ...CurrencyCode[]])
    .nullable(),
  category: z.enum(EXPENSE_CATEGORIES).nullable(),
  /** ISO date, only when legibly printed on the receipt. */
  day: z.string().nullable(),
});

function buildPrompt(hintCurrency: string | null): string {
  return [
    "This is a photo of a travel receipt or purchase confirmation. Extract:",
    "- the TOTAL actually paid — not a subtotal, not a single line item's price",
    "- the currency it was paid in",
    "- a short merchant or vendor name",
    `- which single category it best fits: ${EXPENSE_CATEGORIES.join(", ")}`,
    "- the date, only if it is printed and legible",
    "",
    "Return the amount as plain digits with at most one decimal point — no",
    "currency symbol, no thousands separators (e.g. \"250000\" or \"12.50\").",
    hintCurrency
      ? `The traveler is currently somewhere using ${hintCurrency}; prefer that reading if the currency symbol is ambiguous (e.g. a bare "$").`
      : "",
    "",
    "If the photo doesn't show a receipt or a purchase total, set found to",
    "false and leave every other field null rather than guessing.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const access = await requireAssistantAccess(rateLimit, ACCESS_MESSAGES);
  if (!access.ok) return access.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof Blob) || image.size === 0) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.has(image.type)) {
    return Response.json(
      { error: "Only JPEG or PNG images are supported" },
      { status: 400 }
    );
  }
  if (image.size > MAX_BYTES) {
    return Response.json({ error: "Image is too large" }, { status: 400 });
  }

  const hint = form.get("hintCurrency");
  const hintCurrency = typeof hint === "string" && hint ? hint : null;

  // The image lives in this Buffer for the duration of the request only —
  // never written to disk, a database, or storage. Extract, then discard.
  const bytes = Buffer.from(await image.arrayBuffer());

  try {
    const { object } = await generateObject({
      model: xai.responses(MODEL),
      schema: ReceiptSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(hintCurrency) },
            { type: "file", data: bytes, mediaType: image.type },
          ],
        },
      ],
    });
    return Response.json(object);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
