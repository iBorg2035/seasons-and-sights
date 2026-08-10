"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Only in production — a SW in dev interferes with hot reload.
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      // The build id rides along as `?v=`, which sw.js turns into its cache
      // name. Two things follow, both of them the point: a changed URL is a
      // different script, so the browser installs it rather than keeping the
      // one it has, and the new worker opens an empty cache instead of serving
      // the last release's bundle.
      const build = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
      navigator.serviceWorker.register(`/sw.js?v=${build}`).catch(() => {});
    }
  }, []);
  return null;
}
