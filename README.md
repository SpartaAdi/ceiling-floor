# Ceiling • Floor • Miss

Mobile-first, local-first PWA for the Ceiling / Floor / Miss daily routine system.

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
- `src/screens/*`: Today, Dashboard (lazy-loaded), Routine, Settings

## Install on phone
Deploy `dist/` to any HTTPS static host, open it in Safari/Chrome, then **Add to Home Screen**.

## Data note
Logs (including habit/health ticks) live unencrypted in this browser's localStorage, and JSON exports are plain text, so keep backup files somewhere private.
