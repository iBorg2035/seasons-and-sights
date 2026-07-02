"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getTrip,
  updateTrip,
  deleteSavedTrip,
  SAVED_TRIPS_EVENT,
  type SavedTripLite,
} from "@/lib/saved-trips";
import {
  setActiveTripId,
  ACTIVE_TRIP_EVENT,
} from "@/lib/active-trip";
import { useAuth } from "@/lib/contexts/auth-context";
import { SyncBadge } from "@/components/SyncBadge";
import { ShareTripButton } from "@/components/ShareTripButton";
import { InviteEditorDialog } from "@/components/InviteEditorDialog";
import { RouteSection } from "@/components/RouteSection";
import { StopsSection } from "@/components/StopsSection";
import { PrepSection } from "@/components/PrepSection";
import { MapSection } from "@/components/MapSection";

const SECTIONS = [
  { id: "route", label: "Route" },
  { id: "stops", label: "Stops" },
  { id: "prep", label: "Prep" },
  { id: "map", label: "Map" },
] as const;

export function TripView({
  tripId,
  addRegionId,
}: {
  tripId: string;
  addRegionId?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [trip, setTrip] = useState<SavedTripLite | undefined>(undefined);
  // `undefined` = not yet loaded (distinguish from a confirmed "missing" trip).
  const [loaded, setLoaded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("route");

  const refresh = useCallback(() => {
    setTrip(getTrip(tripId));
  }, [tripId]);

  // Load + mark this trip active + subscribe to change events.
  useEffect(() => {
    setActiveTripId(tripId);
    refresh();
    setLoaded(true);

    const onSaved = () => refresh();
    const onActive = () => refresh();
    window.addEventListener(SAVED_TRIPS_EVENT, onSaved);
    window.addEventListener(ACTIVE_TRIP_EVENT, onActive);
    window.addEventListener("storage", onSaved);
    return () => {
      window.removeEventListener(SAVED_TRIPS_EVENT, onSaved);
      window.removeEventListener(ACTIVE_TRIP_EVENT, onActive);
      window.removeEventListener("storage", onSaved);
    };
  }, [tripId, refresh]);

  // Handle ?add=<regionId>: add as a stop if not already present, then strip
  // the query param so a refresh/reload doesn't re-add it.
  useEffect(() => {
    if (!addRegionId || !trip) return;
    const already = trip.stops.some(([id]) => id === addRegionId);
    if (!already) {
      updateTrip(tripId, (t) => {
        t.stops.push([addRegionId, 2]);
      });
      refresh();
    }
    router.replace(`/trips/${tripId}`);
  }, [addRegionId, trip, tripId, router, refresh]);

  // Scroll-spy: highlight the section currently in view.
  useEffect(() => {
    const sections = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost intersecting section (largest intersectionRatio, but
        // prefer the one nearest the top of the viewport).
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        // Anchor near the sticky bar's bottom (~offset for both rows).
        rootMargin: "-140px 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 1],
      }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [loaded, trip?.stops.length]);

  // Close the ⋯ menu on outside click / escape.
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function commitRename() {
    const trimmed = nameDraft.trim();
    setRenaming(false);
    if (trimmed && trimmed !== trip?.name) {
      updateTrip(tripId, (t) => {
        t.name = trimmed;
      });
      refresh();
    }
  }

  function handleDelete() {
    if (!trip) return;
    const ok = window.confirm(`Delete "${trip.name}"? This can't be undone.`);
    if (!ok) return;
    deleteSavedTrip(trip.id);
    router.push("/trips");
  }

  if (!loaded) {
    return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (!trip) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
        <p className="text-slate-600">This trip couldn&apos;t be found.</p>
        <Link
          href="/trips"
          className="mt-4 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          ← Back to trips
        </Link>
      </div>
    );
  }

  const sectionLink = (s: (typeof SECTIONS)[number]) => {
    const isActive = activeSection === s.id;
    return (
      <a
        key={s.id}
        href={`#${s.id}`}
        aria-current={isActive ? "true" : undefined}
        className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
          isActive
            ? "border-amber-500 text-amber-700"
            : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
        }`}
      >
        {s.label}
      </a>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Sticky bar */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        {/* Row 1: identity + actions */}
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link
            href="/trips"
            className="flex-none text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Trips
          </Link>
          <span className="flex-none text-slate-200" aria-hidden>
            /
          </span>
          {renaming ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              aria-label="Trip name"
              className="min-w-0 flex-1 rounded-lg border border-amber-300 px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(trip.name);
                setRenaming(true);
              }}
              title="Rename trip"
              className="min-w-0 flex-1 truncate text-left text-base font-bold text-slate-900 hover:text-amber-600"
            >
              {trip.name}
            </button>
          )}
          <div className="flex flex-none items-center gap-2">
            <SyncBadge />
            <button
              type="button"
              onClick={() => {
                setNameDraft(trip.name);
                setRenaming(true);
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Rename
            </button>
            <ShareTripButton
              trip={{
                name: trip.name,
                start: trip.start,
                stops: trip.stops,
              }}
            />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More actions"
                aria-expanded={menuOpen}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                ⋯
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {user && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setInviteOpen(true);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Invite partner
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="block w-full px-4 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                  >
                    Delete trip
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: section nav */}
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {SECTIONS.map(sectionLink)}
        </nav>
      </div>

      {/* Sections */}
      <main className="mx-auto max-w-5xl space-y-12 px-4 py-8">
        <section id="route" className="scroll-mt-32">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Route</h2>
          <RouteSection trip={trip} />
        </section>

        <section id="stops" className="scroll-mt-32">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Stops{" "}
            <span className="text-sm font-normal text-slate-400">
              ({trip.stops.length})
            </span>
          </h2>
          <StopsSection trip={trip} onChange={refresh} />
        </section>

        <section id="prep" className="scroll-mt-32">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Pre-departure prep
          </h2>
          <PrepSection trip={trip} />
        </section>

        <section id="map" className="scroll-mt-32">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Map</h2>
          <MapSection trip={trip} />
        </section>
      </main>

      {inviteOpen && user && (
        <InviteEditorDialog
          tripId={trip.id}
          ownerId={user.id}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </div>
  );
}
