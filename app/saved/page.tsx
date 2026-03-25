"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import EventImageWithFallback from "../components/EventImageWithFallback";

type RecommendResult = {
  id: string;
  score: number;
  title: string | null;
  venue: string | null;
  date: string | null;
  price_display: string | null;
  image_url: string | null;
  url: string | null;
  vibe_tags: string[] | null;
  event_dna: Record<string, unknown> | null;
};

const ACCENT = "#a855f7";

function formatEventDate(date: string | null) {
  if (!date) return "Date TBA";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(d);
}

export default function SavedPage() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [allEvents, setAllEvents] = useState<RecommendResult[]>([]);

  useEffect(() => {
    try {
      const savedRaw = sessionStorage.getItem("kairos:saved");
      const saved = savedRaw ? (JSON.parse(savedRaw) as string[]) : [];
      setSavedIds(Array.isArray(saved) ? saved : []);

      const recRaw = sessionStorage.getItem("kairos:recommendations");
      const recParsed = recRaw ? JSON.parse(recRaw) : null;
      const recs = Array.isArray(recParsed?.results)
        ? (recParsed.results as RecommendResult[])
        : [];
      setAllEvents(recs);
    } catch {
      setSavedIds([]);
      setAllEvents([]);
    }
  }, []);

  const savedEvents = useMemo(
    () => allEvents.filter((e) => savedIds.includes(e.id)),
    [allEvents, savedIds]
  );

  const suggested = useMemo(
    () => allEvents.filter((e) => !savedIds.includes(e.id)).slice(0, 6),
    [allEvents, savedIds]
  );

  function persist(next: string[]) {
    setSavedIds(next);
    sessionStorage.setItem("kairos:saved", JSON.stringify(next));
  }

  function save(id: string) {
    if (savedIds.includes(id)) return;
    persist([...savedIds, id]);
  }

  function unsave(id: string) {
    persist(savedIds.filter((x) => x !== id));
  }

  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-10 sm:px-8">
        <header className="mb-8">
          <h1 className="editorial text-4xl font-semibold text-white sm:text-5xl">
            Saved
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Your shortlist for future nights.
          </p>
        </header>

        {savedEvents.length === 0 ? (
          <section
            className="rounded-3xl px-6 py-8"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <p className="max-w-xl text-white/70">
              Nothing saved yet. Explore your feed and save events you want to
              remember.
            </p>
            <div className="mt-5">
              <Link
                href="/feed"
                className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
                style={{ background: ACCENT }}
              >
                Go to feed
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {savedEvents.map((ev) => (
              <article
                key={ev.id}
                className="overflow-hidden rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.07)",
                }}
              >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-white/[0.04]">
                <EventImageWithFallback
                  key={`${ev.id}:${ev.image_url ?? "none"}`}
                  event={ev}
                  wrapperClassName="absolute inset-0"
                  imgClassName="absolute inset-0 h-full w-full object-cover"
                  size="small"
                />
              </div>
                <div className="px-4 py-4">
                  <h2 className="text-lg font-semibold text-white">
                    {ev.title ?? "Untitled event"}
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    {[ev.venue, formatEventDate(ev.date)].filter(Boolean).join(" • ")}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <a
                      href={ev.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-white/80 underline decoration-white/20 underline-offset-4 hover:text-white"
                    >
                      View event
                    </a>
                    <button
                      type="button"
                      onClick={() => unsave(ev.id)}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75 hover:bg-white/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {suggested.length > 0 ? (
          <section className="mt-10">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
              Suggested to save
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {suggested.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => save(ev.id)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06]"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white/[0.04]">
                    <EventImageWithFallback
                      key={`${ev.id}:${ev.image_url ?? "none"}`}
                      event={ev}
                      wrapperClassName="absolute inset-0"
                      imgClassName="absolute inset-0 h-full w-full object-cover"
                      size="small"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {ev.title ?? "Untitled event"}
                    </div>
                    <div className="text-xs text-white/55">
                      {[ev.venue, formatEventDate(ev.date)].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: ACCENT }}>
                    Save
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

