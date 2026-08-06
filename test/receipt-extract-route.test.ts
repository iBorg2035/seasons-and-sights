import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * /api/receipt/extract spends money per call and takes a user-supplied file,
 * so two things must hold: the access gate behaves the same as the chat
 * route's (proven directly against requireAssistantAccess in
 * assistant-access-shared.test.ts, exercised here through the real route),
 * and a request that shouldn't reach the model never does.
 */

const getServerUserMock = vi.fn();
const generateObjectMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServerUser: () => getServerUserMock(),
}));
vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));
vi.mock("@ai-sdk/xai", () => ({ xai: { responses: () => ({}) } }));

const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer;

function post(form: FormData) {
  return new Request("http://localhost/api/receipt/extract", {
    method: "POST",
    body: form,
  });
}

function formWithImage(opts: { type?: string; bytes?: ArrayBuffer } = {}) {
  const form = new FormData();
  const blob = new Blob([opts.bytes ?? JPEG_MAGIC], {
    type: opts.type ?? "image/jpeg",
  });
  form.set("image", blob, "receipt.jpg");
  return form;
}

beforeEach(() => {
  vi.resetModules();
  getServerUserMock.mockReset();
  generateObjectMock.mockReset();
  process.env.XAI_API_KEY = "test-key";
  process.env.ASSISTANT_ALLOWED_EMAILS = "owner@example.com";
  getServerUserMock.mockResolvedValue({ id: "u1", email: "owner@example.com" });
});

afterEach(() => {
  delete process.env.XAI_API_KEY;
  delete process.env.ASSISTANT_ALLOWED_EMAILS;
});

describe("/api/receipt/extract access", () => {
  it("never reaches the model when signed out", async () => {
    getServerUserMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/receipt/extract/route");

    const res = await POST(post(formWithImage()));

    expect(res.status).toBe(401);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it("never reaches the model when the allowlist is unset", async () => {
    delete process.env.ASSISTANT_ALLOWED_EMAILS;
    const { POST } = await import("@/app/api/receipt/extract/route");

    const res = await POST(post(formWithImage()));

    expect(res.status).toBe(503);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });
});

describe("/api/receipt/extract input validation", () => {
  it("rejects a request with no image field", async () => {
    const { POST } = await import("@/app/api/receipt/extract/route");
    const res = await POST(post(new FormData()));

    expect(res.status).toBe(400);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it("rejects an unsupported file type before spending on a call", async () => {
    const { POST } = await import("@/app/api/receipt/extract/route");
    const res = await POST(post(formWithImage({ type: "image/gif" })));

    expect(res.status).toBe(400);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized image before spending on a call", async () => {
    const { POST } = await import("@/app/api/receipt/extract/route");
    const big = new Uint8Array(9 * 1024 * 1024).buffer;
    const res = await POST(post(formWithImage({ bytes: big })));

    expect(res.status).toBe(400);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });
});

describe("/api/receipt/extract, a granted request", () => {
  it("passes the image to the model and returns its structured result", async () => {
    generateObjectMock.mockResolvedValue({
      object: {
        found: true,
        merchant: "Cua Dai restaurant",
        amount: "250000",
        currency: "VND",
        category: "food",
        day: "2026-08-12",
      },
    });
    const { POST } = await import("@/app/api/receipt/extract/route");

    const res = await POST(post(formWithImage()));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      found: true,
      merchant: "Cua Dai restaurant",
      amount: "250000",
      currency: "VND",
      category: "food",
      day: "2026-08-12",
    });
    // The image reached the model as a file part, not dropped or re-encoded
    // as something the schema-less parts of the SDK would silently ignore.
    const call = generateObjectMock.mock.calls[0][0];
    const content = call.messages[0].content;
    expect(content.some((p: { type: string }) => p.type === "file")).toBe(true);
  });

  it("passes a currency hint through into the prompt when supplied", async () => {
    generateObjectMock.mockResolvedValue({
      object: { found: false, merchant: null, amount: null, currency: null, category: null, day: null },
    });
    const { POST } = await import("@/app/api/receipt/extract/route");

    const form = formWithImage();
    form.set("hintCurrency", "VND");
    await POST(post(form));

    const call = generateObjectMock.mock.calls[0][0];
    const promptText = call.messages[0].content.find(
      (p: { type: string }) => p.type === "text"
    ).text;
    expect(promptText).toContain("VND");
  });

  it("turns a model failure into a clean error, not a stack trace", async () => {
    generateObjectMock.mockRejectedValue(new Error("model timed out"));
    const { POST } = await import("@/app/api/receipt/extract/route");

    const res = await POST(post(formWithImage()));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("model timed out");
  });

  it("reports found: false straight through when the photo isn't a receipt", async () => {
    generateObjectMock.mockResolvedValue({
      object: { found: false, merchant: null, amount: null, currency: null, category: null, day: null },
    });
    const { POST } = await import("@/app/api/receipt/extract/route");

    const res = await POST(post(formWithImage()));
    const body = await res.json();

    expect(body.found).toBe(false);
  });
});
