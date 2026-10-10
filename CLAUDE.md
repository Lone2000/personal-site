# irfanlone-site

The personal site for Muhammad Irfan Lone, deployed to Cloudflare Pages at https://irfanlone.pages.dev. See `README.md` for setup and deploy steps. If this repo sits inside the bundle, the parent folder's `CLAUDE.md` has the full background.

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
| `src/data/site.ts` | All copy: `PROJECTS`, `ROLES`, `PRINCIPLES`, `STACK`, `EDUCATION`, `LINKS`, `EMAIL`. Change content here, not in the components. |
| `src/lib/app.tsx` | App context: theme (stored in localStorage `il.theme`, set before paint by an inline script in `index.html`), island notices, `copyEmail`, the open project (hash `#work/<slug>`), and command-palette state with ⌘K, Ctrl K and `/` shortcuts. |
| `src/components/ReelName.tsx` | The hero name as slot-machine reels. Spins once on load; hovering a letter spins it again. |
| `src/components/Island.tsx` | The status pill. Opens on hover or focus, and shows "Email copied". |
| `src/components/Nav.tsx` | Fixed header with a gradient fade. The header ignores pointer events and its children accept them. Also holds `Monogram`. |
| `src/components/Hero.tsx` | The hero, plus `EmailCommand`, the copy button styled like a shell command. |
| `src/components/Work.tsx` | Filter tabs and a 12-column bento grid. `SPANS` maps item count to column spans, and each row must sum to 12. Video previews play on mouse hover, or with IntersectionObserver on touch devices. |
| `src/components/ProjectSheet.tsx` | Project dialog: video with sound, "Try this", "What's real", the stack, demo and source links. Supports ←/→ and Esc and traps focus. |
| `src/components/CommandPalette.tsx` | Search across projects, demos and actions. |
| `src/components/Sections.tsx` | Principles, Experience, the stack marquee, Contact and Footer. |
| `public/<slug>/` | The nine static demos, served as-is. Don't run them through Vite. |
| `public/videos/` | Web-size MP4s and posters. |
| `public/resume.pdf`, `public/og.png`, `public/favicon.svg`, `public/_headers` | Résumé, social preview image, favicon and Cloudflare headers. |

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

- Deploy and confirm the `irfanlone` project name. If it changes, update canonical, og:url and og:image in `index.html`, and the résumé.
- Check the hover video previews in a real browser. Headless Chromium can't play H.264.
- Decide whether the Feels Like Today "Longing" room stays public. It has personal lines.
