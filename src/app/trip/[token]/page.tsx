import { SharedTripView } from "@/components/SharedTripView";

export const metadata = {
  title: "Shared trip — Seasons & Sights",
  description: "A trip shared from Seasons & Sights — view it and make it yours.",
};

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedTripView token={token} />;
}
