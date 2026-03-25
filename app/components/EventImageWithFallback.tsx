"use client";

import { useMemo, useState } from "react";

type EventLike = {
  id?: string;
  image_url?: string | null;
  title?: string | null;
  venue?: string | null;
  vibe_tags?: string[] | null;
  event_dna?: Record<string, unknown> | null;
};

type PlaceholderUi = {
  emoji: string;
  label: string; // category label shown under the emoji
  gradient: string;
};

function sanitizeSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s.length ? s : null;
}

function safeTags(tags: EventLike["vibe_tags"]) {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t) => typeof t === "string" && t.trim().length > 0);
}

function getSocialContext(ev: EventLike) {
  const dna = (ev.event_dna ?? {}) as Record<string, unknown>;
  const v =
    dna.social_context ?? dna.socialContext ?? dna.social ?? null;
  return typeof v === "string" ? v.toLowerCase() : "";
}

function getPlaceholderUi(ev: EventLike): PlaceholderUi {
  const dna = (ev.event_dna ?? {}) as Record<string, unknown>;
  const genreRaw =
    (typeof dna.genre === "string" ? dna.genre : null) ??
    (Array.isArray(dna.genres) && typeof dna.genres[0] === "string"
      ? dna.genres[0]
      : null) ??
    (typeof dna.music_genre === "string" ? dna.music_genre : null) ??
    "";
  const genre = typeof genreRaw === "string" ? genreRaw.toLowerCase() : "";

  const tags = safeTags(ev.vibe_tags).map((t) => t.toLowerCase());
  const venue = (ev.venue ?? "").toLowerCase();
  const social = getSocialContext(ev);

  const hay = `${genre} ${tags.join(" ")} ${venue} ${social}`.toLowerCase();

  const matchesAny = (needles: string[]) =>
    needles.some((n) => hay.includes(n));

  // Order matters: we pick the most specific bucket first.
  if (matchesAny(["comedy"])) {
    return {
      emoji: "😂",
      label: "Comedy",
      gradient: "linear-gradient(135deg, #1e3a5f, #3b82f6)",
    };
  }

  if (
    matchesAny([
      "sports",
      "fitness",
      "gym",
      "workout",
      "trail",
      "run",
      "running",
      "outdoor",
      "active",
      "energetic",
    ])
  ) {
    return {
      emoji: "⚡",
      label: "Sports & Fitness",
      gradient: "linear-gradient(135deg, #064e3b, #10b981)",
    };
  }

  if (
    matchesAny([
      "food",
      "drink",
      "bar",
      "cafe",
      "restaurant",
      "kitchen",
      "dining",
      "bistro",
      "cocktail",
      "wine",
      "beer",
    ])
  ) {
    return {
      emoji: "🍷",
      label: "Food & Drink",
      gradient: "linear-gradient(135deg, #78350f, #d97706)",
    };
  }

  if (
    matchesAny([
      "arts",
      "culture",
      "theatre",
      "theater",
      "museum",
      "exhibition",
      "immersive",
      "experimental",
      "intimate",
      "atmospheric",
    ])
  ) {
    return {
      emoji: "🎨",
      label: "Arts & Culture",
      gradient: "linear-gradient(135deg, #831843, #db2777)",
    };
  }

  if (matchesAny(["music", "rave", "club", "electronic", "dance", "dj", "house", "techno", "rock", "pop", "jazz", "latin", "alternative", "r&b"])) {
    return {
      emoji: "🎵",
      label: "Music",
      gradient: "linear-gradient(135deg, #4c1d95, #7c3aed)",
    };
  }

  return {
    emoji: "✨",
    label: "Event",
    gradient: "linear-gradient(135deg, #1e1b4b, #a855f7)",
  };
}

export default function EventImageWithFallback({
  event,
  wrapperClassName,
  imgClassName,
  size = "default",
}: {
  event: EventLike;
  wrapperClassName: string;
  imgClassName?: string;
  size?: "default" | "small";
}) {
  const dna = (event.event_dna ?? {}) as Record<string, unknown>;

  // Traceable + robust src extraction:
  // Prefer the explicit `image_url` field, then try a few common alternatives.
  const src =
    sanitizeSrc(event.image_url) ??
    sanitizeSrc((event as unknown as { imageUrl?: unknown }).imageUrl) ??
    sanitizeSrc(dna.image_url) ??
    sanitizeSrc(dna.imageUrl) ??
    sanitizeSrc(dna.image);

  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const placeholderUi = useMemo(() => getPlaceholderUi(event), [event]);

  const showImg = !!src && failedSrc !== src;
  const isSmall = size === "small";

  const emojiClass = isSmall ? "text-2xl" : "text-3xl";
  const labelClass = isSmall ? "mt-1 text-[10px]" : "mt-2 text-[11px]";

  return (
    <div
      className={["relative", wrapperClassName].join(" ")}
      data-event-id={event.id ?? ""}
      data-image-src={src ?? ""}
      data-image-failed-src={failedSrc ?? ""}
      data-image-state={showImg ? "image" : "fallback"}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={event.title ?? "Event image"}
          className={
            imgClassName ?? "absolute inset-0 h-full w-full object-cover"
          }
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
        />
      ) : null}

      {!showImg ? (
        <div
          className="absolute inset-0 z-10"
          style={{ background: placeholderUi.gradient }}
        >
          <div className="relative h-full w-full flex flex-col items-center justify-center text-center">
            <div
              className={emojiClass}
              style={{
                filter: "drop-shadow(0 12px 26px rgba(0,0,0,0.55))",
              }}
            >
              {placeholderUi.emoji}
            </div>
            <div
              className={labelClass + " font-semibold text-white/90 drop-shadow"}
            >
              {placeholderUi.label}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

