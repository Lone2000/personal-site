import { MotionConfig } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { AppProvider } from "./lib/app";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Work } from "./components/Work";
import { ProjectSheet } from "./components/ProjectSheet";
import { CommandPalette } from "./components/CommandPalette";
import { Contact, Experience, Footer, Principles, StackMarquee } from "./components/Sections";
import { Console } from "./variants/Console";
import { Ledger } from "./variants/Ledger";
import { Reel } from "./variants/Reel";
import { Switcher } from "./variants/Switcher";
import { DEFAULT_VARIANT, VARIANTS, readVariant, saveVariant, type VariantId } from "./variants/registry";

/** The design in the repo today. */
function CurrentDesign() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Work />
        <Principles />
        <Experience />
        <StackMarquee />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  const [variant, setVariant] = useState<VariantId>(DEFAULT_VARIANT);

  // read on mount rather than in the initialiser so the server-rendered and
  // first client paint agree if this is ever prerendered
  useEffect(() => setVariant(readVariant()), []);

  useEffect(() => {
    const token = VARIANTS.find((v) => v.id === variant)?.token ?? null;
    const root = document.documentElement;
    if (token) root.dataset.variant = token;
    else delete root.dataset.variant;
  }, [variant]);

  const change = useCallback((id: VariantId) => {
    setVariant(id);
    saveVariant(id);
    scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <a
          href="#work"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to the work
        </a>

        {variant === "current" && <CurrentDesign />}
        {variant === "ledger" && <Ledger />}
        {variant === "console" && <Console />}
        {variant === "reel" && <Reel />}

        <ProjectSheet />
        <CommandPalette />
        <Switcher value={variant} onChange={change} />
      </AppProvider>
    </MotionConfig>
  );
}
