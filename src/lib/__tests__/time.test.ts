import { describe, expect, it } from 'vitest'
import { addDays, dayTypeOf, dowIndex, durationLabel, fmt12, fmtTime, fromKey, isWeekend, templateFor, to12, toKey, toMin, weekDays, weekStartOf } from '../time'
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

describe('12-hour display', () => {
  it.each([
    ['00:00', '12:00 AM'],
    ['00:30', '12:30 AM'],
    ['05:00', '5:00 AM'],
    ['11:59', '11:59 AM'],
    ['12:00', '12:00 PM'],
    ['12:45', '12:45 PM'],
    ['13:30', '1:30 PM'],
    ['21:05', '9:05 PM'],
    ['23:59', '11:59 PM'],
  ])('%s → %s', (input, want) => expect(fmt12(input)).toBe(want))
  it('shows an end-of-day 23:59 block end as midnight', () => {
    expect(fmt12('23:59', true)).toBe('12:00 AM')
    expect(to12('23:59', true)).toEqual({ time: '12:00', period: 'AM' })
    expect(fmt12('22:00', true)).toBe('10:00 PM')
  })
  it('formats the live clock', () => {
    expect(fmtTime(new Date(2026, 10, 18, 21, 5))).toBe('9:05 PM')
    expect(fmtTime(new Date(2026, 10, 18, 0, 7))).toBe('12:07 AM')
  })
})
