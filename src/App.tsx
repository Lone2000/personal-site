import { MotionConfig } from "motion/react";
import { AppProvider } from "./lib/app";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Work } from "./components/Work";
import { ProjectSheet } from "./components/ProjectSheet";
import { CommandPalette } from "./components/CommandPalette";
import { Contact, Experience, Footer, Principles, StackMarquee } from "./components/Sections";

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <a href="#work" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg">
          Skip to the work
        </a>
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
        <ProjectSheet />
        <CommandPalette />
      </AppProvider>
    </MotionConfig>
  );
}
