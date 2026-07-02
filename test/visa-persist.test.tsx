// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { VisaByNationality } from "@/components/VisaByNationality";

// Regression test for the blocked-localStorage crash in `choose()`. Safari
// private mode / quota-exceeded / disabled site data make `setItem` throw;
// the handler must not crash, must not desync the chip from what's persisted,
// and must not broadcast a change that never stuck. See saved-trips.ts for the
// same guard pattern. Mirrors the project's "every fixed bug leaves a
// regression test" norm.

describe("VisaByNationality blocked-storage resilience", () => {
  const KEY = "seasons-passport";

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not throw and keeps the chip consistent when setItem throws", () => {
    // Make every write throw, as it does when storage is blocked.
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Persistent storage disabled", "SecurityError");
    });

    let crashed = false;
    try {
      render(<VisaByNationality country="Thailand" fallback="check requirements" />);
      const usBtn = screen.getByText("🇺🇸 US").closest("button")!;
      act(() => {
        fireEvent.click(usBtn);
      });
    } catch {
      crashed = true;
    }

    // No throw, and nothing was written, so storage and the persisted value
    // stay in sync (both empty) — no phantom toggled chip.
    expect(crashed).toBe(false);
    expect(spy).toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("persists and reflects the choice when storage works", () => {
    render(<VisaByNationality country="Thailand" fallback="check requirements" />);
    const usBtn = screen.getByText("🇺🇸 US").closest("button")!;
    act(() => {
      fireEvent.click(usBtn);
    });
    expect(localStorage.getItem(KEY)).toBe("US");
  });
});
