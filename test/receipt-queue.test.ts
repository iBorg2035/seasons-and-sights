// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  MAX_ATTEMPTS,
  QUEUE_CAP,
  STALE_CLAIM_MS,
  claimNext,
  clearQueue,
  completeExtraction,
  dequeue,
  enqueue,
  failExtraction,
  listQueue,
  retryFailed,
} from "@/lib/receipt-queue";
import type { ReceiptExtraction } from "@/lib/receipt";

/**
 * Run against fake-indexeddb rather than a hand-written stand-in, because the
 * property most worth testing here IS IndexedDB's transaction isolation. A
 * hand-rolled in-memory fake would make the dedup tests below pass by
 * construction, which is the definition of a vacuous test.
 *
 * ONE THING THIS ENVIRONMENT CANNOT EXPRESS, verified rather than assumed:
 * fake-indexeddb's structured clone does not preserve a jsdom Blob — it goes
 * in as a Blob and comes back as `{}`. Real IndexedDB stores Blobs correctly,
 * so this is a limitation of the test double, not of the queue.
 *
 * The consequence is that these tests assert the PRESENCE or ABSENCE of the
 * `blob` key, never its contents. That still covers the property that
 * matters most — a read photo is dropped, which is the privacy promise — and
 * "the bytes actually survive and are actually gone" is confirmed in a real
 * browser during live QA instead.
 */

const RESULT: ReceiptExtraction = {
  found: true,
  merchant: "Cua Dai",
  amount: "250000",
  currency: "VND",
  category: "food",
  day: "2026-08-12",
};

function photo(bytes = 16): Blob {
  return new Blob([new Uint8Array(bytes).buffer], { type: "image/jpeg" });
}

beforeEach(() => {
  // A fresh factory per test — otherwise the first test's rows leak into
  // every later one and the ordering assertions become order-dependent.
  globalThis.indexedDB = new IDBFactory();
});

describe("holding a photo", () => {
  it("keeps it until it's read", async () => {
    await enqueue("t1", photo());

    const [row] = await listQueue("t1");
    expect(row.status).toBe("pending");
    // Key present = the photo is still being held. See the note at the top on
    // why this can't assert the bytes themselves in this environment.
    expect("blob" in row).toBe(true);
  });

  it("keeps trips apart", async () => {
    await enqueue("t1", photo());
    expect(await listQueue("t2")).toHaveLength(0);
  });

  it("refuses at the cap instead of silently dropping the oldest", async () => {
    // Losing a receipt someone believes they captured is the one failure this
    // feature must not have.
    for (let i = 0; i < QUEUE_CAP; i++) await enqueue("t1", photo());

    const result = await enqueue("t1", photo());

    expect(result.ok).toBe(false);
    expect(result.error).toContain("full");
    expect(await listQueue("t1")).toHaveLength(QUEUE_CAP);
  });

  it("counts only live rows against the cap, so reviewed ones free space", async () => {
    for (let i = 0; i < QUEUE_CAP; i++) await enqueue("t1", photo());
    const first = (await listQueue("t1"))[0];
    await completeExtraction(first.id, RESULT);

    expect((await enqueue("t1", photo())).ok).toBe(true);
  });
});

describe("claiming, with two tabs racing", () => {
  it("never hands the same receipt to two callers", async () => {
    // The actual two-tab race, run concurrently against real IDB transaction
    // semantics — not a simulation of it.
    await enqueue("t1", photo());
    await enqueue("t1", photo());

    const [a, b] = await Promise.all([claimNext("t1"), claimNext("t1")]);

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.id).not.toBe(b!.id);
  });

  it("returns null once everything is claimed rather than re-handing rows out", async () => {
    await enqueue("t1", photo());

    await claimNext("t1");
    expect(await claimNext("t1")).toBeNull();
  });

  it("hands out the oldest first", async () => {
    await enqueue("t1", photo(), 1000);
    await enqueue("t1", photo(), 2000);

    const first = await claimNext("t1");
    const all = await listQueue("t1");

    expect(first!.id).toBe(all[0].id);
  });

  it("recovers a claim from a tab that died mid-request", async () => {
    await enqueue("t1", photo(), 1000);
    const claimed = await claimNext("t1", 1000);

    // Nothing completed it; long enough later, it must come back into play
    // rather than being stranded in "extracting" forever.
    const reclaimed = await claimNext("t1", 1000 + STALE_CLAIM_MS + 1);

    expect(reclaimed!.id).toBe(claimed!.id);
  });

  it("does not reclaim a claim that is still fresh", async () => {
    await enqueue("t1", photo(), 1000);
    await claimNext("t1", 1000);

    expect(await claimNext("t1", 1000 + STALE_CLAIM_MS - 1)).toBeNull();
  });
});

describe("finishing a read", () => {
  it("drops the photo and keeps the numbers", async () => {
    // The privacy promise, asserted rather than assumed: once the amount is
    // out, the image has no further purpose on the device.
    await enqueue("t1", photo());
    const claimed = await claimNext("t1");

    await completeExtraction(claimed!.id, RESULT);

    const [row] = await listQueue("t1");
    expect(row.status).toBe("ready");
    expect(row.blob).toBeUndefined();
    expect("blob" in row).toBe(false);
    expect(row.result).toEqual(RESULT);
  });

  it("yields one row even if the same receipt is somehow read twice", async () => {
    await enqueue("t1", photo());
    const claimed = await claimNext("t1");

    await completeExtraction(claimed!.id, RESULT);
    await completeExtraction(claimed!.id, RESULT);

    expect(await listQueue("t1")).toHaveLength(1);
  });

  it("is gone entirely once reviewed", async () => {
    await enqueue("t1", photo());
    const [row] = await listQueue("t1");

    await dequeue(row.id);

    expect(await listQueue("t1")).toHaveLength(0);
  });
});

describe("failures", () => {
  it("puts a retryable failure back in line", async () => {
    await enqueue("t1", photo());
    const claimed = await claimNext("t1");

    await failExtraction(claimed!.id, "network died");

    const [row] = await listQueue("t1");
    expect(row.status).toBe("pending");
    expect(row.attempts).toBe(1);
    // Still held, so the retry has something to send.
    expect("blob" in row).toBe(true);
  });

  it("gives up after the attempt budget rather than retrying forever", async () => {
    await enqueue("t1", photo());
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const claimed = await claimNext("t1");
      await failExtraction(claimed!.id, "network died");
    }

    const [row] = await listQueue("t1");
    expect(row.status).toBe("failed");
    expect(row.attempts).toBe(MAX_ATTEMPTS);
  });

  it("gives up immediately on a terminal failure, without burning attempts", async () => {
    // A malformed image fails identically in an hour; spending three tries on
    // it only delays telling the truth.
    await enqueue("t1", photo());
    const claimed = await claimNext("t1");

    await failExtraction(claimed!.id, "Only JPEG or PNG images are supported", true);

    const [row] = await listQueue("t1");
    expect(row.status).toBe("failed");
    expect(row.attempts).toBe(1);
  });

  it("keeps the error so it can be shown rather than guessed at", async () => {
    await enqueue("t1", photo());
    const claimed = await claimNext("t1");
    await failExtraction(claimed!.id, "model timed out", true);

    expect((await listQueue("t1"))[0].error).toBe("model timed out");
  });

  it("can be retried by hand, with the budget reset", async () => {
    await enqueue("t1", photo());
    const claimed = await claimNext("t1");
    await failExtraction(claimed!.id, "network died", true);

    await retryFailed(claimed!.id);

    const [row] = await listQueue("t1");
    expect(row.status).toBe("pending");
    expect(row.attempts).toBe(0);
    expect(row.error).toBeUndefined();
  });

  it("refuses to retry a row whose photo is already gone", async () => {
    // Nothing left to send — the blob was dropped when it succeeded.
    await enqueue("t1", photo());
    const claimed = await claimNext("t1");
    await completeExtraction(claimed!.id, RESULT);

    await retryFailed(claimed!.id);

    expect((await listQueue("t1"))[0].status).toBe("ready");
  });
});

describe("clearing a trip", () => {
  it("takes its queued photos with it", async () => {
    await enqueue("t1", photo());
    await enqueue("t1", photo());
    await enqueue("t2", photo());

    await clearQueue("t1");

    expect(await listQueue("t1")).toHaveLength(0);
    expect(await listQueue("t2")).toHaveLength(1);
  });
});
