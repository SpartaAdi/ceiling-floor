import { describe, expect, it } from 'vitest'
import { applyDayMode, ensureSnapshot, resetDayLog, setDayPlan } from '../dayLogic'
import { MON, SAT, fresh, logDay } from './helpers'

describe('applyDayMode', () => {
  it('Ceiling snapshots the template and auto-ticks every block green', () => {
    const d = fresh()
    applyDayMode(d, MON, 'ceiling')
    const day = d.days[MON]
    expect(day.template).toBe('weekday-ceiling')
    expect(day.blocks).toHaveLength(14)
    expect(Object.values(day.statuses).every((s) => s === 'completed')).toBe(true)
  })
  it('Floor uses the Floor template', () => {
    const d = fresh()
    applyDayMode(d, SAT, 'floor')
    expect(d.days[SAT].template).toBe('weekend-floor')
    expect(d.days[SAT].blocks).toHaveLength(10)
  })
  it('Miss marks every planned block red; switching away clears the reason', () => {
    const d = fresh()
    logDay(d, MON, 'miss', { reason: 'Sick' })
    expect(Object.values(d.days[MON].statuses).every((s) => s === 'missed')).toBe(true)
    applyDayMode(d, MON, 'ceiling')
    expect(d.days[MON].missReason).toBeUndefined()
    expect(Object.values(d.days[MON].statuses).every((s) => s === 'completed')).toBe(true)
  })
  it('keeps catch-up logs made before a mode was picked (same template)', () => {
    const d = fresh()
    const day = ensureSnapshot(d, MON)
    day.statuses[day.blocks[0].id] = 'missed'
    applyDayMode(d, MON, 'ceiling')
    expect(d.days[MON].statuses[d.days[MON].blocks[0].id]).toBe('missed')
  })
  it('drops catch-up logs when switching to a different template', () => {
    const d = fresh()
    const day = ensureSnapshot(d, MON)
    day.statuses[day.blocks[0].id] = 'missed'
    applyDayMode(d, MON, 'floor')
    expect(Object.values(d.days[MON].statuses).every((s) => s === 'completed')).toBe(true)
  })
  it('protects history: editing a template later does not change logged days', () => {
    const d = fresh()
    applyDayMode(d, MON, 'ceiling')
    d.templates['weekday-ceiling'][0].title = 'Changed'
    d.templates['weekday-ceiling'].pop()
    expect(d.days[MON].blocks[0].title).toBe('Morning Reset')
    expect(d.days[MON].blocks).toHaveLength(14)
  })
  it('keeps habits and energy when the day is reset', () => {
    const d = fresh()
    logDay(d, MON, 'ceiling', { habits: ['meds'], energy: 4 })
    resetDayLog(d, MON)
    expect(d.days[MON].mode).toBeUndefined()
    expect(d.days[MON].blocks).toHaveLength(0)
    expect(d.days[MON].habits.meds).toBe(true)
    expect(d.days[MON].energy).toBe(4)
  })
})

describe('day plans', () => {
  it('sets and clears a plan without logging the day', () => {
    const d = fresh()
    setDayPlan(d, SAT, 'floor')
    expect(d.days[SAT]).toMatchObject({ plan: 'floor', blocks: [] })
    expect(d.days[SAT].mode).toBeUndefined()
    setDayPlan(d, SAT, undefined)
    expect(d.days[SAT].plan).toBeUndefined()
  })
  it('applying the mode keeps the plan for reference; reset clears both', () => {
    const d = fresh()
    setDayPlan(d, MON, 'floor')
    applyDayMode(d, MON, 'floor')
    expect(d.days[MON]).toMatchObject({ mode: 'floor', plan: 'floor', template: 'weekday-floor' })
    resetDayLog(d, MON)
    expect(d.days[MON].plan).toBeUndefined()
  })
})
