import { budget, essentials, expect, modeTile, moveClock, openAt, test, timeline } from './fixtures'

// Wed 18 Nov 2026 is a weekday
test('real-time focus, catch-up and night-care nudges', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:05:00')
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect(page.getByRole('main').locator('header').getByText('9:05 PM')).toBeVisible()

  // NOW block + Now/Next card
  const nowRow = timeline(page).locator('li[data-now]')
  await expect(nowRow).toContainText('Night Care')
  await expect(nowRow).toContainText('NOW')
  await expect(nowRow).toContainText('9:00PM')
  await expect(timeline(page).locator('li').last()).toContainText('10:00PM12:00AM') // Sleep ends at midnight
  const now = page.getByRole('region', { name: 'Now and next' })
  await expect(now).toContainText('Night Care')
  await expect(now).toContainText('9:00 PM – 9:30 PM')
  await expect(now).toContainText('25m left')
  await expect(now).toContainText('Reading')

  // Earlier Today: 11 past blocks unlogged
  const catchUp = page.getByRole('region', { name: 'Earlier Today' })
  await expect(catchUp).toContainText('11 unlogged')
  await catchUp.getByRole('button', { name: 'Morning Reset missed' }).click()
  await expect(catchUp).toContainText('10 unlogged')
  await catchUp.getByRole('button', { name: 'Mark all done' }).click()
  await expect(catchUp).toBeHidden()

  // Evening habits inline in Night Care, synced with the essentials strip
  const open = page.getByRole('group', { name: 'Still open habits' })
  await expect(open.getByRole('button')).toHaveText(['Meds', 'Steam', 'Brush'])
  await open.getByRole('button', { name: 'Meds' }).click()
  await expect(essentials(page).getByRole('button', { name: 'Meds' })).toHaveAttribute('aria-pressed', 'true')
  await expect(open.getByRole('button')).toHaveText(['Steam', 'Brush'])

  // Triphala nudged after 19:30
  await expect(essentials(page).getByRole('button', { name: 'Triphala' })).toHaveClass(/border-floor/)

  // Ceiling keeps catch-up ticks (Morning Reset stays red)
  await page.keyboard.press('c')
  await expect(modeTile(page, 'Ceiling')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('Ceiling day • 13/14 blocks done')).toBeVisible()
  await expect(budget(page)).toContainText('1/5')
})

test('Earlier Today: mark all missed in one click', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T10:00:00') // 5 blocks have ended by 10:00 AM
  const card = page.getByRole('region', { name: 'Earlier Today' })
  await expect(card).toContainText('5 unlogged')
  await card.getByRole('button', { name: 'Mark all missed' }).click()
  await expect(card).toBeHidden()
  for (const t of ['Morning Reset', 'Yoga & Mind', 'Gym Prep', 'Gym', 'Shake & Bath'])
    await expect(timeline(page).getByRole('button', { name: `${t} missed` })).toHaveAttribute('aria-pressed', 'true')
  await expect(timeline(page).getByRole('button', { name: 'Morning Sitting missed' })).toHaveAttribute('aria-pressed', 'false')
  // Choosing the day mode afterwards keeps those misses
  await page.keyboard.press('c')
  await expect(page.getByText('Ceiling day • 9/14 blocks done')).toBeVisible()
})

test('Earlier Today: hide is clearly separate and logs nothing', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T10:00:00')
  const card = page.getByRole('region', { name: 'Earlier Today' })
  await card.getByRole('button', { name: 'Hide for now' }).click()
  await expect(card).toBeHidden()
  await expect(timeline(page).getByRole('button', { name: 'Gym missed' })).toHaveAttribute('aria-pressed', 'false')
  await expect(timeline(page).getByRole('button', { name: 'Gym done' })).toHaveAttribute('aria-pressed', 'false')
})

test('mode switching, block overrides and weekly counters', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T10:00:00')
  await modeTile(page, 'Ceiling').click()
  await expect(page.getByText('Ceiling day • 14/14 blocks done')).toBeVisible()

  // Red-tick a block on a Ceiling day
  await timeline(page).getByRole('button', { name: 'Reading missed' }).click()
  await expect(page.getByText('Ceiling day • 13/14 blocks done')).toBeVisible()
  await expect(timeline(page).getByRole('heading', { name: 'Reading' })).toHaveClass(/line-through/)
  // and back to green
  await timeline(page).getByRole('button', { name: 'Reading done' }).click()
  await expect(page.getByText('Ceiling day • 14/14 blocks done')).toBeVisible()

  // Floor: loads Floor template, decrements Floor Left 2 → 1
  await expect(budget(page)).toContainText('Floor Left2')
  await page.keyboard.press('f')
  await expect(page.getByText('Weekday Floor • 9 blocks')).toBeVisible()
  await expect(budget(page)).toContainText('Floor Left1')
  // Green-tick nothing extra; partial credit on a Floor day
  await timeline(page).getByRole('button', { name: 'Evening Sitting missed' }).click()
  await expect(page.getByText('Floor day • 8/9 blocks done')).toBeVisible()

  // Miss with a reason
  await page.keyboard.press('m')
  await expect(page.getByText('Miss day • 0/14 blocks done')).toBeVisible()
  await expect(page.getByText(/Miss reason/)).toHaveCount(0) // just Ceiling / Floor / Miss, no reason asked
  await expect(budget(page)).toContainText('Miss1')

  // Partial credit on a Miss day
  await timeline(page).getByRole('button', { name: 'Gym done' }).click()
  await expect(page.getByText('Miss day • 1/14 blocks done')).toBeVisible()

  // Reset
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByText('No mode yet • Pick how today went')).toBeVisible()
  await expect(budget(page)).toContainText('Floor Left2')
})

test('day navigation, past-day editing and week strip', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tuesday')
  await expect(page.getByText('Editing past day')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Now and next' })).toBeHidden()
  await modeTile(page, 'Floor').click()

  await page.keyboard.press('t')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today')
  await expect(budget(page).getByRole('listitem', { name: /2026-11-17 • Floor/ })).toBeVisible()
  // future days open in planning mode
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Thursday')
  await expect(page.getByText('Planning ahead')).toBeVisible()
  await page.keyboard.press('t')

  await budget(page).getByRole('listitem', { name: /^2026-11-16/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Monday')
})

test('Green → Amber week health with live forecast', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-20T20:00:00') // Friday
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Monday')
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('c')
    await page.keyboard.press('ArrowRight')
  }
  await page.keyboard.press('c')
  await expect(budget(page)).toContainText('5/5')
  await expect(budget(page)).toContainText('Green Week')
  await expect(budget(page)).toContainText('Green secured • Avoid a Miss')

  await moveClock(page, '2026-11-21T20:00:00')
  await page.keyboard.press('m')
  await expect(budget(page)).toContainText('Amber Week')
})

test('check-in: prompts open a writing dialog, save long notes, feed tomorrow', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T22:10:00')
  const prompts = page.getByRole('list', { name: 'Reflection prompts' })
  await expect(prompts.getByRole('button')).toHaveCount(5)
  for (const t of ['Something positive today', "I'm grateful for", 'Lesson to keep', "What's bothering me & why", 'Focus for tomorrow'])
    await expect(prompts.getByRole('button', { name: new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })).toBeVisible()

  await page.getByRole('radio', { name: /^4/ }).click()

  // Long, multi-line win
  const long = 'Shipped the review page.\n\nAlso had a calm, focused morning — no phone until 10, deep block done before lunch, and a long walk with Bunny in the evening. ' + 'More detail. '.repeat(20)
  await prompts.getByRole('button', { name: /^Something positive today/ }).click()
  const dlg = page.getByRole('dialog', { name: 'Something positive today' })
  await expect(dlg).toBeVisible()
  const pad = dlg.getByRole('textbox', { name: 'Something positive today' })
  await expect(pad).toBeFocused()
  await pad.fill(long)
  await dlg.getByRole('button', { name: 'Save' }).click()
  await expect(dlg).toBeHidden()
  await expect(prompts.getByRole('button', { name: /^Something positive today • written/ })).toContainText('Shipped the review page.')

  // Cancel discards edits
  await prompts.getByRole('button', { name: /^What's bothering me & why/ }).click()
  await page.getByRole('textbox', { name: "What's bothering me & why" }).fill('should not save')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(prompts.getByRole('button', { name: /^What's bothering me & why/ })).toContainText('Click to write')

  // ⌘+Enter saves
  await prompts.getByRole('button', { name: /^Focus for tomorrow/ }).click()
  await page.getByRole('textbox', { name: 'Focus for tomorrow' }).fill('Deep Block before noon')
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByText('2/5').first()).toBeVisible()

  // Persists in full after reload
  await page.reload()
  await expect(page.getByRole('radio', { name: /^4/ })).toHaveAttribute('aria-checked', 'true')
  await prompts.getByRole('button', { name: /^Something positive today/ }).click()
  await expect(page.getByRole('textbox', { name: 'Something positive today' })).toHaveValue(long.trim())
  await page.keyboard.press('Escape')

  // Tomorrow's Now card shows the focus
  await moveClock(page, '2026-11-19T07:00:00')
  await expect(page.getByRole('region', { name: 'Now and next' })).toContainText('Deep Block before noon')
})

test('plan future days in advance; plan applies when the day arrives', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-16T20:00:00') // Monday — whole week ahead
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tuesday')
  await expect(page.getByRole('heading', { name: 'Plan this day' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Now and next' })).toBeHidden()
  await expect(page.getByRole('list', { name: 'Reflection prompts' })).toBeHidden()

  // Plan Floor via keyboard
  await page.keyboard.press('f')
  await expect(modeTile(page, 'Floor')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText(/Planned Floor • Applies on the day/)).toBeVisible()
  await expect(page.getByText('Weekday Floor • Planned • 9 blocks')).toBeVisible()
  await expect(timeline(page).getByRole('button', { name: 'Gym done' }).or(timeline(page).getByRole('button', { name: 'Home Morning done' })).first()).toBeDisabled()
  await expect(budget(page).getByRole('listitem', { name: '2026-11-17 • Planned Floor' })).toBeVisible()
  await expect(budget(page)).toContainText('−1 planned')
  await expect(budget(page)).toContainText('5 more Ceiling days for Green')

  // Plan Saturday as Miss from the week strip; budget forecast reacts
  await budget(page).getByRole('listitem', { name: /^2026-11-21/ }).click()
  await modeTile(page, 'Miss').click()
  await expect(budget(page)).toContainText('+1 planned')
  await expect(budget(page)).toContainText('Amber Week')
  await expect(budget(page)).toContainText('3 more Ceiling days for Amber')
  // click again clears the plan
  await modeTile(page, 'Miss').click()
  await expect(modeTile(page, 'Miss')).toHaveAttribute('aria-checked', 'false')
  await expect(budget(page)).toContainText('Green Week')
  await expect(budget(page)).toContainText('5 more Ceiling days for Green')

  // Plans are not results: still 0 floors used
  await page.keyboard.press('t')
  await expect(budget(page)).toContainText('Floor Left2')

  // Next day: plan auto-applies with all blocks ticked
  await moveClock(page, '2026-11-17T07:00:00')
  await expect(page.getByRole('status')).toContainText("Today's plan applied • Floor")
  await expect(modeTile(page, 'Floor')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText(/Floor day • 9\/9 blocks done/)).toBeVisible()
  await expect(page.getByText('• as planned')).toBeVisible()
  await expect(budget(page)).toContainText('Floor Left1')

  // Reset doesn't immediately re-apply the plan
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByText('No mode yet • Pick how today went')).toBeVisible()
  await page.reload()
  await expect(page.getByText('No mode yet • Pick how today went')).toBeVisible()
})

test('calendar lets you plan future days', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await page.keyboard.press('2')
  await page.getByRole('button', { name: /^2026-11-27/ }).click()
  await expect(page.getByText('Planning ahead')).toBeVisible()
  await modeTile(page, 'Ceiling').click()
  await page.keyboard.press('2')
  await expect(page.getByRole('button', { name: '2026-11-27 • Planned Ceiling' })).toBeVisible()
  await page.getByRole('button', { name: 'Next month' }).click()
  await expect(page.getByRole('button', { name: /^2026-12-15/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next month' })).toBeDisabled()
})

test('weekend care is tracked once per week', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-21T10:00:00') // Saturday
  const care = page.getByRole('group', { name: 'Weekend care' })
  await care.getByRole('button', { name: /Besan Scrub/ }).click()
  await expect(care.getByRole('button', { name: /Besan Scrub/ })).toHaveAttribute('aria-pressed', 'true')

  await moveClock(page, '2026-11-22T10:00:00') // Sunday
  await expect(care.getByRole('button', { name: /Besan Scrub/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Besan Scrub done Sat/)).toBeVisible()
  await expect(care.getByRole('button', { name: /Oiling/ })).toHaveAttribute('aria-pressed', 'false')

  await moveClock(page, '2026-11-23T10:00:00') // Monday — hidden
  await expect(page.getByRole('group', { name: 'Weekend care' })).toBeHidden()
})

test('clock refreshes every minute and moves NOW', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:29:30')
  await expect(timeline(page).locator('li[data-now]')).toContainText('Night Care')
  await page.clock.runFor(61_000)
  await expect(page.getByRole('main').locator('header').getByText('9:30 PM')).toBeVisible()
  await expect(timeline(page).locator('li[data-now]')).toContainText('Reading')
})

test('keyboard shortcuts dialog and page keys', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T12:00:00')
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  const pages: [string, string][] = [
    ['2', 'Dashboard'],
    ['3', 'Goals'],
    ['4', 'Weekly Review'],
    ['5', 'Routine'],
    ['6', 'Settings'],
    ['1', 'Today'],
  ]
  for (const [k, h] of pages) {
    await page.keyboard.press(k)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(h)
  }
})

test('diet: multi-select, egg count, typed foods with quantities, estimates, eating out, water', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:30:00') // Wednesday night: every meal time has passed
  const diet = page.getByRole('region', { name: 'Diet' })
  const meals = diet.getByRole('list', { name: 'Meals' })
  const sheet = (name: string) => page.getByRole('dialog', { name })

  await meals.getByRole('button', { name: 'Jeera water done' }).click()
  await meals.getByRole('button', { name: 'Protein shake done' }).click()
  await expect(diet.getByRole('region', { name: "Today's estimate" })).toContainText('Protein')

  await meals.getByRole('button', { name: 'Choose Pre-gym' }).click()
  await sheet('Pre-gym').getByRole('checkbox', { name: 'Black coffee' }).click()
  await sheet('Pre-gym').getByRole('button', { name: 'Save' }).click()

  // Eggs: choose the count, and multi-select with the light swap
  await meals.getByRole('button', { name: 'Choose Eggs' }).click()
  const eggs = sheet('Eggs')
  await eggs.getByRole('checkbox', { name: 'Boiled eggs' }).click()
  await eggs.getByRole('button', { name: 'More eggs' }).click()
  await expect(eggs).toContainText('4 eggs')
  await eggs.getByRole('checkbox', { name: 'Light swap' }).click()
  await eggs.getByRole('button', { name: 'Save' }).click()
  await expect(meals).toContainText('4 eggs • Light swap')

  // Salad: several salads; nuts pre-ticked
  await meals.getByRole('button', { name: 'Choose Salad & nuts' }).click()
  const salad = sheet('Salad & nuts')
  await salad.getByRole('checkbox', { name: 'Beet • Cucumber • Tomato' }).click()
  await salad.getByRole('checkbox', { name: 'Spinach & Amla' }).click()
  await expect(salad.getByRole('button', { name: /4 almonds \+ 1 walnut/ })).toHaveAttribute('aria-pressed', 'true')
  await salad.getByRole('button', { name: 'Save' }).click()
  await expect(meals).toContainText('Beet • Cucumber • Tomato • Spinach & Amla • 4 almonds + 1 walnut')

  // Lunch: type it in your own words, adjust a quantity, unknown word is flagged
  await meals.getByRole('button', { name: 'Choose Lunch' }).click()
  const lunch = sheet('Lunch')
  await lunch.getByRole('textbox', { name: 'What else did you have' }).fill('2 roti, half katori dal, some dahi, zzqx')
  await expect(lunch).toContainText('Detected: 2 rotis roti • ½ katori dal • 1 katori curd • "zzqx"?')
  await lunch.getByRole('button', { name: 'Add' }).click()
  const added = lunch.getByRole('list', { name: 'Added foods' })
  await expect(added.getByRole('listitem')).toHaveCount(3)
  await added.getByRole('radiogroup', { name: 'Dal quantity' }).getByRole('radio', { name: '1 katori' }).click()
  await expect(lunch).toContainText('Not sure what “zzqx” is')
  await lunch.getByRole('button', { name: 'Save' }).click()
  await expect(meals).toContainText('2 rotis • 1 katori dal • 1 katori curd')

  await meals.getByRole('button', { name: 'Choose Dinner + veggies' }).click()
  await sheet('Dinner + veggies').getByRole('checkbox', { name: 'Chicken + veggies' }).click()
  await sheet('Dinner + veggies').getByRole('button', { name: 'Save' }).click()

  await expect(diet).toContainText('7/7')
  await expect(diet).toContainText('Eat Right • auto')
  await expect(essentials(page).getByRole('button', { name: /Eat Right/ })).toHaveAttribute('aria-pressed', 'true')
  const estimate = diet.getByRole('region', { name: "Today's estimate" })
  await expect(estimate).toContainText('Calories')
  await expect(estimate).toContainText(/to go|On target|over/)

  // water
  await diet.getByRole('button', { name: 'Add a glass of water' }).click()
  await diet.getByRole('button', { name: 'Add a glass of water' }).click()
  await expect(diet).toContainText('Water 2/12 glasses')

  await page.reload()
  await expect(diet).toContainText('7/7')

  // Eating out: Tuesday cheat uses the 1/week allowance → a Wednesday cheat goes over
  await page.keyboard.press('ArrowLeft')
  await diet.getByRole('list', { name: 'Meals' }).getByRole('button', { name: 'Choose Dinner + veggies' }).click()
  await sheet('Dinner + veggies').getByRole('checkbox', { name: 'Cheat meal' }).click()
  await sheet('Dinner + veggies').getByRole('button', { name: 'Save' }).click()
  await page.keyboard.press('t')
  await meals.getByRole('button', { name: /^Dinner \+ veggies/ }).click()
  await sheet('Dinner + veggies').getByRole('checkbox', { name: 'Cheat meal' }).click()
  await sheet('Dinner + veggies').getByRole('button', { name: 'Save' }).click()
  await expect(diet).toContainText('Over allowance')
  await expect(diet).toContainText('+1 over')
  await expect(essentials(page).getByRole('button', { name: /Eat Right/ })).toHaveAttribute('aria-pressed', 'false')

  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('region', { name: 'Diet' })).toHaveCount(0)
})

test('Exercise ticks itself from fitness blocks', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:00:00')
  const ex = essentials(page).getByRole('button', { name: /Exercise/ })
  await expect(ex).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('c')
  await expect(ex).toHaveAttribute('aria-pressed', 'true')
  for (const t of ['Gym Prep', 'Gym', 'Cardio & Dinner']) await timeline(page).getByRole('button', { name: `${t} missed` }).click()
  await expect(ex).toHaveAttribute('aria-pressed', 'false')
})
