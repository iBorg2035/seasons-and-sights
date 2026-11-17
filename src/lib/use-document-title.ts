"use client";

import { useEffect } from "react";
import { SITE_NAME } from "@/lib/site";

/**
 * Put a client-only name in the tab title.
 *
 * Trips live in localStorage, so the server can't know a trip's name when it
 * renders metadata — every trip tab would read "Trip". This fills it in once
 * the trip has loaded, in the same "<page> · <site>" shape the root layout's
 * title template produces, and leaves the server title alone until then.
 */
export function useDocumentTitle(title: string | undefined): void {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} · ${SITE_NAME}`;
  }, [title]);
}
