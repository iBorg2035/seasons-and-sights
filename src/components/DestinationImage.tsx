"use client";

import Image from "next/image";
import { useState } from "react";

export function DestinationImage({
  src,
  alt,
  className = "",
  sizes = "100vw",
  priority = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  // Warm gradient fallback when there's no photo, or one fails to load.
  if (!src || failed) {
    return (
      <div
        aria-hidden
        className={`bg-gradient-to-br from-amber-200 via-orange-200 to-cyan-200 ${className}`}
      />
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setFailed(true)}
        className="object-cover"
      />
    </div>
  );
}
