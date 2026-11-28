import { foodById, type Food, type FoodUnit } from '../data/foods'
import { foodsN } from './nutrition'

/**
 * Your own foods — no AI, just arithmetic on the built-in list:
 *  • "Like" a food you know: same numbers per serving, your name
 *  • From ingredients: add up what goes in, divide by servings
 */

/** Where it's from: a known restaurant/brand id, or a place name you typed. */
export interface From {
  brand?: string
  place?: string
}
const fromFields = ({ brand, place }: From) => (brand ? { brand } : place?.trim() ? { place: place.trim().slice(0, 40) } : {})

const id = () => `my-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
const r1 = (n: number) => Math.round(n * 10) / 10
const cleanName = (name: string) => {
  const n = name.replace(/\s+/g, ' ').trim().slice(0, 60)
  return n.charAt(0).toUpperCase() + n.slice(1)
}

/** A new food that counts exactly like `base` (e.g. "Grandma's laddoo" like Indian sweet). */
export function foodLike(name: string, base: Food, from: From = {}): Food {
  const n = cleanName(name)
  return {
    id: id(),
    name: n,
    aliases: [n.toLowerCase()],
    unit: base.unit,
    ...(base.unitLabel ? { unitLabel: base.unitLabel } : {}),
    ...(base.grams ? { grams: base.grams } : {}),
    defaultQty: base.defaultQty,
    kcal: base.kcal,
    protein: base.protein,
    carbs: base.carbs,
    fat: base.fat,
    custom: true,
    like: base.id,
    ...fromFields(from),
  }
}

/** Units a home recipe can be served in, with how the count reads. */
export const SERVE_UNITS: { unit: FoodUnit; label: string; one: string; many: string; unitLabel?: string }[] = [
  { unit: 'piece', label: 'Pieces', one: 'piece', many: 'pieces', unitLabel: 'piece' },
  { unit: 'katori', label: 'Katori', one: 'katori', many: 'katori' },
  { unit: 'bowl', label: 'Bowls', one: 'bowl', many: 'bowls' },
  { unit: 'plate', label: 'Plates', one: 'plate', many: 'plates' },
  { unit: 'glass', label: 'Glasses', one: 'glass', many: 'glasses' },
  { unit: 'slice', label: 'Slices', one: 'slice', many: 'slices', unitLabel: 'slice' },
]

/** Per-serving nutrition of a recipe: total of the ingredients ÷ servings. */
export function recipePerServing(items: { food?: string; qty: number }[], servings: number) {
  const total = foodsN(items.filter((i) => foodById(i.food)))
  const s = Math.max(1, servings)
  return { kcal: Math.round(total.kcal / s), protein: r1(total.protein / s), carbs: r1(total.carbs / s), fat: r1(total.fat / s) }
}

/** A new food made from listed ingredients, measured per serving. */
export function foodFromRecipe(name: string, items: { food?: string; qty: number }[], servings: number, serve: (typeof SERVE_UNITS)[number], from: From = {}): Food {
  const n = cleanName(name)
  const known = items.filter((i) => foodById(i.food)).map((i) => ({ food: i.food!, qty: i.qty }))
  return {
    id: id(),
    name: n,
    aliases: [n.toLowerCase()],
    unit: serve.unit,
    ...(serve.unitLabel ? { unitLabel: serve.unitLabel } : {}),
    defaultQty: 1,
    ...recipePerServing(known, servings),
    custom: true,
    recipe: known,
    servings: Math.max(1, servings),
    ...fromFields(from),
  }
}
