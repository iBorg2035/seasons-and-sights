import { TripView } from "@/components/TripView";

export const metadata = {
  title: "Trip",
  description: "Build and manage your trip — route, stops, prep, and map in one place.",
};

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ add?: string }>;
}) {
  const { id } = await params;
  const { add } = await searchParams;
  return <TripView tripId={id} addRegionId={add} />;
}
