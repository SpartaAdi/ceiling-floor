# Sync your Mac + iPhone, and turn on daily reminders

Until you finish these steps the app keeps working exactly as before, and your data stays on each device.
About 20 minutes, once.

> **Privacy:** after setup, your routine data (including habit ticks and check-in reflections) is stored in
> *your own* Supabase project: encrypted at rest, region of your choice, and locked by row-level security so
> only your login can read it. Notification text is kept generic because it shows on your lock screen.

---

## 1. Create your Supabase project (5 min)
1. Go to **supabase.com** → sign up (free) → **New project**.
2. Name: `ceiling-floor` • Region: **South Asia (Mumbai)** • set a database password (keep it in your password manager).
3. When it's ready: **SQL Editor** → **New query** → paste everything from [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
4. **Authentication → Sign In / Providers → Email**: keep it enabled.
   *Optional:* turn off **Confirm email** so you can sign in straight away.

## 2. Connect the app (5 min)
1. Supabase → **Project Settings → API**: you need the **Project URL** and the **anon / publishable key**.
   These are public by design (the database rules protect your data); the **service_role** key is secret: never put it in the app.
2. **Vercel** → your project → **Settings → Environment Variables** → add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon key
3. **Deployments → ⋯ → Redeploy**.
4. On your Mac, open the app → **Settings → Sync & Reminders** → **Create account** (email + a password you choose).
   Your existing history uploads automatically.

## 3. Install on iPhone + sign in (3 min)
1. On the iPhone, open your app link in **Safari** → **Share** → **Add to Home Screen** → open it **from the Home Screen icon**.
2. **Menu (☰) → Settings → Sync & Reminders** → **Sign in** with the same email and password.
   Your Mac data appears within seconds; from now on both devices stay in sync (live, plus on every open).

## 4. Daily reminders at 9:30 AM and 9:00 PM (7 min)
Run these in Terminal on your Mac (they handle the secret keys locally; nothing secret is shown or committed):

```bash
export PATH=~/.local/node/bin:$PATH && cd ~/Desktop/Claude/ceiling-floor
```
```bash
npx supabase login
```
```bash
node scripts/setup-reminders.mjs YOUR_PROJECT_REF you@example.com
```
`YOUR_PROJECT_REF` is the id in your Supabase URL (`https://YOUR_PROJECT_REF.supabase.co`).

Then:
1. Supabase → **Integrations** → enable **Cron** and **pg_net**.
2. **SQL Editor** → paste `supabase/cron.local.sql` (created by the script) → **Run** → delete that file.
3. Vercel → add `VITE_VAPID_PUBLIC_KEY` (printed by the script) → **Redeploy**.
4. On the **iPhone Home Screen app**: **Settings → Sync & Reminders → Turn on reminders for this device** → **Allow** → **Send test**.
   Do the same on the Mac in Chrome if you want reminders there too.

You'll get **two notifications a day** (not per task): morning ("Pick today's mode • Tick your morning blocks")
and evening ("Update what you did today"). Change the times anytime in Settings; they follow your phone's time zone.

---

### Troubleshooting
- **"Add to Home Screen first"** on iPhone: reminders only work in the Home Screen app (iOS 16.4+), not a Safari tab.
- **No test notification:** iPhone **Settings → Notifications → Ceiling • Floor** → Allow; also check Focus mode.
- **Sync error:** confirm both `VITE_SUPABASE_*` variables are set on Vercel and you redeployed; check that you ran `schema.sql`.
