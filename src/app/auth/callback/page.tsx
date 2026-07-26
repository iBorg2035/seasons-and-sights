import { Suspense } from "react";
import { AuthCallback } from "@/components/AuthCallback";

export const metadata = {
  title: "Signing you in",
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  // useSearchParams needs a Suspense boundary to keep this route static.
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}>
      <AuthCallback />
    </Suspense>
  );
}
