"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "#09090b", color: "#fafafa", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <h2 style={{ marginTop: "1rem", fontSize: "1.25rem", fontWeight: 600 }}>Application Error</h2>
          <p style={{ marginTop: "0.5rem", color: "#a1a1aa", maxWidth: "28rem", textAlign: "center", fontSize: "0.875rem" }}>
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem", padding: "0.5rem 1.5rem", backgroundColor: "#27272a",
              color: "#fafafa", border: "1px solid #3f3f46", borderRadius: "0.375rem",
              cursor: "pointer", fontSize: "0.875rem",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
