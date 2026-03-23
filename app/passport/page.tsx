"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type QuizAnswers = {
  timeOfDay?: string;
  fridayNight?: string;
  social?: string;
  genres?: string[];
  discoveryScore?: number;
  setting?: string[];
  spendMindset?: string;
  priceRange?: string[];
  physical?: string;
  experienceType?: string[];
  openness?: string;
  spontaneity?: string;
  frequency?: string;
};

const ACCENT = "#a855f7";
const ACCENT_2 = "#f472b6";

type Archetype = {
  name: string;
  sub: string;
  description: string;
};

const ARCHETYPE_DESC: Record<string, string> = {
  Raver:
    "You live for the after-midnight hours when the city reveals its best-kept secrets. Dark rooms, heavy bass, and the electric feeling of being exactly where you are supposed to be.",
  Flaneur:
    "You drift through the city with a connoisseur's eye, collecting experiences like others collect stamps. The journey is never linear and that is exactly how you like it.",
  Connector:
    "Events are your social infrastructure. You measure a good night by who you met, what was said, and whether you will see them again.",
  Athlete:
    "The city is your playground and you mean that literally. You want to feel the world through your body and the best events leave you physically spent.",
  Connoisseur:
    "You have standards and that is not a crime. You do not go to many events but the ones you choose are researched, deliberate, and almost always exceptional.",
  Hedonist:
    "You decided to go out at 6pm tonight. You are already in line by 9. Plans are suggestions, budgets are flexible.",
  "Lone Wolf":
    "You go out deliberately and you go alone. Not from shyness, from a desire to be fully present. You have seen more extraordinary things than most people know exist in this city.",
  Intellectual:
    "You want to leave with your mind rearranged. Panel discussions, philosophical debates, author talks. You take notes at events.",
};

function deriveArchetype(a: QuizAnswers): Archetype {
  const physical = (a.physical ?? "").toLowerCase();
  const timeOfDay = (a.timeOfDay ?? "").toLowerCase();
  const friday = (a.fridayNight ?? "").toLowerCase();
  const social = (a.social ?? "").toLowerCase();
  const exp = (a.experienceType ?? []).join(" ").toLowerCase();
  const openness = (a.openness ?? "").toLowerCase();
  const spend = (a.spendMindset ?? "").toLowerCase();
  const spont = (a.spontaneity ?? "").toLowerCase();

  if (physical.includes("hike run cycle")) {
    return {
      name: "The Athlete",
      sub: "The Urban Explorer",
      description: ARCHETYPE_DESC.Athlete,
    };
  }
  if (timeOfDay.includes("night owl") && friday.includes("dance floor")) {
    return {
      name: "The Raver",
      sub: "The Midnight Architect",
      description: ARCHETYPE_DESC.Raver,
    };
  }
  if (social.includes("solo")) {
    return {
      name: "The Lone Wolf",
      sub: "The Quiet Discoverer",
      description: ARCHETYPE_DESC["Lone Wolf"],
    };
  }
  if (exp.includes("make me think")) {
    return {
      name: "The Intellectual",
      sub: "The Thinking Flaneur",
      description: ARCHETYPE_DESC.Intellectual,
    };
  }
  if (friday.includes("buzzy bar") && openness.includes("love meeting strangers")) {
    return {
      name: "The Connector",
      sub: "The Scene Weaver",
      description: ARCHETYPE_DESC.Connector,
    };
  }
  if (spend.includes("price rarely stops me")) {
    return {
      name: "The Connoisseur",
      sub: "The Velvet Underground",
      description: ARCHETYPE_DESC.Connoisseur,
    };
  }
  if (spont.includes("whim")) {
    return {
      name: "The Hedonist",
      sub: "The Spontaneous Architect",
      description: ARCHETYPE_DESC.Hedonist,
    };
  }

  return {
    name: "The Flaneur",
    sub: "The Cultural Cartographer",
    description: ARCHETYPE_DESC.Flaneur,
  };
}

function tasteTags(a: QuizAnswers) {
  const g = (a.genres ?? []).join(" ").toLowerCase();
  const tags: string[] = [];
  if (g.includes("electronic")) tags.push("Electronic");
  if (g.includes("jazz")) tags.push("Jazz");
  if (g.includes("classical")) tags.push("Classical");
  if (g.includes("sports") || g.includes("outdoor")) tags.push("Outdoor");
  if ((a.timeOfDay ?? "").toLowerCase().includes("night owl")) tags.push("Night Owl");
  if (tags.length < 4 && (a.discoveryScore ?? 0) >= 70) tags.push("Adventurous");
  return Array.from(new Set(tags)).slice(0, 4);
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

function radarValues(a: QuizAnswers) {
  const friday = (a.fridayNight ?? "").toLowerCase();
  const social = (a.social ?? "").toLowerCase();
  const exp = (a.experienceType ?? []).join(" ").toLowerCase();
  const time = (a.timeOfDay ?? "").toLowerCase();

  const energy = friday.includes("dance floor") ? 95 : friday.includes("buzzy bar") ? 70 : friday.includes("quiet") ? 30 : 55;
  const socialV =
    social.includes("more the merrier")
      ? 95
      : social.includes("small gang")
        ? 70
        : social.includes("partner")
          ? 45
          : social.includes("solo")
            ? 20
            : 55;
  const discovery = clamp(Math.round(a.discoveryScore ?? 50));
  const culture =
    exp.includes("make me think")
      ? 90
      : exp.includes("make me feel")
        ? 75
        : exp.includes("make me laugh")
          ? 65
          : exp.includes("make me move")
            ? 55
            : 60;
  const night =
    time.includes("night owl")
      ? 95
      : time.includes("evening")
        ? 70
        : time.includes("afternoon")
          ? 40
          : time.includes("morning")
            ? 20
            : 55;

  return { energy, social: socialV, discovery, culture, night };
}

function polygonPoints(values: number[]) {
  // 5-axis radar centered at (120,120), radius 92
  const cx = 120;
  const cy = 120;
  const r = 92;
  const pts = values.map((v, i) => {
    const angle = (-90 + i * 72) * (Math.PI / 180);
    const rr = (v / 100) * r;
    const x = cx + Math.cos(angle) * rr;
    const y = cy + Math.sin(angle) * rr;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return pts.join(" ");
}

type Integration = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
};

const INTEGRATIONS: Integration[] = [
  { id: "spotify", emoji: "🎧", name: "Spotify", desc: "Your listening patterns & moods." },
  { id: "strava", emoji: "🏃", name: "Strava", desc: "Your movement habits & routines." },
  { id: "hinge", emoji: "💌", name: "Hinge", desc: "Your dating energy & social style." },
  { id: "deliveroo", emoji: "🍜", name: "Deliveroo", desc: "Your cravings & comfort spots." },
  { id: "goodreads", emoji: "📚", name: "Goodreads", desc: "Your ideas, authors, and obsessions." },
];

export default function PassportPage() {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kairos:quiz");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { quizAnswers?: QuizAnswers };
      setAnswers(parsed.quizAnswers ?? {});
    } catch {
      setAnswers({});
    }
  }, []);

  const archetype = useMemo(() => deriveArchetype(answers), [answers]);
  const tags = useMemo(() => tasteTags(answers), [answers]);
  const values = useMemo(() => radarValues(answers), [answers]);

  const axes = [
    { k: "Energy", v: values.energy },
    { k: "Social", v: values.social },
    { k: "Discovery", v: values.discovery },
    { k: "Culture", v: values.culture },
    { k: "Night", v: values.night },
  ];

  const pts = polygonPoints([values.energy, values.social, values.discovery, values.culture, values.night]);

  const badges = useMemo(() => {
    const b: string[] = [archetype.name];
    if ((answers.discoveryScore ?? 0) > 60) b.push("Trailblazer");
    if ((answers.frequency ?? "").toLowerCase().includes("live for this")) b.push("Night Owl");
    if ((answers.genres ?? []).length >= 4) b.push("Genre Hopper");
    if ((answers.spontaneity ?? "").toLowerCase().includes("whim")) b.push("Yes Person");
    return b.slice(0, 4);
  }, [answers, archetype.name]);

  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-5xl px-6 pb-20 pt-10 sm:px-10">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/feed"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/85"
            style={{ background: "rgba(255,255,255,0.04)", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }}
            aria-label="Back"
          >
            ←
          </Link>
          <Link href="/" className="editorial text-lg font-semibold text-white">
            Kairos
          </Link>
        </div>

        <h1 className="editorial text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl">
          Your Taste Passport
        </h1>

        <div
          className="mt-8 rounded-3xl px-6 py-8 sm:px-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 90px rgba(0,0,0,0.55)",
            backdropFilter: "blur(18px)",
          }}
        >
          <div className="text-xs font-semibold tracking-[0.28em] uppercase" style={{ color: ACCENT }}>
            {archetype.sub}
          </div>
          <div className="editorial mt-2 text-[52px] font-semibold leading-none text-white">
            {archetype.name}
          </div>
          <p className="mt-4 max-w-3xl text-base text-white/70">{archetype.description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full px-4 py-2 text-sm font-medium text-white/90"
                style={{
                  background: "rgba(168,85,247,0.12)",
                  border: "1px solid rgba(168,85,247,0.35)",
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="editorial text-2xl font-semibold text-white">Your radar</div>
              <p className="mt-2 text-sm text-white/60">
                A quick silhouette of your nightlife geometry.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/70">
                {axes.map((a) => (
                  <div key={a.k} className="flex items-center gap-2">
                    <span className="text-white/55">{a.k}</span>
                    <span className="font-semibold" style={{ color: ACCENT }}>
                      {a.v}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <svg width="260" height="260" viewBox="0 0 240 240" role="img" aria-label="Taste radar chart">
                <g>
                  {[1, 0.75, 0.5, 0.25].map((s, i) => (
                    <polygon
                      key={i}
                      points={polygonPoints([100 * s, 100 * s, 100 * s, 100 * s, 100 * s])}
                      fill="none"
                      stroke="rgba(255,255,255,0.10)"
                      strokeWidth="1"
                    />
                  ))}

                  {["Energy", "Social", "Discovery", "Culture", "Night"].map((label, i) => {
                    const angle = (-90 + i * 72) * (Math.PI / 180);
                    const x = 120 + Math.cos(angle) * 112;
                    const y = 120 + Math.sin(angle) * 112;
                    return (
                      <text
                        key={label}
                        x={x}
                        y={y}
                        fill="rgba(255,255,255,0.55)"
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {label}
                      </text>
                    );
                  })}

                  <polygon points={pts} fill="rgba(168,85,247,0.15)" stroke={ACCENT} strokeWidth="2" />
                </g>
              </svg>
            </div>
          </div>
        </div>

        <section className="mt-10 space-y-4">
          <div className="editorial text-2xl font-semibold text-white">Badges</div>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <div className="editorial text-2xl font-semibold text-white">App integrations</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {INTEGRATIONS.map((i) => {
              const isOn = !!connected[i.id];
              return (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-4 rounded-2xl px-4 py-4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl">{i.emoji}</div>
                    <div>
                      <div className="text-sm font-semibold text-white">{i.name}</div>
                      <div className="text-xs text-white/60">{i.desc}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConnected((p) => ({ ...p, [i.id]: true }))}
                    className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white"
                    style={{
                      background: isOn
                        ? "rgba(255,255,255,0.06)"
                        : `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
                      border: "1px solid rgba(255,255,255,0.12)",
                      opacity: isOn ? 0.9 : 1,
                    }}
                  >
                    {isOn ? "Connected ✓" : "Connect"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/feed"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white"
            style={{
              background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
              boxShadow: "0 18px 60px rgba(168,85,247,0.22)",
            }}
          >
            Explore my feed
          </Link>
          <Link
            href="/quiz"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white/85"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            Retake quiz, see if you&apos;ve changed
          </Link>
        </div>
      </div>
    </main>
  );
}

