import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EMAIL, PROJECTS } from "../data/site";

type Theme = "dark" | "light";

interface AppState {
  theme: Theme;
  toggleTheme: () => void;
  /** a short message the island shows for a moment */
  notice: string | null;
  notify: (msg: string) => void;
  copyEmail: () => void;
  openSlug: string | null;
  openProject: (slug: string | null) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage off */ } };

function slugFromHash(): string | null {
  const m = /^#work\/([a-z0-9-]+)$/.exec(location.hash);
  return m && PROJECTS.some((p) => p.slug === m[1]) ? m[1] : null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = read("il.theme");
    if (saved === "light" || saved === "dark") return saved;
    return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#000000" : "#ffffff");
  }, [theme]);
  const toggleTheme = useCallback(() => {
    setTheme((t) => { const n = t === "dark" ? "light" : "dark"; write("il.theme", n); return n; });
  }, []);

  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const notify = useCallback((msg: string) => {
    setNotice(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 2200);
  }, []);

  const copyEmail = useCallback(() => {
    const done = () => notify("Email copied");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(EMAIL).then(done, () => { location.href = `mailto:${EMAIL}`; });
    } else {
      location.href = `mailto:${EMAIL}`;
    }
  }, [notify]);

  const [openSlug, setOpenSlug] = useState<string | null>(() => slugFromHash());
  const openProject = useCallback((slug: string | null) => {
    setOpenSlug(slug);
    const url = slug ? `#work/${slug}` : location.pathname + location.search;
    history.replaceState(null, "", url);
  }, []);
  useEffect(() => {
    const on = () => setOpenSlug(slugFromHash());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);

  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setPaletteOpen((o) => !o); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setPaletteOpen(true); }
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, []);

  const value = useMemo(() => ({
    theme, toggleTheme, notice, notify, copyEmail, openSlug, openProject, paletteOpen, setPaletteOpen,
  }), [theme, toggleTheme, notice, notify, copyEmail, openSlug, openProject, paletteOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
