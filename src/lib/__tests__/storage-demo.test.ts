import { describe, expect, it } from 'vitest'
import { normalize } from '../../services/storageService'
import { DEMO_DAYS, withDemoData, withoutDemoData } from '../demo'
import { fresh, logDay } from './helpers'
import { addDays, weekStartOf } from '../time'

describe('normalize + migration', () => {
  it('upgrades v1 data: Reading category, habit areas, Eat Right', () => {
    const v1 = {
      version: 1,
      settings: { theme: 'dark', targets: { ceiling: 4 } },
      habits: [
        { id: 'meds', label: 'Meds', kind: 'daily' },
        { id: 'brush', label: 'Brush', kind: 'daily' },
        { id: 'besan', label: 'Besan Scrub', kind: 'weekly' },
      ],
      templates: { 'weekday-ceiling': [{ id: 'r', start: '21:30', end: '22:00', title: 'Reading', details: '', category: 'mind' }] },
      days: { '2026-11-16': { date: '2026-11-16', mode: 'ceiling', blocks: [{ id: 'r', start: '21:30', end: '22:00', title: 'Reading', details: '', category: 'mind' }], statuses: {}, habits: {}, updatedAt: 0 } },
      weeks: {},
    }
    const d = normalize(v1)
    expect(d.version).toBe(2)
    expect(d.templates['weekday-ceiling'][0].category).toBe('learning')
    expect(d.days['2026-11-16'].blocks[0].category).toBe('learning')
    expect(d.habits.map((h) => h.id)).toEqual(['meds', 'brush', 'eatright', 'exercise', 'besan'])
    expect(d.habits[0].facet).toBe('health')
    expect(d.settings.targets).toEqual({ ceiling: 4, floor: 2, miss: 0 })
    expect(d.settings.theme).toBe('dark')
    expect(d.goals).toEqual([])
    expect(d.templates['weekend-floor'].length).toBeGreaterThan(0)
  })
  it('rejects non-objects', () => {
    expect(() => normalize('nope')).toThrow()
    expect(() => normalize([1, 2])).toThrow()
  })
  it('round-trips current data unchanged', () => {
    const d = fresh()
    logDay(d, '2026-11-16', 'floor')
    expect(normalize(JSON.parse(JSON.stringify(d)))).toEqual(JSON.parse(JSON.stringify(d)))
  })
})

describe('demo data', () => {
  const today = '2026-11-21'
  it('is deterministic and covers 6 weeks ending yesterday', () => {
    const a = withDemoData(fresh(), today)
    const b = withDemoData(fresh(), today)
    expect(Object.keys(a.days)).toHaveLength(DEMO_DAYS)
    expect(a.days[addDays(today, -1)]).toBeDefined()
    expect(a.days[today]).toBeUndefined()
    expect(JSON.stringify(a.days)).toBe(JSON.stringify(b.days))
    expect(a.goals.filter((g) => g.demo)).toHaveLength(5)
    expect(a.weeks[weekStartOf(today)].plan?.priorities.length).toBe(2)
  })
  it('removing demo keeps real logs, goals and reviews', () => {
    const d = fresh()
    logDay(d, today, 'ceiling')
    d.goals.push({ id: 'mine', facet: 'deep', title: 'Mine', kind: 'hours', target: 5, period: 'week', createdAt: today })
    const lastWeek = addDays(weekStartOf(today), -14)
    d.weeks[lastWeek] = { weekStart: lastWeek, care: {}, review: { rating: 5, completedAt: 1 } }
    const withDemo = withDemoData(d, today)
    expect(withDemo.weeks[lastWeek].review?.rating).toBe(5) // real review not overwritten
    const cleaned = withoutDemoData(withDemo)
    expect(Object.keys(cleaned.days)).toEqual([today])
    expect(cleaned.goals.map((g) => g.id)).toEqual(['mine'])
    expect(cleaned.weeks[lastWeek].review?.rating).toBe(5)
    expect(cleaned.weeks[weekStartOf(today)].plan).toBeUndefined()
  })
})
