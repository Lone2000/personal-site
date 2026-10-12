# irfanlone-site

The personal site for Muhammad Irfan Lone, deployed to Hostinger at https://irfanlone.com, auto-deploying from `main`. See `README.md` for setup and deploy steps. If this repo sits inside the bundle, the parent folder's `CLAUDE.md` has the full background.

## Commands

```bash
npm install
npm run dev        # Vite dev server
npm run build      # tsc -b then vite build → dist/
npm run preview    # serve dist/ like production
```

Run `npm run build` before you say a change is done. It type-checks and fails on unused locals.

## Stack

- Vite 8, React 19, TypeScript ~6, Tailwind CSS 4 (via `@tailwindcss/vite`, configured in CSS, no config file), Motion 14 (`motion/react`).
- Font: the self-hosted Archivo variable font (`@fontsource-variable/archivo`, weight 100–900 and width 62–125%). Don't add Google Fonts.

## Layout

| File | What it is |
|---|---|
| `src/data/site.ts` | All copy: `PROJECTS`, `ROLES`, `PRINCIPLES`, `STACK`, `EDUCATION`, `LINKS`, `EMAIL`, `NAME`, `ROLE_LINE`, `LOCATION`, `PROFILE`. Change content here, not in the components. Projects are authored in `ALL`, then exported as `PROJECTS` **automation first**: the strip, the numbered index and the sheet's previous/next all read that one order, so numbering stays consistent. Reorder there, never in a component. |
| `tools/og-source.html`, `tools/render-og.mjs` | How `public/og.png` is made. Run the dev server, then `node tools/render-og.mjs`. It stages the source into `public/`, shoots 1200×630, refuses to render if Archivo fell back to a system font, and cleans up. playwright-core is deliberately not a dependency (the host installs on every deploy) — pass `PLAYWRIGHT_CORE=<path>`. Re-render whenever the domain, the headline or the three posters change. |
| `src/variants/` | Design variants (Ledger, Console, Reel) plus the review-only `Switcher`. Each only re-points the CSS tokens in `index.css`; all of them read `site.ts`. `registry.ts` sets `DEFAULT_VARIANT`, currently **`ledger`** — the chosen direction. Delete the other two once that is final. |
| `src/variants/Ledger.tsx` | `Strip` is the drag rail under the hero: the centred frame plays its launch film, so the work moves before anyone clicks. `RowMedia` is the Demo / Launch film toggle inside an opened row. Keep the hero short enough that the strip stays near the fold. |
| `src/lib/app.tsx` | App context: theme (stored in localStorage `il.theme`, set before paint by an inline script in `index.html`), island notices, `copyEmail`, the open project (hash `#work/<slug>`), and command-palette state with ⌘K, Ctrl K and `/` shortcuts. |
| `src/components/ReelName.tsx` | The hero name as slot-machine reels. Spins once on load; hovering a letter spins it again. |
| `src/components/Island.tsx` | The status pill. Opens on hover or focus, and shows "Email copied". |
| `src/components/Nav.tsx` | Fixed header with a gradient fade. The header ignores pointer events and its children accept them. Also holds `Monogram`. |
| `src/components/Hero.tsx` | The hero, plus `EmailCommand`, the copy button styled like a shell command. |
| `src/components/Work.tsx` | Filter tabs and a 12-column bento grid. `SPANS` maps item count to column spans, and each row must sum to 12. Video previews play on mouse hover, or with IntersectionObserver on touch devices. |
| `src/components/ProjectSheet.tsx` | Project dialog: video with sound, "Try this", "What's real", the stack, demo and source links. Supports ←/→ and Esc and traps focus. `SheetMedia` shows a **Walkthrough / Launch film** toggle when the project has both, walkthrough first. Opened by a click it autoplays with sound (the click is the gesture the browser needs); reached by a deep link like `#work/grind-bot` it correctly shows the poster and a play button instead. |
| `src/components/CommandPalette.tsx` | Search across projects, demos and actions. |
| `src/components/Sections.tsx` | Principles, Experience, the stack marquee, Contact and Footer. |
| `public/<slug>/` | The nine static demos, served as-is. Don't run them through Vite. |
| `public/videos/` | Web-size MP4s and posters. `<slug>.mp4` is the art-directed launch film; `<slug>-demo.mp4` is a plain walkthrough of the real thing. A project declares the second one with `demoVideo` / `demoPoster`, and Ledger then shows a Demo / Launch film toggle, walkthrough first. Only Grind Bot, PCI DSS and BrandVoice have both so far. |
| `public/resume.pdf`, `public/og.png`, `public/favicon.svg`, `public/_headers` | Résumé, social preview image, favicon. `_headers` is Cloudflare-only and inert on Hostinger; `public/.htaccess` is the live one. |

## Design rules (keep them)

- **Monochrome UI.** Use true black and white through the CSS variables in `src/index.css` (`--bg`, `--fg`, `--muted`, `--faint`, `--line`…). Tailwind exposes them as `bg-bg`, `text-fg`, `text-muted`, `border-line`. The only colour on the page comes from the project media, plus the green "open to work" dot.
- **One family: Archivo.** Personality comes from the width axis: 62% for the display name, about 72–75% for headings, 85% for card titles, 100% for body. Body text is 17px.
- **Motion.** One orchestrated moment, the name reel. Everything else moves only in response to the user (hover, open, filter). `MotionConfig reducedMotion="user"` is set; keep anything new compatible with reduced motion.
- **Copy.**
  - Sentence case, plain verbs.
  - No arrows on buttons.
  - No all-caps eyebrow labels.
  - No dot-joined meta strings.
  - Buttons say exactly what happens: "Open the demo", "Copy email".
- **Layering.** Custom CSS goes in `@layer base` or `@layer components`. Unlayered CSS beats Tailwind utilities.
- Works at 375px with no horizontal scroll and visible focus outlines.

## Privacy

The demos use invented data only. Never add real names of other people, employer internals, tokens or private files. See the parent `CLAUDE.md` for the full list.

## Open items

- ~~Deploy and confirm the project name.~~ Live at https://irfanlone.com on Hostinger, auto-deploying from `main`. If the domain ever changes, update four things: `index.html` (canonical, og:url, og:image), `tools/og-source.html` then re-render `og.png`, both résumés via `build_resume.py --base`, and `application/tekavra-dm.md`.
- ~~Check the hover video previews.~~ Fixed and verified: `play()` was called in the same tick that mounted the `<video>`, so `vid.current` was null and the empty `.catch` hid it. Playwright's Chromium does decode H.264; only its bundled ffmpeg does not.
- Decide whether the Feels Like Today "Longing" room stays public. It has personal lines.
