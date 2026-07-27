/**
 * Deciding whether a click is a navigation worth blocking when there's
 * unsaved work.
 *
 * The App Router has no route-blocking API, so the only way to guard in-app
 * links is to intercept clicks before its own handler sees them. That makes
 * the predicate load-bearing: guard too little and work is lost silently,
 * guard too much and the page starts refusing ordinary clicks — including its
 * own `#section` anchors, which navigate nowhere.
 *
 * Pure and separate from the hook so each case can be tested directly.
 */

export interface ClickIntent {
  /** Left button only — 1 is middle, 2 is right. */
  button: number;
  /** Any of these means the browser opens a new tab/window, not a navigation. */
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  /** Already handled by something closer to the element. */
  defaultPrevented: boolean;
}

export interface LinkTarget {
  /** Fully resolved href, i.e. the anchor's `.href`, not its attribute. */
  href: string;
  /** The anchor's `target` attribute, if any. */
  target?: string | null;
  /** Whether the anchor carries `download`. */
  download?: boolean;
}

export function shouldGuardNavigation(
  link: LinkTarget | null,
  intent: ClickIntent,
  currentHref: string
): boolean {
  if (!link?.href) return false;
  if (intent.defaultPrevented) return false;
  // A modified or non-left click opens a new context; the current page — and
  // its unsaved work — stays put, so there is nothing to warn about.
  if (intent.button !== 0) return false;
  if (intent.metaKey || intent.ctrlKey || intent.shiftKey || intent.altKey) {
    return false;
  }
  if (link.download) return false;
  if (link.target && link.target !== "_self") return false;

  let dest: URL;
  let here: URL;
  try {
    dest = new URL(link.href);
    here = new URL(currentHref);
  } catch {
    return false;
  }

  // Leaving the site entirely unloads the page, which beforeunload covers.
  // Guarding here too would double-prompt.
  if (dest.origin !== here.origin) return false;
  // mailto:, tel: and friends never resolve to http(s).
  if (dest.protocol !== "http:" && dest.protocol !== "https:") return false;

  // Same page, different hash: this is the trip page's own section nav
  // (#route, #stops…). It scrolls; it doesn't navigate.
  if (dest.pathname === here.pathname && dest.search === here.search) {
    return false;
  }

  return true;
}
