import { describe, expect, it } from 'vitest'
import { autoFacetTargets, facetOfCategory, facetTargets, fmtH } from '../facets'
import { buildInsights, computeFacets, growthHours, lifeScore, previousRange, weekdayProfile } from '../insights'
import { FRI, MON, THU, TUE, WED, fresh, logDay } from './helpers'
import { addDays } from '../time'

describe('facet mapping + targets', () => {
  it('maps categories to life areas', () => {
    expect(facetOfCategory('learning')).toBe('learning')
    expect(facetOfCategory('care')).toBe('health')
    expect(facetOfCategory('meal')).toBe('nutrition')
    expect(facetOfCategory('work')).toBeUndefined()
  })
  it('derives weekly targets from a Green-week plan (5 Ceiling + 2 Floor)', () => {
    const d = fresh()
    expect(autoFacetTargets(d).deep).toBe(21)
    d.settings.facetTargets.deep = 15
    expect(facetTargets(d).deep).toBe(15)
  })
  it('formats hours', () => {
    expect(fmtH(2.5)).toBe('2.5h')
    expect(fmtH(3)).toBe('3h')
    expect(fmtH(1.04)).toBe('1h')
  })
})

describe('computeFacets', () => {
  it('credits done minutes per area and respects red ticks', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling', { set: { Reading: 'missed', 'Evening Sitting': 'missed' }, habits: ['meds', 'brush', 'eatright'] })
    const f = computeFacets(d, Object.values(d.days))
    expect(f.deep.hours).toBe(1) // Morning Sitting only
    expect(f.deep.blockPct).toBe(40) // 60 of 150 min
    expect(f.learning.hours).toBe(0)
    expect(f.fitness.hours).toBe(3.25)
    expect(f.health.habitDone).toBe(2) // meds + brush (triphala, steam missing)
    expect(f.health.habitPossible).toBe(4)
    expect(f.nutrition.habitPct).toBe(100)
    expect(growthHours(f)).toBeCloseTo(1 + 3.25 + 1 + 0)
  })
  it('gives Floor-day partial credit for green-ticked blocks', () => {
    const d = fresh()
    logDay(d, MON, 'miss')
    d.days[MON].statuses[d.days[MON].blocks.find((b) => b.title === 'Gym')!.id] = 'completed'
    const f = computeFacets(d, Object.values(d.days))
    expect(f.fitness.hours).toBe(2)
  })
  it('life score averages areas that have data', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling')
    const s = lifeScore(computeFacets(d, Object.values(d.days)))
    expect(s).toBeGreaterThan(0)
    expect(s).toBeLessThanOrEqual(100)
  })
})

describe('previousRange', () => {
  it('shifts week by 7 days', () => expect(previousRange('week', [MON, WED])).toEqual([addDays(MON, -7), addDays(WED, -7)]))
  it('clamps month to previous month length', () => expect(previousRange('month', ['2026-03-01', '2026-03-31'])).toEqual(['2026-02-01', '2026-02-28']))
  it('shifts 30 days by its length', () => expect(previousRange('30d', ['2026-10-23', '2026-11-21'])).toEqual(['2026-09-23', '2026-10-22']))
  it('has none for all time', () => expect(previousRange('all', [MON, WED])).toBeNull())
})

describe('insights', () => {
  it('spots area gains, Floor cost, and bottlenecks', () => {
    const d = fresh()
    // previous week: lots of misses on deep work
    for (let i = 0; i < 5; i++) logDay(d, addDays(MON, -7 + i), 'floor', { set: { 'Morning Sitting': 'missed', 'Evening Sitting': 'missed' } })
    // this week: ceiling days, reading often missed
    logDay(d, MON, 'ceiling', { set: { Reading: 'missed' }, energy: 5 })
    logDay(d, TUE, 'ceiling', { set: { Reading: 'missed' }, energy: 4 })
    logDay(d, WED, 'floor', { energy: 2 })
    logDay(d, THU, 'floor', { energy: 3 })
    logDay(d, FRI, 'ceiling', { energy: 4 })
    const cur = Object.values(d.days).filter((x) => x.date >= MON)
    const prev = Object.values(d.days).filter((x) => x.date < MON)
    const out = buildInsights({ data: d, days: cur, prevDays: prev, rangeDays: 5 })
    const titles = out.map((i) => i.title)
    expect(titles.some((t) => t.startsWith('Deep Work up'))).toBe(true)
    expect(titles.some((t) => t.startsWith('Floor days cost'))).toBe(true)
    expect(titles).toContain('Bottleneck • Reading')
    expect(titles.some((t) => t.startsWith('Energy 4.3 on Ceiling days'))).toBe(true)
  })
  it('asks for more data when fewer than 3 days are logged', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling')
    expect(buildInsights({ data: d, days: Object.values(d.days), prevDays: null, rangeDays: 1 })[0].title).toBe('Log a few more days')
  })
  it('weekday profile excludes sleep and averages completion', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling', { set: { Office: 'missed' } })
    const p = weekdayProfile(Object.values(d.days))
    expect(p[0].pct).toBeLessThan(100)
    expect(p[1].pct).toBeNull()
  })
})
