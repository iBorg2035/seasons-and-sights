"use client";

import { useLayoutEffect } from "react";
import { TITLE_TEMPLATE } from "@/lib/site";

/** The one mounted caller allowed to set the title (the newest). */
let owner: symbol | null = null;

/**
 * Put a client-only name in the tab title.
 *
 * Trips live in localStorage, so the server can't know a trip's name when it
 * renders metadata — every trip tab would read "Trip". This fills it in once
 * the trip has loaded, using the same template as every other page.
 *
 * Setting it once isn't enough: Next streams the route's metadata and writes
 * its own <title> after hydration, which silently replaced this one on a
 * fresh load. So it also watches the <head> and puts the name back when
 * something else changes the title, while the component is mounted.
 *
 * A layout effect, not a plain one: its cleanup runs in the same commit that
 * removes the page, so the watcher is gone before the next page's title
 * lands — a passive cleanup runs later and put the old trip's name onto the
 * page you'd just navigated to. Only the newest caller re-applies, so two
 * callers can never fight over the title.
 */
export function useDocumentTitle(title: string | undefined): void {
  useLayoutEffect(() => {
    if (!title) return;
    const me = Symbol(title);
    owner = me;
    const wanted = TITLE_TEMPLATE.replace("%s", title);
    let observer: MutationObserver | undefined;
    const apply = () => {
      if (owner !== me || document.title === wanted) return;
      document.title = wanted;
      observer?.takeRecords(); // our own write isn't news
    };
    apply();
    observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      observer?.disconnect();
      if (owner === me) owner = null;
    };
  }, [title]);
}
