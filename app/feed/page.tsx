"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

type StoredRecs = {
  results: RecommendResult[];
  createdAt?: number;
  answers?: Record<string, unknown>;
};

const ACCENT = "#a855f7";
const ACCENT_2 = "#f472b6";

function clampMatchPercent(score: number) {
  const s = Number.isFinite(score) ? score : 0;
  const pct = Math.round(s * 100);
  return Math.max(0, Math.min(100, pct));
}

function safeTags(tags: RecommendResult["vibe_tags"]) {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t) => typeof t === "string" && t.trim().length > 0);
}

function formatPriceDisplay(price: string | null) {
  if (!price) return "Price TBA";
  const trimmed = price.trim();
  if (trimmed.length === 0) return "Price TBA";
  if (trimmed.includes("£")) return trimmed;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `£${trimmed}`;
  return trimmed;
}

function formatEventDate(date: string | null) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;

  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).formatToParts(d);

  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const month = parts.find((p) => p.type === "month")?.value;

  if (!weekday || !day || !month) return date;
  return `${weekday} ${day} ${month}`;
}

function getEventGenres(ev: RecommendResult) {
  const dna = ev.event_dna ?? {};
  const genre = (dna as any)?.genre;
  const genres = (dna as any)?.genres;
  const out: string[] = [];
  if (typeof genre === "string") out.push(genre);
  if (Array.isArray(genres)) {
    for (const g of genres) if (typeof g === "string") out.push(g);
  }
  return out.map((s) => s.toLowerCase());
}

function getStartTime(ev: RecommendResult) {
  const dna = ev.event_dna ?? {};
  const t =
    (dna as any)?.start_time ??
    (dna as any)?.startTime ??
    (dna as any)?.start_time_local ??
    null;
  return typeof t === "string" ? t : null; // expecting "HH:MM" or ISO-ish
}

function isLateNight(ev: RecommendResult) {
  const t = getStartTime(ev);
  if (!t) return false;
  const m = t.match(/(\d{1,2}):(\d{2})/);
  if (!m) return false;
  const hh = Number(m[1]);
  return Number.isFinite(hh) && hh >= 21;
}

function containsAny(haystack: string, needles: string[]) {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
}

function eventText(ev: RecommendResult) {
  const tags = safeTags(ev.vibe_tags).join(" ");
  const genres = getEventGenres(ev).join(" ");
  const title = ev.title ?? "";
  return `${title} ${tags} ${genres}`.toLowerCase();
}

function getAiExplanation(ev: RecommendResult) {
  const dna = ev.event_dna ?? {};
  const exp =
    (dna as any)?.ai_explanation ??
    (dna as any)?.explanation ??
    (dna as any)?.why ??
    null;
  return typeof exp === "string" ? exp : null;
}

function parsePriceValue(price: string | null): number | null {
  if (!price) return null;
  const p = price.trim().toLowerCase();
  if (p.length === 0) return null;
  if (p.includes("free") || p === "0" || p === "£0") return 0;
  const m = p.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

function getCategoryBucket(ev: RecommendResult): string[] {
  const genre = (getEventGenres(ev) ?? []).join(" ").toLowerCase();
  const tags = safeTags(ev.vibe_tags).join(" ").toLowerCase();
  const venue = (ev.venue ?? "").toLowerCase();
  const social = getSocialContext(ev);

  const buckets: string[] = [];

  const isMusic = [
    "rock",
    "pop",
    "jazz",
    "electronic",
    "dance",
    "r&b",
    "classical",
    "latin",
    "alternative",
  ].some((k) => genre.includes(k));
  if (isMusic) buckets.push("Music");

  const isArts =
    genre.includes("other") ||
    ["intimate", "experimental", "immersive"].some((k) => tags.includes(k));
  if (isArts) buckets.push("Arts and Culture");

  const isOutdoor =
    (tags.includes("outdoor") || tags.includes("energetic")) &&
    (venue.includes("park") || venue.includes("outdoor"));
  if (isOutdoor) buckets.push("Outdoor and Active");

  if (social.includes("group")) buckets.push("Social");

  const isFood =
    ["bar", "cafe", "restaurant", "kitchen"].some((k) => venue.includes(k));
  if (isFood) buckets.push("Food and Drink");

  return buckets.length ? buckets : ["All"];
}

type DropdownId = "when" | "category" | "price" | null;

function getSocialContext(ev: RecommendResult) {
  const dna = ev.event_dna ?? {};
  const v =
    (dna as any)?.social_context ??
    (dna as any)?.socialContext ??
    (dna as any)?.social ??
    null;
  return typeof v === "string" ? v.toLowerCase() : "";
}

function PremiumEventCard({
  ev,
  onOpen,
}: {
  ev: RecommendResult;
  onOpen: (ev: RecommendResult) => void;
}) {
  const matchPct = clampMatchPercent(ev.score ?? 0);
  const dateLabel = formatEventDate(ev.date);
  const venueLine = [ev.venue, dateLabel].filter(Boolean).join(" • ");

  return (
    <button
      type="button"
      onClick={() => onOpen(ev)}
      className="group w-[180px] shrink-0 text-left"
    >
      <article
        className="overflow-hidden rounded-2xl"
        style={{
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.07)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)",
          transform: "translateY(0px)",
        }}
      >
        <div className="relative">
          <div className="h-[200px] w-full bg-white/[0.04]">
            {ev.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ev.image_url}
                alt={ev.title ?? "Event image"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : null}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(10,10,18,0.88), rgba(10,10,18,0.10))",
              }}
            />
          </div>

          <div
            className="absolute right-3 top-3 rounded-full px-3 py-2 text-center"
            style={{
              background: "rgba(10,10,18,0.45)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="text-sm font-semibold" style={{ color: ACCENT }}>
              {matchPct}%
            </div>
            <div className="text-[10px] font-medium text-white/60">match</div>
          </div>
        </div>

        <div className="space-y-2 px-4 pb-4 pt-4">
          <div className="line-clamp-2 text-sm font-semibold text-white">
            {ev.title ?? "Untitled event"}
          </div>
          <div className="line-clamp-1 text-xs text-white/55">{venueLine || "—"}</div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-white/75">
              {formatPriceDisplay(ev.price_display)}
            </div>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-white/70 transition group-hover:bg-white/[0.07]">
              →
            </div>
          </div>
        </div>
      </article>
      <style jsx>{`
        button:hover article {
          transform: translateY(-8px);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55),
            0 0 0 1px rgba(168, 85, 247, 0.3);
        }
      `}</style>
    </button>
  );
}

function Row({
  title,
  events,
  expanded,
  onToggleExpanded,
  onOpen,
}: {
  title: string;
  events: RecommendResult[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onOpen: (ev: RecommendResult) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="editorial text-lg font-semibold text-white">{title}</h2>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="text-sm font-medium text-white/55 underline decoration-white/20 underline-offset-4 hover:text-white/75"
        >
          {expanded ? "Show less" : "See all"}
        </button>
      </div>

      {expanded ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {events.map((ev) => (
            <div key={ev.id} className="w-full">
              <PremiumEventCard ev={ev} onOpen={onOpen} />
            </div>
          ))}
        </div>
      ) : (
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
          {events.map((ev) => (
            <PremiumEventCard key={ev.id} ev={ev} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const [items, setItems] = useState<RecommendResult[] | null>(null);
  const [activeMode, setActiveMode] = useState<"solo" | "date" | "group">(
    "solo"
  );
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [whenFilter, setWhenFilter] = useState<
    "Tonight" | "This Weekend" | "This Week" | "All"
  >("All");
  const [categoryFilter, setCategoryFilter] = useState<
    | "Music"
    | "Arts and Culture"
    | "Outdoor and Active"
    | "Social"
    | "Food and Drink"
    | "All"
  >("All");
  const [priceFilter, setPriceFilter] = useState<
    "Free" | "Under £20" | "£20 to £50" | "£50 plus" | "Any"
  >("Any");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kairos:recommendations");
      if (!raw) {
        router.replace("/quiz");
        return;
      }

      const parsed = JSON.parse(raw) as StoredRecs;
      const results = Array.isArray(parsed?.results) ? parsed.results : [];

      if (results.length === 0) {
        router.replace("/quiz");
        return;
      }

      setItems(results);
    } catch {
      router.replace("/quiz");
    }
  }, [router]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!openDropdown) return;
      const t = e.target as Node | null;
      if (t && dropdownRef.current && dropdownRef.current.contains(t)) return;
      setOpenDropdown(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [openDropdown]);

  function dateKey(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const events = useMemo(() => items ?? null, [items]);

  const sortedEvents = useMemo(() => {
    if (!events) return null;
    return [...events].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [events]);

  const todayKey = useMemo(() => dateKey(new Date()), []);

  function filterEvent(ev: RecommendResult) {
    // When
    if (whenFilter !== "All") {
      const eventKey = (ev.date ?? "").slice(0, 10);
      if (!eventKey) return false;
      const diffDays =
        Math.floor(
          (new Date(eventKey).getTime() - new Date(todayKey).getTime()) /
            (1000 * 60 * 60 * 24)
        ) || 0;

      if (whenFilter === "Tonight" && eventKey !== todayKey) return false;
      if (whenFilter === "This Weekend" && !(diffDays >= 0 && diffDays <= 3))
        return false;
      if (whenFilter === "This Week" && !(diffDays >= 0 && diffDays <= 7))
        return false;
    }

    // Price
    if (priceFilter !== "Any") {
      const raw = ev.price_display ?? "";
      const v = parseFloat(raw.replace("£", "").trim());
      const isMissingOrNaN = !Number.isFinite(v);
      if (priceFilter === "Free") {
        if (!(v === 0 || isMissingOrNaN)) return false;
      } else if (priceFilter === "Under £20") {
        if (!(v > 0 && v < 20)) return false;
      } else if (priceFilter === "£20 to £50") {
        if (!(v >= 20 && v <= 50)) return false;
      } else if (priceFilter === "£50 plus") {
        if (!(v > 50)) return false;
      }
    }

    // Category
    if (categoryFilter !== "All") {
      const genreRaw = getEventGenres(ev).join(" ");
      const genre = genreRaw.toLowerCase();
      const tags = safeTags(ev.vibe_tags).join(" ").toLowerCase();
      const venue = (ev.venue ?? "").toLowerCase();
      const social = getSocialContext(ev);

      const isMusic = [
        "rock",
        "pop",
        "jazz",
        "electronic",
        "dance",
        "r&b",
        "classical",
        "latin",
        "alternative",
        "other",
      ].some((k) => genre.includes(k));

      const isArts = ["immersive", "experimental", "intimate", "atmospheric"].some(
        (k) => tags.includes(k)
      );
      const isOutdoor = tags.includes("outdoor") || tags.includes("energetic") || venue.includes("park");
      const isSocial = social.includes("group") || social.includes("solo");
      const isFood = ["bar", "cafe", "restaurant"].some((k) => venue.includes(k));

      if (categoryFilter === "Music" && !isMusic) return false;
      if (categoryFilter === "Arts and Culture" && !isArts) return false;
      if (categoryFilter === "Outdoor and Active" && !isOutdoor) return false;
      if (categoryFilter === "Social" && !isSocial) return false;
      if (categoryFilter === "Food and Drink" && !isFood) return false;
    }

    return true;
  }

  const filtered = useMemo(() => {
    if (!sortedEvents) return null;
    return sortedEvents.filter(filterEvent);
  }, [sortedEvents, whenFilter, categoryFilter, priceFilter, todayKey]);

  const featured = useMemo(() => {
    if (!filtered || filtered.length === 0) return null;
    return filtered[0];
  }, [filtered]);

  const forYou = useMemo(() => {
    if (!filtered) return [];
    const base = filtered.slice(0, 20);
    const modeNeedle =
      activeMode === "solo"
        ? "solo"
        : activeMode === "date"
          ? "date night"
          : "group";

    const boosted = [...base].sort((a, b) => {
      const as = getSocialContext(a).includes(modeNeedle) ? 1 : 0;
      const bs = getSocialContext(b).includes(modeNeedle) ? 1 : 0;
      if (bs !== as) return bs - as;
      return (b.score ?? 0) - (a.score ?? 0);
    });
    return boosted.slice(0, 8);
  }, [filtered, activeMode]);

  const happeningThisWeek = useMemo(() => {
    if (!filtered) return [];
    const rest = filtered.slice(8);
    return [...rest]
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
        const db = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
        return da - db;
      })
      .slice(0, 8);
  }, [filtered]);

  const electronic = useMemo(() => {
    if (!filtered) return [];
    const needles = ["electronic", "club", "dance"];
    return filtered.filter((ev) => containsAny(eventText(ev), needles)).slice(0, 16);
  }, [filtered]);

  const intimate = useMemo(() => {
    if (!filtered) return [];
    const needles = ["intimate", "soulful"];
    return filtered.filter((ev) => containsAny(safeTags(ev.vibe_tags).join(" "), needles)).slice(0, 16);
  }, [filtered]);

  const lateNight = useMemo(() => {
    if (!filtered) return [];
    return filtered.filter(isLateNight).slice(0, 16);
  }, [filtered]);

  if (sortedEvents === null) {
    return (
      <main className="min-h-dvh">
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
          <div className="text-white/70">Loading your feed…</div>
        </div>
      </main>
    );
  }

  function openEvent(ev: RecommendResult) {
    sessionStorage.setItem("kairos:currentEvent", JSON.stringify(ev));
    router.push(`/event/${encodeURIComponent(ev.id)}`);
  }

  return (
    <main className="min-h-dvh" style={{ color: "#fff" }}>
      <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-10 sm:px-8">
        <header className="mb-6">
          <h1 className="editorial text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Your London, Tonight
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/60">
            A personalised selection based on your vibe.
          </p>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          {([
            { id: "solo", label: "Solo" },
            { id: "date", label: "Date Night" },
            { id: "group", label: "Group" },
          ] as const).map((m) => {
            const active = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveMode(m.id)}
                className="rounded-full px-4 py-2 text-sm font-medium transition-all"
                style={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderColor: active
                    ? "rgba(168,85,247,0.55)"
                    : "rgba(255,255,255,0.10)",
                  background: active
                    ? `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`
                    : "rgba(255,255,255,0.03)",
                  color: active ? "#fff" : "rgba(255,255,255,0.70)",
                  boxShadow: active ? "0 10px 36px rgba(168,85,247,0.18)" : "none",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="sticky top-0 z-20 -mx-5 mb-5 bg-black/30 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
          <div ref={dropdownRef} className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown((d) => (d === "when" ? null : "when"))
                  }
                  className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    borderColor:
                      whenFilter !== "All" ? "rgba(168,85,247,0.55)" : "rgba(255,255,255,0.12)",
                    background:
                      "rgba(255,255,255,0.03)",
                  }}
                >
                  <span className="text-white/80">
                    When{whenFilter !== "All" ? `: ${whenFilter}` : ""}
                  </span>
                  <span
                    className="text-white/60 transition-transform"
                    style={{
                      transform:
                        openDropdown === "when" ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▾
                  </span>
                </button>
                {openDropdown === "when" ? (
                  <div className="absolute left-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(10,10,18,0.65)] shadow-xl backdrop-blur-xl">
                    {(["Tonight", "This Weekend", "This Week", "All"] as const).map(
                      (opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setWhenFilter(opt);
                            setOpenDropdown(null);
                          }}
                          className="flex w-full items-center justify-between px-4 py-3 text-sm text-white/80 transition hover:bg-white/[0.06]"
                        >
                          <span>{opt}</span>
                          {whenFilter === opt ? (
                            <span style={{ color: ACCENT }}>●</span>
                          ) : null}
                        </button>
                      )
                    )}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown((d) =>
                      d === "category" ? null : "category"
                    )
                  }
                  className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    borderColor:
                      categoryFilter !== "All"
                        ? "rgba(168,85,247,0.55)"
                        : "rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <span className="text-white/80">
                    Category{categoryFilter !== "All" ? `: ${categoryFilter}` : ""}
                  </span>
                  <span
                    className="text-white/60 transition-transform"
                    style={{
                      transform:
                        openDropdown === "category"
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                    }}
                  >
                    ▾
                  </span>
                </button>
                {openDropdown === "category" ? (
                  <div className="absolute left-0 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(10,10,18,0.65)] shadow-xl backdrop-blur-xl">
                    {(
                      [
                        "Music",
                        "Arts and Culture",
                        "Outdoor and Active",
                        "Social",
                        "Food and Drink",
                        "All",
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setCategoryFilter(opt);
                          setOpenDropdown(null);
                        }}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm text-white/80 transition hover:bg-white/[0.06]"
                      >
                        <span>{opt}</span>
                        {categoryFilter === opt ? (
                          <span style={{ color: ACCENT }}>●</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown((d) => (d === "price" ? null : "price"))
                  }
                  className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    borderColor:
                      priceFilter !== "Any" ? "rgba(168,85,247,0.55)" : "rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <span className="text-white/80">
                    Price{priceFilter !== "Any" ? `: ${priceFilter}` : ""}
                  </span>
                  <span
                    className="text-white/60 transition-transform"
                    style={{
                      transform:
                        openDropdown === "price"
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                    }}
                  >
                    ▾
                  </span>
                </button>
                {openDropdown === "price" ? (
                  <div className="absolute left-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(10,10,18,0.65)] shadow-xl backdrop-blur-xl">
                    {(
                      ["Free", "Under £20", "£20 to £50", "£50 plus", "Any"] as const
                    ).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setPriceFilter(opt);
                          setOpenDropdown(null);
                        }}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm text-white/80 transition hover:bg-white/[0.06]"
                      >
                        <span>{opt}</span>
                        {priceFilter === opt ? (
                          <span style={{ color: ACCENT }}>●</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div
          className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          style={{ borderLeft: `4px solid ${ACCENT}` }}
        >
          <div className="text-sm text-white/70">
            Personalised by Kairos AI -- every match score is calculated from your taste profile.
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/75 hover:border-white/20 hover:bg-white/[0.05]"
          >
            Fix my feed
          </button>
        </div>

        {featured ? (
          <button
            type="button"
            onClick={() => openEvent(featured)}
            className="mb-8 block w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] text-left transition hover:border-white/20"
            style={{ height: 280, boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
          >
            <div className="relative h-full w-full">
              {featured.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.image_url}
                  alt={featured.title ?? "Featured event"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}

              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(10,10,10,0.92), rgba(10,10,10,0.35), rgba(10,10,10,0.15))",
                }}
              />

              <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: "rgba(10,10,10,0.55)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    Featured Tonight
                  </div>
                  <div
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: "rgba(10,10,10,0.55)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: ACCENT,
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    {clampMatchPercent(featured.score ?? 0)}% Taste Match
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="editorial text-balance text-3xl font-semibold leading-tight text-white">
                    {featured.title ?? "Untitled event"}
                  </div>
                  <div className="text-sm text-white/70">
                    {[featured.venue, formatEventDate(featured.date)]
                      .filter(Boolean)
                      .join(" • ") || "—"}
                  </div>
                  {getAiExplanation(featured) ? (
                    <div className="max-w-3xl text-sm text-white/60 line-clamp-2">
                      {getAiExplanation(featured)}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </button>
        ) : null}

        <div className="space-y-10">
          <Row
            title="For You"
            events={forYou}
            expanded={expandedRow === "For You"}
            onToggleExpanded={() =>
              setExpandedRow((r) => (r === "For You" ? null : "For You"))
            }
            onOpen={openEvent}
          />
          <Row
            title="Happening This Week"
            events={happeningThisWeek}
            expanded={expandedRow === "Happening This Week"}
            onToggleExpanded={() =>
              setExpandedRow((r) =>
                r === "Happening This Week" ? null : "Happening This Week"
              )
            }
            onOpen={openEvent}
          />
          <Row
            title="Electronic and Club"
            events={electronic}
            expanded={expandedRow === "Electronic and Club"}
            onToggleExpanded={() =>
              setExpandedRow((r) =>
                r === "Electronic and Club" ? null : "Electronic and Club"
              )
            }
            onOpen={openEvent}
          />
          <Row
            title="Intimate Venues"
            events={intimate}
            expanded={expandedRow === "Intimate Venues"}
            onToggleExpanded={() =>
              setExpandedRow((r) =>
                r === "Intimate Venues" ? null : "Intimate Venues"
              )
            }
            onOpen={openEvent}
          />
          <Row
            title="Late Night"
            events={lateNight}
            expanded={expandedRow === "Late Night"}
            onToggleExpanded={() =>
              setExpandedRow((r) => (r === "Late Night" ? null : "Late Night"))
            }
            onOpen={openEvent}
          />
        </div>

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
                <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-white/85">
                  Saved
                </a>
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
    </main>
  );
}

