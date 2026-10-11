"use client";

// Reports React rendering errors to Sentry and shows a minimal fallback.
// Keep the Sentry call; the copy is Slovenian.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="sl">
      <body>
        <div style={{ padding: "4rem", textAlign: "center", fontFamily: "system-ui" }}>
          <h2>Nekaj je šlo narobe.</h2>
          <p>Napako smo zabeležili. Poskusi znova čez trenutek.</p>
        </div>
      </body>
    </html>
  );
}
