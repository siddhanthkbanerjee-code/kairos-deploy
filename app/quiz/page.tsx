"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type QuizAnswers = {
  timeOfDay?: string;
  fridayNight?: string;
  aesthetic?: string;
  soundtrack?: string;
  social?: string;
  genres?: string[];
  discoveryScore?: number; // 0..100
  experienceIntent?: string;
};

type QuestionBase = {
  id: keyof QuizAnswers;
  label: string;
  question: string;
  subtext?: string;
};

type SingleQuestion = QuestionBase & {
  kind: "single";
  options: string[];
};

type MultiQuestion = QuestionBase & {
  kind: "multi";
  options: string[];
  gridCols?: 2;
  minSelected?: number;
};

type SliderQuestion = QuestionBase & {
  kind: "slider";
  min: number;
  max: number;
  leftLabel: string;
  rightLabel: string;
};

type AnyQuestion = SingleQuestion | MultiQuestion | SliderQuestion;

const ACCENT = "#a855f7";

type PaletteName =
  | "night-underground"
  | "night-underground-light"
  | "warm-intimate"
  | "warm-intimate-light"
  | "outdoor-fresh"
  | "outdoor-fresh-light"
  | "social-warm"
  | "social-warm-light"
  | "gold-dark"
  | "blue-dark"
  | "default-dark";

function dispatchPalette(name: PaletteName) {
  try {
    sessionStorage.setItem("kairos:palette", name);
  } catch {}
  window.dispatchEvent(new CustomEvent("kairos-palette-change", { detail: name }));
}

const QUESTIONS: AnyQuestion[] = [
  {
    id: "fridayNight",
    kind: "single",
    label: "01 / VIBE",
    question: "What's your Friday night energy?",
    options: [
      "Quiet table deep conversation",
      "Buzzy bar run into people",
      "Dance floor no thoughts",
      "Wherever the night takes me",
    ],
  },
  {
    id: "aesthetic",
    kind: "single",
    label: "02 / AESTHETIC",
    question: "Pick your aesthetic.",
    options: [
      "Candlelit & cosy",
      "Neon & electric",
      "Elegant & refined",
      "Gritty & underground",
    ],
  },
  {
    id: "soundtrack",
    kind: "single",
    label: "03 / SOUNDTRACK",
    question: "What's your default soundtrack?",
    options: [
      "Chill / lo-fi / jazz",
      "Pop / mainstream",
      "Electronic / house / techno",
      "Indie / alternative",
    ],
  },
  {
    id: "genres",
    kind: "multi",
    label: "04 / TASTE",
    question: "What pulls you in? Pick all that apply.",
    options: [
      "Jazz and Soul",
      "Electronic and Club",
      "Classical and Arts",
      "Rock and Indie",
      "Comedy and Spoken Word",
      "Sports and Outdoor",
      "Social and Networking",
      "Food and Drinks",
      "Books and Ideas",
      "Experimental and Weird",
    ],
    gridCols: 2,
    minSelected: 1,
  },
  {
    id: "experienceIntent",
    kind: "single",
    label: "05 / INTENT",
    question: "What do you want tonight to do to you?",
    options: [
      "Make me think",
      "Make me feel something",
      "Make me move",
      "Make me laugh",
      "Surprise me",
    ],
  },
  {
    id: "social",
    kind: "single",
    label: "06 / SOCIAL",
    question: "Who's in your orbit tonight?",
    options: [
      "Solo",
      "Partner or one close friend",
      "Small gang 3 to 5 people",
      "The more the merrier",
    ],
  },
  {
    id: "timeOfDay",
    kind: "single",
    label: "07 / TIME",
    question: "When do you come alive?",
    options: [
      "Morning before 10am",
      "Afternoon noon to 6pm",
      "Evening 6pm to 10pm",
      "Night owl the later the better",
    ],
  },
  {
    id: "discoveryScore",
    kind: "slider",
    label: "08 / DISCOVERY DIAL",
    question: "How adventurous are you feeling?",
    min: 0,
    max: 100,
    leftLabel: "Comfort zone",
    rightLabel: "Surprise me",
  },
];

function glassCardClassName() {
  return [
    "rounded-3xl border border-white/10 bg-white/[0.06]",
    "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_90px_rgba(0,0,0,0.55)]",
    "backdrop-blur-[20px]",
  ].join(" ");
}

function optionClassName(selected: boolean) {
  return [
    "w-full rounded-2xl border px-5 py-4 text-left",
    "transition-colors duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
    selected
      ? "border-[rgba(168,85,247,0.55)] bg-[rgba(168,85,247,0.12)]"
      : "border-white/10 bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.08]",
  ].join(" ");
}

function chipClassName(selected: boolean) {
  return [
    "rounded-full border px-4 py-2 text-sm font-medium",
    "transition-colors duration-200 ease-out",
    selected
      ? "border-[rgba(168,85,247,0.55)] bg-[rgba(168,85,247,0.12)] text-white"
      : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25 hover:bg-white/[0.05]",
  ].join(" ");
}

function getDiscoveryLabel(v: number) {
  if (v <= 10) return "Only what I already love";
  if (v <= 20) return "Mostly familiar territory";
  if (v <= 30) return "A little outside my usual";
  if (v <= 40) return "Open to something new";
  if (v <= 50) return "Balanced explorer";
  if (v <= 60) return "Leaning adventurous";
  if (v <= 70) return "Show me something different";
  if (v <= 80) return "Take me somewhere unexpected";
  if (v <= 90) return "The more unusual the better";
  return "Fully uncharted, surprise me completely";
}

function getAnswerForQuestion(q: AnyQuestion, answers: QuizAnswers) {
  return answers[q.id];
}

export default function QuizPage() {
  const router = useRouter();

  const total = QUESTIONS.length; // 8
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    discoveryScore: 50,
    genres: [],
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const current = QUESTIONS[index];

  useEffect(() => {
    // Keep current palette until Q1 triggers first shift.
  }, []);

  const stepDisplay = useMemo(() => {
    const x = Math.min(index + 1, total);
    return `${x} of ${total}`;
  }, [index, total]);

  const progressPct = useMemo(() => {
    const x = Math.min(index + 1, total);
    return total === 0 ? 0 : (x / total) * 100;
  }, [index, total]);

  useEffect(() => {
    sessionStorage.setItem("kairos:quiz", JSON.stringify({ quizAnswers: answers }));
  }, [answers]);

  async function submitAndGoFeed(finalAnswers: QuizAnswers) {
    setIsSubmitting(true);
    try {
      sessionStorage.setItem(
        "kairos:quiz",
        JSON.stringify({ quizAnswers: finalAnswers })
      );

      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quizAnswers: finalAnswers }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { results?: unknown };
      const results = Array.isArray((data as any)?.results) ? (data as any).results : [];

      sessionStorage.setItem(
        "kairos:recommendations",
        JSON.stringify({ results, createdAt: Date.now(), answers: finalAnswers })
      );

      router.push("/feed");
    } catch (e) {
      console.error("Quiz submit error:", e);
      setIsSubmitting(false);
    }
  }

  function goFeed() {
    sessionStorage.setItem("kairos:quiz", JSON.stringify({ quizAnswers: answers }));
    void submitAndGoFeed(answers);
  }

  function updateAnswer<K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "timeOfDay") {
        dispatchPalette("default-dark");
      }
      if (key === "fridayNight") {
        const v = String(value).toLowerCase();
        if (v.includes("dance floor")) dispatchPalette("night-underground");
        else if (v.includes("quiet table")) dispatchPalette("warm-intimate");
        else if (v.includes("buzzy bar")) dispatchPalette("social-warm");
        else dispatchPalette("default-dark");
      }
      if (key === "social") {
        const v = String(value).toLowerCase();
        if (v === "solo") dispatchPalette("night-underground-light");
        else if (v.startsWith("partner")) dispatchPalette("warm-intimate-light");
        else if (v.includes("more the merrier")) dispatchPalette("social-warm");
      }
      if (key === "aesthetic") {
        const v = String(value).toLowerCase();
        if (v.includes("neon")) dispatchPalette("night-underground");
        else if (v.includes("candlelit")) dispatchPalette("warm-intimate");
        else if (v.includes("elegant")) dispatchPalette("gold-dark");
        else if (v.includes("gritty")) dispatchPalette("night-underground");
      }
      if (key === "soundtrack") {
        const v = String(value).toLowerCase();
        if (v.includes("electronic")) dispatchPalette("night-underground");
        else if (v.includes("jazz")) dispatchPalette("warm-intimate");
        else if (v.includes("indie")) dispatchPalette("blue-dark");
        else dispatchPalette("default-dark");
      }
      if (key === "experienceIntent") {
        const v = String(value).toLowerCase();
        if (v.includes("think")) dispatchPalette("warm-intimate");
        else if (v.includes("move")) dispatchPalette("social-warm");
        else if (v.includes("feel")) dispatchPalette("night-underground-light");
      }
      return next;
    });
  }

  function toggleMulti(key: keyof QuizAnswers, option: string) {
    setAnswers((prev) => {
      const currentVal = prev[key];
      const arr = Array.isArray(currentVal) ? (currentVal as string[]) : [];
      const next = arr.includes(option) ? arr.filter((x) => x !== option) : [...arr, option];
      const nextAnswers = { ...prev, [key]: next } as QuizAnswers;
      if (key === "genres") {
        const g = (nextAnswers.genres ?? []).map((x) => x.toLowerCase());
        const has = (needle: string) => g.some((x) => x.includes(needle));
        const hasElectronic = has("electronic") || has("club");
        const hasWarm = has("jazz") || has("classical");
        const hasOutdoor = has("outdoor") || has("sports");

        if (hasElectronic) dispatchPalette("night-underground");
        else if (hasOutdoor) dispatchPalette("outdoor-fresh");
        else if (hasWarm) dispatchPalette("warm-intimate");
        else dispatchPalette("default-dark");
      }
      return nextAnswers;
    });
  }

  function canContinue() {
    if (!current) return false;
    const a = getAnswerForQuestion(current, answers);

    switch (current.kind) {
      case "single":
        return typeof a === "string" && a.trim().length > 0;
      case "multi": {
        const arr = Array.isArray(a) ? a : [];
        const min = current.minSelected ?? 1;
        return arr.length >= min;
      }
      case "slider":
        return true;
      default:
        return false;
    }
  }

  function advanceToNextCard() {
    if (index >= total - 1) {
      void submitAndGoFeed(answers);
      return;
    }

    setIsTransitioning(true);
    window.setTimeout(() => {
      setIndex((i) => Math.min(i + 1, total - 1));
      setTransitionKey((k) => k + 1);
      setIsTransitioning(false);
    }, 260);
  }

  function next() {
    if (!current) return;
    if (!canContinue()) return;

    if (current.id === "discoveryScore") {
      void submitAndGoFeed(answers);
      return;
    }

    if (index >= total - 1) {
      void submitAndGoFeed(answers);
      return;
    }

    advanceToNextCard();
  }

  return (
    <main className="min-h-dvh" style={{ color: "rgba(255,255,255,0.92)" }}>
      <div className="mx-auto w-full max-w-3xl px-5 pb-14 pt-8 sm:px-8">
        <header className="mb-6">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="text-sm font-semibold tracking-[0.28em] text-white/70 uppercase">
              Kairos
            </div>

            <div className="flex items-center justify-center">
              <div className="text-sm font-medium text-white/70">{stepDisplay}</div>
            </div>

            <button
              type="button"
              onClick={goFeed}
              disabled={isSubmitting}
              className="text-sm font-medium text-white/60 underline decoration-white/20 underline-offset-4 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Skip
            </button>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%`, background: ACCENT }}
            />
          </div>
        </header>

        <section
          key={transitionKey}
          className={[
            glassCardClassName(),
            "px-6 pb-6 pt-6 sm:px-8 sm:pb-7 sm:pt-7",
            "transition-all duration-300 ease-out",
            isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
          ].join(" ")}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="text-xs font-semibold tracking-[0.22em] text-white/60 uppercase">
              {current.label}
            </div>
          </div>

          <h1 className="text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl">
            {current.question}
          </h1>

          {current.subtext ? (
            <p className="mt-3 text-sm text-white/60">{current.subtext}</p>
          ) : null}

          <div className="mt-7 space-y-4">
            {current.kind === "single" ? (
              <div className="grid grid-cols-1 gap-3">
                {current.options.map((opt) => {
                  const selected = answers[current.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        if (isSubmitting) return;
                        updateAnswer(current.id, opt);
                        if (current.id === "discoveryScore") return;
                        window.setTimeout(() => {
                          advanceToNextCard();
                        }, 40);
                      }}
                      disabled={isSubmitting}
                      className={optionClassName(selected)}
                    >
                      <div className="text-base font-medium text-white">{opt}</div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {current.kind === "multi" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {current.options.map((opt) => {
                  const arr = (answers[current.id] ?? []) as string[];
                  const selected = Array.isArray(arr) && arr.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        if (isSubmitting) return;
                        toggleMulti(current.id, opt);
                      }}
                      disabled={isSubmitting}
                      className={optionClassName(selected)}
                    >
                      <div className="text-base font-medium text-white">{opt}</div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {current.kind === "slider" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <div>{current.leftLabel}</div>
                  <div>{current.rightLabel}</div>
                </div>

                <input
                  type="range"
                  min={current.min}
                  max={current.max}
                  value={typeof answers.discoveryScore === "number" ? answers.discoveryScore : 50}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateAnswer("discoveryScore", val);
                    if (val > 70) dispatchPalette("night-underground");
                    else if (val >= 40) dispatchPalette("default-dark");
                    else dispatchPalette("warm-intimate");
                  }}
                  className="kairos-range"
                  style={{
                    ["--pct" as never]: `${
                      typeof answers.discoveryScore === "number"
                        ? `${answers.discoveryScore}%`
                        : "50%"
                    }`,
                  }}
                />

                <div className="text-sm font-medium" style={{ color: ACCENT }}>
                  {getDiscoveryLabel(typeof answers.discoveryScore === "number" ? answers.discoveryScore : 50)}
                </div>
              </div>
            ) : null}

          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={next}
              disabled={!canContinue()}
              className={[
                "inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold",
                "transition-all duration-200 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
                canContinue() ? "text-white" : "cursor-not-allowed text-white/45",
              ].join(" ")}
              style={{
                background: canContinue() ? ACCENT : "rgba(255,255,255,0.08)",
              }}
            >
              {isSubmitting
                ? "Finding your matches…"
                : current.id === "discoveryScore"
                  ? "See my results"
                  : "Continue"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

