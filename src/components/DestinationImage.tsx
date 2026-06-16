"use client";

import { useEffect, useState } from "react";

export function DestinationImage({
  title,
  alt,
  variant = "card",
  className = "",
}: {
  title?: string;
  alt: string;
  variant?: "card" | "hero";
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!title) {
      setFailed(true);
      return;
    }
    let active = true;
    setSrc(null);
    setFailed(false);
    fetch(`/api/photo?title=${encodeURIComponent(title)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { thumb: string | null; full: string | null }) => {
        if (!active) return;
        const url = variant === "hero" ? d.full || d.thumb : d.thumb || d.full;
        url ? setSrc(url) : setFailed(true);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [title, variant]);

  // Warm gradient fallback when there's no photo.
  if (failed) {
    return (
      <div
        aria-hidden
        className={`bg-gradient-to-br from-amber-200 via-orange-200 to-cyan-200 ${className}`}
      />
    );
  }
  if (!src) {
    return <div aria-hidden className={`animate-pulse bg-stone-200 ${className}`} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`object-cover ${className}`}
    />
  );
}
