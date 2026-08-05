"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getTrip,
  updateTrip,
  editedTrip,
  saveTrip,
  hasUnsavedChanges,
  deleteSavedTrip,
  SAVED_TRIPS_EVENT,
  type SavedTripLite,
} from "@/lib/saved-trips";
import {
  setActiveTripId,
  ACTIVE_TRIP_EVENT,
} from "@/lib/active-trip";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  upsertRemoteTrip,
  deleteRemoteTrip,
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
import {
  resolveStartMonth,
  seedBookedDates,
  wouldReorder,
} from "@/lib/trip-plan";
import { tripSlimLegs } from "@/lib/trip-plan-slim";
import { clearRecords, TRIP_RECORDS_EVENT } from "@/lib/trip-records";
import { CHECKLIST_ENTITY, migrateLegacyTicks } from "@/lib/checklist-progress";
import { PACKING_ENTITY } from "@/lib/packing-progress";
import { FX_ENTITY } from "@/lib/fx";
import {
  deleteRemoteRecords,
  mirrorRecord,
  syncRecords,
} from "@/lib/supabase/trip-records";
import { JOURNAL_ENTITY } from "@/lib/journal";
import { EXPENSE_ENTITY } from "@/lib/expenses";
import {
  RESERVATION_ENTITY,
  listReservations,
  type Reservation,
} from "@/lib/reservations";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

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
  // The working copy shown and edited on this page. Nothing reaches storage
  // until Save. `saved` is the last committed copy, kept so the page can tell
  // whether there are real changes and can discard back to it.
  const [trip, setTrip] = useState<SavedTripLite | undefined>(undefined);
  const [saved, setSaved] = useState<SavedTripLite | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
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
  const dirty = !!trip && !!saved && hasUnsavedChanges(trip, saved);

  // Covers tab close, reload, and every in-app link — including the global
  // header, which this page doesn't render and so can't guard link by link.
  useUnsavedGuard(dirty, "This trip has unsaved changes. Leave without saving?");
  const canManageEditors =
    !!user && !!trip && (!trip.ownerId || trip.ownerId === user.id);

  /**
   * Pull the stored trip in as the new baseline. An unsaved working copy is
   * left alone — a cloud sync or another tab must not silently overwrite what
   * someone is in the middle of editing.
   */
  const refresh = useCallback(() => {
    const stored = getTrip(tripId);
    setSaved(stored);
    setTrip((current) => {
      if (!current || !stored) return stored;
      return hasUnsavedChanges(current, stored) ? current : stored;
    });
  }, [tripId]);

  /** Apply an edit to the working copy. Does not touch storage. */
  const editDraft = useCallback(
    (mutate: (t: SavedTripLite) => void) => {
      setTrip((current) => (current ? editedTrip(current, mutate) : current));
    },
    []
  );

  /** Mirror a local trip edit to the cloud when signed in. No-op signed-out. */
  const mirrorToCloud = useCallback(
    (id: string) => {
      if (!user) return;
      const t = getTrip(id);
      if (t) void upsertRemoteTrip(user.id, t as SavedTrip);
    },
    [user]
  );

  /**
   * Edit and commit in one go. Reserved for actions that complete elsewhere —
   * adding a stop from a region page arrives already decided, so leaving it
   * unsaved would look like the click didn't work.
   */
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

  /** Commit the working copy. */
  const handleSave = useCallback(() => {
    if (!trip) return;
    setSaving(true);
    const ok = saveTrip(trip);
    setSaving(false);
    if (!ok) {
      setSaveError(true);
      return;
    }
    setSaveError(false);
    setSaved(getTrip(trip.id));
    mirrorToCloud(trip.id);
  }, [trip, mirrorToCloud]);

  /** Throw the working copy away and go back to what's stored. */
  const handleDiscard = useCallback(() => {
    if (!saved) return;
    if (!window.confirm("Discard your unsaved changes to this trip?")) return;
    setTrip(structuredClone(saved));
    setSaveError(false);
  }, [saved]);

  const reloadReservations = useCallback(() => {
    setReservations(listReservations(tripId));
  }, [tripId]);

  // Reservations save on write, like the journal and expenses — they're a
  // record of something that already happened, not part of the trip draft the
  // Save button commits.
  useEffect(() => {
    reloadReservations();
    window.addEventListener(TRIP_RECORDS_EVENT, reloadReservations);
    window.addEventListener("storage", reloadReservations);
    return () => {
      window.removeEventListener(TRIP_RECORDS_EVENT, reloadReservations);
      window.removeEventListener("storage", reloadReservations);
    };
  }, [reloadReservations]);

  // Pull them down on sign-in, the same reconcile the journal page does for
  // its own entities — otherwise a reservation saved on your phone never
  // reaches the laptop unless you happen to open the journal.
  const syncTripRecords = useCallback(() => {
    if (!user) return;
    const userId = user.id;
    void syncRecords(userId, tripId, RESERVATION_ENTITY).then(reloadReservations);
    // Checklist ticks ride the same reconcile. Migrate first: the legacy
    // `string[]` shares this entity's storage key, and pushing it unconverted
    // would upload rows with no id.
    migrateLegacyTicks(tripId);
    void syncRecords(userId, tripId, CHECKLIST_ENTITY);
    void syncRecords(userId, tripId, PACKING_ENTITY);
  }, [user?.id, tripId, reloadReservations]);

  useEffect(() => {
    syncTripRecords();
  }, [syncTripRecords]);

  // Again when the tab comes back, so a browser left open on this trip picks
  // up what was ticked on the phone instead of sitting on a stale copy.
  useRefreshOnFocus(syncTripRecords);

  // Load + mark this trip active + subscribe to change events.
  useEffect(() => {
    setActiveTripId(tripId);
    const initial = getTrip(tripId);
    setTrip(initial);
    setSaved(initial);
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
        t.stops.push([addRegionId, 1]);
      });
      if (!saved) return;
    }
    router.replace(`/trips/${tripId}`);
  }, [addRegionId, trip, tripId, router, persistTripEdit]);

  // The sign-in sync used to live here. It now runs from the root layout
  // (TripCloudSync) so it also reaches someone who lands on /trips with an
  // empty local store. Its merge fires SAVED_TRIPS_EVENT, which the listener
  // above already turns into a refresh, so nothing is needed here.

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
      editDraft((t) => {
        t.name = trimmed;
      });
    }
  }

  /**
   * Put the trip onto real dates. Shared by the mode toggle and the "Set
   * exact dates" button on a stop's booking card — one implementation, so the
   * plan-before-flip ordering below can't be got right in one place and wrong
   * in the other.
   */
  const switchMode = useCallback(
    (next: "planning" | "booked", alreadyConfirmed = false) => {
      if (!trip) return;
      if (next === "planning") {
        // Keep bookedDates in storage so switching back restores the dates
        // rather than making the user re-enter them.
        editDraft((t) => {
          t.mode = "planning";
        });
        return;
      }
      // Committing the plan also adopts the planner's ORDER. TripModeToggle
      // asks first and passes alreadyConfirmed; any other entry point (the
      // booking card's "Set exact dates") has to ask here, or stops would
      // rearrange with no warning.
      if (
        !alreadyConfirmed &&
        !trip.bookedDates?.some((d) => d != null) &&
        wouldReorder(trip.stops, tripSlimLegs(trip)) &&
        !window.confirm(
          "Setting exact dates will also reorder your stops into the sequence " +
            "that suits the seasons. Continue?"
        )
      ) {
        return;
      }
      editDraft((t) => {
        // Already has dates (switched back and forth) — keep the user's edits
        // rather than overwriting from the plan.
        if (t.bookedDates?.some((d) => d != null)) {
          t.mode = "booked";
          return;
        }
        // Plan BEFORE flipping the mode: tripSlimLegs dispatches on mode, so a
        // trip already marked booked would be planned from its (still empty)
        // dates — yielding zero-length stays and no reorder, instead of the
        // derived plan we mean to commit.
        const legs = tripSlimLegs(t);
        const ranges = legDateRanges(resolveStartMonth(t.start), legs);
        const seeded = seedBookedDates(t.stops, legs, ranges);
        t.stops = seeded.stops;
        t.bookedDates = seeded.bookedDates;
        t.mode = "booked";
      });
    },
    [trip, editDraft]
  );

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
    clearRecords(RESERVATION_ENTITY, trip.id);
    clearRecords(CHECKLIST_ENTITY, trip.id);
    clearRecords(PACKING_ENTITY, trip.id);
    clearRecords(FX_ENTITY, trip.id);
    if (user && (!trip.ownerId || trip.ownerId === user.id)) {
      void deleteRemoteTrip(trip.id);
      // trip_records has no FK to trips (a journal write can race ahead of the
      // trip's own upsert), so nothing cascades — the rows must go explicitly.
      void deleteRemoteRecords(trip.id);
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
            {/* Saving is explicit now, so whether there are pending changes is
                the most important state on this page — and it changes without
                anyone moving focus. Announced politely so it lands between
                edits rather than interrupting each keystroke. */}
            <span role="status" aria-live="polite" className="sr-only">
              {saving
                ? "Saving trip"
                : dirty
                  ? "Trip has unsaved changes"
                  : "Trip saved"}
            </span>
            {dirty && (
              <>
                <span aria-hidden className="text-xs font-medium text-amber-700">
                  Unsaved
                </span>
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Discard
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {saving ? "Saving…" : dirty ? "Save" : "Saved"}
            </button>
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
                      onClick={() => {
                        setMenuOpen(false);
                        handleDiscard();
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Discard unsaved changes
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
              editDraft((t) => {
                t.start = month;
              });
            }}
            onInterestsChange={(interests) => {
              editDraft((t) => {
                t.interests = interests;
              });
            }}
          />
        </section>

        <section id="stops" className="scroll-mt-32">
          <TripModeToggle
            trip={trip}
            onSwitch={(next) => switchMode(next, true)}
          />
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Route</h2>
          <RouteSection
            trip={trip}
            onStartChange={(month) => {
              editDraft((t) => {
                t.start = month;
              });
            }}
            onInterestsChange={(interests) => {
              editDraft((t) => {
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
                editDraft((t) => {
                  t.mode = "planning";
                });
                return;
              }
              editDraft((t) => {
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
            onEdit={editDraft}
            onLockInDates={() => switchMode("booked")}
            reservations={reservations}
            onReservationChanged={(id) => {
              reloadReservations();
              if (user) void mirrorRecord(user.id, trip.id, RESERVATION_ENTITY, id);
            }}
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
