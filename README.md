# irfanlone.com

Personal site for Muhammad Irfan Lone: the portfolio home page plus nine live demos and their launch videos.

- **Home page:** Vite, React 19, TypeScript, Tailwind CSS 4 and Motion. Self-hosted Archivo variable font, so it makes no Google requests.
- **Demos:** static folders in `public/`. Each one is served as-is at `/<name>/`, for example `/starry-post/`.

## Run it locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-checks, then writes dist/
npm run preview   # serves dist/ the way the host will
```

Node 20 or newer.

## Deploy (Hostinger, from GitHub)

1. Push this folder to a GitHub repository.
2. Hostinger is connected to this repository and deploys `main` automatically. Build `npm run build`, output `dist`.
3. Use these build settings:
   - Framework preset: **Vite** (or None)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22`
4. Name the project `irfanlone` to get **https://irfanlone.com**. That address is printed on the résumé and set in `index.html` (`canonical`, `og:url`, `og:image`). If you use another name, update those three tags.

Every push to the main branch redeploys. Pull requests get preview URLs.

`public/_headers` sets security headers and long caching for videos and hashed assets. `public/.htaccess` is what Hostinger reads; `public/_headers` is the Cloudflare equivalent, kept in step but inert here.

## Where things live

| Path | What it is |
|---|---|
| `src/data/site.ts` | **All the copy:** projects, roles, principles, stack, links. Edit here first. |
| `src/components/ReelName.tsx` | The slot-reel name in the hero. Plays on load; hovering a letter spins it again. |
| `src/components/Island.tsx` | The status pill at the top. It opens with contact options and shows "Email copied". |
| `src/components/Work.tsx` | The filterable project grid. Previews play on hover, or while scrolling on phones. |
| `src/components/ProjectSheet.tsx` | The project dialog. Deep links look like `/#work/starry-post`; ← → switch projects. |
| `src/components/CommandPalette.tsx` | Search, opened with ⌘K, Ctrl K or `/`. |
| `src/components/Sections.tsx` | Experience, principles, stack marquee, contact and footer. |
| `public/<demo>/` | The nine demos. |
| `public/videos/` | Web-size launch videos and posters. |
| `public/resume.pdf` | The résumé linked from the site. |
| `public/og.png` | The share image. |

## Adding a project

1. Add an entry to `PROJECTS` in `src/data/site.ts`.
2. Put its demo in `public/<slug>/`, or point `href` at an external site and set `external: true`.
3. Put the poster (16:9 JPG, about 960 px wide) and an optional MP4 in `public/videos/`.

If the number of projects in a filter changes, add a matching row pattern to `SPANS` in `Work.tsx`. Each row must add up to 12 columns.

## Design notes

- The interface is monochrome (true black or white) so that the only colour on the page comes from the work.
- The site uses one typeface, Archivo. Its width axis does the heavy lifting: 62% for the name, 75% for headings, 100% for reading text.
- Motion is limited to the name reel on load and to responses to what the visitor does. All of it switches off with the "reduce motion" setting.

Inspired by the feel of skiper-ui.com and cult-ui.com. The components here are written from scratch.
