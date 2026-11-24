import { describe, expect, it } from 'vitest'
import type { AppData } from '../../types'
import { mergeData, sameSynced, stampChanges } from '../../sync/merge'
import { syncOnce, type RemoteStore } from '../../sync/engine'
import { applyDayMode, setDayPlan } from '../dayLogic'
import { withDemoData, withoutDemoData } from '../demo'
import { MON, TUE, WED, fresh } from './helpers'

/** A device = local data + a commit() that stamps changes like the app store does. */
function device(start: AppData = fresh()) {
  let data = start
  let clock = 1_000
  return {
    get data() {
      return data
    },
    edit(fn: (d: AppData) => void, at = (clock += 10)) {
      const next = structuredClone(data)
      fn(next)
      data = stampChanges(data, next, at)
    },
    replace(make: (d: AppData) => AppData, at = (clock += 10)) {
      data = stampChanges(data, make(data), at)
    },
    apply(incoming: AppData) {
      data = mergeData(data, incoming)
    },
  }
}

/** In-memory cloud copy (stands in for Supabase). */
function cloud() {
  let stored: unknown = null
  let pushes = 0
  const remote: RemoteStore = {
    pull: async () => (stored ? structuredClone(stored) : null),
    push: async (d) => {
      stored = structuredClone(d)
      pushes++
    },
  }
  return { remote, get pushes() { return pushes }, get stored() { return stored as AppData | null } }
}

async function sync(dev: ReturnType<typeof device>, c: ReturnType<typeof cloud>) {
  const r = await syncOnce(dev.data, c.remote)
  if (r.changedLocal) dev.apply(r.merged)
  return r
}

describe('stampChanges', () => {
  it('stamps changed days, sections and tombstones deletions', () => {
    const a = fresh()
    const b = structuredClone(a)
    applyDayMode(b, MON, 'ceiling')
    b.settings.targets.ceiling = 4
    b.settings.theme = 'dark' // per-device: not a synced change
    const s = stampChanges(a, b, 500)
    expect(s.days[MON].updatedAt).toBe(500)
    expect(s.meta?.sections.settings).toBe(500)
    expect(s.meta?.sections.templates).toBeUndefined()

    const c = structuredClone(s)
    delete c.days[MON]
    expect(stampChanges(s, c, 600).meta?.tombstones[`day:${MON}`]).toBe(600)
  })
  it('a theme-only change is not a synced change', () => {
    const a = fresh()
    const b = structuredClone(a)
    b.settings.theme = 'dark'
    expect(stampChanges(a, b, 1).meta?.sections.settings).toBeUndefined()
  })
})

describe('mergeData', () => {
  it('keeps edits to different days from both devices', () => {
    const mac = device()
    const phone = device()
    mac.edit((d) => applyDayMode(d, MON, 'ceiling'))
    phone.edit((d) => applyDayMode(d, TUE, 'floor'))
    const m = mergeData(mac.data, phone.data)
    expect(m.days[MON].mode).toBe('ceiling')
    expect(m.days[TUE].mode).toBe('floor')
  })
  it('newest edit of the same day wins', () => {
    const mac = device()
    const phone = device()
    mac.edit((d) => applyDayMode(d, MON, 'ceiling'), 100)
    phone.edit((d) => applyDayMode(d, MON, 'miss'), 200)
    expect(mergeData(mac.data, phone.data).days[MON].mode).toBe('miss')
    expect(mergeData(phone.data, mac.data).days[MON].mode).toBe('miss')
  })
  it('deletions stick unless the day was edited again later', () => {
    const mac = device()
    mac.edit((d) => applyDayMode(d, MON, 'ceiling'), 100)
    const phone = device(structuredClone(mac.data))
    mac.edit((d) => delete d.days[MON], 200)
    expect(mergeData(phone.data, mac.data).days[MON]).toBeUndefined()
    phone.edit((d) => applyDayMode(d, MON, 'floor'), 300) // edited after the delete
    expect(mergeData(phone.data, mac.data).days[MON].mode).toBe('floor')
  })
  it('whole sections follow the newest change; theme stays per device', () => {
    const mac = device()
    const phone = device()
    mac.edit((d) => (d.settings.theme = 'dark'), 50)
    phone.edit((d) => (d.settings.targets.floor = 3), 100)
    mac.edit((d) => (d.templates['weekday-ceiling'][0].title = 'Wake & Water'), 150)
    const onMac = mergeData(mac.data, phone.data)
    expect(onMac.settings.targets.floor).toBe(3)
    expect(onMac.settings.theme).toBe('dark')
    expect(onMac.templates['weekday-ceiling'][0].title).toBe('Wake & Water')
    expect(mergeData(phone.data, mac.data).settings.theme).toBe('system')
  })
  it('is idempotent and order-independent for synced content', () => {
    const mac = device()
    const phone = device()
    mac.edit((d) => applyDayMode(d, MON, 'ceiling'), 100)
    phone.edit((d) => setDayPlan(d, WED, 'floor'), 110)
    const ab = mergeData(mac.data, phone.data)
    expect(sameSynced(mergeData(ab, phone.data), ab)).toBe(true)
    expect(sameSynced(ab, mergeData(phone.data, mac.data))).toBe(true)
  })
  it('removing demo data on one device removes it everywhere', () => {
    const mac = device()
    mac.replace((d) => withDemoData(d, '2026-11-21'), 100)
    const phone = device(mergeData(fresh(), mac.data))
    expect(Object.keys(phone.data.days).length).toBe(42)
    mac.replace((d) => withoutDemoData(d), 200)
    phone.apply(mac.data)
    expect(Object.keys(phone.data.days)).toHaveLength(0)
    expect(phone.data.goals).toHaveLength(0)
  })
})

describe('syncOnce with a shared cloud copy', () => {
  it('first device seeds the cloud; second device receives everything', async () => {
    const c = cloud()
    const mac = device()
    mac.edit((d) => applyDayMode(d, MON, 'ceiling'))
    const r1 = await sync(mac, c)
    expect(r1.pushed).toBe(true)

    const phone = device()
    const r2 = await sync(phone, c)
    expect(r2.changedLocal).toBe(true)
    expect(phone.data.days[MON].mode).toBe('ceiling')
  })
  it('concurrent edits on both devices converge, and idle syncs push nothing', async () => {
    const c = cloud()
    const mac = device()
    const phone = device()
    await sync(mac, c)
    await sync(phone, c)
    mac.edit((d) => applyDayMode(d, MON, 'ceiling'))
    phone.edit((d) => applyDayMode(d, TUE, 'floor'))
    await sync(mac, c)
    await sync(phone, c)
    await sync(mac, c)
    expect(mac.data.days[TUE].mode).toBe('floor')
    expect(phone.data.days[MON].mode).toBe('ceiling')
    expect(sameSynced(mac.data, phone.data)).toBe(true)
    const before = c.pushes
    await sync(mac, c)
    await sync(phone, c)
    expect(c.pushes).toBe(before) // nothing new → no writes
  })
  it('a phone with only defaults never overwrites real history', async () => {
    const c = cloud()
    const mac = device()
    mac.replace((d) => withDemoData(d, '2026-11-21'))
    mac.edit((d) => (d.settings.targets.ceiling = 4))
    await sync(mac, c)
    const phone = device()
    phone.edit((d) => (d.settings.theme = 'dark')) // only a per-device tweak
    await sync(phone, c)
    expect(Object.keys(phone.data.days)).toHaveLength(42)
    expect(phone.data.settings.targets.ceiling).toBe(4)
    expect(phone.data.settings.theme).toBe('dark')
    expect(c.stored!.goals).toHaveLength(5)
  })
})
