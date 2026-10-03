# FlashBack 📸

A digital disposable camera for weddings and events. Guests scan a QR code, a retro camera opens in the browser (no app download), each guest gets a limited roll of film, and every photo lands in one shared album at the reveal time.

Built with React + Vite + TypeScript + Tailwind CSS, with Supabase as the backend.

## Features

- **Host:** create an event, pick shots per guest, reveal time and film style, then get a QR code and printable A6 table cards (4 per A4 sheet).
- **Guest camera:** live viewfinder, flash (torch on the back camera, white screen on the front), lens switch, shutter sound and haptics, and a film counter. There are **no previews**, just like real film.
- **Film effects:** Classic 35mm, Golden Hour or Black & White, with grain, vignette, light leaks and an optional orange `'26 10 03` date stamp.
- **Works on bad networks:** photos are saved on the phone first and upload in the background, with automatic retries.
- **Shot limit enforced on the server:** guests can't cheat by clearing their browser or editing the app.
- **The reveal:** guests see a "darkroom" countdown until the photos develop, then a masonry gallery with per-guest filters, a swipeable lightbox and downloads.
- **Host dashboard:** live stats, hide or delete photos, reveal early, and download all photos as a ZIP.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. With no configuration it runs in **demo mode**: everything is saved in your browser only, so you can test the whole flow on one device.

> The camera only works on `https://` or `localhost`. To test on your phone, deploy it (see below), or use a tunnel such as `npx localtunnel --port 5173`.

## Connect Supabase (real shared albums)

1. Create a free project at https://supabase.com.
2. Open **SQL Editor → New query**, paste [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates the tables, the `photos` storage bucket and the security rules.
3. Go to **Project Settings → API** and copy the Project URL and the `anon` public key.
4. Copy `.env.example` to `.env` and fill them in:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

5. Restart `npm run dev`. The demo-mode notice on the home page disappears.

## Deploy (Vercel)

1. Push this repo to GitHub, then import it at https://vercel.com/new.
2. Add the two `VITE_SUPABASE_*` environment variables.
3. Deploy. `vercel.json` already makes links like `/e/ABC123` work.

## How security works

- Hosts don't need an account. Creating an event returns a secret **host key**, and the private host link (`/host/CODE#key=...`) is the login. It's saved in the browser and stripped from the address bar.
- The browser never writes to tables directly. All writes go through Postgres functions (`add_photo`, `host_set_hidden`, …) that check the host key, the shot limit (with a row lock, so double-taps can't sneak through) and the reveal time.
- Guests get no photo data until `reveal_at` has passed.

## Project structure

```
src/
  lib/
    types.ts          Shared types + the Store interface
    store.ts          Picks Supabase or local demo storage
    supabaseStore.ts  Supabase backend
    localStore.ts     IndexedDB demo backend
    film.ts           Capture + film filter + date stamp
    uploadQueue.ts    Offline-safe background uploads
  pages/              Home, CreateEvent, HostDashboard, PrintCards,
                      GuestWelcome, Camera, Album
  components/         Logo, QrCode, Lightbox, Countdown, Spinner
supabase/schema.sql   Database, storage and security functions
```

## Brand palette

All colors are defined once as tokens in `src/index.css` (`bg-primary`, `text-gold`, `bg-night`, …). They come from the event app palette: burgundy `#6F1018`, champagne gold `#C9A24A`, a warm off-white background, and a dark gallery mode for the camera and album.

## Roadmap

- [ ] Payments (Paystack for NGN, Stripe for USD) and plan limits
- [ ] Cover photo for the welcome screen
- [ ] iOS App Clip / Android Instant App for true lock-screen launch
- [ ] Short video clips (Premium)
- [ ] Clean up storage files when a host deletes a photo
