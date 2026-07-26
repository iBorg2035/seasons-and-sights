import { describe, it, expect } from "vitest";
import { buildIcs } from "@/lib/ics";
import { tripIcsEvents, tripDateRanges, tripLegs } from "@/lib/trip-plan";
import { getSlimRegion } from "@/data/regions-slim";

const lookup = (id: string) => getSlimRegion(id);
const NOW = new Date(2026, 5, 15);

describe("buildIcs", () => {
  it("builds an all-day VEVENT with escaped fields", () => {
    const ics = buildIcs([
      {
        title: "Cusco, Peru",
        start: new Date(2026, 8, 1), // Sep 1
        end: new Date(2026, 10, 1), // Nov 1 (exclusive)
        description: "Dry — ideal season",
      },
    ]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260901");
    expect(ics).toContain("DTEND;VALUE=DATE:20261101");
    expect(ics).toContain("SUMMARY:Cusco\\, Peru"); // comma escaped
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("emits one VEVENT per leg", () => {
    const ics = buildIcs([
      { title: "A", start: new Date(2026, 0, 1), end: new Date(2026, 1, 1) },
      { title: "B", start: new Date(2026, 1, 1), end: new Date(2026, 2, 1) },
    ]);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
  });

  it("namespaces UIDs per trip so two trips can't overwrite each other", () => {
    const events = [
      { title: "A", start: new Date(2026, 8, 1), end: new Date(2026, 9, 1) },
    ];
    const uid = (ics: string) => ics.match(/^UID:.*$/m)![0];

    // Same index, same start date, different trips — must not collide.
    expect(uid(buildIcs(events, "Peru", "trip-abc"))).not.toBe(
      uid(buildIcs(events, "Peru", "trip-xyz"))
    );
    // Same trip re-exported: stable, so a re-import updates rather than dupes.
    expect(uid(buildIcs(events, "Peru", "trip-abc"))).toBe(
      uid(buildIcs(events, "Renamed", "trip-abc"))
    );
  });

  it("keeps the UID line valid when the namespace has odd characters", () => {
    const ics = buildIcs(
      [{ title: "A", start: new Date(2026, 8, 1), end: new Date(2026, 9, 1) }],
      "Trip",
      "id with spaces: and@symbols\n"
    );
    expect(ics.match(/^UID:[A-Za-z0-9@.-]+$/m)).not.toBeNull();
  });
});

describe("tripIcsEvents", () => {
  function eventsFor(trip: Parameters<typeof tripLegs>[0]) {
    const legs = tripLegs(trip, lookup, NOW);
    return {
      legs,
      events: tripIcsEvents(legs, tripDateRanges(trip, legs, NOW)),
    };
  }

  it("exports a booked trip's committed dates, end-exclusive", () => {
    const { events } = eventsFor({
      start: 9,
      stops: [
        ["peru-cusco", 1],
        ["thailand-bangkok", 1],
      ],
      mode: "booked",
      bookedDates: [
        { start: "2026-09-03", end: "2026-09-12" },
        // A real gap between the stays — not contiguous, unlike planning mode.
        { start: "2026-10-01", end: "2026-10-08" },
      ],
    });

    expect(events).toHaveLength(2);
    expect(events[0].start).toEqual(new Date(2026, 8, 3));
    expect(events[0].end).toEqual(new Date(2026, 8, 12));
    expect(events[1].start).toEqual(new Date(2026, 9, 1));

    const ics = buildIcs(events, "Andes");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260903");
    expect(ics).toContain("DTEND;VALUE=DATE:20260912");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261001");
  });

  it("keeps each event on its own destination when booked", () => {
    const { legs, events } = eventsFor({
      start: 9,
      stops: [
        ["peru-cusco", 1],
        ["thailand-bangkok", 1],
      ],
      mode: "booked",
      bookedDates: [
        { start: "2026-09-03", end: "2026-09-12" },
        { start: "2026-10-01", end: "2026-10-08" },
      ],
    });

    // Booked mode must not reorder, so leg order is stops order.
    expect(legs.map((l) => l.region.id)).toEqual([
      "peru-cusco",
      "thailand-bangkok",
    ]);
    expect(events[0].title).toContain("Cusco");
    expect(events[1].title).toContain("Bangkok");
  });

  it("skips undated stops rather than emitting a bogus event", () => {
    const { events } = eventsFor({
      start: 9,
      stops: [
        ["peru-cusco", 1],
        ["thailand-bangkok", 1],
      ],
      mode: "booked",
      bookedDates: [{ start: "2026-09-03", end: "2026-09-12" }, null],
    });

    expect(events).toHaveLength(1);
    expect(events[0].title).toContain("Cusco");
    expect(buildIcs(events).match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("exports a planning trip's derived month ranges, contiguously", () => {
    const { legs, events } = eventsFor({
      start: 3,
      stops: [
        ["peru-cusco", 2],
        ["thailand-bangkok", 1],
      ],
    });

    expect(events).toHaveLength(legs.length);
    // Planning ranges are back-to-back: one leg ends exactly where the next
    // begins, which is what makes end-exclusive DTEND the right encoding.
    expect(events[0].end).toEqual(events[1].start);
    // March is behind NOW (June 2026), so the anchor rolls to the next March.
    expect(events[0].start).toEqual(new Date(2027, 2, 1));
  });

  it("anchors a flexible-start planning trip to the current month", () => {
    const { events } = eventsFor({ start: 0, stops: [["peru-cusco", 1]] });
    expect(events[0].start).toEqual(new Date(2026, 5, 1)); // NOW = June 2026
  });

  it("produces no events for a trip with no stops", () => {
    expect(eventsFor({ start: 3, stops: [] }).events).toEqual([]);
  });
});
