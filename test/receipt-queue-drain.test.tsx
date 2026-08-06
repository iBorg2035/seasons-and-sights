// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { renderHook, waitFor, act } from "@testing-library/react";
import { enqueue, listQueue } from "@/lib/receipt-queue";
import type { ReceiptExtraction, ReceiptFailure } from "@/lib/receipt";

/**
 * How the queue gets worked through — the part with the async hazards. The
 * store's own guarantees are covered in receipt-queue.test.ts; this is about
 * the drain: one at a time, stopping when the server says stop, and never
 * two passes overlapping.
 */

const extractMock = vi.fn<
  (blob: Blob, opts?: unknown) => Promise<ReceiptExtraction | ReceiptFailure>
>();

vi.mock("@/lib/receipt", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/receipt")>();
  return { ...actual, extractReceipt: (b: Blob, o?: unknown) => extractMock(b, o) };
});

const { useReceiptQueue } = await import("@/lib/use-receipt-queue");

const OK: ReceiptExtraction = {
  found: true,
  merchant: "Cua Dai",
  amount: "250000",
  currency: "VND",
  category: "food",
  day: null,
};

const photo = () => new Blob([new Uint8Array(8).buffer], { type: "image/jpeg" });

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  extractMock.mockReset();
  vi.stubGlobal("navigator", { onLine: true });
});
afterEach(() => vi.unstubAllGlobals());

describe("working through held receipts", () => {
  it("reads every queued receipt and keeps the results", async () => {
    await enqueue("t1", photo());
    await enqueue("t1", photo());
    extractMock.mockResolvedValue(OK);

    const { result } = renderHook(() => useReceiptQueue("t1"));

    await waitFor(() => expect(result.current.ready).toHaveLength(2));
    expect(extractMock).toHaveBeenCalledTimes(2);
  });

  it("reads them one at a time, never in parallel", async () => {
    // Ten queued photos must not become ten concurrent vision calls — that
    // trips the route's own rate limiter and costs ten times as much.
    await enqueue("t1", photo());
    await enqueue("t1", photo());
    await enqueue("t1", photo());

    let inFlight = 0;
    let maxInFlight = 0;
    extractMock.mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return OK;
    });

    const { result } = renderHook(() => useReceiptQueue("t1"));

    await waitFor(() => expect(result.current.ready).toHaveLength(3));
    expect(maxInFlight).toBe(1);
  });

  it("stops the whole pass when throttled, instead of working through the rest", async () => {
    await enqueue("t1", photo());
    await enqueue("t1", photo());
    await enqueue("t1", photo());
    extractMock.mockResolvedValue({
      error: "Too many receipt scans — give it a minute.",
      retryable: true,
      backOff: true,
    });

    const { result } = renderHook(() => useReceiptQueue("t1"));

    await waitFor(() => expect(extractMock).toHaveBeenCalled());
    // One attempt, then it gives up on the pass — the next two would get the
    // same answer.
    await new Promise((r) => setTimeout(r, 50));
    expect(extractMock).toHaveBeenCalledTimes(1);
    expect(result.current.waiting.length).toBeGreaterThan(0);
  });

  it("gives up on a terminal failure without spending the retry budget", async () => {
    await enqueue("t1", photo());
    extractMock.mockResolvedValue({
      error: "Only JPEG or PNG images are supported",
      retryable: false,
      backOff: false,
    });

    const { result } = renderHook(() => useReceiptQueue("t1"));

    await waitFor(() => expect(result.current.failed).toHaveLength(1));
    expect(extractMock).toHaveBeenCalledTimes(1);
    expect(result.current.failed[0].attempts).toBe(1);
  });

  it("does not attempt anything while offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    await enqueue("t1", photo());
    extractMock.mockResolvedValue(OK);

    const { result } = renderHook(() => useReceiptQueue("t1"));

    await waitFor(() => expect(result.current.waiting).toHaveLength(1));
    expect(extractMock).not.toHaveBeenCalled();
  });

  it("picks the queue up again when the connection returns", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    await enqueue("t1", photo());
    extractMock.mockResolvedValue(OK);

    const { result } = renderHook(() => useReceiptQueue("t1"));
    await waitFor(() => expect(result.current.waiting).toHaveLength(1));

    vi.stubGlobal("navigator", { onLine: true });
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(result.current.ready).toHaveLength(1));
  });

  it("leaves a discarded receipt gone", async () => {
    await enqueue("t1", photo());
    extractMock.mockResolvedValue(OK);
    const { result } = renderHook(() => useReceiptQueue("t1"));
    await waitFor(() => expect(result.current.ready).toHaveLength(1));

    await act(async () => {
      await result.current.discard(result.current.ready[0].id);
    });

    expect(result.current.items).toHaveLength(0);
    expect(await listQueue("t1")).toHaveLength(0);
  });

  it("only reads a trip's own receipts", async () => {
    await enqueue("t1", photo());
    await enqueue("t2", photo());
    extractMock.mockResolvedValue(OK);

    const { result } = renderHook(() => useReceiptQueue("t1"));

    await waitFor(() => expect(result.current.ready).toHaveLength(1));
    expect(extractMock).toHaveBeenCalledTimes(1);
    expect((await listQueue("t2"))[0].status).toBe("pending");
  });
});
