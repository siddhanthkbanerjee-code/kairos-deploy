"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type QuizAnswers = {
  timeOfDay?: string;
  fridayNight?: string;
  social?: string;
  genres?: string[];
  discoveryScore?: number; // 0..100
  setting?: string[];
  spendMindset?: string;
  priceRange?: string[];
  physical?: string;
  experienceType?: string[];
  openness?: string;
  spontaneity?: string;
  frequency?: string;
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

type CompositeSpendQuestion = QuestionBase & {
  kind: "spend";
  options: string[]; // single-select mindset
  sweetSpotLabel: string;
  sweetSpotOptions: string[]; // multi-select chips
};

type AnyQuestion = SingleQuestion | MultiQuestion | SliderQuestion | CompositeSpendQuestion;

const ACCENT = "#a855f7";

type PaletteName =
  | "night-underground"
  | "warm-intimate"
  | "outdoor-fresh"
  | "social-warm"
  | "default-dark";

function dispatchPalette(name: PaletteName) {
  try {
    sessionStorage.setItem("kairos:palette", name);
  } catch {}
  window.dispatchEvent(new CustomEvent("kairos-palette-change", { detail: name }));
}

const QUESTIONS: AnyQuestion[] = [
  {
    id: "timeOfDay",
    kind: "single",
    label: "01 / ENERGY",
    question: "When do you actually come alive?",
    options: [
      "🌅 Morning person before 10am",
      "🧭 Afternoon explorer noon to 6pm",
      "🌇 Evening creature 6pm to 10pm",
      "🌙 Night owl the later the better",
    ],
  },
  {
    id: "fridayNight",
    kind: "single",
    label: "02 / VIBE",
    question: "Pick your Friday night.",
    options: [
      "Quiet table deep conversation",
      "Buzzy bar run into people",
      "Dance floor no thoughts",
      "Wherever the night takes me",
    ],
  },
  {
    id: "social",
    kind: "single",
    label: "03 / SOCIAL",
    question: "You're going out tonight. Who's with you?",
    options: [
      "Solo I like my own company",
      "Partner or one close friend",
      "Small gang 3 to 5 people",
      "The more the merrier",
    ],
  },
  {
    id: "genres",
    kind: "multi",
    label: "04 / TASTE",
    question: "What pulls you in? Pick all that apply.",
    subtext: "Select as many as feel true.",
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
    id: "discoveryScore",
    kind: "slider",
    label: "05 / DISCOVERY",
    question: "How adventurous are you feeling?",
    subtext: "This controls how far we push you outside your comfort zone.",
    min: 0,
    max: 100,
    leftLabel: "Comfort zone",
    rightLabel: "Surprise me",
  },
  {
    id: "setting",
    kind: "multi",
    label: "06 / SETTING",
    question: "Pick your scene.",
    options: [
      "Dark intimate basement",
      "Rooftop with city views",
      "Grand theatre or hall",
      "Open air parks and fields",
      "Hidden secret location",
      "Anywhere it's about the vibe",
    ],
    gridCols: 2,
    minSelected: 1,
  },
  {
    id: "spendMindset",
    kind: "spend",
    label: "07 / SPEND",
    question: "How do you think about event spend?",
    options: [
      "I decide per event based on how excited I am",
      "I have a rough weekly budget I stick to",
      "Price rarely stops me if I really want to go",
      "I mainly do free and low-cost",
    ],
    sweetSpotLabel: "Sweet spot per event",
    sweetSpotOptions: [
      "Free",
      "Under £15",
      "£15 to £35",
      "£35 to £60",
      "£60 and above",
    ],
  },
  {
    id: "physical",
    kind: "single",
    label: "08 / BODY",
    question: "How physical do you like your plans?",
    options: [
      "Give me a seat and a drink",
      "Happy on my feet for a few hours",
      "I'll hike run cycle yes to active",
      "Dance floor counts as exercise",
    ],
  },
  {
    id: "experienceType",
    kind: "multi",
    label: "09 / APPETITE",
    question: "What kind of experience are you after?",
    options: [
      "Make me think",
      "Make me feel something",
      "Make me move",
      "Make me laugh",
      "All of the above I contain multitudes",
    ],
    gridCols: 2,
    minSelected: 1,
  },
  {
    id: "openness",
    kind: "single",
    label: "10 / CONNECTION",
    question: "When it comes to meeting new people at events...",
    options: [
      "I go for connection love meeting strangers",
      "I'm open to it if it happens naturally",
      "I go for the event not the people",
      "Depends entirely on the vibe",
    ],
  },
  {
    id: "spontaneity",
    kind: "single",
    label: "11 / SPONTANEITY",
    question: "How far in advance do you actually plan?",
    options: [
      "I book weeks ahead I'm a planner",
      "A few days out feels right",
      "I decide day of always",
      "I show up on a whim plans are overrated",
    ],
  },
  {
    id: "frequency",
    kind: "single",
    label: "12 / FREQUENCY",
    question: "How often do you want to go out?",
    options: [
      "Once or twice a month is plenty",
      "Most weekends",
      "A few times a week",
      "As much as possible I live for this",
    ],
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

  const total = QUESTIONS.length; // 12
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    discoveryScore: 50,
    genres: [],
    setting: [],
    priceRange: [],
    experienceType: [],
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
      case "spend": {
        const mindset = answers.spendMindset;
        return typeof mindset === "string" && mindset.trim().length > 0;
      }
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

    if (current.id === "frequency") {
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
                        if (current.id === "frequency") return;
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
                  onChange={(e) => updateAnswer("discoveryScore", Number(e.target.value))}
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

            {current.kind === "spend" ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-3">
                  {current.options.map((opt) => {
                    const selected = answers.spendMindset === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          if (isSubmitting) return;
                          updateAnswer("spendMindset", opt);
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

                <div className="space-y-3">
                  <div className="text-sm font-semibold text-white/70">{current.sweetSpotLabel}</div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {current.sweetSpotOptions.map((opt) => {
                      const arr = answers.priceRange ?? [];
                      const selected = Array.isArray(arr) && arr.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleMulti("priceRange", opt)}
                          disabled={isSubmitting}
                          className={chipClassName(selected)}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
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
                : current.id === "frequency"
                  ? "See my results"
                  : "Continue"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

