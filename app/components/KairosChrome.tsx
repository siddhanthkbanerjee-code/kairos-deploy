"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const PALETTES: Record<
  string,
  { bg: string; blob1: string; blob2: string; blob3: string; blob4: string }
> = {
  "light-landing": {
    bg: "rgb(250, 249, 247)",
    blob1: "rgba(180, 150, 255, 0.20)",
    blob2: "rgba(255, 180, 150, 0.18)",
    blob3: "rgba(150, 200, 255, 0.15)",
    blob4: "rgba(200, 150, 200, 0.12)",
  },
  "night-underground": {
    bg: "rgb(6, 4, 20)",
    blob1: "rgba(160, 60, 255, 0.55)",
    blob2: "rgba(80, 40, 240, 0.50)",
    blob3: "rgba(120, 20, 180, 0.45)",
    blob4: "rgba(60, 10, 140, 0.40)",
  },
  "warm-intimate": {
    bg: "rgb(12, 6, 2)",
    blob1: "rgba(200, 100, 20, 0.55)",
    blob2: "rgba(180, 60, 10, 0.50)",
    blob3: "rgba(220, 140, 40, 0.45)",
    blob4: "rgba(160, 40, 20, 0.40)",
  },
  "outdoor-fresh": {
    bg: "rgb(2, 12, 8)",
    blob1: "rgba(20, 200, 120, 0.55)",
    blob2: "rgba(10, 160, 100, 0.50)",
    blob3: "rgba(40, 220, 80, 0.45)",
    blob4: "rgba(0, 140, 80, 0.40)",
  },
  "social-warm": {
    bg: "rgb(14, 4, 8)",
    blob1: "rgba(220, 40, 100, 0.55)",
    blob2: "rgba(200, 20, 80, 0.50)",
    blob3: "rgba(240, 80, 120, 0.45)",
    blob4: "rgba(180, 10, 60, 0.40)",
  },
  "default-dark": {
    bg: "rgb(8, 8, 18)",
    blob1: "rgba(140, 60, 255, 0.50)",
    blob2: "rgba(80, 50, 220, 0.45)",
    blob3: "rgba(20, 160, 140, 0.42)",
    blob4: "rgba(180, 30, 100, 0.38)",
  },
};

function applyPalette(name: string) {
  const palette = PALETTES[name] ?? PALETTES["default-dark"];
  const root = document.documentElement;
  root.style.background = palette.bg;

  const b1 = document.querySelector<HTMLElement>(".kairos-blob-1");
  const b2 = document.querySelector<HTMLElement>(".kairos-blob-2");
  const b3 = document.querySelector<HTMLElement>(".kairos-blob-3");
  const b4 = document.querySelector<HTMLElement>(".kairos-blob-4");

  if (b1) b1.style.background = palette.blob1;
  if (b2) b2.style.background = palette.blob2;
  if (b3) b3.style.background = palette.blob3;
  if (b4) b4.style.background = palette.blob4;

  // Nav color: light palette uses dark nav; others use light nav.
  const isLight = name === "light-landing";
  root.style.setProperty("--navText", isLight ? "#1a1a2e" : "rgba(255,255,255,0.88)");
  root.style.setProperty(
    "--navIcon",
    isLight ? "rgba(26,26,46,0.75)" : "rgba(255,255,255,0.75)"
  );
}

function applyOrbPreset() {
  // Match the "floating orb" background: purple/rose on dark navy.
  const root = document.documentElement;
  root.style.background = "rgb(10, 10, 18)"; // #0a0a12

  const purple = "rgba(168, 85, 247, 0.34)"; // #a855f7
  const rose = "rgba(244, 114, 182, 0.30)"; // #f472b6

  const b1 = document.querySelector<HTMLElement>(".kairos-blob-1");
  const b2 = document.querySelector<HTMLElement>(".kairos-blob-2");
  const b3 = document.querySelector<HTMLElement>(".kairos-blob-3");
  const b4 = document.querySelector<HTMLElement>(".kairos-blob-4");

  if (b1) b1.style.background = purple;
  if (b2) b2.style.background = rose;
  if (b3) b3.style.background = "rgba(168, 85, 247, 0.22)";
  if (b4) b4.style.background = "rgba(244, 114, 182, 0.20)";
}

export function setKairosPalette(name: string) {
  sessionStorage.setItem("kairos:palette", name);
  applyPalette(name);
}

export default function KairosChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const orbPages = pathname === "/feed" || pathname === "/quiz";

  const initialPalette = useMemo(() => {
    if (pathname === "/") return "light-landing";
    return "default-dark";
  }, [pathname]);

  useEffect(() => {
    ["1", "2", "3", "4"].forEach((n) => {
      const el = document.querySelector<HTMLElement>(`.kairos-blob-${n}`);
      if (el) {
        el.style.transition = "background 3s ease, opacity 3s ease";
      }
    });
    document.documentElement.style.transition = "background 4s ease";
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.transition = "background-color 1.2s ease, filter 1.2s ease";

    try {
      const stored = sessionStorage.getItem("kairos:palette");
      const name = stored || initialPalette;
      applyPalette(name);
      if (orbPages) applyOrbPreset();
    } catch {
      applyPalette(initialPalette);
      if (orbPages) applyOrbPreset();
    }
  }, [initialPalette, orbPages]);

  useEffect(() => {
    function onPaletteChange(e: Event) {
      const ce = e as CustomEvent<string>;
      const name = ce.detail;
      sessionStorage.setItem("kairos:palette", name);
      applyPalette(name);
      if (orbPages) applyOrbPreset();
    }
    window.addEventListener("kairos-palette-change", onPaletteChange as EventListener);
    return () =>
      window.removeEventListener(
        "kairos-palette-change",
        onPaletteChange as EventListener
      );
  }, [orbPages]);

  useEffect(() => {
    if (!orbPages) return;
    try {
      applyOrbPreset();
    } catch {}
  }, [orbPages]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <div className="kairos-blobs" aria-hidden="true">
        <div className="kairos-blob kairos-blob-1" />
        <div className="kairos-blob kairos-blob-2" />
        <div className="kairos-blob kairos-blob-3" />
        <div className="kairos-blob kairos-blob-4" />
      </div>

      <div className="kairos-content">
        <nav className="kairos-nav">
          <Link href="/" className="kairos-wordmark editorial">
            Kairos
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={["kairos-hamburger", drawerOpen ? "open" : ""].join(" ")}
            aria-label="Open menu"
          >
            <span />
            <span />
            <span />
          </button>
        </nav>

        {children}

        <div
          className={[
            "kairos-drawer-overlay",
            drawerOpen ? "open" : "",
          ].join(" ")}
          onClick={() => setDrawerOpen(false)}
          aria-hidden={!drawerOpen}
        />
        <aside className={["kairos-drawer", drawerOpen ? "open" : ""].join(" ")}>
          <div className="kairos-drawer-head">
            <div className="editorial text-lg font-semibold text-white">Menu</div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="kairos-drawer-close"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <div className="kairos-drawer-links">
            <Link href="/feed" onClick={() => setDrawerOpen(false)}>
              Discover
            </Link>
            <Link href="/passport" onClick={() => setDrawerOpen(false)}>
              Taste Passport
            </Link>
            <Link href="/saved" onClick={() => setDrawerOpen(false)}>
              Saved Events
            </Link>
            <Link href="/settings" onClick={() => setDrawerOpen(false)}>
              Settings
            </Link>
            <Link href="/help" onClick={() => setDrawerOpen(false)}>
              Help
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

