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

1. **Testimonials are placeholders.** Replace them in `site.ts` with real client reviews (for example, from Upwork).
2. **Check the experience dates and stats** in `site.ts`.
3. **Set your domain** in `site.url` (used for SEO, the sitemap and social previews).
4. **Contact form:** it sends through [FormSubmit](https://formsubmit.co) to `nexorahbuilds@gmail.com`. The first time someone submits, FormSubmit emails you an activation link, so click it once. If sending ever fails, the form offers an email/WhatsApp fallback.

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm start       # serve the production build
```

## Deploy (free) on Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo. No settings are needed.
3. Optional: add your own domain in the Vercel project settings, then update `site.url`.
