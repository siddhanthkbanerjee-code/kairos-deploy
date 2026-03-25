"use client";

import Link from "next/link";

const ACCENT = "#a855f7";
const ACCENT_2 = "#f472b6";

const FAQ = [
  {
    q: "How are match scores calculated?",
    a: "Kairos compares your taste profile to event metadata (genre, vibe, timing, and discovery level) and ranks the closest fits.",
  },
  {
    q: "Can I re-tune my recommendations?",
    a: "Yes. Retake the quiz any time to refresh your taste profile and reshape your feed.",
  },
  {
    q: "Why do some events feel unexpected?",
    a: "Discovery mode can intentionally stretch your preferences so you still get serendipity, not just repetition.",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-4xl px-5 pb-14 pt-10 sm:px-8">
        <header className="mb-8">
          <h1 className="editorial text-4xl font-semibold text-white sm:text-5xl">
            Help
          </h1>
          <p className="mt-2 text-sm text-white/60">
            How Kairos works, plus lightweight next steps when you need a nudge.
          </p>
        </header>

        <section className="space-y-3">
          <article
            className="rounded-2xl px-5 py-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-white">How Kairos works</h2>
              <div
                className="rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
                  color: "#fff",
                  boxShadow: "0 18px 60px rgba(168,85,247,0.18)",
                }}
              >
                The loop
              </div>
            </div>
            <p className="mt-2 text-sm text-white/65">
              You take a quick quiz, Kairos matches your answers to event metadata, and then
              builds a feed that feels like your kind of night. Save events you like, then
              come back whenever you want to shortlist again.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/quiz"
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Retake quiz
              </Link>
              <Link
                href="/feed"
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Explore feed
              </Link>
              <Link
                href="/saved"
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                View saved
              </Link>
            </div>
          </article>

          <article
            className="rounded-2xl px-5 py-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <h2 className="text-base font-semibold text-white">How recommendations are generated</h2>
            <p className="mt-2 text-sm text-white/65">
              Kairos compares your quiz taste (genres/vibes and timing) against each event metadata.
              It then ranks and groups results for your browsing mode (solo, date night, or group)
              and uses a bit of discovery so you do not just see the same safe picks.
            </p>
          </article>

          <article
            className="rounded-2xl px-5 py-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
              Quick FAQ
            </h3>
            <div className="mt-3 space-y-3">
              {FAQ.map((item) => (
                <div key={item.q}>
                  <h4 className="text-base font-semibold text-white">{item.q}</h4>
                  <p className="mt-1 text-sm text-white/65">{item.a}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section
          className="mt-8 rounded-2xl px-5 py-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
            Coming soon
          </h3>
          <p className="mt-2 text-sm text-white/65">
            We are adding deeper explanations, more controls, and better navigation between feed,
            saved events, and recommendations. For now, you can recalibrate by retaking the quiz.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/quiz"
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Retake quiz
            </Link>
            <Link
              href="/feed"
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Go to feed
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

