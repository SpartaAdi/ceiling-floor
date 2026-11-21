import { describe, expect, it } from 'vitest'
import { addDays, dayTypeOf, dowIndex, durationLabel, fromKey, isWeekend, templateFor, toKey, toMin, weekDays, weekStartOf } from '../time'
import { MON, SAT, SUN, WED } from './helpers'

describe('date keys', () => {
  it('round-trips local dates without UTC drift', () => {
    expect(toKey(fromKey('2026-03-29'))).toBe('2026-03-29')
    expect(toKey(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01')
  })
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('finds Monday as week start, including from Sunday', () => {
    expect(weekStartOf(MON)).toBe(MON)
    expect(weekStartOf(WED)).toBe(MON)
    expect(weekStartOf(SUN)).toBe(MON)
    expect(weekDays(MON)).toHaveLength(7)
    expect(weekDays(MON)[6]).toBe(SUN)
    expect(dowIndex(SUN)).toBe(6)
  })
})

describe('day type and templates', () => {
  it('detects weekends', () => {
    expect(isWeekend(SAT)).toBe(true)
    expect(isWeekend(SUN)).toBe(true)
    expect(isWeekend(WED)).toBe(false)
    expect(dayTypeOf(SAT)).toBe('weekend')
  })
  it('maps mode to template (Miss uses the Ceiling plan)', () => {
    expect(templateFor(WED, 'ceiling')).toBe('weekday-ceiling')
    expect(templateFor(WED, 'floor')).toBe('weekday-floor')
    expect(templateFor(WED, 'miss')).toBe('weekday-ceiling')
    expect(templateFor(SAT, 'floor')).toBe('weekend-floor')
  })
})

describe('time maths', () => {
  it('treats 23:59 as end of day only for end times', () => {
    expect(toMin('23:59', true)).toBe(1440)
    expect(toMin('23:59')).toBe(1439)
    expect(toMin('05:15')).toBe(315)
  })
  it('formats durations', () => {
    expect(durationLabel('05:00', '05:15')).toBe('15m')
    expect(durationLabel('22:00', '23:59')).toBe('2h')
    expect(durationLabel('13:30', '15:45')).toBe('2h 15m')
  })
})
