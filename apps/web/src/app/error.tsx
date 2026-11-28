"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={{ padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
      <h2>Something went wrong</h2>
      <p style={{ opacity: 0.75, marginBottom: "1rem" }}>
        We couldn&apos;t load this view. Please try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          border: "1px solid currentColor",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
