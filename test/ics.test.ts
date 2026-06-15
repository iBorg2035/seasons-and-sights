import { describe, it, expect } from "vitest";
import { buildIcs } from "@/lib/ics";

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
});
