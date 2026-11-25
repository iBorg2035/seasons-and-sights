"use client";

import { useEffect } from "react";
import { shouldGuardNavigation } from "@/lib/unsaved-nav";

/**
 * Unsaved work currently on screen, described for a person. Actions that
 * don't navigate — signing out, which clears the device in place — can't rely
 * on the link and unload guards below, so they ask this instead.
 */
const pending = new Map<symbol, string>();

export function unsavedWork(): string[] {
  return [...pending.values()];
}

/**
 * Warn before unsaved work is lost — on tab close, reload, and any in-app
 * link, including the ones in the global header that this page doesn't own.
 *
 * The link half is a capture-phase listener on `document`, which is the only
 * hook available: the App Router gives no way to block a route change, and by
 * the time a `<Link>`'s own handler runs the navigation is already committed.
 * Capturing at the document lets the confirm run first and stop propagation,
 * so Next's handler never fires.
 *
 * Not covered: the browser Back button within the app. Blocking that means
 * pushing a decoy history entry and unwinding it on popstate, which breaks
 * ordinary back navigation in ways that are worse than the gap.
 */
export function useUnsavedGuard(
  dirty: boolean,
  message: string,
  /** What's unsaved, for unsavedWork() — e.g. `changes to "Peru"`. */
  label?: string
): void {
  useEffect(() => {
    if (!dirty || !label) return;
    const key = Symbol(label);
    pending.set(key, label);
    return () => {
      pending.delete(key);
    };
  }, [dirty, label]);

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome only shows its prompt when returnValue is set.
      e.returnValue = "";
    };

    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a");
      const guard = shouldGuardNavigation(
        link
          ? {
              href: link.href,
              target: link.getAttribute("target"),
              download: link.hasAttribute("download"),
            }
          : null,
        {
          button: e.button,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          defaultPrevented: e.defaultPrevented,
        },
        window.location.href
      );
      if (!guard) return;
      if (window.confirm(message)) return;
      // Both, and in capture: preventDefault alone still lets the router's
      // own click handler run and navigate.
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, message]);
}
