#!/usr/bin/env node
// One-time reminders setup. Run it yourself (it handles secrets locally):
//   node scripts/setup-reminders.mjs <PROJECT_REF> <your-email-for-push-contact>
// Prereq: `npx supabase login` once.
// It: generates VAPID keys + a cron secret → stores them as Supabase function secrets
//     → deploys the send-reminders function → writes supabase/cron.local.sql for you to paste
//     → prints the PUBLIC key for Vercel (VITE_VAPID_PUBLIC_KEY).
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const [ref, contact] = process.argv.slice(2)
if (!ref || !/^[a-z0-9]{10,}$/.test(ref) || !contact || !contact.includes('@')) {
  console.error('Usage: node scripts/setup-reminders.mjs <PROJECT_REF> <email>\n  PROJECT_REF is the id in your Supabase URL: https://<PROJECT_REF>.supabase.co')
  process.exit(1)
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const pub = publicKey.export({ format: 'jwk' })
const priv = privateKey.export({ format: 'jwk' })
const vapidPublic = b64url(Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]))
const vapidPrivate = priv.d
const cronSecret = randomBytes(32).toString('hex')

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const run = (args) => execFileSync(npx, ['--yes', 'supabase', ...args], { stdio: ['ignore', 'inherit', 'inherit'] })

console.log('→ Storing function secrets in Supabase (values are not printed)…')
run(['secrets', 'set', `VAPID_PUBLIC_KEY=${vapidPublic}`, `VAPID_PRIVATE_KEY=${vapidPrivate}`, `VAPID_SUBJECT=mailto:${contact}`, `CRON_SECRET=${cronSecret}`, '--project-ref', ref])

console.log('→ Deploying the send-reminders function…')
run(['functions', 'deploy', 'send-reminders', '--no-verify-jwt', '--project-ref', ref])

const sql = readFileSync(new URL('../supabase/cron.sql', import.meta.url), 'utf8').replaceAll('<CRON_SECRET>', cronSecret).replaceAll('<PROJECT_REF>', ref)
writeFileSync(new URL('../supabase/cron.local.sql', import.meta.url), sql)

console.log(`
✅ Done.

Next:
 1. Open Supabase → SQL Editor, paste the contents of supabase/cron.local.sql and Run.
    (It contains your cron secret — it's git-ignored; delete it after running.)
 2. Add this PUBLIC key to Vercel → Settings → Environment Variables as VITE_VAPID_PUBLIC_KEY,
    and to .env.local for local testing:

    ${vapidPublic}

 3. Redeploy on Vercel.
`)
