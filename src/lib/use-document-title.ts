"use client";

import { useEffect } from "react";
import { SITE_NAME } from "@/lib/site";

/**
 * Put a client-only name in the tab title.
 *
 * Trips live in localStorage, so the server can't know a trip's name when it
 * renders metadata — every trip tab would read "Trip". This fills it in once
 * the trip has loaded, in the same "<page> · <site>" shape the root layout's
 * title template produces.
 *
 * Setting it once isn't enough: Next streams the route's metadata and writes
 * its own <title> after hydration, which silently replaced this one on a
 * fresh load. So it also watches the <head> and puts the name back whenever
 * something else changes the title, until the component unmounts.
 */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    if (!title) return;
    const wanted = `${title} · ${SITE_NAME}`;
    const apply = () => {
      if (document.title !== wanted) document.title = wanted;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [title]);
}
