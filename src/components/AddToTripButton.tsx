"use client";

import { useEffect, useState } from "react";
import { addToDraft, getDraft, DRAFT_EVENT } from "@/lib/trip-draft";
import { monthOf } from "@/lib/season";

export function AddToTripButton({
  regionId,
  className = "",
}: {
  regionId: string;
  className?: string;
}) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const sync = () => setAdded(getDraft().stops.some((s) => s.id === regionId));
    sync();
    window.addEventListener(DRAFT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DRAFT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [regionId]);

  const onClick = (e: React.MouseEvent) => {
    // The card is a link; don't navigate when adding.
    e.preventDefault();
    e.stopPropagation();
    addToDraft(regionId, monthOf());
  };

  return (
    <button onClick={onClick} aria-pressed={added} className={className}>
      {added ? "✓ In your trip" : "+ Add to trip"}
    </button>
  );
}
