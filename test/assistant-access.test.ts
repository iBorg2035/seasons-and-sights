import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * /api/assistant spends money per call, so access control is the thing that
 * must not silently regress. These assert it fails CLOSED at every step —
 * an unauthorized request must never reach the model.
 */

const getServerUserMock = vi.fn();
const streamTextMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServerUser: () => getServerUserMock(),
}));

// If any of these run, the gate leaked — the assertions below check they don't.
vi.mock("ai", () => ({
  streamText: (...args: unknown[]) => streamTextMock(...args),
  convertToModelMessages: async (m: unknown) => m,
  createUIMessageStreamResponse: () => new Response("stream"),
  toUIMessageStream: () => ({}),
  isStepCount: () => () => false,
  // createAssistantTools() wraps every tool with this; it's an identity helper.
  tool: (config: unknown) => config,
}));
vi.mock("@ai-sdk/xai", () => ({ xai: { responses: () => ({}) } }));

function post(body: unknown) {
  return new Request("http://localhost/api/assistant", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const VALID_BODY = { messages: [{ role: "user", parts: [] }] };

beforeEach(() => {
  vi.resetModules();
  getServerUserMock.mockReset();
  streamTextMock.mockReset();
  process.env.XAI_API_KEY = "test-key";
});

afterEach(() => {
  delete process.env.XAI_API_KEY;
  delete process.env.ASSISTANT_ALLOWED_EMAILS;
});

describe("/api/assistant access control", () => {
  it("is disabled when the allowlist is unset — forgetting to configure it must not open the endpoint", async () => {
    delete process.env.ASSISTANT_ALLOWED_EMAILS;
    const { POST } = await import("@/app/api/assistant/route");

    const res = await POST(post(VALID_BODY));

    expect(res.status).toBe(503);
    expect(getServerUserMock).not.toHaveBeenCalled();
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("rejects an anonymous caller", async () => {
    process.env.ASSISTANT_ALLOWED_EMAILS = "owner@example.com";
    getServerUserMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/assistant/route");

    const res = await POST(post(VALID_BODY));

    expect(res.status).toBe(401);
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("rejects a signed-in user who isn't on the allowlist", async () => {
    process.env.ASSISTANT_ALLOWED_EMAILS = "owner@example.com";
    getServerUserMock.mockResolvedValue({ email: "someone-else@example.com" });
    const { POST } = await import("@/app/api/assistant/route");

    const res = await POST(post(VALID_BODY));

    expect(res.status).toBe(403);
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("matches the allowlist case-insensitively and ignores surrounding spaces", async () => {
    process.env.ASSISTANT_ALLOWED_EMAILS = " Owner@Example.com , other@example.com ";
    getServerUserMock.mockResolvedValue({ id: "u1", email: "OWNER@example.COM" });
    streamTextMock.mockReturnValue({ stream: {} });
    const { POST } = await import("@/app/api/assistant/route");

    await POST(post(VALID_BODY));

    expect(streamTextMock).toHaveBeenCalled();
  });

  it("rejects a user with no email rather than treating it as a match", async () => {
    process.env.ASSISTANT_ALLOWED_EMAILS = "owner@example.com";
    getServerUserMock.mockResolvedValue({ email: undefined });
    const { POST } = await import("@/app/api/assistant/route");

    const res = await POST(post(VALID_BODY));

    expect(res.status).toBe(403);
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("throttles a burst from one user without reaching the model", async () => {
    process.env.ASSISTANT_ALLOWED_EMAILS = "owner@example.com";
    getServerUserMock.mockResolvedValue({ id: "u1", email: "owner@example.com" });
    streamTextMock.mockReturnValue({ stream: {} });
    const { POST } = await import("@/app/api/assistant/route");

    const statuses: number[] = [];
    for (let i = 0; i < 32; i++) {
      statuses.push((await POST(post(VALID_BODY))).status);
    }

    const throttled = statuses.filter((s) => s === 429);
    expect(throttled.length).toBeGreaterThan(0);
    // The gate is ahead of the model call, so throttled requests cost nothing.
    expect(streamTextMock.mock.calls.length).toBe(32 - throttled.length);
  });

  it("throttles per user, not globally", async () => {
    process.env.ASSISTANT_ALLOWED_EMAILS = "a@example.com,b@example.com";
    streamTextMock.mockReturnValue({ stream: {} });
    const { POST } = await import("@/app/api/assistant/route");

    getServerUserMock.mockResolvedValue({ id: "ua", email: "a@example.com" });
    for (let i = 0; i < 32; i++) await POST(post(VALID_BODY));

    getServerUserMock.mockResolvedValue({ id: "ub", email: "b@example.com" });
    const res = await POST(post(VALID_BODY));

    expect(res.status).not.toBe(429);
  });

  it("still refuses when XAI_API_KEY is absent, before any access check", async () => {
    delete process.env.XAI_API_KEY;
    process.env.ASSISTANT_ALLOWED_EMAILS = "owner@example.com";
    const { POST } = await import("@/app/api/assistant/route");

    const res = await POST(post(VALID_BODY));

    expect(res.status).toBe(503);
    expect(streamTextMock).not.toHaveBeenCalled();
  });
});
