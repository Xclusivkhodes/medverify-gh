"use client";

import { Shell } from "@/components/shell";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  void error.digest;
  return (
    <Shell title="Something went wrong">
      <main className="gutter legal pt-6 pb-12">
        <h1 className="t-h1">The page could not be shown</h1>
        <p className="t-muted">Try again. If a check was in progress, start it once more. No verdict was saved.</p>
        <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
      </main>
    </Shell>
  );
}
