"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

function safeExplanation(exp: string | null) {
  const s = exp?.trim() ?? "";
  return s.length ? s : null;
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
    ["intimate", "experimental", "immersive", "atmospheric"].some((k) => tags.includes(k));
  if (isArts) buckets.push("Arts and Culture");

  const isOutdoor =
    tags.includes("outdoor") ||
    tags.includes("energetic") ||
    tags.includes("active") ||
    venue.includes("park") ||
    venue.includes("outdoor") ||
    venue.includes("trail");
  if (isOutdoor) buckets.push("Outdoor and Active");

  if (social.includes("group") || social.includes("solo")) buckets.push("Social");

  const isFood =
    ["bar", "cafe", "restaurant", "kitchen", "dining", "bistro"].some((k) =>
      venue.includes(k)
    ) ||
    tags.includes("food") ||
    tags.includes("drink") ||
    tags.includes("cocktail");
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
  const fromDna = typeof v === "string" ? v.toLowerCase() : "";
  if (fromDna) return fromDna;

  // Fallback inference: keeps the mode buttons functional even when
  // social context metadata is missing.
  const title = (ev.title ?? "").toLowerCase();
  const venue = (ev.venue ?? "").toLowerCase();
  const tags = safeTags(ev.vibe_tags).join(" ").toLowerCase();
  const hay = `${title} ${venue} ${tags}`;

  if (/(partner|couple|date night|date-night|date|romantic|two|pair)/.test(hay)) {
    return "date night";
  }
  if (/(solo|single|individual|one\b|lone)/.test(hay)) {
    return "solo";
  }
  if (/(group|friends|gang|crew|crowd|party|social|merrier|more the merrier)/.test(hay)) {
    return "group";
  }

  return "";
}

function PremiumEventCard({
  ev,
  onOpen,
  isSaved,
  onToggleSave,
  variant,
}: {
  ev: RecommendResult;
  onOpen: (ev: RecommendResult) => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  variant: "carousel" | "grid";
}) {
  const matchPct = clampMatchPercent(ev.score ?? 0);
  const dateLabel = formatEventDate(ev.date);
  const venueLine = [ev.venue, dateLabel].filter(Boolean).join(" • ");
  const explanation = safeExplanation(getAiExplanation(ev));

  return (
    <button
      type="button"
      onClick={() => onOpen(ev)}
      className={
        variant === "carousel"
          ? "group w-[180px] shrink-0 text-left"
          : "group w-full text-left"
      }
    >
      <article
        className="overflow-hidden rounded-2xl"
        style={{
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.07)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.02) 100%)",
          transition: "transform 220ms ease, box-shadow 220ms ease",
          transform: "translateY(0px)",
        }}
      >
        <div className="relative">
          <div className="relative aspect-[9/10] w-full overflow-hidden bg-white/[0.04]">
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
                  "linear-gradient(to top, rgba(10,10,18,0.70), rgba(10,10,18,0.04))",
              }}
            />
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-pressed={isSaved}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave(ev.id);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              e.stopPropagation();
              onToggleSave(ev.id);
            }}
            className="absolute left-3 top-3 z-10 cursor-pointer rounded-full px-3 py-2 text-center min-h-[38px] min-w-[38px] flex items-center justify-center"
            style={{
              background: isSaved
                ? `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`
                : "rgba(10,10,18,0.45)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="text-[10px] font-semibold" style={{ color: "#fff" }}>
              {isSaved ? "Saved" : "Save"}
            </div>
          </div>

          <div
            className="absolute right-3 top-3 z-10 rounded-full px-3 py-2 text-center"
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

          <div
            className={[
              "min-h-[44px] line-clamp-2 text-[11px] leading-snug text-white/55",
              explanation ? "" : "opacity-0",
            ].join(" ")}
            aria-hidden={!explanation}
          >
            {explanation ?? ""}
          </div>

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

function getRowIdentity(title: string) {
  const t = title.toLowerCase();
  if (t === "for you") return "Personalised";
  if (t.startsWith("best for")) return "Mode Picks";
  if (t.includes("happening this week")) return "Calendar";
  if (t === "late night") return "After Hours";
  if (t.includes("electronic")) return "Momentum";
  if (t.includes("intimate")) return "Close-up";
  if (t.includes("social")) return "Shared Energy";
  if (t.includes("outdoor")) return "Open Air";
  if (t.includes("food")) return "Taste + Drink";
  if (t.includes("under £20")) return "Low Cost";
  if (t.includes("just dropped")) return "New Arrivals";
  return "Curated";
}

function Row({
  title,
  subtitle,
  events,
  expanded,
  onToggleExpanded,
  onOpen,
  savedIds,
  onToggleSave,
}: {
  title: string;
  subtitle?: string;
  events: RecommendResult[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onOpen: (ev: RecommendResult) => void;
  savedIds: string[];
  onToggleSave: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);
  const userInteractedUntilRef = useRef(0);

  useEffect(() => {
    if (expanded) return;
    const el = scrollerRef.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHoverAndFinePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;
    if (prefersReduced || !canHoverAndFinePointer) return;

    let rafId = 0;
    let lastTs = performance.now();

    const onUserScroll = () => {
      userInteractedUntilRef.current = performance.now() + 1500;
    };
    el.addEventListener("scroll", onUserScroll, { passive: true });

    const tick = (ts: number) => {
      const dt = ts - lastTs;
      lastTs = ts;

      const maxScroll = el.scrollWidth - el.clientWidth;
      const shouldAutoScroll =
        !pausedRef.current && maxScroll > 0 && ts >= userInteractedUntilRef.current;

      if (shouldAutoScroll) {
        const speedPxPerSec = 14; // subtle + premium
        el.scrollLeft = el.scrollLeft + (speedPxPerSec * dt) / 1000;
        if (el.scrollLeft >= maxScroll - 1) el.scrollLeft = 0;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", onUserScroll);
    };
  }, [expanded]);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
              }}
            />
            {getRowIdentity(title)}
          </div>
          <h2 className="editorial text-2xl font-semibold text-white sm:text-[28px]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-white/55">{subtitle}</p>
          ) : null}
        </div>
        {events.length > 4 ? (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="text-sm font-medium text-white/55 underline decoration-white/20 underline-offset-4 hover:text-white/75"
          >
            {expanded ? "Show less" : "See all"}
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 justify-items-start">
          {events.map((ev) => (
            <div key={ev.id} className="w-full">
              <PremiumEventCard
                ev={ev}
                onOpen={onOpen}
                isSaved={savedIds.includes(ev.id)}
                onToggleSave={onToggleSave}
                variant="grid"
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={scrollerRef}
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
          className="no-scrollbar flex gap-4 overflow-x-auto pb-2"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {events.map((ev) => (
            <PremiumEventCard
              key={ev.id}
              ev={ev}
              onOpen={onOpen}
              isSaved={savedIds.includes(ev.id)}
              onToggleSave={onToggleSave}
              variant="carousel"
            />
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
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const activeFilterCount =
    (whenFilter !== "All" ? 1 : 0) +
    (categoryFilter !== "All" ? 1 : 0) +
    (priceFilter !== "Any" ? 1 : 0);

  function resetFilters() {
    setWhenFilter("All");
    setCategoryFilter("All");
    setPriceFilter("Any");
    setOpenDropdown(null);
  }

  useEffect(() => {
    window.scrollTo(0, 0);
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
    function onDocPointerDown(e: PointerEvent) {
      if (!openDropdown) return;
      const t = e.target as Node | null;
      if (t && dropdownRef.current && dropdownRef.current.contains(t)) return;
      setOpenDropdown(null);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () =>
      document.removeEventListener("pointerdown", onDocPointerDown);
  }, [openDropdown]);

  function dateKey(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function getWeekendRange(now: Date) {
    const day = now.getDay(); // 0 sun, 6 sat
    const diffToSaturday = day <= 6 ? (6 - day + 7) % 7 : 0;
    const sat = startOfDay(new Date(now.getTime() + diffToSaturday * 86400000));
    const sun = startOfDay(new Date(sat.getTime() + 86400000));
    const endSun = new Date(sun.getTime() + 86399999);
    return { start: sat, end: endSun };
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
      const eventDate = startOfDay(new Date(eventKey));
      const today = startOfDay(new Date(todayKey));
      const diffDays = Math.floor((eventDate.getTime() - today.getTime()) / 86400000) || 0;

      if (whenFilter === "Tonight" && eventKey !== todayKey) return false;
      if (whenFilter === "This Weekend") {
        const now = new Date();
        const { start, end } = getWeekendRange(now);
        if (!(eventDate.getTime() >= start.getTime() && eventDate.getTime() <= end.getTime())) {
          return false;
        }
      }
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
      const buckets = getCategoryBucket(ev);
      if (!buckets.includes(categoryFilter)) return false;
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

  const modeNeedles = useMemo(() => {
    if (activeMode === "solo")
      return ["solo", "single", "individual", "one", "solo night", "lone"];
    if (activeMode === "date")
      return [
        "date night",
        "date-night",
        "date",
        "partner",
        "couple",
        "two",
        "romantic",
        "pair",
      ];
    return [
      "group",
      "gang",
      "friends",
      "social",
      "crew",
      "crowd",
      "merrier",
      "party",
      "more the merrier",
    ];
  }, [activeMode]);

  const modeMatched = useMemo(() => {
    if (!filtered) return [];
    return filtered.filter((ev) =>
      modeNeedles.some((needle) => getSocialContext(ev).includes(needle))
    );
  }, [filtered, modeNeedles]);

  const forYou = useMemo(() => {
    if (!filtered) return [];
    const base = filtered.slice(0, 28);

    const boosted = [...base].sort((a, b) => {
      const aMatch = modeNeedles.some((needle) =>
        getSocialContext(a).includes(needle)
      );
      const bMatch = modeNeedles.some((needle) =>
        getSocialContext(b).includes(needle)
      );
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
      return (b.score ?? 0) - (a.score ?? 0);
    });
    return boosted.slice(0, 8);
  }, [filtered, modeNeedles]);

  const happeningThisWeek = useMemo(() => {
    if (!filtered) return [];
    const rest = filtered.slice(6);
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

  const socialPicks = useMemo(() => {
    if (!filtered) return [];
    return filtered
      .filter((ev) => getSocialContext(ev).includes("group") || getSocialContext(ev).includes("social"))
      .slice(0, 12);
  }, [filtered]);

  const outdoorActive = useMemo(() => {
    if (!filtered) return [];
    return filtered
      .filter((ev) => {
        const tags = safeTags(ev.vibe_tags).join(" ").toLowerCase();
        const venue = (ev.venue ?? "").toLowerCase();
        return (
          tags.includes("outdoor") ||
          tags.includes("active") ||
          tags.includes("energetic") ||
          venue.includes("park")
        );
      })
      .slice(0, 12);
  }, [filtered]);

  const foodAndDrink = useMemo(() => {
    if (!filtered) return [];
    return filtered
      .filter((ev) => {
        const tags = safeTags(ev.vibe_tags).join(" ").toLowerCase();
        const venue = (ev.venue ?? "").toLowerCase();
        return (
          ["bar", "cafe", "restaurant", "kitchen", "dining", "bistro"].some((k) =>
            venue.includes(k)
          ) ||
          tags.includes("food") ||
          tags.includes("drink") ||
          tags.includes("cocktail")
        );
      })
      .slice(0, 12);
  }, [filtered]);

  const underTwenty = useMemo(() => {
    if (!filtered) return [];
    return filtered
      .filter((ev) => {
        const p = parsePriceValue(ev.price_display);
        return p !== null && p > 0 && p < 20;
      })
      .slice(0, 12);
  }, [filtered]);

  const justDropped = useMemo(() => {
    if (!filtered) return [];
    return [...filtered]
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      })
      .slice(0, 10);
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

  function toggleSave(id: string) {
    setSavedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        sessionStorage.setItem("kairos:saved", JSON.stringify(next));
      } catch {
        // Keep UI consistent even if storage fails.
      }
      return next;
    });
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
          <p className="mt-2 text-sm text-white/55">
            Curated based on your vibe, energy, and taste profile.
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

        <div className="sticky top-0 z-20 -mx-3 mb-5 bg-black/30 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
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
                          style={{
                            background:
                              whenFilter === opt
                                ? "rgba(168,85,247,0.12)"
                                : undefined,
                          }}
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
                          style={{
                            background:
                              categoryFilter === opt
                                ? "rgba(168,85,247,0.12)"
                                : undefined,
                          }}
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
                        style={{
                          background:
                            priceFilter === opt ? "rgba(168,85,247,0.12)" : undefined,
                        }}
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

              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.05]"
                  style={{ marginLeft: "auto" }}
                >
                  Clear filters
                </button>
              ) : null}
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
            disabled
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Tune my feed (coming soon)
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
              <EventImageWithFallback
                event={featured}
                wrapperClassName="absolute inset-0"
                imgClassName="absolute inset-0 h-full w-full object-cover"
                size="default"
              />

              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(10,10,10,0.78), rgba(10,10,10,0.28), rgba(10,10,10,0.08))",
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
                  {safeExplanation(getAiExplanation(featured)) ? (
                    <div className="max-w-3xl text-sm text-white/60 line-clamp-2">
                      {safeExplanation(getAiExplanation(featured))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </button>
        ) : null}

        <div className="space-y-10">
          {(() => {
            const used = new Set<string>();

            const sections = [
              {
                title: "For You",
                subtitle: "Your strongest matches right now.",
                events: forYou,
              },
              {
                title:
                  activeMode === "solo"
                    ? "Best For Solo"
                    : activeMode === "date"
                      ? "Best For Date Night"
                      : "Best For Group Nights",
                subtitle: "Boosted by your social mode.",
                events: modeMatched.slice(0, 10),
              },
              {
                title: "Electronic and Club",
                subtitle: "Bass-forward picks built for momentum.",
                events: electronic,
              },
              {
                title: "Intimate Venues",
                subtitle: "Warm, close-up nights with real texture.",
                events: intimate,
              },
              {
                title: "Social Picks",
                subtitle: "For sharing energy with friends.",
                events: socialPicks,
              },
              {
                title: "Outdoor & Active",
                subtitle: "Open-air energy and movement-friendly plans.",
                events: outdoorActive,
              },
              {
                title: "Food and Drink",
                subtitle: "Drink-led evenings and good bites.",
                events: foodAndDrink,
              },
              {
                title: "Happening This Week",
                subtitle: "On the calendar, next.",
                events: happeningThisWeek,
              },
              {
                title: "Late Night",
                subtitle: "Starts late; ideal for drifting after 21:00.",
                events: lateNight,
              },
              {
                title: "Under £20",
                subtitle: "Low cost, high vibe.",
                events: underTwenty,
              },
              {
                title: "Just Dropped",
                subtitle: "New arrivals from your recommendations.",
                events: justDropped,
              },
            ].map((s) => ({
              ...s,
              events: s.events.filter((e) => {
                if (used.has(e.id)) return false;
                used.add(e.id);
                return true;
              }),
            }));

            return sections
              .filter((s) => s.events.length >= 3)
              .map((section) => (
                <Row
                  key={section.title}
                  title={section.title}
                  subtitle={section.subtitle}
                  events={section.events}
                  expanded={expandedRow === section.title}
                  onToggleExpanded={() =>
                    setExpandedRow((r) =>
                      r === section.title ? null : section.title
                    )
                  }
                  onOpen={openEvent}
                  savedIds={savedIds}
                  onToggleSave={toggleSave}
                />
              ));
          })()}
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
    </main>
  );
}

