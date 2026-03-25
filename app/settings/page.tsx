"use client";

import { useEffect, useState } from "react";
import { setKairosPalette } from "../components/KairosChrome";

type SettingsState = {
  darkMode: boolean;
  notificationsEnabled: boolean;
  autoplayTrailers: boolean;
  showExperimentalFirst: boolean;
  discoveryNudges: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  darkMode: true,
  notificationsEnabled: false,
  autoplayTrailers: false,
  showExperimentalFirst: false,
  discoveryNudges: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kairos:settings");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      const next = { ...DEFAULT_SETTINGS, ...parsed };
      setSettings(next);
      setKairosPalette(next.darkMode ? "default-dark" : "light-landing");
    } catch {
      setSettings(DEFAULT_SETTINGS);
      setKairosPalette("default-dark");
    }
  }, []);

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem("kairos:settings", JSON.stringify(next));

    if (key === "darkMode") {
      setKairosPalette(value ? "default-dark" : "light-landing");
    }

    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 800);
  }

  return (
    <main className="min-h-dvh">
      <div className="mx-auto w-full max-w-4xl px-5 pb-14 pt-10 sm:px-8">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="editorial text-4xl font-semibold text-white sm:text-5xl">
              Settings
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Lightweight preview controls for how Kairos feels (stored locally in this browser).
            </p>
          </div>
          <div className="text-xs text-white/55">
            {savedFlash ? "Saved" : "Auto-saved"}
          </div>
        </header>

        <section className="space-y-3">
          <article
            className="rounded-2xl px-5 py-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <h2 className="text-base font-semibold text-white">Coming soon</h2>
            <p className="mt-2 text-sm text-white/65">
              Some controls are placeholders while we wire them up. Dark mode preview below is
              functional; notifications and the rest are saved locally for now.
            </p>
          </article>

          {[
            {
              key: "darkMode" as const,
              label: "Dark mode (preview)",
              desc: "Switch between Kairos palettes instantly.",
            },
            {
              key: "notificationsEnabled" as const,
              label: "Notifications",
              desc: "Coming soon. Toggle is stored locally only.",
            },
            {
              key: "autoplayTrailers" as const,
              label: "Autoplay previews (placeholder)",
              desc: "Saved locally for now. We will wire this into feed browsing later.",
            },
            {
              key: "showExperimentalFirst" as const,
              label: "Bias toward experimental picks (placeholder)",
              desc: "Saved locally for now. Coming soon: affect recommendation ordering.",
            },
            {
              key: "discoveryNudges" as const,
              label: "Discovery nudges (placeholder)",
              desc: "Saved locally for now. Coming soon: add subtle stretching prompts.",
            },
          ].map((item) => (
            <article
              key={item.key}
              className="flex items-center justify-between rounded-2xl px-5 py-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div>
                <h2 className="text-base font-semibold text-white">{item.label}</h2>
                <p className="mt-1 text-sm text-white/60">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => update(item.key, !settings[item.key])}
                className="relative h-7 w-12 rounded-full transition"
                style={{
                  background: settings[item.key]
                    ? "rgba(168,85,247,0.55)"
                    : "rgba(255,255,255,0.18)",
                }}
                aria-label={item.label}
              >
                <span
                  className="absolute top-1 h-5 w-5 rounded-full bg-white transition"
                  style={{ left: settings[item.key] ? "24px" : "4px" }}
                />
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

