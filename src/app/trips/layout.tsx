import type { Metadata } from "next";
import { SITE_NAME, TITLE_TEMPLATE } from "@/lib/site";

// /trips is a client page (it reads localStorage), so it can't export metadata
// itself; this layout gives it a tab title. A plain-string title here would
// also stop the root layout's title template reaching the trip and journal
// pages below — they rendered as a bare "Trip" — so the template is restated
// for them.
export const metadata: Metadata = {
  title: {
    absolute: `My trips · ${SITE_NAME}`,
    template: TITLE_TEMPLATE,
  },
  description: "Your saved trips — plan by season or start from real dates.",
};

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
