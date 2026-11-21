import { describe, expect, it } from 'vitest'
import type { Goal } from '../../types'
import { evaluateGoal, goalHistory, goalValue, periodFor } from '../goals'
import { defaultReviewWeek, reviewDue, weekReview } from '../review'
import { FRI, MON, SAT, SUN, THU, TUE, WED, fresh, habitsOnly, logDay } from './helpers'
import { addDays } from '../time'

const goal = (g: Partial<Goal>): Goal => ({ id: 'g', facet: 'deep', title: 'T', kind: 'hours', target: 10, period: 'week', createdAt: '2026-10-01', ...g })

describe('goal periods', () => {
  it('week / month / custom ranges', () => {
    expect(periodFor(goal({}), WED)).toEqual({ key: MON, from: MON, to: SUN })
    expect(periodFor(goal({ period: 'month' }), WED)).toEqual({ key: '2026-11-01', from: '2026-11-01', to: '2026-11-30' })
    expect(periodFor(goal({ period: 'custom', start: MON, end: '2026-12-31' }), WED)).toEqual({ key: 'custom', from: MON, to: '2026-12-31' })
    expect(periodFor(goal({ period: 'custom', start: MON }), WED).to).toBe(addDays(MON, 29))
  })
})

describe('goal measurement', () => {
  it('hours, sessions, habit days and manual counts', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling', { habits: ['eatright'] }) // deep 2.5h, gym session
    logDay(d, TUE, 'ceiling', { set: { Gym: 'missed', 'Gym Prep': 'missed', 'Cardio & Dinner': 'missed' }, habits: ['eatright'] })
    habitsOnly(d, WED, ['eatright'])
    const r = periodFor(goal({}), WED)
    expect(goalValue(d, goal({ kind: 'hours' }), r)).toBe(5)
    expect(goalValue(d, goal({ kind: 'sessions', facet: 'fitness' }), r)).toBe(1)
    expect(goalValue(d, goal({ kind: 'habit', habitId: 'eatright' }), r)).toBe(3)
    expect(goalValue(d, goal({ kind: 'manual', manual: { [MON]: 2 } }), r)).toBe(2)
  })
})

describe('evaluateGoal', () => {
  it('done when target reached', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling')
    expect(evaluateGoal(d, goal({ target: 2 }), MON).status).toBe('done')
  })
  it('on-track / behind / off-track vs pace', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling') // 2.5h deep
    // Wed, not yet logged: Mon + Tue finished → expected = target * 2/7
    expect(evaluateGoal(d, goal({ target: 6 }), WED).status).toBe('on-track') // 2.5 vs 1.71
    expect(evaluateGoal(d, goal({ target: 12 }), WED).status).toBe('behind') // 2.5 vs 3.43
    expect(evaluateGoal(d, goal({ target: 20 }), WED).status).toBe('off-track') // 2.5 vs 5.71
  })
  it('does not flag a goal before the first day is logged', () => {
    const d = fresh()
    const ev = evaluateGoal(d, goal({ target: 20 }), MON)
    expect(ev.status).toBe('on-track')
    expect(ev.expected).toBe(0)
    logDay(d, MON, 'floor') // logged: Monday now counts toward pace
    expect(evaluateGoal(d, goal({ target: 20 }), MON).expected).toBeCloseTo(20 / 7)
  })
  it('computes days left and need per day', () => {
    const d = fresh()
    const ev = evaluateGoal(d, goal({ target: 10 }), FRI)
    expect(ev.daysLeft).toBe(3)
    expect(ev.needPerDay).toBeCloseTo(10 / 3)
  })
  it('upcoming and missed for custom goals', () => {
    const d = fresh()
    expect(evaluateGoal(d, goal({ period: 'custom', start: SAT, end: SUN }), WED).status).toBe('upcoming')
    expect(evaluateGoal(d, goal({ period: 'custom', start: MON, end: TUE }), WED).status).toBe('missed')
  })
  it('history reports previous weeks, oldest first, not before creation', () => {
    const d = fresh()
    logDay(d, addDays(MON, -7), 'ceiling')
    const h = goalHistory(d, goal({ target: 2, createdAt: addDays(MON, -14) }), WED)
    expect(h.map((x) => x.key)).toEqual([addDays(MON, -14), addDays(MON, -7)])
    expect(h.map((x) => x.hit)).toEqual([false, true])
  })
})

describe('weekly review', () => {
  it('reviews this week on Sunday, last week otherwise', () => {
    expect(defaultReviewWeek(SUN)).toBe(MON)
    expect(defaultReviewWeek(addDays(SUN, 1))).toBe(MON)
    expect(defaultReviewWeek(WED)).toBe(addDays(MON, -7))
  })
  it('nudges Sun–Tue for a logged, unreviewed week', () => {
    const d = fresh()
    const nextMon = addDays(MON, 7)
    expect(reviewDue(d, nextMon)).toBeNull() // nothing logged
    logDay(d, MON, 'ceiling')
    expect(reviewDue(d, SUN)).toBe(MON)
    expect(reviewDue(d, nextMon)).toBe(MON)
    expect(reviewDue(d, addDays(nextMon, 2))).toBeNull() // Wednesday: too late to nag
    d.weeks[MON] = { weekStart: MON, care: {}, review: { completedAt: 1 } }
    expect(reviewDue(d, nextMon)).toBeNull()
  })
  it('summarises the week', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling', { habits: ['meds'], energy: 4, win: 'Shipped' })
    logDay(d, TUE, 'ceiling', { set: { Reading: 'missed', Gym: 'missed' }, energy: 2 })
    logDay(d, WED, 'miss', { reason: 'Sick' })
    d.goals.push(goal({ id: 'w', target: 4 }))
    const r = weekReview(d, MON, THU)
    expect(r.logged).toBe(3)
    expect(r.best?.key).toBe(MON)
    expect(r.toughest?.key).toBe(WED)
    expect(r.avgEnergy).toBe(3)
    expect(r.wins).toEqual([{ date: MON, text: 'Shipped' }])
    expect(r.missReasons).toEqual(['Sick'])
    expect(r.habits.find((h) => h.habit.id === 'meds')).toMatchObject({ done: 1, of: 4 })
    expect(r.goals[0].ev.value).toBe(5) // 2.5h + 2.5h deep
    expect(r.goals[0].ev.status).toBe('done')
  })
})
