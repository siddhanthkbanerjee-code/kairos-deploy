 "use client";

import Link from "next/link";
import { useEffect } from "react";

const ACCENT = "#a855f7";

export default function Home() {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("kairos-palette-change", { detail: "light-landing" })
    );
  }, []);

  return (
    <main className="min-h-[calc(100dvh-72px)]">
      <div className="mx-auto flex min-h-[calc(100dvh-72px)] w-full max-w-5xl flex-col justify-center px-6 pb-16 pt-10 sm:px-10">
        <section className="flex flex-col items-start justify-center gap-10">
          <div className="max-w-3xl space-y-5">
            <p
              className="text-xs font-medium uppercase tracking-[0.3em]"
              style={{ letterSpacing: "0.3em" }}
            >
              <span style={{ color: ACCENT }}>London tonight, curated by AI</span>
            </p>
            <h1
              className="editorial text-balance text-4xl font-semibold leading-tight sm:text-6xl"
              style={{ color: "#1a1a2e" }}
            >
              Discover the nights that{" "}
              <span style={{ color: ACCENT }}>feel made for you</span>.
            </h1>
            <p
              className="max-w-xl text-base sm:text-lg"
              style={{ color: "#4a4a6a" }}
            >
              Kairos learns your vibe in seconds and surfaces the most
              interesting events in London right now—no endless scrolling, just
              instant, tailored nights out.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/quiz"
              className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white shadow-lg shadow-[rgba(168,85,247,0.5)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(168,85,247,1) 0%, rgba(244,114,182,0.92) 100%)",
              }}
            >
              Start the taste quiz
            </Link>
            <div className="text-sm" style={{ color: "#6b6b8a" }}>
              8 questions, 90 seconds.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
