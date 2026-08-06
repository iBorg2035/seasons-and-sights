import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";
import { requireAssistantAccess, type AccessMessages } from "@/lib/assistant/access";

/**
 * The gate itself, in isolation from either route. `/api/assistant`'s own
 * test file (assistant-access.test.ts) proves the gate still behaves
 * correctly once wired into a real route; this proves the shared piece is
 * correct on its own, so a bug here is caught before it can propagate into
 * both routes at once — the exact risk extracting it was meant to remove.
 */

const getServerUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getServerUser: () => getServerUserMock(),
}));

const MESSAGES: AccessMessages = {
  unconfigured: "unconfigured",
  notOpen: "not open",
  signIn: "sign in",
  forbidden: "forbidden",
  throttled: "throttled",
};

beforeEach(() => {
  getServerUserMock.mockReset();
  process.env.XAI_API_KEY = "test-key";
});

afterEach(() => {
  delete process.env.XAI_API_KEY;
  delete process.env.ASSISTANT_ALLOWED_EMAILS;
});

describe("requireAssistantAccess", () => {
  it("denies before checking anything else when the key is missing", async () => {
    delete process.env.XAI_API_KEY;
    process.env.ASSISTANT_ALLOWED_EMAILS = "owner@example.com";
    const limit = createRateLimiter({ limit: 5, windowMs: 1000 });

    const result = await requireAssistantAccess(limit, MESSAGES);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.response.status).toBe(503);
    expect(getServerUserMock).not.toHaveBeenCalled();
  });

  it("denies when the allowlist is empty, without calling getServerUser", async () => {
    delete process.env.ASSISTANT_ALLOWED_EMAILS;
    const limit = createRateLimiter({ limit: 5, windowMs: 1000 });

    const result = await requireAssistantAccess(limit, MESSAGES);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.response.status).toBe(503);
    expect(getServerUserMock).not.toHaveBeenCalled();
  });

  it("denies an anonymous caller", async () => {
    process.env.ASSISTANT_ALLOWED_EMAILS = "owner@example.com";
    getServerUserMock.mockResolvedValue(null);
    const limit = createRateLimiter({ limit: 5, windowMs: 1000 });

    const result = await requireAssistantAccess(limit, MESSAGES);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.response.status).toBe(401);
  });

  it("denies a signed-in user who isn't on the allowlist", async () => {
    process.env.ASSISTANT_ALLOWED_EMAILS = "owner@example.com";
    getServerUserMock.mockResolvedValue({ email: "someone-else@example.com" });
    const limit = createRateLimiter({ limit: 5, windowMs: 1000 });

    const result = await requireAssistantAccess(limit, MESSAGES);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.response.status).toBe(403);
  });

  it("grants an allowlisted, signed-in user under their limit", async () => {
    process.env.ASSISTANT_ALLOWED_EMAILS = " Owner@Example.com ";
    getServerUserMock.mockResolvedValue({ id: "u1", email: "OWNER@example.COM" });
    const limit = createRateLimiter({ limit: 5, windowMs: 1000 });

    const result = await requireAssistantAccess(limit, MESSAGES);

    expect(result).toEqual({ ok: true, userId: "u1" });
  });

  it("denies once the supplied limiter is exhausted", async () => {
    process.env.ASSISTANT_ALLOWED_EMAILS = "owner@example.com";
    getServerUserMock.mockResolvedValue({ id: "u1", email: "owner@example.com" });
    const limit = createRateLimiter({ limit: 2, windowMs: 60_000 });

    await requireAssistantAccess(limit, MESSAGES);
    await requireAssistantAccess(limit, MESSAGES);
    const third = await requireAssistantAccess(limit, MESSAGES);

    expect(third.ok).toBe(false);
    expect(!third.ok && third.response.status).toBe(429);
  });

  it("keeps two callers' limiters independent when given separate instances", async () => {
    // This is the reason a receipt-scanning bucket has to be its own
    // createRateLimiter() call, not a shared one with the chat route.
    process.env.ASSISTANT_ALLOWED_EMAILS = "owner@example.com";
    getServerUserMock.mockResolvedValue({ id: "u1", email: "owner@example.com" });
    const chatLimit = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const receiptLimit = createRateLimiter({ limit: 1, windowMs: 60_000 });

    await requireAssistantAccess(chatLimit, MESSAGES);
    const secondChatCall = await requireAssistantAccess(chatLimit, MESSAGES);
    const firstReceiptCall = await requireAssistantAccess(receiptLimit, MESSAGES);

    expect(secondChatCall.ok).toBe(false);
    expect(firstReceiptCall.ok).toBe(true);
  });
});
