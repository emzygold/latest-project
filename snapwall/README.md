# Snapwall

A disposable-camera app for events, built for **event planners**.

- **Planners** create an event, set how many shots each guest gets and when the photos are revealed, then share a QR code / 6-letter code.
- **Guests** join with the code (no account needed), shoot a limited roll, and can't see any photos until the reveal.
- At the reveal the camera closes and everyone sees **the wall**: every guest's shots in one gallery they can save.
- Planners see shots live as they come in and can hide or delete any photo before guests see it.

Built with Expo (React Native, SDK 57) and Supabase (database, auth, file storage).

## 1. Set up Supabase (about 10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. **Authentication → Sign In / Providers**:
   - turn on **Anonymous sign-ins** (that's how guests join without an account)
   - keep **Email** on (planners sign in with email + password)
4. **Project Settings → API**: copy the Project URL and the `anon` public key.

## 2. Run the app

```bash
cd snapwall
cp .env.example .env      # paste your Supabase URL and anon key
npm install
npx expo start
```

Scan the QR code in the terminal with the **Expo Go** app on your phone. If a native module is missing in Expo Go, make a development build instead: `npx eas-cli@latest build --profile development --platform android`.

## 3. Ship to the Play Store / App Store

```bash
npx eas-cli@latest build --platform android   # .aab for Google Play
npx eas-cli@latest build --platform ios       # needs an Apple Developer account
```

Change `com.snapwall.app` in `app.json` to an ID you own before your first store upload. It can't be changed later.

## Plans and pricing

Guest limits are enforced by the database (`apply_plan_limits` in the schema), so nobody can raise their own limit from the app:

| Plan   | Guests per event |
| ------ | ---------------- |
| free   | 25               |
| pro    | 250              |
| studio | 1000             |

To upgrade a planner by hand for now: `update planners set plan = 'pro' where user_id = '...';` in the SQL editor.
Payments aren't wired up yet (see "Next steps").

## Project layout

```
src/app/                 screens (Expo Router: each file is a route)
  index.tsx              welcome: join an event / planner sign-in
  sign-in.tsx            planner email + password
  planner/index.tsx      planner dashboard (all events)
  planner/new.tsx        create an event
  planner/[id].tsx       event: QR code, stats, reveal now, moderate photos
  join/index.tsx         scan QR or type a code
  join/[code].tsx        guest enters their name (deep link: snapwall://join/CODE)
  event/[id]/camera.tsx  the disposable camera
  event/[id]/wall.tsx    the revealed gallery
src/components/          shared UI
src/lib/                 Supabase client, API calls, theme, helpers
supabase/schema.sql      tables, security rules, shot-limit logic, storage
supabase/tests/          database security tests
tests/                   unit tests
```

## Checks

```bash
npm run typecheck
npm test
# database rules (needs a throwaway Postgres with supabase/tests/mock_supabase.sql + supabase/schema.sql loaded)
DATABASE_URL=postgres://... supabase/tests/rls_test.sh
```

## Next steps

- **Logo**: replace the files in `assets/` (`icon.png` 1024×1024, `android-icon-foreground.png`, `splash-icon.png`) and swap the text wordmark in `src/components/ui.tsx`.
- **Payments**: Google Play and the App Store require their own billing for in-app digital upgrades. RevenueCat is the easiest way to do both, and its webhook can update `planners.plan`.
- **Web join page**: a small site at your domain (e.g. `snapwall.app/join/CODE`) so invite links open the app or the store, instead of guests typing the code.
- **Push notification at reveal time** so guests come back to the wall.
- **Download all photos as a zip** for planners to deliver to clients.
