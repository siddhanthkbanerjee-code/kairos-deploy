import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-4xl px-6 pb-16 pt-10 sm:px-10">
        <h1 className="editorial text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl">
          We built Kairos because great nights should find you.
        </h1>

        <div className="mt-8 space-y-5 text-base text-white/70">
          <p>
            London has thousands of events happening every week, but discovery is
            broken. You either scroll endless ticket grids, or you find out
            about something perfect the next day through someone else’s story.
          </p>
          <p>
            Kairos uses AI to understand your cultural taste at a deeper level
            than “popular near you.” We learn the shape of your nights — the
            energy, the setting, the social context, and what you actually want
            to feel — and then surface the events that match that profile.
          </p>
          <p>
            The taste quiz is the start: it captures how you move through the
            city. The match score isn’t a generic rating; it’s a similarity
            signal calculated from your profile against event “DNA” so the feed
            becomes more you every time.
          </p>
          <p>
            The vision is simple: a city that feels curated. Not by influencers,
            not by algorithms chasing virality — by your taste, in the moment
            it matters.
          </p>
        </div>

        <div className="mt-10">
          <Link
            href="/quiz"
            className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white"
            style={{
              background:
                "linear-gradient(135deg, rgba(168,85,247,1) 0%, rgba(244,114,182,0.92) 100%)",
              boxShadow: "0 18px 60px rgba(168,85,247,0.22)",
            }}
          >
            Start discovering
          </Link>
        </div>
      </div>
    </main>
  );
}

