import type { Metadata } from "next";

// /trips is a client page (it reads localStorage), so it can't export metadata
// itself; this layout gives it a tab title. The nested trip and journal pages
// set their own, which override this one.
export const metadata: Metadata = {
  title: "My trips",
  description: "Your saved trips — plan by season or start from real dates.",
};

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
