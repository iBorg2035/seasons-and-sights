"use client";

import { useEffect } from "react";
import { initErrorReporting } from "@/lib/report-error";

/** Registers global error/rejection handlers (no-op without a Sentry DSN). */
export function ErrorReporter() {
  useEffect(() => {
    initErrorReporting();
  }, []);
  return null;
}
