import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChefHat, Clock3, Minus, NotebookPen, Package, Plus, Search, Store, X } from 'lucide-react'
import type { AppData, LoggedFood } from '../types'
import { brandLabel, foodById, qtyChoices, qtyLabel, type Food } from '../data/foods'
import { BRAND_BY_ID } from '../data/brands'
import { parseFoods, POPULAR_PACKAGED, POPULAR_RESTAURANTS, searchBrands, searchFoods, splitBrand } from '../lib/foodParse'
import { foodN, round, type Nutrients } from '../lib/nutrition'
import { foodFromRecipe, foodLike, recipePerServing, SERVE_UNITS } from '../lib/myFoods'
import { addDays } from '../lib/time'
import { useStore } from '../store/AppStore'
import { cx } from './ui'

export const est = (n: Nutrients) => `≈ ${round(n.kcal)} kcal · ${round(n.protein)} g protein`

/** "Domino's · 2 slices · ≈ 380 kcal" — where it's from and what a serving is worth. */
const servingHint = (f: Food, qty = f.defaultQty) => [brandLabel(f), qtyLabel(f, qty), `≈ ${round(foodN(f.id, qty).kcal)} kcal`].filter(Boolean).join(' · ')

/** The name part of what was typed ("2 grandma laddoo" → "grandma laddoo"). */
const nameOnly = (s: string) => s.replace(/^[\d½¼¾./\s]+(?:x\s+)?/i, '').trim() || s.trim()

const YoursBadge = () => <span className="ml-1.5 rounded-full bg-accent/30 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-brand dark:text-accent">Yours</span>

/** Foods you logged recently, most used first (for one-tap re-logging). */
export function recentFoods(data: AppData, date: string, limit = 8): Food[] {
  const count = new Map<string, number>()
  for (let i = 0; i <= 21; i++) {
    const day = data.days[addDays(date, -i)]
    if (!day) continue
    const all = [...(day.foodLog ?? []), ...Object.values(day.meals ?? {}).flatMap((m) => m.extras ?? [])]
    for (const e of all) if (e.food && foodById(e.food)) count.set(e.food, (count.get(e.food) ?? 0) + 1 + (21 - i) / 100)
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => foodById(id)!)
}

export function QtyChips({ food, qty, onChange, label }: { food: Food; qty: number; onChange: (q: number) => void; label: string }) {
  const choices = qtyChoices(food)
  const custom = !choices.includes(qty)
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
      {custom && (
        <button role="radio" aria-checked className="h-11 shrink-0 rounded-full border-2 border-brand bg-brand px-3 text-xs font-bold text-white dark:border-accent dark:bg-accent dark:text-brand">
          {qtyLabel(food, qty)}
        </button>
      )}
      {choices.map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={qty === c}
          onClick={() => onChange(c)}
          className={cx(
            'h-11 shrink-0 rounded-full border-2 px-3 text-xs font-bold transition-colors',
            qty === c ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-night-line dark:bg-night-card dark:text-slate-300',
          )}
        >
          {qtyLabel(food, c)}
        </button>
      ))}
    </div>
  )
}

const chip = (on: boolean) =>
  cx('h-10 shrink-0 rounded-full border-2 px-3 text-xs font-bold transition-colors', on ? 'border-brand bg-brand text-white dark:border-accent dark:bg-accent dark:text-brand' : 'border-slate-200 bg-white text-slate-600 dark:border-night-line dark:bg-night-card dark:text-slate-300')

/**
 * Make a food the list doesn't have — no AI, no typing numbers:
 *  • It's like…  pick a similar food; yours counts the same
 *  • From ingredients  add what goes in; totals ÷ servings
 */
function CreateFood({ initialName, onSave, onNote, onCancel }: { initialName: string; onSave: (f: Food) => void; onNote: (name: string) => void; onCancel: () => void }) {
  // "sagar ratan rava dosa" → From: Sagar Ratna, name: Rava dosa
  const split = useMemo(() => splitBrand(initialName), [initialName])
  const [name, setName] = useState(split.brand && split.rest ? split.rest : initialName)
  const [from, setFrom] = useState(split.brand?.name ?? '')
  const [fromFocus, setFromFocus] = useState(false)
  const fromMatches = useMemo(() => (fromFocus ? searchBrands(from, 5).filter((b) => b.name !== from) : []), [from, fromFocus])
  const fromFields = () => {
    const exact = searchBrands(from, 1)[0]
    const known = exact && (exact.name.toLowerCase() === from.trim().toLowerCase() || exact.aliases.includes(from.trim().toLowerCase()))
    return known ? { brand: exact.id } : { place: from }
  }
  const [mode, setMode] = useState<'like' | 'recipe'>('like')
  const [q, setQ] = useState(() => (split.rest || initialName).split(' ').pop() ?? '')
  const [like, setLike] = useState<Food | null>(null)
  const [ingredients, setIngredients] = useState<LoggedFood[]>([])
  const [servings, setServings] = useState(1)
  const [serve, setServe] = useState(SERVE_UNITS[0])
  const matches = useMemo(() => (q.trim().length >= 2 ? searchFoods(q, 6).filter((r) => !r.food.custom) : []), [q])
  const per = recipePerServing(ingredients, servings)
  const ok = name.trim().length >= 2 && (mode === 'like' ? !!like : ingredients.some((i) => foodById(i.food)))

  const save = () => {
    if (!ok) return
    onSave(mode === 'like' ? foodLike(name, like!, fromFields()) : foodFromRecipe(name, ingredients, servings, serve, fromFields()))
  }

  return (
    <div role="group" aria-label="New food" className="rounded-2xl border-2 border-accent bg-accent/10 p-3 dark:bg-accent/5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-brand">
          <ChefHat size={18} />
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Food name"
          className="h-11 min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 text-[15px] font-semibold text-brand outline-none focus:border-brand dark:border-night-line dark:bg-night-card dark:text-white"
        />
        <button aria-label="Cancel new food" onClick={onCancel} className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-white dark:hover:bg-night-card">
          <X size={16} />
        </button>
      </div>

      <div className="relative mb-3">
        <Store size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          onFocus={() => setFromFocus(true)}
          onBlur={() => window.setTimeout(() => setFromFocus(false), 150)}
          aria-label="From restaurant or shop (optional)"
          placeholder="From (optional): restaurant, café, shop…"
          autoComplete="off"
          className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm text-brand outline-none focus:border-brand dark:border-night-line dark:bg-night-card dark:text-white"
        />
        {fromMatches.length > 0 && (
          <ul role="listbox" aria-label="Matching restaurants" className="absolute inset-x-0 top-[calc(100%+4px)] z-30 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-night-line dark:bg-night-card">
            {fromMatches.map((b) => (
              <li key={b.id} role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => { setFrom(b.name); setFromFocus(false) }} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand hover:bg-slate-50 dark:text-white dark:hover:bg-night">
                {b.kind === 'restaurant' ? <Store size={14} className="text-slate-400" /> : <Package size={14} className="text-slate-400" />} {b.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div role="radiogroup" aria-label="How to work it out" className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-white p-1 dark:bg-night-card">
        {(
          [
            ['like', 'It’s like…'],
            ['recipe', 'From ingredients'],
          ] as const
        ).map(([m, label]) => (
          <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cx('h-10 rounded-lg text-xs font-bold', mode === m ? 'bg-brand text-white dark:bg-accent dark:text-brand' : 'text-slate-600 dark:text-slate-300')}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'like' ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-600 dark:text-slate-400">Pick the closest food on the list — yours will count the same per serving.</p>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setLike(null)
              }}
              aria-label="Similar food"
              placeholder="e.g. laddoo, paratha, cake"
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm text-brand outline-none focus:border-brand dark:border-night-line dark:bg-night-card dark:text-white"
            />
          </div>
          <div role="radiogroup" aria-label="Similar foods" className="flex flex-col gap-1">
            {matches.map(({ food }) => (
              <button
                key={food.id}
                role="radio"
                aria-checked={like?.id === food.id}
                onClick={() => setLike(food)}
                className={cx('flex min-h-11 items-center justify-between gap-2 rounded-xl border-2 px-3 py-1.5 text-left', like?.id === food.id ? 'border-brand bg-white dark:border-accent dark:bg-night-card' : 'border-transparent bg-white/70 dark:bg-night-card/60')}
              >
                <span className="truncate text-sm font-semibold text-brand dark:text-white">{food.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{servingHint(food)}</span>
              </button>
            ))}
            {q.trim().length >= 2 && !matches.length && <p className="text-xs text-slate-500">No close match — try another word, or build it from ingredients.</p>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">Add what goes into the whole batch, then how many servings it makes.</p>
          <FoodPicker items={ingredients} onItems={setIngredients} label="Add an ingredient" placeholder="e.g. besan, ghee, sugar" allowCreate={false} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Makes</span>
            <div className="flex items-center gap-1 rounded-full bg-white p-1 dark:bg-night-card" role="group" aria-label="Servings">
              <button aria-label="Fewer servings" disabled={servings <= 1} onClick={() => setServings((s) => s - 1)} className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-brand disabled:opacity-30 dark:bg-night dark:text-white">
                <Minus size={15} />
              </button>
              <span className="min-w-[88px] text-center text-sm font-bold tabular-nums text-brand dark:text-white">
                {servings} {servings === 1 ? serve.one : serve.many}
              </span>
              <button aria-label="More servings" disabled={servings >= 40} onClick={() => setServings((s) => s + 1)} className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-brand disabled:opacity-30 dark:bg-night dark:text-white">
                <Plus size={15} />
              </button>
            </div>
          </div>
          <div role="radiogroup" aria-label="Served as" className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {SERVE_UNITS.map((u) => (
              <button key={u.unit} role="radio" aria-checked={serve.unit === u.unit} onClick={() => setServe(u)} className={chip(serve.unit === u.unit)}>
                {u.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {ok && (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold tabular-nums text-brand dark:bg-night-card dark:text-white" role="status">
          {mode === 'like'
            ? `Per ${qtyLabel(like!, 1).replace(/^1 /, '')}: ≈ ${round(like!.kcal)} kcal · ${round(like!.protein)} g protein · ${round(like!.carbs)} g carbs · ${round(like!.fat)} g fat`
            : `Per serving: ≈ ${per.kcal} kcal · ${round(per.protein)} g protein · ${round(per.carbs)} g carbs · ${round(per.fat)} g fat`}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button onClick={() => onNote(name)} className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-night-card">
          <NotebookPen size={14} /> Just a note
        </button>
        <button disabled={!ok} onClick={save} className="h-11 flex-1 rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-40 dark:bg-accent dark:text-brand">
          Save to my foods & add
        </button>
      </div>
    </div>
  )
}

interface Props {
  items: LoggedFood[]
  onItems: (items: LoggedFood[]) => void
  recent?: Food[]
  /** Accessible name of the search box */
  label: string
  placeholder?: string
  autoFocus?: boolean
  /** Offer "create your own food" for things not on the list (off for recipe ingredients) */
  allowCreate?: boolean
}

/**
 * Search-as-you-type food picker: a dropdown of matching foods (built-in +
 * yours) with one-tap amounts. Anything not on the list can be saved as your
 * own food — like a food you know, or built from ingredients. All estimates
 * are plain arithmetic from per-serving values; nothing is sent anywhere.
 */
export function FoodPicker({ items, onItems, recent = [], label, placeholder = 'Search: coffee, poha, samosa…', autoFocus, allowCreate = true }: Props) {
  const { saveMyFood } = useStore()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [msg, setMsg] = useState<string | null>(null)
  const [creating, setCreating] = useState<{ name: string; qty?: number; replace?: number } | null>(null)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(closeTimer.current), [])
  /** Open the list (and cancel a pending close from an earlier blur). */
  const openList = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  /** On a phone, bring the search box to the top of the sheet so results have room above the keyboard. */
  const lift = () => {
    if (window.innerWidth >= 768) return
    window.setTimeout(() => inputRef.current?.closest('form')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60)
  }

  const segment = text.split(/,|;|\n/).pop()?.trim() ?? ''
  const results = useMemo(() => (segment.length >= 2 ? searchFoods(text, 7) : []), [text, segment])
  const newName = nameOnly(segment)
  const justBrand = useMemo(() => {
    const sb = splitBrand(segment)
    return !!sb.brand && !sb.rest
  }, [segment])
  const offerNew = newName.length >= 3 && !justBrand && !results.some((r) => r.food.name.toLowerCase() === newName.toLowerCase())
  const rows = results.length + (offerNew ? 1 : 0)

  const add = (food: Food, qty?: number, base = items) => {
    onItems([...base, { food: food.id, name: food.name, qty: qty ?? food.defaultQty }])
    // keep earlier comma-separated parts the user is still typing
    const parts = text.split(/,|;|\n/)
    parts.pop()
    setText(parts.length ? parts.join(', ') + ', ' : '')
    setActive(-1)
    setMsg(null)
    inputRef.current?.focus()
  }

  const startCreate = (raw: string, replace?: number) => {
    const [p] = parseFoods(raw)
    if (!allowCreate) {
      onItems([...items, { name: nameOnly(raw), qty: 1 }])
      setText('')
      setMsg('Not on the list • saved as a note')
      return
    }
    setCreating({ name: nameOnly(raw), qty: p?.qtyGiven ? p.qty : undefined, replace })
    setOpen(false)
    setText('')
  }

  /** Enter / Add without picking from the list: understand the whole sentence. */
  const addAll = () => {
    const parsed = parseFoods(text)
    const known = parsed.filter((p) => p.food)
    const unknown = parsed.filter((p) => !p.food)
    const base = [...items, ...known.map((p) => ({ food: p.food!.id, name: p.food!.name, qty: p.qty }))]
    setText('')
    setOpen(false)
    onItems([...base, ...unknown.map((u) => ({ name: nameOnly(u.raw), qty: 1 }))])
    if (unknown.length) setMsg(`${unknown.map((u) => `“${nameOnly(u.raw)}”`).join(', ')} not on the list • saved as ${unknown.length > 1 ? 'notes' : 'a note'}${allowCreate ? ' • tap the chef’s hat to make it a food' : ''}`)
  }

  const choose = (i: number) => {
    if (i < results.length) add(results[i].food, results[i].qty)
    else if (offerNew) startCreate(segment)
  }

  const saveCreated = (food: Food) => {
    if (!creating) return
    saveMyFood(food)
    const item = { food: food.id, name: food.name, qty: creating.qty ?? food.defaultQty }
    if (creating.replace !== undefined) onItems(items.map((y, j) => (j === creating.replace ? item : y)))
    else onItems([...items, item])
    setMsg(`Saved “${food.name}” to your foods • it’ll show up when you search`)
    setCreating(null)
  }

  const showList = open && segment.length >= 2 && rows > 0

  return (
    <div className="flex flex-col gap-3">
      {creating ? (
        <CreateFood
          initialName={creating.name}
          onSave={saveCreated}
          onCancel={() => setCreating(null)}
          onNote={(name) => {
            if (creating.replace === undefined) onItems([...items, { name, qty: 1 }])
            setCreating(null)
          }}
        />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (active >= 0 && showList) choose(active)
            else if (text.trim()) addAll()
          }}
          className="relative scroll-mt-3"
        >
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={text}
                autoFocus={autoFocus}
                onChange={(e) => {
                  if (!text) lift()
                  setText(e.target.value)
                  openList()
                  setActive(-1)
                }}
                onFocus={openList}
                onBlur={() => {
                  window.clearTimeout(closeTimer.current)
                  closeTimer.current = window.setTimeout(() => setOpen(false), 150)
                }}
                onKeyDown={(e) => {
                  if (!showList) return
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setActive((a) => (a + 1) % rows)
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActive((a) => (a <= 0 ? rows - 1 : a - 1))
                  } else if (e.key === 'Escape') setOpen(false)
                }}
                role="combobox"
                aria-expanded={showList}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
                aria-label={label}
                placeholder={placeholder}
                autoComplete="off"
                enterKeyHint="done"
                className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-10 pr-3 text-[15px] text-brand outline-none placeholder:text-slate-400 focus:border-brand dark:border-night-line dark:bg-night-card dark:text-white dark:focus:border-accent"
              />
            </div>
            <button disabled={!text.trim()} className="h-12 shrink-0 rounded-2xl bg-brand px-4 text-sm font-bold text-white disabled:opacity-40 dark:bg-accent dark:text-brand">
              Add
            </button>
          </div>

          {showList && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Matching foods"
              className="mt-1.5 max-h-[52vh] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-brand/10 dark:border-night-line dark:bg-night-card"
            >
              {results.map((r, i) => (
                <li
                  key={r.food.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={active === i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  className={cx('flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2', active === i ? 'bg-accent/25 dark:bg-accent/15' : 'hover:bg-slate-50 dark:hover:bg-night')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-brand dark:text-white">
                      {r.food.name}
                      {r.food.custom && <YoursBadge />}
                    </span>
                    <span className="block truncate text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{servingHint(r.food, r.qty)}</span>
                  </span>
                  <Plus size={16} className="shrink-0 text-slate-400" />
                </li>
              ))}
              {offerNew && (
                <li
                  id={`${listId}-${results.length}`}
                  role="option"
                  aria-selected={active === results.length}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(results.length)}
                  className={cx('flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2', active === results.length ? 'bg-accent/25 dark:bg-accent/15' : 'hover:bg-slate-50 dark:hover:bg-night')}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/30 text-brand dark:text-accent">{allowCreate ? <ChefHat size={15} /> : <NotebookPen size={15} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-brand dark:text-white">{allowCreate ? `Create “${newName}” as my food` : `Add “${newName}” as a note`}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">{allowCreate ? 'Like a food you know, or from ingredients' : 'Not counted in estimates'}</span>
                  </span>
                </li>
              )}
            </ul>
          )}
        </form>
      )}

      {msg && !creating && (
        <p role="status" className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {msg}
        </p>
      )}

      {!text && !items.length && !creating && recent.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Clock3 size={11} /> Recent
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((f) => (
              <button key={f.id} onClick={() => add(f)} className="inline-flex h-11 items-center gap-1 rounded-full border-2 border-slate-200 bg-white px-3 text-xs font-semibold text-brand hover:border-brand dark:border-night-line dark:bg-night-card dark:text-white">
                <Plus size={13} /> {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {allowCreate && !text && !creating && (
        <div className="flex flex-col gap-2">
          {(
            [
              ['Eating out', POPULAR_RESTAURANTS, Store],
              ['Packaged', POPULAR_PACKAGED, Package],
            ] as const
          ).map(([title, ids, Icon]) => (
            <div key={title}>
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Icon size={11} /> {title}
              </p>
              <div role="group" aria-label={title} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                {ids.map((id) => BRAND_BY_ID[id]).filter(Boolean).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setText(b.name + ' ')
                      openList()
                      inputRef.current?.focus()
                      lift()
                    }}
                    className="h-10 shrink-0 rounded-full border-2 border-slate-200 bg-white px-3 text-xs font-semibold text-brand hover:border-brand dark:border-night-line dark:bg-night-card dark:text-white"
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <ul aria-label={allowCreate ? 'Added foods' : 'Ingredients'} className="flex flex-col gap-2">
          {items.map((e, i) => {
            const food = foodById(e.food)
            const remove = () => onItems(items.filter((_, j) => j !== i))
            return (
              <li key={i} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-night-line dark:bg-night-card">
                <div className={cx('flex items-center justify-between gap-2', food && 'mb-2')}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-brand dark:text-white">
                      {food?.name ?? e.name}
                      {food?.custom && <YoursBadge />}
                    </span>
                    <span className="block truncate text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{food ? [brandLabel(food), est(foodN(food.id, e.qty))].filter(Boolean).join(' · ') : 'Note • not counted in estimates'}</span>
                  </span>
                  <span className="flex shrink-0 items-center">
                    {!food && allowCreate && (
                      <button aria-label={`Make ${e.name} a food`} onClick={() => startCreate(e.name, i)} className="flex size-11 items-center justify-center rounded-xl text-brand hover:bg-accent/20 dark:text-accent">
                        <ChefHat size={16} />
                      </button>
                    )}
                    <button aria-label={`Remove ${food?.name ?? e.name}`} onClick={remove} className="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-miss/10 hover:text-miss-ink">
                      <X size={16} />
                    </button>
                  </span>
                </div>
                {food && <QtyChips food={food} qty={e.qty} label={`${food.name} quantity`} onChange={(q) => onItems(items.map((y, j) => (j === i ? { ...y, qty: q } : y)))} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
