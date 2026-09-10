"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GeoStatus =
  | "idle"
  | "locating"
  | "ok"
  | "denied"
  | "unavailable"
  | "timeout";

export interface GeoState {
  status: GeoStatus;
  coords: { lat: number; lng: number } | null;
  /** Metres, as reported by the device. Null until a fix arrives. */
  accuracy: number | null;
}

const IDLE: GeoState = { status: "idle", coords: null, accuracy: null };

/**
 * The browser's position, on demand.
 *
 * Deliberately NOT requested on mount. An unprompted permission dialog the
 * moment a page loads is the pattern browsers now penalise and users reflexively
 * dismiss — and a dismissal is sticky, so asking too early can cost the
 * permission permanently. `request()` is wired to an explicit button instead,
 * and every caller is expected to have a non-GPS fallback for the answer "no".
 */
export function useGeolocation(): GeoState & { request: () => void } {
  const [state, setState] = useState<GeoState>(IDLE);
  // A fix that lands after unmount must not set state on a dead component.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable", coords: null, accuracy: null });
      return;
    }
    setState((s) => ({ ...s, status: "locating" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!alive.current) return;
        setState({
          status: "ok",
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy ?? null,
        });
      },
      (err) => {
        if (!alive.current) return;
        // PERMISSION_DENIED = 1, POSITION_UNAVAILABLE = 2, TIMEOUT = 3.
        const status: GeoStatus =
          err.code === 1 ? "denied" : err.code === 3 ? "timeout" : "unavailable";
        setState({ status, coords: null, accuracy: null });
      },
      {
        // A rough fix now beats a precise one in fifteen seconds: the search
        // radius is 1.5km, so street-level accuracy changes nothing.
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, []);

  return { ...state, request };
}
