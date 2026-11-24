import type { BrowserContext, Route } from '@playwright/test'

/**
 * Minimal in-memory stand-in for the Supabase endpoints the app uses
 * (password auth, the app_state row, push_subscriptions). Shared by every
 * browser context attached to it, so two "devices" talk to one cloud.
 */
export function fakeSupabase() {
  const users = new Map<string, { id: string; email: string; password: string }>()
  const rows = new Map<string, { data: unknown; updated_at: string }>() // user_id → app_state
  const pushes: unknown[] = []
  let writes = 0

  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const session = (u: { id: string; email: string }) => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const user = { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString() }
    return {
      access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp })}.sig`,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: exp,
      refresh_token: `refresh-${u.id}`,
      user,
    }
  }
  const userFromAuth = (h?: string) => {
    const token = h?.replace(/^Bearer\s+/i, '') ?? ''
    try {
      const sub = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub
      return [...users.values()].find((u) => u.id === sub) ?? null
    } catch {
      return null
    }
  }
  const reply = (route: Route, status: number, body?: unknown) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
      body: body === undefined ? '' : JSON.stringify(body),
    })

  async function handle(route: Route) {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    if (method === 'OPTIONS') return reply(route, 200)
    const body = req.postData() ? JSON.parse(req.postData()!) : {}

    // ---- auth
    if (url.pathname === '/auth/v1/signup') {
      if ([...users.values()].some((u) => u.email === body.email)) return reply(route, 422, { code: 'user_already_exists', msg: 'User already registered' })
      const u = { id: crypto.randomUUID(), email: body.email, password: body.password }
      users.set(u.id, u)
      return reply(route, 200, session(u))
    }
    if (url.pathname === '/auth/v1/token') {
      const u = [...users.values()].find((x) => x.email === body.email && x.password === body.password)
      if (!u) return reply(route, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' })
      return reply(route, 200, session(u))
    }
    if (url.pathname === '/auth/v1/user') {
      const u = userFromAuth(req.headers()['authorization'])
      return u ? reply(route, 200, session(u).user) : reply(route, 401, { msg: 'invalid token' })
    }
    if (url.pathname === '/auth/v1/logout') return reply(route, 204)

    // ---- data (row-level security: only the caller's own row)
    const u = userFromAuth(req.headers()['authorization'])
    if (url.pathname === '/rest/v1/app_state') {
      if (!u) return reply(route, 401, { message: 'JWT required' })
      if (method === 'GET') {
        const row = rows.get(u.id)
        return reply(route, 200, row ? [{ data: row.data }] : [])
      }
      if (method === 'POST') {
        const rec = Array.isArray(body) ? body[0] : body
        if (rec.user_id !== u.id) return reply(route, 403, { message: 'row-level security' })
        rows.set(u.id, { data: rec.data, updated_at: rec.updated_at })
        writes++
        return reply(route, 201)
      }
    }
    if (url.pathname === '/rest/v1/push_subscriptions') {
      if (!u) return reply(route, 401, { message: 'JWT required' })
      if (method === 'POST') pushes.push(body)
      return reply(route, method === 'POST' ? 201 : 204)
    }
    return reply(route, 404, { message: `fake supabase: no route for ${method} ${url.pathname}` })
  }

  return {
    async attach(ctx: BrowserContext) {
      await ctx.route('http://sync.test/**', handle)
      // Realtime socket: accept silently (devices also sync on open, resume, poll and edits)
      await ctx.routeWebSocket(/sync\.test\/realtime/, () => {})
    },
    row: (email: string) => {
      const u = [...users.values()].find((x) => x.email === email)
      return (u ? rows.get(u.id)?.data : undefined) as { days: Record<string, { mode?: string; statuses: Record<string, string>; blocks: { id: string; title: string }[] }>; settings: { theme: string } } | undefined
    },
    get writes() {
      return writes
    },
    pushes,
  }
}
