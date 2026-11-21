import { describe, expect, it } from 'vitest'
import { blockReport, blockScore, breakdown, classifyWeek, effectiveStatus, monthGrid, nonMissStreak, rangeFor, strongest, summarizeWeek, weakest } from '../stats'
import { FRI, MON, SAT, SUN, THU, TUE, WED, fresh, logDay } from './helpers'
import { setDayPlan } from '../dayLogic'
import { addDays } from '../time'

const T = { ceiling: 5, floor: 2, miss: 0 }

describe('classifyWeek (spec rules)', () => {
  it.each([
    [5, 0, 'green'],
    [7, 0, 'green'],
    [4, 0, 'amber'],
    [3, 1, 'amber'],
    [5, 1, 'amber'],
    [3, 0, 'amber'],
    [2, 0, 'red'],
    [0, 0, 'red'],
    [4, 2, 'red'],
    [6, 2, 'red'],
  ] as const)('%i Ceiling + %i Miss → %s', (c, m, want) => {
    expect(classifyWeek(c, m, T)).toBe(want)
  })
})

describe('summarizeWeek: live budget + forecast', () => {
  it('starts the week on track for Green', () => {
    const s = summarizeWeek(fresh(), MON, MON)
    expect(s.remaining).toBe(7)
    expect(s.floorLeft).toBe(2)
    expect(s.projected).toBe('green')
    expect(s.forecast).toBe('5 more Ceiling days for Green')
  })
  it('decrements Floor Left 2 → 1 → 0 → +1 over', () => {
    const d = fresh()
    logDay(d, MON, 'floor')
    expect(summarizeWeek(d, MON, TUE).floorLeft).toBe(1)
    logDay(d, TUE, 'floor')
    const s2 = summarizeWeek(d, MON, WED)
    expect(s2.floorLeft).toBe(0)
    expect(s2.forecast).toBe('0 Floors left • Hold Ceiling')
    logDay(d, WED, 'floor')
    expect(summarizeWeek(d, MON, THU).floorLeft).toBe(-1)
  })
  it('one Miss makes Green impossible and points to Amber', () => {
    const d = fresh()
    logDay(d, MON, 'miss')
    const s = summarizeWeek(d, MON, TUE)
    expect(s.projected).toBe('amber')
    expect(s.forecast).toBe('3 more Ceiling days for Amber')
    for (const k of [TUE, WED, THU]) logDay(d, k, 'ceiling')
    expect(summarizeWeek(d, MON, FRI).forecast).toBe('Amber secured • No more Miss')
  })
  it('two Misses lock Red', () => {
    const d = fresh()
    logDay(d, MON, 'miss')
    logDay(d, TUE, 'miss')
    expect(summarizeWeek(d, MON, WED).forecast).toBe('Red locked • Finish strong')
  })
  it('reports a closed Green week', () => {
    const d = fresh()
    for (const k of [MON, TUE, WED, THU, FRI]) logDay(d, k, 'ceiling')
    logDay(d, SAT, 'floor')
    logDay(d, SUN, 'floor')
    const s = summarizeWeek(d, MON, addDays(SUN, 1))
    expect(s.remaining).toBe(0)
    expect(s.actual).toBe('green')
    expect(s.forecast).toBe('Week closed • Green 🎉')
  })
  it('says Green is secured after 5 Ceiling days', () => {
    const d = fresh()
    for (const k of [MON, TUE, WED, THU, FRI]) logDay(d, k, 'ceiling')
    expect(summarizeWeek(d, MON, SAT).forecast).toBe('Green secured • Avoid a Miss')
  })
})

describe('block status + scores', () => {
  it('defaults by mode, explicit overrides win', () => {
    const d = fresh()
    const day = logDay(d, MON, 'ceiling', { set: { Reading: 'missed', Gym: 'missed' } })
    expect(blockScore(day)).toEqual({ done: 12, total: 14 })
    delete day.statuses[day.blocks[0].id]
    expect(effectiveStatus(day, day.blocks[0].id)).toBe('completed')
  })
  it('breakdown percentages', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling')
    logDay(d, TUE, 'ceiling')
    logDay(d, WED, 'floor')
    logDay(d, THU, 'miss')
    expect(breakdown(Object.values(d.days))).toMatchObject({ total: 4, pCeiling: 50, pFloor: 25, pMiss: 25 })
  })
})

describe('block report', () => {
  it('counts red ticks on Ceiling/Floor days and ignores Miss days', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling', { set: { Reading: 'missed' } })
    logDay(d, TUE, 'ceiling', { set: { Reading: 'missed' } })
    logDay(d, WED, 'ceiling')
    logDay(d, THU, 'miss')
    const rep = blockReport(Object.values(d.days))
    const reading = rep.find((r) => r.title === 'Reading')!
    expect(reading).toMatchObject({ done: 1, total: 3, pct: 33 })
    expect(weakest(rep)[0].title).toBe('Reading')
    expect(strongest(rep).every((r) => r.pct === 100)).toBe(true)
  })
  it('ignores one-off blocks once there is enough history', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling')
    logDay(d, TUE, 'ceiling')
    logDay(d, WED, 'ceiling')
    logDay(d, SAT, 'floor', { set: { 'Outing / Rest': 'missed' } }) // seen once
    expect(weakest(blockReport(Object.values(d.days))).map((r) => r.title)).not.toContain('Outing / Rest')
  })
})

describe('streaks and ranges', () => {
  it('counts non-Miss streak from yesterday when today is unlogged', () => {
    const d = fresh()
    logDay(d, MON, 'miss')
    logDay(d, TUE, 'ceiling')
    logDay(d, WED, 'floor')
    expect(nonMissStreak(d, THU)).toEqual({ current: 2, best: 2 })
    logDay(d, THU, 'ceiling')
    expect(nonMissStreak(d, THU).current).toBe(3)
  })
  it('builds ranges for timeframes', () => {
    const d = fresh()
    expect(rangeFor('week', d, WED)).toEqual([MON, WED])
    expect(rangeFor('month', d, WED)).toEqual(['2026-11-01', WED])
    expect(rangeFor('30d', d, WED)).toEqual([addDays(WED, -29), WED])
  })
  it('month grid starts on Monday and fills whole weeks', () => {
    const g = monthGrid('2026-11-05')
    expect(g.length % 7).toBe(0)
    expect(g.indexOf('2026-11-01')).toBe(6) // 1 Nov 2026 is a Sunday
    expect(g.filter(Boolean)).toHaveLength(30)
  })
})

describe('planned future days', () => {
  it('count toward the forecast without counting as logged', () => {
    const d = fresh()
    for (const k of [MON, TUE, WED]) logDay(d, k, 'ceiling')
    setDayPlan(d, SAT, 'floor')
    setDayPlan(d, SUN, 'floor')
    const s = summarizeWeek(d, MON, THU)
    expect(s.ceiling).toBe(3)
    expect(s.floor).toBe(0) // plans are not results
    expect(s.planned).toEqual({ ceiling: 0, floor: 2, miss: 0 })
    expect(s.floorLeft).toBe(2)
    expect(s.forecast).toBe('0 Floors left • Hold Ceiling') // Thu + Fri must be Ceiling
    expect(s.days.find((x) => x.key === SAT)?.plan).toBe('floor')
  })
  it('a planned Miss lowers the projected week', () => {
    const d = fresh()
    setDayPlan(d, FRI, 'miss')
    const s = summarizeWeek(d, MON, MON)
    expect(s.projected).toBe('amber')
    expect(s.forecast).toBe('3 more Ceiling days for Amber')
  })
  it('when every open day is planned, says the plan decides the week', () => {
    const d = fresh()
    for (const k of [MON, TUE, WED, THU]) logDay(d, k, 'ceiling')
    setDayPlan(d, FRI, 'ceiling')
    setDayPlan(d, SAT, 'floor')
    setDayPlan(d, SUN, 'floor')
    expect(summarizeWeek(d, MON, FRI).forecast).toBe('Plan → Green Week • Stick to it')
  })
  it('a logged mode overrides the plan', () => {
    const d = fresh()
    setDayPlan(d, MON, 'floor')
    logDay(d, MON, 'ceiling')
    const s = summarizeWeek(d, MON, MON)
    expect(s.days[0]).toMatchObject({ mode: 'ceiling', plan: undefined })
    expect(s.planned.floor).toBe(0)
  })
})
