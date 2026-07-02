"use client";
import { useEffect } from "react";
import { migrateDraftToTrips } from "@/lib/trip-migrate";

/** Runs the one-time draft→trips migration on mount. Renders nothing. */
export function MigrationRunner() {
  useEffect(() => {
    migrateDraftToTrips();
  }, []);
  return null;
}
