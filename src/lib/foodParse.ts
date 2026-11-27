import { FOODS, type Food } from '../data/foods'

export interface ParsedItem {
  raw: string
  food?: Food
  qty: number
  /** The user wrote a quantity (otherwise the food's default portion is used) */
  qtyGiven: boolean
  /** Closest foods when unsure or unmatched */
  suggestions: Food[]
}

const WORD_NUM: Record<string, number> = {
  half: 0.5, aadha: 0.5, adha: 0.5, aadhi: 0.5, adhi: 0.5, quarter: 0.25, paav: 0.25, pav: 0.25,
  a: 1, an: 1, one: 1, ek: 1, two: 2, do: 2, three: 3, teen: 3, four: 4, char: 4, chaar: 4, five: 5, paanch: 5, panch: 5, six: 6, chhe: 6, che: 6,
  seven: 7, saat: 7, eight: 8, aath: 8, ten: 10, das: 10, dozen: 12,
}
const VAGUE = /\b(some|thoda|thodi|thoda sa|little|bit|few|kuch)\b/g
const UNIT_RE = /\b(katoris?|bowls?|cups?|glass(?:es)?|tsp|teaspoons?|tbsp|tablespoons?|scoops?|plates?|slices?|pieces?|pcs?|handfuls?|grams?|gms?|gm|g|ml)\b/
const MASS = new Set(['g', 'gm', 'gms', 'gram', 'grams', 'ml'])

const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()

function lev(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 99
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

/** Score how well `name` refers to `food` (0 = no match). Longer exact aliases win (egg white > egg). */
function score(name: string, food: Food) {
  let best = 0
  const words = name.split(' ')
  for (const alias of [food.name.toLowerCase(), ...food.aliases]) {
    const a = norm(alias)
    if (!a) continue
    if (name === a) best = Math.max(best, 200 + a.length)
    else if (new RegExp(`(^| )${a}( |$)`).test(name)) best = Math.max(best, 100 + a.length)
    else if (name.length >= 3 && a.startsWith(name)) best = Math.max(best, 60 + name.length)
    else {
      // typo tolerance on single words (e.g. "panner" → paneer, "omlet" → omelette)
      const aw = a.split(' ')
      const hits = aw.filter((x) => x.length >= 4 && words.some((w) => w.length >= 4 && lev(w, x) <= (x.length >= 6 ? 2 : 1))).length
      if (hits && hits === aw.length) best = Math.max(best, 60 + hits * 5)
    }
  }
  return best
}

export function matchFood(name: string): { food?: Food; suggestions: Food[] } {
  const n = norm(name)
  if (!n) return { suggestions: [] }
  const ranked = FOODS.map((f) => ({ f, s: score(n, f) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
  const top = ranked[0]
  const confident = top && top.s >= 60
  return { food: confident ? top.f : undefined, suggestions: ranked.slice(confident ? 1 : 0, confident ? 3 : 4).map((x) => x.f) }
}

/** "3 boiled eggs, ½ katori poha and some upma" → items with quantities. */
export function parseFoods(text: string): ParsedItem[] {
  const prepared = text
    .replace(/½/g, ' 0.5 ')
    .replace(/¼/g, ' 0.25 ')
    .replace(/¾/g, ' 0.75 ')
    .replace(/(\d+)\s+(\d)\/(\d)/g, (_, w, a, b) => ` ${Number(w) + Number(a) / Number(b)} `)
    .replace(/(\d)\/(\d)/g, (_, a, b) => ` ${Number(a) / Number(b)} `)
  return prepared
    .split(/,|;|\n|\+|&|\band\b|\baur\b|\bwith\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      let s = ' ' + raw.toLowerCase().replace(VAGUE, ' ') + ' '
      let qty: number | undefined
      const num = s.match(/(\d+(?:\.\d+)?)/)
      if (num) {
        qty = Number(num[1])
        s = s.replace(num[1], ' ')
      } else {
        for (const w of s.split(/\s+/)) {
          if (w in WORD_NUM) {
            qty = WORD_NUM[w]
            s = s.replace(new RegExp(`\\b${w}\\b`), ' ')
            break
          }
        }
      }
      const unit = s.match(UNIT_RE)?.[1]
      if (unit) s = s.replace(UNIT_RE, ' ')
      const name = s.replace(/\b(of|x|nos?|number)\b/g, ' ')
      const { food, suggestions } = matchFood(name)
      let q = qty
      if (food && q !== undefined && unit && MASS.has(unit) && food.grams) q = Math.round((q / food.grams) * 4) / 4 || 0.25
      return { raw: raw.trim(), food, qty: q ?? food?.defaultQty ?? 1, qtyGiven: q !== undefined, suggestions }
    })
}
