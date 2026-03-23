import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex min-h-[calc(100dvh-72px)] w-full max-w-3xl flex-col items-center justify-center px-6 pb-16 pt-10 text-center sm:px-10">
        <div className="editorial text-2xl font-semibold text-white">Kairos</div>
        <h1 className="editorial mt-6 text-5xl font-semibold text-white">
          Coming soon.
        </h1>
        <p className="mt-4 max-w-md text-base text-white/65">
          We are building something here. Check back soon.
        </p>
        <Link
          href="/"
          className="mt-8 text-sm font-medium text-white/70 underline decoration-white/20 underline-offset-4 hover:text-white/90"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

