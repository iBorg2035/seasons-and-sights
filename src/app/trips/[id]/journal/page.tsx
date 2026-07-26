import { TripJournalView } from "@/components/TripJournalView";

export const metadata = {
  title: "Trip journal",
  description: "Your diary and expenses for this trip, day by day.",
};

export default async function TripJournalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // key: remount per trip, so one trip's drafts and open editors can never
  // carry over on a trip→trip navigation. Same reason as the trip page.
  return <TripJournalView key={id} tripId={id} />;
}
