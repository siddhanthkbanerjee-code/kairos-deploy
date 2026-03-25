"use client";

import { useEffect, useMemo, useState } from "react";

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
  label: string;
  gradient: string;
};

function safeTags(tags: EventLike["vibe_tags"]) {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t) => typeof t === "string" && t.trim().length > 0);
}

function getSocialContext(ev: EventLike) {
  const dna = ev.event_dna ?? {};
  const v =
    (dna as any)?.social_context ??
    (dna as any)?.socialContext ??
    (dna as any)?.social ??
    null;
  return typeof v === "string" ? v.toLowerCase() : "";
}

function getPrimaryGenre(ev: EventLike) {
  const dna = ev.event_dna ?? {};
  const g =
    (dna as any)?.genre ??
    (dna as any)?.genres?.[0] ??
    (dna as any)?.music_genre ??
    null;
  return typeof g === "string" ? g.toLowerCase() : "";
}

function getPlaceholderUi(ev: EventLike): PlaceholderUi {
  const genre = getPrimaryGenre(ev);
  const tags = safeTags(ev.vibe_tags).map((t) => t.toLowerCase());
  const venue = (ev.venue ?? "").toLowerCase();
  const social = getSocialContext(ev);

  const isMusic = ["rock", "pop", "jazz", "electronic", "dance", "r&b", "classical", "latin", "alternative", "club", "house", "techno"].some(
    (k) => genre.includes(k)
  );
  const isArts =
    genre.includes("other") ||
    ["intimate", "experimental", "immersive", "atmospheric"].some((k) =>
      tags.includes(k)
    );
  const isOutdoor =
    tags.includes("outdoor") ||
    tags.includes("energetic") ||
    tags.includes("active") ||
    venue.includes("park") ||
    venue.includes("outdoor") ||
    venue.includes("trail");
  const isFood =
    ["bar", "cafe", "restaurant", "kitchen", "dining", "bistro"].some((k) =>
      venue.includes(k)
    ) || tags.includes("food") || tags.includes("drink") || tags.includes("cocktail");
  const isSocial =
    social.includes("group") ||
    social.includes("solo") ||
    social.includes("partner") ||
    social.includes("couple") ||
    social.includes("friends") ||
    social.includes("gang") ||
    social.includes("crew");

  if (isMusic) {
    return {
      emoji: "🎵",
      label: "Music",
      gradient:
        "linear-gradient(135deg, rgba(168, 85, 247, 0.40) 0%, rgba(244, 114, 182, 0.18) 45%, rgba(20, 160, 140, 0.12) 100%)",
    };
  }
  if (isArts) {
    return {
      emoji: "🎭",
      label: "Arts & Culture",
      gradient:
        "linear-gradient(135deg, rgba(244, 114, 182, 0.30) 0%, rgba(168, 85, 247, 0.16) 55%, rgba(255,255,255,0.04) 100%)",
    };
  }
  if (isOutdoor) {
    return {
      emoji: "🏃",
      label: "Outdoor & Active",
      gradient:
        "linear-gradient(135deg, rgba(59, 130, 246, 0.28) 0%, rgba(20, 184, 166, 0.18) 45%, rgba(244, 114, 182, 0.10) 100%)",
    };
  }
  if (isFood) {
    return {
      emoji: "🍷",
      label: "Food & Drink",
      gradient:
        "linear-gradient(135deg, rgba(244, 114, 182, 0.22) 0%, rgba(168, 85, 247, 0.18) 45%, rgba(255,255,255,0.04) 100%)",
    };
  }
  if (isSocial) {
    return {
      emoji: "🫶",
      label: "Social",
      gradient:
        "linear-gradient(135deg, rgba(20, 160, 140, 0.22) 0%, rgba(168, 85, 247, 0.14) 45%, rgba(244, 114, 182, 0.08) 100%)",
    };
  }

  return {
    emoji: "✨",
    label: "Event",
    gradient:
      "linear-gradient(135deg, rgba(168, 85, 247, 0.14) 0%, rgba(244, 114, 182, 0.10) 45%, rgba(20, 160, 140, 0.08) 100%)",
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
  const [imgFailed, setImgFailed] = useState(false);

  const src = event.image_url ?? null;

  useEffect(() => {
    setImgFailed(false);
  }, [event?.id, event?.image_url]);

  const placeholderUi = useMemo(() => getPlaceholderUi(event), [event]);

  const showImg = !!src && !imgFailed;
  const isSmall = size === "small";

  const emojiClass = isSmall ? "text-2xl" : "text-3xl";
  const labelClass = isSmall ? "mt-1 text-[10px]" : "mt-2 text-[11px]";

  return (
    <div className={["relative", wrapperClassName].join(" ")}>
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
          onError={() => setImgFailed(true)}
        />
      ) : null}

      {!showImg ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: placeholderUi.gradient,
            backgroundSize: "cover",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(10,10,18,0.86), rgba(10,10,18,0.10))",
            }}
          />

          <div className="relative h-full w-full flex flex-col items-center justify-center text-center">
            <div className={emojiClass} style={{ filter: "drop-shadow(0 12px 26px rgba(0,0,0,0.55))" }}>
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

