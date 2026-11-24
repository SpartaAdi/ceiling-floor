import { describe, expect, it } from 'vitest'
import { SEND_WINDOW_MIN, dueReminders, localNow, reminderMessage, type ReminderSub } from '../../../supabase/functions/_shared/reminders.ts'

const sub = (p: Partial<ReminderSub> = {}): ReminderSub => ({ tz: 'Asia/Kolkata', morning: '09:30', evening: '21:00', last_morning: null, last_evening: null, ...p })
const ist = (hhmm: string, date = '2026-11-24') => new Date(`${date}T${hhmm}:00+05:30`)

describe('localNow', () => {
  it('converts to the subscriber time zone', () => {
    expect(localNow(ist('09:30'), 'Asia/Kolkata')).toEqual({ date: '2026-11-24', minutes: 570 })
    // 9:30 AM IST = 11:00 PM previous day in New York (EST, UTC−5)
    expect(localNow(ist('09:30'), 'America/New_York')).toEqual({ date: '2026-11-23', minutes: 23 * 60 })
  })
  it('falls back to IST for an unknown zone', () => {
    expect(localNow(ist('21:00'), 'Not/AZone').minutes).toBe(21 * 60)
  })
})

describe('dueReminders', () => {
  it('nothing before the chosen time', () => {
    expect(dueReminders(sub(), ist('09:29'))).toEqual([])
  })
  it('morning is due at 9:30 and during the send window', () => {
    expect(dueReminders(sub(), ist('09:30'))).toEqual([{ kind: 'morning', date: '2026-11-24' }])
    expect(dueReminders(sub(), ist('09:35'))).toHaveLength(1)
  })
  it('only once per day', () => {
    expect(dueReminders(sub({ last_morning: '2026-11-24' }), ist('09:40'))).toEqual([])
    expect(dueReminders(sub({ last_morning: '2026-11-23' }), ist('09:40'))).toHaveLength(1)
  })
  it('evening at 9 PM; not after the window closes', () => {
    expect(dueReminders(sub(), ist('21:00'))).toEqual([{ kind: 'evening', date: '2026-11-24' }])
    const late = new Date(ist('21:00').getTime() + SEND_WINDOW_MIN * 60_000)
    expect(dueReminders(sub(), late)).toEqual([])
  })
  it('respects custom times', () => {
    expect(dueReminders(sub({ morning: '07:00' }), ist('07:02'))[0].kind).toBe('morning')
    expect(dueReminders(sub({ evening: '22:15' }), ist('21:00'))).toEqual([])
  })
  it('never sends more than two a day, even if the cron runs all day', () => {
    let s = sub()
    let sent = 0
    for (let m = 0; m < 24 * 60; m += 5) {
      const now = new Date(ist('00:00').getTime() + m * 60_000)
      for (const d of dueReminders(s, now)) {
        sent++
        s = { ...s, [d.kind === 'morning' ? 'last_morning' : 'last_evening']: d.date }
      }
    }
    expect(sent).toBe(2)
  })
})

describe('reminderMessage', () => {
  it('morning mentions a planned mode', () => {
    expect(reminderMessage('morning', { plan: 'floor' }).body).toBe('Today is a Floor day • Tick your morning blocks')
    expect(reminderMessage('morning', null).body).toContain("Pick today's mode")
  })
  it('evening asks to update what you did today', () => {
    const none = reminderMessage('evening', null)
    expect(none.title).toBe('Update what you did today 🌙')
    expect(none.body).toContain("Pick today's mode")
    expect(reminderMessage('evening', { mode: 'ceiling' }).body).toBe('Mark any misses • Write your check-in')
    expect(reminderMessage('evening', { mode: 'ceiling', reflection: { win: 'x' } }).body).toBe('Mark any misses • Plan tomorrow')
  })
  it('never puts personal details on the lock screen', () => {
    const m = reminderMessage('evening', { mode: 'miss', reflection: { bother: 'private thing' } })
    expect(JSON.stringify(m)).not.toContain('private thing')
  })
})
