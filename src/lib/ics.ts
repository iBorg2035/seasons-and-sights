export interface IcsEvent {
  title: string;
  /** All-day start, inclusive. */
  start: Date;
  /** All-day end, exclusive (per iCalendar spec). */
  end: Date;
  description?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function icsDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function escape(s: string): string {
  return s.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
}

/** Build an iCalendar (.ics) document from a list of all-day events. */
export function buildIcs(
  events: IcsEvent[],
  calName = "Seasons & Sights trip"
): string {
  const stamp = `${icsDate(new Date())}T000000Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Seasons & Sights//Trip//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escape(calName)}`,
  ];
  events.forEach((e, i) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:trip-${i}-${icsDate(e.start)}@seasons-and-sights`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(e.start)}`,
      `DTEND;VALUE=DATE:${icsDate(e.end)}`,
      `SUMMARY:${escape(e.title)}`
    );
    if (e.description) lines.push(`DESCRIPTION:${escape(e.description)}`);
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
