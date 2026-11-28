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
  // Shows the 3 most recent; the rest are one tap away
  await expect(catchUp.getByRole('listitem')).toHaveCount(3)
  await catchUp.getByRole('button', { name: 'Show all 11' }).click()
  await expect(catchUp.getByRole('listitem')).toHaveCount(11)
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

  // Ceiling keeps catch-up ticks (Morning Reset stays red); the 3 blocks still ahead aren't assumed done
  await page.keyboard.press('c')
  await expect(modeTile(page, 'Ceiling')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('Ceiling day • 10/14 blocks done')).toBeVisible()
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
  // Choosing the day mode afterwards keeps those misses, and assumes nothing is done
  await page.keyboard.press('c')
  await expect(page.getByText('Ceiling day • 0/14 blocks done')).toBeVisible()
  await expect(timeline(page).getByRole('button', { name: 'Gym missed' })).toHaveAttribute('aria-pressed', 'true')
  await expect(timeline(page).getByRole('button', { name: 'Morning Sitting done' })).toHaveAttribute('aria-pressed', 'false')
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
  // Nothing is assumed done: blocks count only once ticked
  await expect(page.getByText('Ceiling day • 0/14 blocks done')).toBeVisible()
  await timeline(page).getByRole('button', { name: 'Reading done' }).click()
  await expect(page.getByText('Ceiling day • 1/14 blocks done')).toBeVisible()

  // Red-tick it instead
  await timeline(page).getByRole('button', { name: 'Reading missed' }).click()
  await expect(page.getByText('Ceiling day • 0/14 blocks done')).toBeVisible()
  await expect(timeline(page).getByRole('heading', { name: 'Reading' })).toHaveClass(/line-through/)
  // and back to green
  await timeline(page).getByRole('button', { name: 'Reading done' }).click()
  await expect(page.getByText('Ceiling day • 1/14 blocks done')).toBeVisible()

  // Floor: loads Floor template, decrements Floor Left 2 → 1
  await expect(budget(page)).toContainText('Floor Left2')
  await page.keyboard.press('f')
  await expect(page.getByText('Weekday Floor • 9 blocks')).toBeVisible()
  await expect(budget(page)).toContainText('Floor Left1')
  // Partial credit on a Floor day
  await expect(page.getByText('Floor day • 0/9 blocks done')).toBeVisible()
  await timeline(page).getByRole('button', { name: 'Evening Sitting done' }).click()
  await expect(page.getByText('Floor day • 1/9 blocks done')).toBeVisible()

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

  // Next day: plan auto-applies (blocks still to tick — nothing assumed done)
  await moveClock(page, '2026-11-17T07:00:00')
  await expect(page.getByRole('status')).toContainText("Today's plan applied • Floor")
  await expect(modeTile(page, 'Floor')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText(/Floor day • 0\/9 blocks done/)).toBeVisible()
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

  // Lunch: pick from the dropdown, or type a whole sentence; unknown words become notes
  await meals.getByRole('button', { name: 'Choose Lunch' }).click()
  const lunch = sheet('Lunch')
  const search = lunch.getByRole('combobox', { name: 'What else did you have' })
  await search.fill('da')
  const options = lunch.getByRole('listbox', { name: 'Matching foods' })
  await expect(options.getByRole('option').first()).toContainText('Dal')
  await options.getByRole('option', { name: /^Dal\b/ }).first().click()
  await search.fill('2 roti, some dahi, zzqx')
  await lunch.getByRole('button', { name: 'Add', exact: true }).click()
  const added = lunch.getByRole('list', { name: 'Added foods' })
  await expect(added.getByRole('listitem')).toHaveCount(4)
  await expect(added).toContainText('Note • not counted in estimates') // zzqx (no AI without sign-in)
  await added.getByRole('radiogroup', { name: 'Dal quantity' }).getByRole('radio', { name: '½ katori', exact: true }).click()
  await lunch.getByRole('button', { name: 'Save' }).click()
  await expect(meals).toContainText('½ katori dal • 2 rotis • 1 katori curd • zzqx')

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

test('log food: dropdown variants, quantity, time, off-plan flag, edit and delete', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:30:00')
  const diet = page.getByRole('region', { name: 'Diet' })
  const meals = diet.getByRole('list', { name: 'Meals' })
  await diet.getByRole('button', { name: /Log food or drink/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Log food or drink' })
  await expect(sheet.getByLabel('Time eaten')).toHaveValue('21:30') // defaults to now
  await sheet.getByRole('button', { name: 'Evening' }).click()
  await expect(sheet.getByLabel('Time eaten')).toHaveValue('17:00')

  // "coffee" → every kind of coffee to choose from
  const search = sheet.getByRole('combobox', { name: 'Search food or drink' })
  await search.fill('coffee')
  const list = sheet.getByRole('listbox', { name: 'Matching foods' })
  for (const n of ['Coffee with milk', 'Black coffee', 'Filter coffee', 'Cold coffee']) await expect(list).toContainText(n)
  await list.getByRole('option', { name: /Filter coffee/ }).click()
  await sheet.getByRole('radiogroup', { name: 'Filter coffee quantity' }).getByRole('radio', { name: '2 cups' }).click()
  // keyboard: arrow + enter picks from the list
  await search.fill('samo')
  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(sheet.getByRole('list', { name: 'Added foods' }).getByRole('listitem')).toHaveCount(2)
  // something not on the list is offered as your own food (no AI: just arithmetic)
  await search.fill('grandma special laddoo')
  await expect(list).toContainText('Create “grandma special laddoo” as my food')
  await search.fill('')
  await expect(sheet).toContainText('2 items at 5:00 PM')
  await sheet.getByRole('button', { name: 'Log 2 items' }).click()

  // Both appear in the day's timeline at 5:00 PM, flagged off plan; totals include them
  const coffee = meals.getByRole('button', { name: 'Filter coffee at 5:00 PM • Off plan' })
  await expect(coffee).toContainText('2 cups')
  await expect(meals.getByRole('button', { name: 'Samosa at 5:00 PM • Off plan' })).toBeVisible()
  await expect(diet.getByRole('region', { name: "Today's estimate" })).toContainText('460')

  // Edit: change the time; delete the samosa
  await coffee.click()
  const edit = page.getByRole('dialog', { name: 'Edit food' })
  await edit.getByRole('button', { name: 'Breakfast' }).click()
  await edit.getByRole('button', { name: 'Save' }).click()
  await expect(meals.getByRole('button', { name: 'Filter coffee at 9:00 AM • Off plan' })).toBeVisible()
  await meals.getByRole('button', { name: /Samosa at/ }).click()
  await page.getByRole('dialog', { name: 'Edit food' }).getByRole('button', { name: 'Delete' }).click()
  await expect(meals.getByRole('button', { name: /Samosa at/ })).toHaveCount(0)

  // Remembered: shows under Recent next time
  await diet.getByRole('button', { name: /Log food or drink/ }).click()
  await expect(page.getByRole('dialog', { name: 'Log food or drink' }).getByRole('button', { name: 'Filter coffee' })).toBeVisible()
})

test('your own foods without AI: "like" a listed food, or built from ingredients', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:30:00')
  const diet = page.getByRole('region', { name: 'Diet' })
  await diet.getByRole('button', { name: /Log food or drink/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Log food or drink' })
  const search = sheet.getByRole('combobox', { name: 'Search food or drink' })

  // 1) "It's like…": 2 grandma laddoo counts like an Indian sweet
  await search.fill('2 grandma laddoo')
  await sheet.getByRole('option', { name: /Create “grandma laddoo” as my food/ }).click()
  const make = sheet.getByRole('group', { name: 'New food' })
  await expect(make.getByLabel('Food name')).toHaveValue('grandma laddoo')
  await make.getByRole('radio', { name: /Indian sweet/ }).click()
  await expect(make.getByRole('status')).toContainText('≈ 150 kcal')
  await make.getByRole('button', { name: 'Save to my foods & add' }).click()
  const added = sheet.getByRole('list', { name: 'Added foods' })
  await expect(added).toContainText('Grandma laddooYours')
  await expect(added).toContainText('≈ 300 kcal') // typed amount (2) kept

  // 2) From ingredients: a batch of besan laddoo that makes 4
  await search.fill('besan laddoo')
  await sheet.getByRole('option', { name: /Create “besan laddoo” as my food/ }).click()
  await make.getByRole('radio', { name: 'From ingredients' }).click()
  const ing = make.getByRole('combobox', { name: 'Add an ingredient' })
  for (const [q, name] of [['besan', /Besan/], ['ghee', /Ghee/], ['sugar', /^Sugar/]] as const) {
    await ing.fill(q)
    await make.getByRole('option', { name }).first().click()
  }
  const ingredients = make.getByRole('list', { name: 'Ingredients' })
  await ingredients.getByRole('radiogroup', { name: /Besan.*quantity/ }).getByRole('radio', { name: '2 tbsp' }).click()
  for (let i = 0; i < 3; i++) await make.getByRole('button', { name: 'More servings' }).click()
  await expect(make.getByRole('group', { name: 'Servings' })).toContainText('4 pieces')
  // (2 tbsp besan 62 + 1 tsp ghee 45 + 1 tsp sugar 16) ÷ 4 ≈ 31
  await expect(make.getByRole('status')).toContainText('Per serving: ≈ 31 kcal')
  await make.getByRole('button', { name: 'Save to my foods & add' }).click()
  await expect(added.getByRole('listitem')).toHaveCount(2)
  await sheet.getByRole('button', { name: 'Log 2 items' }).click()

  // They're remembered: searchable next time, and listed in Routine → Meals
  await diet.getByRole('button', { name: /Log food or drink/ }).click()
  await sheet.getByRole('combobox').fill('laddoo')
  await expect(sheet.getByRole('listbox', { name: 'Matching foods' }).getByRole('option').first()).toContainText('Yours')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.keyboard.press('5')
  await page.getByRole('tab', { name: 'Meals' }).click()
  const mine = page.getByRole('region', { name: 'My foods' })
  await expect(mine).toContainText('Grandma laddoo')
  await expect(mine).toContainText('Like Indian sweet')
  await expect(mine).toContainText('3 ingredients • makes 4')
  await mine.getByRole('button', { name: 'Delete Grandma laddoo' }).click()
  await mine.getByRole('button', { name: 'Confirm delete Grandma laddoo' }).click()
  await expect(mine).not.toContainText('Grandma laddoo')
})

test('restaurants and packaged foods: browse a menu, misspell a brand, half a bar, your own restaurant dish', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:30:00')
  const diet = page.getByRole('region', { name: 'Diet' })
  await diet.getByRole('button', { name: /Log food or drink/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Log food or drink' })
  const search = sheet.getByRole('combobox', { name: 'Search food or drink' })
  const list = sheet.getByRole('listbox', { name: 'Matching foods' })
  const added = sheet.getByRole('list', { name: 'Added foods' })

  // Browse: tap Domino's → its menu
  await sheet.getByRole('group', { name: 'Eating out' }).getByRole('button', { name: "Domino's" }).click()
  await expect(list.getByRole('option')).toHaveCount(17)
  await list.getByRole('option', { name: /Farmhouse pizza/ }).click()
  await added.getByRole('radiogroup', { name: /Farmhouse.*quantity/ }).getByRole('radio', { name: '3 slices' }).click()
  await expect(added).toContainText("Domino's · ≈ 570 kcal")

  // Misspelt brand + dish
  await search.fill('macdonalds fries')
  await expect(list.getByRole('option').first()).toContainText('Fries (medium)')
  await expect(list.getByRole('option').first()).toContainText("McDonald's")
  await list.getByRole('option').first().click()

  // Packaged: half a Silk
  await search.fill('dairy milk silk')
  await list.getByRole('option', { name: /Dairy Milk Silk/ }).click()
  await added.getByRole('radiogroup', { name: /Silk.*quantity/ }).getByRole('radio', { name: '½ bar', exact: true }).click()
  await expect(added).toContainText('Cadbury · ≈ 165 kcal')

  // A dish the menu doesn't have: restaurant typed first is picked up
  await search.fill('sagar ratan pineapple sheera')
  await sheet.getByRole('option', { name: /Create “sagar ratan pineapple sheera” as my food/ }).click()
  const make = sheet.getByRole('group', { name: 'New food' })
  await expect(make.getByLabel('Food name')).toHaveValue('pineapple sheera')
  await expect(make.getByLabel('From restaurant or shop (optional)')).toHaveValue('Sagar Ratna')
  await make.getByRole('textbox', { name: 'Similar food', exact: true }).fill('halwa')
  await make.getByRole('radio', { name: /Halwa/ }).click()
  await make.getByRole('button', { name: 'Save to my foods & add' }).click()
  await expect(added.getByRole('listitem')).toHaveCount(4)
  await sheet.getByRole('button', { name: 'Log 4 items' }).click()

  // In the timeline with the restaurant shown; and searchable by restaurant next time
  const meals = diet.getByRole('list', { name: 'Meals' })
  await expect(meals.getByRole('button', { name: /Farmhouse pizza/ })).toContainText("Domino's • 3 slices")
  await diet.getByRole('button', { name: /Log food or drink/ }).click()
  await search.fill('sagar sheera')
  await expect(list.getByRole('option').first()).toContainText('Pineapple sheeraYours')
})

test('Exercise ticks itself from fitness blocks', async ({ page, errors: _ }) => {
  await openAt(page, '2026-11-18T21:00:00')
  const ex = essentials(page).getByRole('button', { name: /Exercise/ })
  await expect(ex).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('c')
  await expect(ex).toHaveAttribute('aria-pressed', 'false') // picking Ceiling doesn't count as working out
  await timeline(page).getByRole('button', { name: 'Gym done' }).click()
  await expect(ex).toHaveAttribute('aria-pressed', 'true')
  await timeline(page).getByRole('button', { name: 'Gym missed' }).click()
  await expect(ex).toHaveAttribute('aria-pressed', 'false')
})
