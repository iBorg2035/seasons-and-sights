// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { compressForUpload, extractReceipt } from "@/lib/receipt";

/**
 * The client side: shrinking a photo must never block a real upload even
 * where the browser API it wants doesn't exist (jsdom has neither
 * createImageBitmap nor a working 2D canvas context — the same shape of gap
 * an old mobile browser could have), and a server response is untrusted the
 * same way a synced record is, so re-validation has to be real, not a
 * decoration on top of the server's own checks.
 */

describe("compressForUpload", () => {
  it("falls back to the original file rather than blocking the upload", async () => {
    // jsdom has no createImageBitmap and no working canvas 2D context — the
    // exact gap the fallback exists for. This is that gap, exercised for
    // real, not simulated.
    const file = new File(["not actually an image"], "receipt.jpg", {
      type: "image/jpeg",
    });

    const result = await compressForUpload(file);

    expect(result).toBe(file);
  });
});

describe("extractReceipt", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  function mockResponse(status: number, body: unknown) {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(body), { status })
    );
  }

  it("passes a well-formed result straight through", async () => {
    mockResponse(200, {
      found: true,
      merchant: "Cua Dai restaurant",
      amount: "250000",
      currency: "VND",
      category: "food",
      day: "2026-08-12",
    });

    const result = await extractReceipt(new Blob());

    expect(result).toEqual({
      found: true,
      merchant: "Cua Dai restaurant",
      amount: "250000",
      currency: "VND",
      category: "food",
      day: "2026-08-12",
    });
  });

  it("degrades a currency the app doesn't know to null rather than passing it through", async () => {
    // Proves the client re-validates — the server already constrains this,
    // so this is only meaningful if the client checks independently too.
    mockResponse(200, {
      found: true,
      merchant: null,
      amount: "12.50",
      currency: "ZZZ",
      category: "food",
      day: null,
    });

    const result = await extractReceipt(new Blob());

    expect("currency" in result && result.currency).toBeNull();
  });

  it("degrades a category outside the closed set to null", async () => {
    mockResponse(200, {
      found: true,
      merchant: null,
      amount: "12.50",
      currency: "USD",
      category: "shopping",
      day: null,
    });

    const result = await extractReceipt(new Blob());

    expect("category" in result && result.category).toBeNull();
  });

  it("rejects an amount that isn't plain digits, even if the server sent one", async () => {
    mockResponse(200, {
      found: true,
      merchant: null,
      amount: "$12.50",
      currency: "USD",
      category: "food",
      day: null,
    });

    const result = await extractReceipt(new Blob());

    expect("found" in result && result.found).toBe(false);
    expect("amount" in result && result.amount).toBeNull();
  });

  it("rejects a day that isn't ISO-shaped", async () => {
    mockResponse(200, {
      found: true,
      merchant: null,
      amount: "12.50",
      currency: "USD",
      category: "food",
      day: "12 August 2026",
    });

    const result = await extractReceipt(new Blob());

    expect("day" in result && result.day).toBeNull();
  });

  it("reports not-found as not-found, nothing prefilled", async () => {
    mockResponse(200, {
      found: false,
      merchant: null,
      amount: null,
      currency: null,
      category: null,
      day: null,
    });

    const result = await extractReceipt(new Blob());

    expect("found" in result && result.found).toBe(false);
  });

  it("surfaces the server's error message on a non-200 response", async () => {
    mockResponse(429, { error: "Too many receipt scans — give it a minute." });

    const result = await extractReceipt(new Blob());

    // Shape gained `retryable`/`backOff` when the offline queue landed: the
    // caller has to know whether a failure is worth holding onto, and 429
    // specifically means stop the whole drain rather than try the next one.
    expect(result).toEqual({
      error: "Too many receipt scans — give it a minute.",
      retryable: true,
      backOff: true,
    });
  });

  it("classifies a bad request as not worth holding onto", async () => {
    // A malformed image fails identically in an hour. Queuing it would make a
    // row that retries three times and dies.
    mockResponse(400, { error: "Only JPEG or PNG images are supported" });

    const result = await extractReceipt(new Blob());

    expect(result).toEqual({
      error: "Only JPEG or PNG images are supported",
      retryable: false,
      backOff: false,
    });
  });

  it("classifies a server error as worth retrying, without stopping the queue", async () => {
    mockResponse(502, { error: "model timed out" });

    const result = await extractReceipt(new Blob());

    expect(result).toEqual({
      error: "model timed out",
      retryable: true,
      backOff: false,
    });
  });

  it("degrades a network failure to a readable message instead of throwing", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("offline"));

    const result = await extractReceipt(new Blob());

    expect("error" in result).toBe(true);
  });

  it("sends the hint currency when one is supplied", async () => {
    mockResponse(200, {
      found: false,
      merchant: null,
      amount: null,
      currency: null,
      category: null,
      day: null,
    });

    await extractReceipt(new Blob(), { hintCurrency: "VND" });

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const form = call[1].body as FormData;
    expect(form.get("hintCurrency")).toBe("VND");
  });
});
