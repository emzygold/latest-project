# Nexorah: George Nnamdi Portfolio

A multi-page, animated portfolio for **George Nnamdi, Bubble.io Developer**.

Built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, **Motion** (Framer Motion) and **Lenis** smooth scrolling.

## Pages

| Route | What's there |
| --- | --- |
| `/` | Hero (rotating headline, parallax portrait, floating chips), tools marquee, about intro, stacked project cards, services, horizontal process, testimonials |
| `/about` | Tilt portrait, story, stats, animated experience timeline, toolkit grid, values |
| `/work` | Filterable project list with a floating hover preview, plus a grid view |
| `/work/[slug]` | Case study for each project: challenge, solution, features, detail shots, outcome, next project |
| `/services` | Service cards, process, FAQ |
| `/contact` | Contact channels, project brief form with chips and validation |
| 404 | Custom not-found page |

## Motion and interaction

- **Preloader** with a counter and cycling words
- **Curtain page transitions** that show the destination page name
- **Custom cursor** that changes to "View", "Drag" and similar labels (desktop only)
- **Buttons:** magnetic pull, a fill that grows from where your mouse entered, letter-by-letter text roll, and an arrow swap
- **Scroll effects:** line and letter reveals, scroll-linked word highlighting, parallax, stacking cards and a pinned horizontal scroll
- **Respects `prefers-reduced-motion`**

## Edit your content

Everything lives in **`src/content/site.ts`**: name, contact links, hero text, projects, services, tools, process, experience, stats, testimonials and FAQ.

Images live in `public/images/`:
- `george-cutout.webp`: hero portrait with the background removed
- `george-portrait.webp`: original purple portrait
- `sixt.webp`, `sensei.webp`, `elysian.webp`: project images

To add a project, drop its image in `public/images/` and add an entry to `projects` in `site.ts`. Its case study page is generated automatically.

### Before going live

1. **Check the experience dates and stats** in `site.ts`.
2. **Set your domain** in `site.url` (used for SEO, the sitemap and social previews).
3. **Contact form:** it sends through [FormSubmit](https://formsubmit.co) to `nexorahbuilds@gmail.com`. The first time someone submits, FormSubmit emails you an activation link, so click it once. If sending ever fails, the form offers an email/WhatsApp fallback.

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static export into the out/ folder
```

## Deploy

The site is a **static export**: `npm run build` creates an `out/` folder with plain HTML, CSS, JS and images. It works on any static host.

**Netlify (drag and drop):** go to [app.netlify.com/drop](https://app.netlify.com/drop) and drop the `out` folder (or unzip `nexorah-site.zip` and drop the folder).

**Netlify (from GitHub):** import the repo. `netlify.toml` already sets the build command and the `out` publish folder.

**Vercel (from GitHub):** go to [vercel.com/new](https://vercel.com/new), import the repo and click Deploy. Vercel detects Next.js automatically.

**Vercel (from the terminal):** run `npx vercel deploy out --prod`.

## Lead Outreach tool

`lead-outreach/` is a separate Node.js app that emails and WhatsApps leads from a CSV and reports the ones that can't be reached on WhatsApp. See [lead-outreach/README.md](lead-outreach/README.md).
