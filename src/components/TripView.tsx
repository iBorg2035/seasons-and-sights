"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getTrip,
  updateTrip,
  deleteSavedTrip,
  SAVED_TRIPS_KEY,
  SAVED_TRIPS_EVENT,
  notifySavedTripsChanged,
  type SavedTripLite,
} from "@/lib/saved-trips";
import {
  setActiveTripId,
  ACTIVE_TRIP_EVENT,
} from "@/lib/active-trip";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  fetchRemoteTrips,
  upsertRemoteTrip,
  deleteRemoteTrip,
  mergeTrips,
  type SavedTrip,
} from "@/lib/supabase/trips";
import { SyncBadge } from "@/components/SyncBadge";
import { ShareTripButton } from "@/components/ShareTripButton";
import { InviteEditorDialog } from "@/components/InviteEditorDialog";
import { RouteSection } from "@/components/RouteSection";
import { StopsSection } from "@/components/StopsSection";
import { PrepSection } from "@/components/PrepSection";
import { MapSection } from "@/components/MapSection";
import { TripCopilot } from "@/components/TripCopilot";
import { TripModeToggle } from "@/components/TripModeToggle";
import { legDateRanges } from "@/lib/season";
import { resolveStartMonth, seedBookedDates } from "@/lib/trip-plan";
import { tripSlimLegs } from "@/lib/trip-plan-slim";
import { clearRecords } from "@/lib/trip-records";
import { JOURNAL_ENTITY } from "@/lib/journal";
import { EXPENSE_ENTITY } from "@/lib/expenses";

const SECTIONS = [
  { id: "copilot", label: "Co-pilot" },
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
  const [saveError, setSaveError] = useState(false);

  // Snapshot of the trip as it was when the page loaded, for the "reset to
  // last saved" escape hatch. In-memory only (per page session); reloading
  // makes the last auto-saved state the new baseline, which is correct.
  const snapshotRef = useRef<string | null>(null);
  const dirty =
    !!trip &&
    !!snapshotRef.current &&
    JSON.stringify(trip) !== snapshotRef.current;
  const canManageEditors =
    !!user && !!trip && (!trip.ownerId || trip.ownerId === user.id);

  const refresh = useCallback(() => {
    setTrip(getTrip(tripId));
  }, [tripId]);

  /** Mirror a local trip edit to the cloud when signed in. No-op signed-out. */
  const mirrorToCloud = useCallback(
    (id: string) => {
      if (!user) return;
      const t = getTrip(id);
      if (t) void upsertRemoteTrip(user.id, t as SavedTrip);
    },
    [user]
  );

  const persistTripEdit = useCallback(
    (id: string, mutate: (trip: SavedTripLite) => void): boolean => {
      const ok = updateTrip(id, mutate);
      if (!ok) {
        setSaveError(true);
        return false;
      }
      setSaveError(false);
      refresh();
      mirrorToCloud(id);
      return true;
    },
    [mirrorToCloud, refresh]
  );

  // Load + mark this trip active + subscribe to change events.
  useEffect(() => {
    setActiveTripId(tripId);
    const initial = getTrip(tripId);
    setTrip(initial);
    // Snapshot the loaded state once for the "reset to last saved" affordance.
    if (initial) snapshotRef.current = JSON.stringify(initial);
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
      const saved = persistTripEdit(tripId, (t) => {
        t.stops.push([addRegionId, 2]);
      });
      if (!saved) return;
    }
    router.replace(`/trips/${tripId}`);
  }, [addRegionId, trip, tripId, router, persistTripEdit]);

  // On sign-in, pull the user's cloud trips, merge with what's local
  // (last-write-wins), and push any local-only trips up. Keyed on user.id so
  // it doesn't re-run on every token refresh (which swaps the user object).
  // This is the sync that makes sign-in actually do something — it was lost
  // when TripPlanner was retired and is re-homed here.
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;
    (async () => {
      const remote = await fetchRemoteTrips();
      if (cancelled) return;
      let local: SavedTrip[] = [];
      try {
        local = JSON.parse(
          localStorage.getItem(SAVED_TRIPS_KEY) || "[]"
        );
      } catch {
        // ignore
      }
      const { merged, toPush } = mergeTrips(local, remote);
      try {
        localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(merged));
        notifySavedTripsChanged();
      } catch {
        // ignore
      }
      refresh();
      // Side-effects outside setState so React's StrictMode double-invoke can't
      // double-upload.
      for (const t of toPush) void upsertRemoteTrip(userId, t);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, refresh]);

  // If the trip still has the default name, invite a rename on first load —
  // the user almost certainly wants to name a fresh trip.
  useEffect(() => {
    if (loaded && trip && trip.name === "Untitled trip" && !renaming) {
      setNameDraft("");
      setRenaming(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, trip?.name]);

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
      persistTripEdit(tripId, (t) => {
        t.name = trimmed;
      });
    }
  }

  function handleReset() {
    if (!snapshotRef.current) return;
    const saved = JSON.parse(snapshotRef.current) as SavedTripLite;
    const ok = persistTripEdit(tripId, (t) => {
      t.name = saved.name;
      t.start = saved.start;
      t.stops = saved.stops.map((s) => [s[0], s[1]] as [string, number]);
    });
    if (ok) setMenuOpen(false);
  }

  function handleDelete() {
    if (!trip) return;
    const ok = window.confirm(`Delete "${trip.name}"? This can't be undone.`);
    if (!ok) return;
    if (!deleteSavedTrip(trip.id)) {
      setSaveError(true);
      return;
    }
    setSaveError(false);
    // Deleting the trip must take its journal and expenses with it — leaving
    // personal entries in localStorage under a trip the user just deleted
    // would be both a leak and a surprise. (Cloud rows: Stage 4.)
    clearRecords(JOURNAL_ENTITY, trip.id);
    clearRecords(EXPENSE_ENTITY, trip.id);
    if (user && (!trip.ownerId || trip.ownerId === user.id)) {
      void deleteRemoteTrip(trip.id);
    }
    // Clear the now-stale active pointer; /trips will repair it on arrival
    // via ensureActiveTripId if other trips remain.
    setActiveTripId(null);
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
          className="mt-4 inline-block rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
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
            ? "border-teal-500 text-teal-700"
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
              placeholder="Name this trip…"
              className="min-w-0 flex-1 rounded-lg border border-teal-400 px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:border-teal-500"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(trip.name);
                setRenaming(true);
              }}
              title="Rename trip"
              className="min-w-0 flex-1 truncate text-left text-base font-bold text-slate-900 hover:text-teal-700"
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
            <ShareTripButton trip={trip} />
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
                  {canManageEditors && (
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
                  {dirty && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Reset to last saved
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
          {/* A route, not a scroll-spy section — the journal has its own page
              because it grows without bound as a trip goes on. */}
          <Link
            href={`/trips/${tripId}/journal`}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
          >
            Journal →
          </Link>
        </nav>
      </div>

      {/* Sections */}
      <main className="mx-auto max-w-5xl space-y-12 px-4 py-8">
        {saveError && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Couldn&apos;t save this trip. Check that browser storage is enabled
            and try again.
          </p>
        )}
        <TripCopilot
          trip={{
            id: trip.id,
            name: trip.name,
            start: trip.start,
            stops: trip.stops,
            interests: trip.interests,
          }}
        />
        <section id="route" className="scroll-mt-32">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Route</h2>
          <RouteSection
            trip={trip}
            onStartChange={(month) => {
              persistTripEdit(trip.id, (t) => {
                t.start = month;
              });
            }}
            onInterestsChange={(interests) => {
              persistTripEdit(trip.id, (t) => {
                t.interests = interests;
              });
            }}
          />
        </section>

        <section id="stops" className="scroll-mt-32">
          <TripModeToggle
            trip={trip}
            onSwitch={(next) => {
              if (next === "planning") {
                // Keep bookedDates in storage so switching back restores the
                // dates rather than making the user re-enter them.
                persistTripEdit(trip.id, (t) => {
                  t.mode = "planning";
                });
                return;
              }
              persistTripEdit(trip.id, (t) => {
                // Already has dates (switched back and forth) — keep the
                // user's edits rather than overwriting from the plan.
                if (t.bookedDates?.some((d) => d != null)) {
                  t.mode = "booked";
                  return;
                }
                // Plan BEFORE flipping the mode: tripSlimLegs dispatches on
                // mode, so a trip already marked booked would be planned from
                // its (still empty) dates — yielding zero-length stays and no
                // reorder, instead of the derived plan we mean to commit.
                const legs = tripSlimLegs(t);
                const ranges = legDateRanges(resolveStartMonth(t.start), legs);
                const seeded = seedBookedDates(t.stops, legs, ranges);
                t.stops = seeded.stops;
                t.bookedDates = seeded.bookedDates;
                t.mode = "booked";
              });
            }}
          />
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Stops{" "}
            <span className="text-sm font-normal text-slate-400">
              ({trip.stops.length})
            </span>
          </h2>
          <StopsSection
            trip={trip}
            onChange={() => {
              setSaveError(false);
              refresh();
              mirrorToCloud(trip.id);
            }}
            onSaveFailure={() => setSaveError(true)}
          />
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

      {inviteOpen && user && canManageEditors && (
        <InviteEditorDialog
          tripId={trip.id}
          ownerId={trip.ownerId ?? user.id}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </div>
  );
}
