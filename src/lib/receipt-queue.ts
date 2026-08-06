"use client";

import type { ReceiptExtraction } from "@/lib/receipt";

/**
 * Receipts waiting to be read, held on this device until there's signal.
 *
 * IndexedDB rather than localStorage for two reasons. The obvious one: a
 * photo is binary, and base64 in localStorage inflates it by a third against
 * a ~5MB quota that trips, journal, expenses, checklist, packing and FX rates
 * already share. The load-bearing one: IDB transactions are the only real
 * mutual exclusion two tabs of the same origin have, and that is what stops
 * both of them reading the same receipt — see claimNext.
 *
 * Deliberately local-only, never synced. A pending scan belongs to the device
 * holding the photo; telling the laptop to "review this receipt" when it has
 * no image to check against would be noise. This is the one per-trip thing in
 * the app that does not reach trip-records, and that is a decision rather
 * than an omission.
 */

const DB_NAME = "seasons-receipts";
const DB_VERSION = 1;
const STORE = "queue";

/** ~300KB each after compression, so the cap is roughly 7.5MB worst case. */
export const QUEUE_CAP = 25;

/** How long a claim can sit before it's assumed the tab holding it died. */
export const STALE_CLAIM_MS = 5 * 60 * 1000;

/** Retryable failures get this many goes before the row is given up on. */
export const MAX_ATTEMPTS = 3;

export type QueuedStatus = "pending" | "extracting" | "ready" | "failed";

export interface QueuedReceipt {
  /** Generated once at capture and never reused — the dedup key. */
  id: string;
  tripId: string;
  status: QueuedStatus;
  /** Dropped the moment extraction succeeds. Absent on ready/failed rows. */
  blob?: Blob;
  result?: ReceiptExtraction;
  error?: string;
  attempts: number;
  createdAt: number;
  /** When status became "extracting", for stale-claim recovery. */
  claimedAt?: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("tripId", "tripId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Promisify one transaction, resolving only once it actually commits. */
function runTx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T> | { result: T }
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let value: T;
    const out = work(store);
    if ("onsuccess" in out) {
      (out as IDBRequest<T>).onsuccess = () => {
        value = (out as IDBRequest<T>).result;
      };
    } else {
      value = out.result;
    }
    // Resolve on complete, not on the request succeeding: a write isn't
    // durable until the transaction commits, and a caller that acts on an
    // uncommitted write is the kind of bug that only shows up under a crash.
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function allRows(db: IDBDatabase): Promise<QueuedReceipt[]> {
  return runTx<QueuedReceipt[]>(db, "readonly", (store) => store.getAll());
}

/** Every queued receipt for a trip, newest last. */
export async function listQueue(tripId: string): Promise<QueuedReceipt[]> {
  const db = await openDb();
  const rows = await allRows(db);
  db.close();
  return rows
    .filter((r) => r.tripId === tripId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export interface EnqueueResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Hold a photo for later.
 *
 * Refuses at the cap rather than evicting the oldest: silently dropping a
 * receipt someone believes they captured is the one failure this feature
 * must not have. Better to say the queue is full and let them clear it.
 */
export async function enqueue(
  tripId: string,
  blob: Blob,
  now: number = Date.now()
): Promise<EnqueueResult> {
  const db = await openDb();
  const rows = await allRows(db);
  const live = rows.filter((r) => r.status !== "ready" && r.status !== "failed");
  if (live.length >= QUEUE_CAP) {
    db.close();
    return {
      ok: false,
      error: `Queue is full (${QUEUE_CAP}). Review or discard some first.`,
    };
  }

  const id = crypto.randomUUID();
  await runTx(db, "readwrite", (store) =>
    store.put({
      id,
      tripId,
      status: "pending",
      blob,
      attempts: 0,
      createdAt: now,
    } satisfies QueuedReceipt)
  );
  db.close();
  return { ok: true, id };
}

/**
 * Take the next pending receipt, marking it claimed in the same transaction.
 *
 * The read and the write share one readwrite transaction, so two tabs racing
 * cannot both come away with the same row — the second sees "extracting" and
 * moves on. This is the whole dedup design; doing the read and write as two
 * separate transactions would reintroduce exactly the race it exists to
 * close.
 *
 * Stale claims are recovered first, so a tab killed mid-request doesn't
 * strand a receipt in "extracting" forever.
 */
export async function claimNext(
  tripId: string,
  now: number = Date.now()
): Promise<QueuedReceipt | null> {
  const db = await openDb();
  const claimed = await new Promise<QueuedReceipt | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    let picked: QueuedReceipt | null = null;

    const req = store.getAll();
    req.onsuccess = () => {
      const rows = (req.result as QueuedReceipt[])
        .filter((r) => r.tripId === tripId)
        .sort((a, b) => a.createdAt - b.createdAt);

      for (const row of rows) {
        const stale =
          row.status === "extracting" &&
          now - (row.claimedAt ?? 0) > STALE_CLAIM_MS;
        if (row.status === "pending" || stale) {
          picked = { ...row, status: "extracting", claimedAt: now };
          store.put(picked);
          break;
        }
      }
    };

    tx.oncomplete = () => resolve(picked);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
  return claimed;
}

/**
 * Record a successful read and **drop the photo**.
 *
 * Deleting the blob here is the privacy promise in code: once the numbers are
 * out, the image has no further purpose and does not linger on the device.
 */
export async function completeExtraction(
  id: string,
  result: ReceiptExtraction
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const row = req.result as QueuedReceipt | undefined;
      if (!row) return;
      // Rebuilt without `blob` rather than setting it undefined, so nothing
      // structured-clones an image back into storage.
      const { blob: _dropped, ...rest } = row;
      store.put({ ...rest, status: "ready", result } satisfies QueuedReceipt);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

/**
 * Record a failed attempt.
 *
 * `terminal` skips the retry budget entirely — a malformed image or a
 * forbidden caller fails identically next time, so spending three attempts
 * on it only delays telling the truth.
 */
export async function failExtraction(
  id: string,
  error: string,
  terminal = false
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const row = req.result as QueuedReceipt | undefined;
      if (!row) return;
      const attempts = row.attempts + 1;
      const givingUp = terminal || attempts >= MAX_ATTEMPTS;
      store.put({
        ...row,
        status: givingUp ? "failed" : "pending",
        claimedAt: undefined,
        attempts,
        error,
      } satisfies QueuedReceipt);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

/** Put a failed row back in line, for a manual retry. */
export async function retryFailed(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const row = req.result as QueuedReceipt | undefined;
      // A row whose photo is already gone has nothing left to retry.
      if (!row || !row.blob) return;
      store.put({
        ...row,
        status: "pending",
        attempts: 0,
        claimedAt: undefined,
        error: undefined,
      } satisfies QueuedReceipt);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

/** Remove a row entirely — after it's been reviewed, or discarded. */
export async function dequeue(id: string): Promise<void> {
  const db = await openDb();
  await runTx(db, "readwrite", (store) => store.delete(id));
  db.close();
}

/** Drop everything for a trip — used when the trip itself is deleted. */
export async function clearQueue(tripId: string): Promise<void> {
  const db = await openDb();
  const rows = await allRows(db);
  await Promise.all(
    rows
      .filter((r) => r.tripId === tripId)
      .map(
        (r) =>
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).delete(r.id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          })
      )
  );
  db.close();
}

/** Whether IndexedDB is usable at all — private modes can refuse it. */
export function isQueueAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}
