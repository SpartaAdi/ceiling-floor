#!/usr/bin/env node
// One-time reminders setup. Run it yourself (it handles secrets locally):
//   node scripts/setup-reminders.mjs <PROJECT_REF> <your-email-for-push-contact>
// Prereq: `npx supabase login` once.
// It: generates VAPID keys + a cron secret → stores them as Supabase function secrets
//     → deploys the send-reminders function → writes supabase/cron.local.sql for you to paste
//     → prints the PUBLIC key for Vercel (VITE_VAPID_PUBLIC_KEY).
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
/** Run the Supabase CLI. Never echoes arguments or error text that could contain secrets. */
const run = (label, args) => {
  try {
    execFileSync(npx, ['--yes', 'supabase', ...args], { stdio: ['ignore', 'inherit', 'inherit'] })
    return true
  } catch {
    console.error(`\n✖ ${label} failed (see the Supabase message above). No secrets were printed.`)
    return false
  }
}

// Secrets go through a private temp file (mode 600), never the command line
const dir = mkdtempSync(join(tmpdir(), 'cfm-secrets-'))
const envFile = join(dir, 'secrets.env')
writeFileSync(envFile, `VAPID_PUBLIC_KEY=${vapidPublic}\nVAPID_PRIVATE_KEY=${vapidPrivate}\nVAPID_SUBJECT=mailto:${contact}\nCRON_SECRET=${cronSecret}\n`, { mode: 0o600 })

console.log('→ Storing function secrets in Supabase (values are not printed)…')
const stored = run('Storing secrets', ['secrets', 'set', '--env-file', envFile, `--remote=${ref}`, '--yes'])
rmSync(dir, { recursive: true, force: true })
if (!stored) process.exit(1)

console.log('→ Deploying the send-reminders function…')
const deployed =
  run('Deploy (server-side bundling)', ['functions', 'deploy', 'send-reminders', '--no-verify-jwt', '--use-api', `--remote=${ref}`, '--yes']) ||
  run('Deploy', ['functions', 'deploy', 'send-reminders', '--no-verify-jwt', `--remote=${ref}`, '--yes'])
if (!deployed) process.exit(1)

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
