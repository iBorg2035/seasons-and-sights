"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ensureActiveTripId } from "@/lib/active-trip";

/**
 * The planner is now the unified trip page. Redirect to the active trip (or
 * the trips home base if there isn't one). Client-side because the active-trip
 * pointer lives in localStorage.
 */
export default function PlannerPage() {
  const router = useRouter();
  useEffect(() => {
    const id = ensureActiveTripId();
    router.replace(id ? `/trips/${id}` : "/trips");
  }, [router]);
  return null;
}
