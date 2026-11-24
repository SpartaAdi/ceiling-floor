# Ceiling • Floor • Miss

Local-first web app (installable PWA) for the Ceiling / Floor / Miss daily routine system, with life-facet analytics. Desktop layout on the Mac, phone layout on iPhone (sized for iPhone 15 Pro), optional Mac ↔ iPhone sync and twice-daily reminders.

**Sync + reminders setup:** see [SETUP-SYNC.md](SETUP-SYNC.md). Without it, everything works offline on each device.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build (PWA service worker in dist/)
npm run preview   # serve dist/
npm run icons     # regenerate PWA icons in public/
npm test          # unit tests (Vitest) for every algorithm
npm run test:e2e  # end-to-end tests (Playwright, installed Chrome): desktop, iPhone 15 Pro, and two-device sync against a fake Supabase
npm run test:all  # unit tests → type-check + build → end-to-end
```

## Pages
- **Today**: day mode tiles, ✓/✕ per block, Now/Next, habits, time invested, check-in, week priorities, review nudge
- **Dashboard**: life score, 8 life facets, insights, trends, goals, calendar, habit matrix, block report
- **Goals**: weekly / monthly / dated targets per area, measured as hours, sessions, habit days or a manual count
- **Review**: weekly scorecard vs last week, highlights, habits, reflection, and next week's priorities
- **Routine** and **Settings**

## Structure
- `src/types.ts`: data model (`AppData`, `DayLog` with block snapshots, `WeekLog` for 1x/week care)
- `src/data/defaults.ts`: the 4 seeded templates + habits
- `src/services/storageService.ts`: async `StorageAdapter` (localStorage now; swap `storage` for Supabase later), JSON export/import
- `src/store/AppStore.tsx`: all state actions (mode auto-tick, block toggles, habits, CRUD)
- `src/lib/stats.ts`: weekly budget, health badge, forecast, streaks, block report, habit matrix
- `src/lib/facets.ts`: life facets (Deep Work, Fitness, Mindfulness, Reading, Family, Health & Care, Nutrition, Sleep) and weekly targets
- `src/lib/insights.ts`: facet hours/scores, period-over-period change, weekly trends, rule-based insights
- `src/lib/goals.ts` / `src/lib/review.ts`: goal measurement + pace, weekly review summary + due nudge
- `src/lib/dayLogic.ts`: pure day-mode rules (auto-tick, catch-up preservation, reset)
- `src/sync/`: merge rules (`merge.ts`), sync loop (`engine.ts`, `SyncProvider.tsx`), Supabase adapter (`supabase.ts`)
- `supabase/`: database schema, reminder cron, and the `send-reminders` Edge Function
- `public/push-sw.js`: notification handlers added to the service worker
- `src/lib/__tests__/`, `e2e/`: unit and end-to-end tests
- `src/screens/*`: Day view, Dashboard (lazy-loaded), Routine, Settings

## Keyboard shortcuts
`C` / `F` / `M` set the day mode • `←` / `→` previous/next day • `T` today • `1`–`6` switch pages • `?` help

## Deploy
Pushing to `main` redeploys on Vercel. In Chrome on the Mac, click the install icon in the address bar to use it as a desktop app.

## Data note
Logs (including habit/health ticks) live unencrypted in this browser's localStorage, and JSON exports are plain text, so keep backup files somewhere private.
