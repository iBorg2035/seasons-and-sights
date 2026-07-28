import type { Region } from "@/types";

export interface ChecklistItem {
  key: string;
  icon: string;
  label: string;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/** Build a trip-specific pre-departure prep list from the destinations' data. */
export function buildChecklistItems(regions: Region[]): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { key: "passport", icon: "🛂", label: "Passport valid 6+ months beyond your return date" },
    { key: "insurance", icon: "🛡️", label: "Travel insurance arranged" },
    { key: "copies", icon: "📄", label: "Photos/copies of passport, cards & bookings (offline + cloud)" },
    { key: "bank", icon: "💳", label: "Tell your bank & phone carrier you're travelling" },
  ];

  // Visas / eVisas for any destination that isn't visa-free.
  const needVisa = uniq(
    regions
      .filter((r) => r.info && !/^visa-free/i.test(r.info.visa.trim()))
      .map((r) => r.country)
  );
  if (needVisa.length) {
    items.push({
      key: "visas",
      icon: "📝",
      label: `Sort visas / eVisas: ${needVisa.join(", ")}`,
    });
  }

  // Health prep — surface any flagged risks across the trip.
  const flags = uniq(
    regions.flatMap((r) => {
      const t = `${r.info?.health ?? ""}`.toLowerCase();
      const f: string[] = [];
      if (t.includes("malaria")) f.push("malaria");
      if (t.includes("yellow fever")) f.push("yellow fever");
      if (t.includes("dengue")) f.push("dengue");
      if (t.includes("altitude")) f.push("altitude");
      return f;
    })
  );
  items.push({
    key: "health",
    icon: "💉",
    label: flags.length
      ? `Check vaccinations & meds (${flags.join(", ")})`
      : "Check routine vaccinations are up to date",
  });

  // Power adapters — list the distinct plug notes on the route.
  const plugs = uniq(regions.map((r) => r.info?.plugs).filter(Boolean) as string[]);
  if (plugs.length) {
    items.push({
      key: "adapters",
      icon: "🔌",
      label: `Pack power adapters — ${plugs.join(" · ")}`,
    });
  }

  // Cash & cards for each currency on the trip.
  const codes = uniq(
    regions
      .map((r) => r.info?.currency?.match(/\(([A-Z]{3})\)/)?.[1])
      .filter(Boolean) as string[]
  );
  if (codes.length) {
    items.push({
      key: "cash",
      icon: "💱",
      label: `Cash / cards for: ${codes.join(", ")}`,
    });
  }

  items.push(
    { key: "esim", icon: "📶", label: "Sort an eSIM or local SIM for data" },
    { key: "offline", icon: "📴", label: "Download offline maps & save this app for offline use" },
  );

  return items;
}
