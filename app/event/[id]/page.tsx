"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EventImageWithFallback from "../../components/EventImageWithFallback";

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
const ACCENT_2 = "#f472b6";

function clampMatchPercent(score: number) {
  const s = Number.isFinite(score) ? score : 0;
  const pct = Math.round(s * 100);
  return Math.max(0, Math.min(100, pct));
}

function formatEventDate(date: string | null) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: undefined as never,
  }).format(d);
}

function formatPriceDisplay(price: string | null) {
  if (!price) return "Price TBA";
  const trimmed = price.trim();
  if (trimmed.length === 0) return "Price TBA";
  if (trimmed.includes("£")) return trimmed;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `£${trimmed}`;
  return trimmed;
}

function safeTags(tags: RecommendResult["vibe_tags"]) {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t) => typeof t === "string" && t.trim().length > 0);
}

function getGenre(ev: RecommendResult) {
  const dna = ev.event_dna ?? {};
  const g = (dna as any)?.genre ?? (dna as any)?.genres?.[0] ?? null;
  return typeof g === "string" ? g : "";
}

function getStartTime(ev: RecommendResult) {
  const dna = ev.event_dna ?? {};
  const t =
    (dna as any)?.start_time ??
    (dna as any)?.startTime ??
    (dna as any)?.start_time_local ??
    null;
  return typeof t === "string" ? t : null;
}

function computeBars(ev: RecommendResult, userGenres: string[]) {
  const discovery = Math.max(
    0,
    Math.min(100, Math.round(((ev.event_dna as any)?.discovery_score ?? 8) * 10))
  );

  const eventVibes = safeTags(ev.vibe_tags).map((x) => x.toLowerCase());
  const overlap =
    userGenres.some((g) => eventVibes.join(" ").includes(g.toLowerCase())) ||
    userGenres.some((g) => (getGenre(ev) || "").toLowerCase().includes(g.toLowerCase()));

  const vibe = overlap ? 85 : 70;

  const start = getStartTime(ev);
  const isLate = start ? (() => {
    const m = start.match(/(\d{1,2}):(\d{2})/);
    if (!m) return false;
    return Number(m[1]) >= 20;
  })() : false;
  const timing = isLate ? 90 : 65;

  const energy = Math.max(
    0,
    Math.min(100, Math.round(((ev.event_dna as any)?.discovery_score ?? 8) * 10))
  );

  return [
    { label: "Energy", value: energy, reason: "Matches your night-time intensity." },
    { label: "Vibe", value: vibe, reason: overlap ? "Shared tags with your taste profile." : "A close cousin to your usual picks." },
    { label: "Timing", value: timing, reason: isLate ? "Starts after 20:00 — prime time." : "Earlier start for an easy night." },
    { label: "Discovery", value: discovery, reason: "Right level of unfamiliar for you." },
  ];
}

function vibeParagraph(ev: RecommendResult) {
  const tags = safeTags(ev.vibe_tags);
  const genre = getGenre(ev).toLowerCase();
  let flavor = "you follow the mood and let the night unfold.";
  if (genre.includes("electronic") || genre.includes("dance") || genre.includes("club")) {
    flavor = "the bass does the talking and you lose track of time.";
  } else if (genre.includes("jazz") || genre.includes("soul")) {
    flavor = "the music is the conversation.";
  } else if (genre.includes("rock") || genre.includes("indie")) {
    flavor = "you leave with ringing ears and a big smile.";
  } else if (genre.includes("classical")) {
    flavor = "everything feels cinematic, like the city is holding its breath.";
  }

  const tagText = tags.length ? tags.join(", ") : "moody, artsy, and immersive";
  return `This event is ${tagText}. The kind of night where ${flavor}`;
}

function photosForGenre(ev: RecommendResult) {
  const genre = getGenre(ev).toLowerCase();
  if (genre.includes("electronic") || genre.includes("dance") || genre.includes("club")) {
    return [
      "https://images.unsplash.com/photo-1571266028243-d220c6a4f7d4?w=400&q=80",
      "https://images.unsplash.com/photo-1571266028243-d220c6a4f7d4?w=400&q=80",
      "https://images.unsplash.com/photo-1571266028243-d220c6a4f7d4?w=400&q=80",
    ];
  }
  if (genre.includes("jazz") || genre.includes("soul")) {
    return [
      "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&q=80",
      "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&q=80",
      "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&q=80",
    ];
  }
  if (genre.includes("classical")) {
    return [
      "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&q=80",
      "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&q=80",
      "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&q=80",
    ];
  }
  return [
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
  ];
}

function FriendCard({
  name,
  archetype,
  pct,
}: {
  name: string;
  archetype: string;
  pct: number;
}) {
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-2xl px-4 py-4"
      style={{
        background: "rgba(255,255,255,0.03)",
        boxShadow: "0 0 0 1px rgba(168,85,247,0.35)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{
            background: "rgba(255,255,255,0.06)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
          }}
        >
          {initial}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{name}</div>
          <div className="text-xs text-white/55">{archetype}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold" style={{ color: ACCENT }}>
          {pct}%
        </div>
        <div className="text-xs text-white/55">taste match with you</div>
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const router = useRouter();
  const [ev, setEv] = useState<RecommendResult | null>(null);
  const [animateBars, setAnimateBars] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kairos:currentEvent");
      if (raw) {
        setEv(JSON.parse(raw) as RecommendResult);
        return;
      }

      const recsRaw = sessionStorage.getItem("kairos:recommendations");
      if (recsRaw) {
        const parsed = JSON.parse(recsRaw) as { results?: RecommendResult[] };
        const list = Array.isArray(parsed?.results) ? parsed.results : [];
        // If we can't find it, just fall through.
        setEv(list[0] ?? null);
      }
    } catch {
      setEv(null);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setAnimateBars(true), 80);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    try {
      const savedRaw = sessionStorage.getItem("kairos:saved");
      const parsed = savedRaw ? JSON.parse(savedRaw) : [];
      setSavedIds(
        Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []
      );
    } catch {
      setSavedIds([]);
    }
  }, []);

  const userGenres = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("kairos:quiz");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { quizAnswers?: any };
      const genres = parsed?.quizAnswers?.genres;
      return Array.isArray(genres) ? genres.filter((x: any) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }, []);

  const similar = useMemo(() => {
    if (!ev) return [];
    try {
      const raw = sessionStorage.getItem("kairos:recommendations");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { results?: RecommendResult[] };
      const list = Array.isArray(parsed?.results) ? parsed.results : [];
      return list
        .filter((x) => x.id !== ev.id)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 4);
    } catch {
      return [];
    }
  }, [ev]);

  function toggleSave(id: string) {
    setSavedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        sessionStorage.setItem("kairos:saved", JSON.stringify(next));
      } catch {
        // If storage is unavailable, just keep the UI in sync.
      }
      return next;
    });
  }

  if (!ev) {
    return (
      <main className="min-h-dvh" style={{ color: "#fff" }}>
        <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
          <div className="text-white/70">Loading event…</div>
        </div>
      </main>
    );
  }

  const matchPct = clampMatchPercent(ev.score ?? 0);
  const isSaved = savedIds.includes(ev.id);
  const dateLabel = formatEventDate(ev.date);
  const timeLabel = getStartTime(ev);
  const priceLabel = formatPriceDisplay(ev.price_display);
  const bars = computeBars(ev, userGenres);
  const photos = photosForGenre(ev);

  return (
    <main className="min-h-dvh" style={{ color: "#fff" }}>
      <div className="relative">
        <section className="relative h-[50vh] min-h-[360px] w-full overflow-hidden">
          <EventImageWithFallback
            event={ev}
            wrapperClassName="absolute inset-0"
            imgClassName="absolute inset-0 h-full w-full object-cover"
            size="default"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,10,18,0.25), rgba(10,10,18,0.55), rgba(10,10,18,0.85))",
            }}
          />

          <div className="absolute left-5 top-5 sm:left-8 sm:top-7">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/85"
              style={{
                background: "rgba(10,10,18,0.40)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
              }}
            >
              ← Back
            </button>
          </div>

          <div className="absolute right-5 top-5 flex flex-col items-end gap-2 sm:right-8 sm:top-7">
            <div
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                background: "rgba(10,10,18,0.40)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: ACCENT,
                backdropFilter: "blur(10px)",
              }}
            >
              {matchPct}% match
            </div>
            <button
              type="button"
              onClick={() => toggleSave(ev.id)}
              aria-pressed={isSaved}
              className="rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                background: isSaved
                  ? `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`
                  : "rgba(10,10,18,0.40)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
                backdropFilter: "blur(10px)",
                boxShadow: isSaved ? "0 18px 60px rgba(168,85,247,0.18)" : "none",
              }}
            >
              {isSaved ? "Saved" : "Save"}
            </button>
          </div>

          <div className="absolute bottom-6 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8">
            <h1 className="editorial text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl">
              {ev.title ?? "Untitled event"}
            </h1>
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl px-5 pb-28 pt-10 sm:px-8">
          <section className="space-y-4">
            <div className="text-sm text-white/60">
              {[ev.venue, dateLabel, timeLabel].filter(Boolean).join(" • ")}
            </div>
            <div className="text-base font-medium text-white">{priceLabel}</div>
            <div className="max-w-3xl text-base text-white/70">
              <div className="text-sm font-semibold text-white/85">Why it&apos;s a vibe</div>
              <p className="mt-2">{vibeParagraph(ev)}</p>
            </div>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="editorial text-2xl font-semibold text-white">
              Why this matches you
            </h2>
            <div className="space-y-4">
              {bars.map((b) => (
                <div key={b.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white/85">
                      {b.label}
                    </div>
                    <div className="text-sm font-semibold" style={{ color: ACCENT }}>
                      {b.value}%
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-[width] duration-[800ms] ease-out"
                      style={{
                        width: animateBars ? `${b.value}%` : "0%",
                        background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
                      }}
                    />
                  </div>
                  <div className="text-sm text-white/55">{b.reason}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="editorial text-2xl font-semibold text-white">
                People like you are going
              </h2>
              <div className="group relative">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-white/70"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                  }}
                >
                  i
                </div>
                <div
                  className="pointer-events-none absolute left-1/2 top-8 w-80 -translate-x-1/2 rounded-2xl px-4 py-3 text-xs text-white/80 opacity-0 shadow-xl transition group-hover:opacity-100"
                  style={{
                    background: "rgba(10,10,18,0.82)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    backdropFilter: "blur(18px)",
                  }}
                >
                  Taste match is calculated from overlapping quiz dimensions between your profile and theirs.
                </div>
              </div>
            </div>
            <div className="text-sm text-white/55">
              Kairos members with similar taste profiles who saved or attended this event.
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <FriendCard name="Alvin" archetype="The Connoisseur" pct={91} />
              <FriendCard name="Shradha" archetype="The Hedonist" pct={87} />
              <FriendCard name="Maya" archetype="The Scene Kid" pct={84} />
            </div>
            <div className="text-sm text-white/45">and 9 others with similar taste</div>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="editorial text-2xl font-semibold text-white">
              The vibe in photos
            </h2>
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
              {photos.slice(0, 4).map((src, idx) => (
                <div
                  key={`${src}-${idx}`}
                  className="relative h-44 w-72 shrink-0 overflow-hidden rounded-2xl"
                  style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
                >
                  <EventImageWithFallback
                    event={{
                      ...ev,
                      id: `${ev.id}-vibe-${idx}`,
                      image_url: src,
                    }}
                    wrapperClassName="absolute inset-0"
                    imgClassName="absolute inset-0 h-full w-full object-cover"
                    size="default"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12 space-y-4">
            <h2 className="editorial text-2xl font-semibold text-white">
              You might also like
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {similar.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem("kairos:currentEvent", JSON.stringify(s));
                    router.push(`/event/${encodeURIComponent(s.id)}`);
                  }}
                  className="flex items-center gap-4 overflow-hidden rounded-2xl text-left"
                  style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="relative h-24 w-24 shrink-0 bg-white/[0.04] overflow-hidden">
                    <EventImageWithFallback
                      event={s}
                      wrapperClassName="absolute inset-0"
                      imgClassName="absolute inset-0 h-full w-full object-cover"
                      size="small"
                    />
                  </div>
                  <div className="flex-1 py-3 pr-4">
                    <div className="line-clamp-1 text-sm font-semibold text-white">
                      {s.title ?? "Untitled event"}
                    </div>
                    <div className="mt-1 text-xs text-white/55">
                      {[s.venue, formatEventDate(s.date)].filter(Boolean).join(" • ") || "—"}
                    </div>
                  </div>
                  <div className="pr-4 text-sm font-semibold" style={{ color: ACCENT }}>
                    {clampMatchPercent(s.score ?? 0)}%
                  </div>
                </button>
              ))}
            </div>
          </section>

          <footer className="mt-14 border-t border-white/10 bg-[rgba(255,255,255,0.02)] px-1 py-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-start">
              <div className="space-y-2">
                <Link href="/" className="editorial text-xl font-semibold text-white">
                  Kairos
                </Link>
                <div className="text-sm text-white/55">Find your perfect moment.</div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/60">
                  <Link href="/feed" className="hover:text-white/85">
                    Discover
                  </Link>
                  <Link href="/passport" className="hover:text-white/85">
                    Taste Passport
                  </Link>
                  <Link href="/saved" className="hover:text-white/85">
                    Saved
                  </Link>
                  <Link href="/coming-soon" className="hover:text-white/85">
                    For Venues
                  </Link>
                  <Link href="/about" className="hover:text-white/85">
                    About
                  </Link>
                  <Link href="/coming-soon" className="hover:text-white/85">
                    Careers
                  </Link>
                  <Link href="/coming-soon" className="hover:text-white/85">
                    Press
                  </Link>
                </div>
                <div className="text-xs text-white/35">
                  All rights reserved. All wrongs reversed. · Made with obsession in London.
                </div>
              </div>

              <div className="text-xs text-white/40 md:text-right">
                Kairos 2025. Not responsible for life-changing nights.
              </div>
            </div>
          </footer>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[rgba(10,10,18,0.78)] backdrop-blur-xl">
          <div className="mx-auto w-full max-w-5xl px-5 py-4 sm:px-8">
            <a
              href={ev.url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white"
              style={{
                background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
                boxShadow: "0 18px 60px rgba(168,85,247,0.22)",
              }}
            >
              Get Tickets — {priceLabel}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

