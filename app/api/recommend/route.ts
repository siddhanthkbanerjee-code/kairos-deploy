import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

type QuizAnswers = Record<string, unknown>;

type RecommendRequestBody = {
  quizAnswers?: QuizAnswers;
};

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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY ?? "",
});

const INDEX_NAME = process.env.PINECONE_INDEX ?? "kairos-events";

function quizAnswersToTasteDescription(quizAnswers: QuizAnswers): string {
  const qa = quizAnswers as Record<string, unknown>;

  const timeOfDay = typeof qa.timeOfDay === "string" ? qa.timeOfDay.trim() : "";
  const fridayNight =
    typeof qa.fridayNight === "string" ? qa.fridayNight.trim() : "";
  const aesthetic =
    typeof qa.aesthetic === "string" ? qa.aesthetic.trim() : "";
  const soundtrack =
    typeof qa.soundtrack === "string" ? qa.soundtrack.trim() : "";
  const social = typeof qa.social === "string" ? qa.social.trim() : "";

  const genres = Array.isArray(qa.genres)
    ? (qa.genres.filter((x) => typeof x === "string" && x.trim().length > 0) as string[])
    : [];

  const discoveryScore =
    typeof qa.discoveryScore === "number" && Number.isFinite(qa.discoveryScore)
      ? Math.max(0, Math.min(100, Math.round(qa.discoveryScore)))
      : null;

  const experienceType = Array.isArray(qa.experienceType)
    ? (qa.experienceType.filter((x) => typeof x === "string" && x.trim().length > 0) as string[])
    : [];

  const experienceIntent =
    typeof qa.experienceIntent === "string" ? qa.experienceIntent.trim() : "";

  const parts: string[] = [];

  if (timeOfDay) parts.push(`User wants ${timeOfDay} events`);
  if (fridayNight) {
    parts.push(
      `${timeOfDay ? "with" : "User wants"} ${fridayNight} energy`
    );
  }
  if (aesthetic) parts.push(`Aesthetic preference: ${aesthetic}`);
  if (soundtrack) parts.push(`Default soundtrack: ${soundtrack}`);
  if (social) parts.push(`Going ${social}`);
  if (genres.length) parts.push(`Interested in ${genres.join(", ")}`);
  if (discoveryScore !== null)
    parts.push(`Discovery appetite ${discoveryScore}/100`);
  if (experienceIntent) parts.push(`Tonight they want to: ${experienceIntent}`);
  if (experienceType.length) parts.push(`Looking to ${experienceType.join(", ")}`);

  if (parts.length === 0) {
    return "User is looking for interesting events in London tonight, open to a variety of vibes and experiences.";
  }

  return `${parts.join(". ")}.`;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    if (!process.env.PINECONE_API_KEY) {
      return NextResponse.json(
        { error: "Missing PINECONE_API_KEY" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as
      | RecommendRequestBody
      | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { quizAnswers } = body;

    if (!quizAnswers || typeof quizAnswers !== "object") {
      return NextResponse.json(
        { error: "quizAnswers is required and must be an object" },
        { status: 400 }
      );
    }

    const tasteDescription = quizAnswersToTasteDescription(quizAnswers);

    console.log("Taste description for embedding:", tasteDescription);

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: tasteDescription,
    });

    const embedding = embeddingResponse.data[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { error: "Failed to generate embedding" },
        { status: 500 }
      );
    }

    const index = pinecone.Index(INDEX_NAME);

    const queryResponse = await index.query({
      topK: 20,
      vector: embedding,
      includeMetadata: true,
    });

    console.log(
      "Pinecone raw queryResponse:",
      JSON.stringify(queryResponse, null, 2)
    );

    const results: RecommendResult[] =
      queryResponse.matches?.map((match) => {
        const metadata = (match.metadata || {}) as Record<string, unknown>;

        return {
          id: match.id,
          score: match.score ?? 0,
          title: (metadata.name as string) ?? null,
          venue: (metadata.venue_name as string) ?? null,
          date: (metadata.start_date as string) ?? null,
          price_display: (metadata.price_display as string) ?? null,
          image_url: (metadata.image_url as string) ?? null,
          url: (metadata.url as string) ?? null,
          vibe_tags: (metadata.vibe_tags as string[]) ?? null,
          event_dna: (metadata.event_dna as Record<string, unknown>) ?? null,
        };
      }) ?? [];

    const rawScores = results
      .map((r) => r.score)
      .filter((s) => Number.isFinite(s)) as number[];
    const minScore = rawScores.length ? Math.min(...rawScores) : 0;
    const maxScore = rawScores.length ? Math.max(...rawScores) : 0;

    const rescaledResults =
      maxScore > minScore
        ? results.map((r) => {
            const normalized = (r.score - minScore) / (maxScore - minScore);
            const rescaledPct = 72 + normalized * 25;
            const pctInt = Math.round(rescaledPct);
            const score01 = Math.max(0, Math.min(100, pctInt)) / 100;
            return { ...r, score: score01 };
          })
        : results.map((r) => ({ ...r, score: 0.85 }));

    // Source boost for fabricated events
    const boosted = rescaledResults.map((r) => {
      const dna = r.event_dna ?? {};
      const source = (dna as any)?.source ?? (r as any)?.source;
      if (source === "fabricated") {
        return { ...r, score: r.score * 1.2 };
      }
      return r;
    });

    boosted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return NextResponse.json({ results: boosted });
  } catch (error) {
    console.error("Error in /api/recommend:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

