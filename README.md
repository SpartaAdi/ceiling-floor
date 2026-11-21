# Ceiling • Floor • Miss

Desktop-first, local-first web app (installable PWA) for the Ceiling / Floor / Miss daily routine system, with life-facet analytics.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build (PWA service worker in dist/)
npm run preview   # serve dist/
npm run icons     # regenerate PWA icons in public/
```

## Structure
- `src/types.ts`: data model (`AppData`, `DayLog` with block snapshots, `WeekLog` for 1x/week care)
- `src/data/defaults.ts`: the 4 seeded templates + habits
- `src/services/storageService.ts`: async `StorageAdapter` (localStorage now; swap `storage` for Supabase later), JSON export/import
- `src/store/AppStore.tsx`: all state actions (mode auto-tick, block toggles, habits, CRUD)
- `src/lib/stats.ts`: weekly budget, health badge, forecast, streaks, block report, habit matrix
- `src/lib/facets.ts`: life facets (Deep Work, Fitness, Mindfulness, Reading, Family, Health & Care, Nutrition, Sleep) and weekly targets
- `src/lib/insights.ts`: facet hours/scores, period-over-period change, weekly trends, rule-based insights
- `src/screens/*`: Day view, Dashboard (lazy-loaded), Routine, Settings

## Keyboard shortcuts
`C` / `F` / `M` set the day mode • `←` / `→` previous/next day • `T` today • `1`–`4` switch pages • `?` help

## Deploy
Pushing to `main` redeploys on Vercel. In Chrome on the Mac, click the install icon in the address bar to use it as a desktop app.

## Data note
Logs (including habit/health ticks) live unencrypted in this browser's localStorage, and JSON exports are plain text, so keep backup files somewhere private.
