import { allFoods, foodsVersion, type Food } from '../data/foods'
import { BRAND_BY_ID, BRANDS, type Brand } from '../data/brands'

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
  half: 0.5, aadha: 0.5, adha: 0.5, aadhi: 0.5, adhi: 0.5, quarter: 0.25,
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
  // Names a restaurant/brand ("mcd fries", "dominos farmhouse")? Use the brand-aware search
  if (splitBrand(name).brand) {
    const strict = searchCore(name).hits.filter((h) => h.strict && !h.brandOnly)
    if (strict.length) return { food: strict[0].food, suggestions: strict.slice(1, 3).map((h) => h.food) }
  }
  const ranked = allFoods().map((f) => ({ f, s: score(n, f) }))
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

/* ───────────── Type-ahead search (word by word, typo-tolerant, brand-aware) ───────────── */

/** Lowercase, strip accents/apostrophes, keep letters and digits ("McDonald's" → "mcdonalds"). */
const key = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`.]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Optimal string alignment distance (a swap like "ratan"/"ratna" counts as one typo). */
function osa(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 99
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  return d[a.length][b.length]
}
const tolerance = (len: number) => (len >= 7 ? 2 : len >= 4 ? 1 : 0)

interface Entry {
  food: Food
  order: number
  phrases: string[]
  tokens: string[]
  brandTokens: string[]
  compacts: string[]
  brandCompacts: string[]
}

const brandKeys = (b?: Brand) => (b ? [b.name, ...b.aliases].map(key) : [])

let indexCache: { v: number; entries: Entry[] } | null = null
function searchIndex(): Entry[] {
  const v = foodsVersion()
  if (indexCache?.v === v) return indexCache.entries
  const entries = allFoods().map((food, order) => {
    const phrases = [food.name, ...food.aliases].map(key).filter(Boolean)
    const bPhrases = [...brandKeys(food.brand ? BRAND_BY_ID[food.brand] : undefined), ...(food.place ? [key(food.place)] : [])]
    return {
      food,
      order,
      phrases,
      tokens: [...new Set(phrases.flatMap((p) => p.split(' ')))],
      brandTokens: [...new Set(bPhrases.flatMap((p) => p.split(' ')))],
      compacts: phrases.map((p) => p.replace(/ /g, '')),
      brandCompacts: bPhrases.map((p) => p.replace(/ /g, '')),
    }
  })
  indexCache = { v, entries }
  return entries
}

/** How well one typed word matches a set of words / squashed phrases (0 = not at all). */
function wordScore(t: string, tokens: string[], compacts: string[]) {
  let best = 0
  const tol = tolerance(t.length)
  for (const w of tokens) {
    if (w === t) return 3
    if (t.length >= 2 && w.startsWith(t)) best = Math.max(best, 2.2 - Math.min(w.length - t.length, 8) / 20)
    else if (tol && osa(t, w) <= Math.min(tol, tolerance(w.length) || 1)) best = Math.max(best, 1.3)
  }
  for (const c of compacts) {
    if (t.length >= 3 && c.startsWith(t)) best = Math.max(best, 2)
    else if (t.length >= 4 && c.includes(t)) best = Math.max(best, 1.4)
    else if (t.length >= 5 && osa(t, c.slice(0, t.length)) <= 1) best = Math.max(best, 1.2) // "macdonald" → mcdonalds…
  }
  return best
}

const STOP = new Set(['from', 'at', 'of', 'the', 'and', 'with', 'se', 'ka', 'ki', 'ke', 'wala', 'wali', 'in', 'restaurant', 'outlet', 'packet', 'pack', 'pkt', 'packets'])

interface Hit {
  food: Food
  s: number
  order: number
  strict: boolean
  /** Weakest word match (exact 3, prefix ~2, typo ~1.3) */
  minWord: number
  /** Typed text (numbers included) starts one of the food's names, e.g. "5 star" */
  whole: boolean
  /** Every word matched only the brand/restaurant name ("dominos") */
  brandOnly: boolean
}

function searchCore(segment: string): { hits: Hit[]; words: string[] } {
  const words = key(segment.replace(/[½¼¾]/g, ' '))
    .replace(/\b\d+(\s?(g|gm|ml))?\b/g, (m) => (/\d+\s?(g|gm|ml)/.test(m) ? m.replace(/\s/g, '') : ' ')) // keep "50g", drop counts
    .replace(new RegExp(UNIT_RE.source, 'g'), ' ')
    .replace(/\b(half|aadha|adha|some|thoda|a|an|one|two|three|four|five|ek|do|teen|char)\b/g, ' ')
    .split(' ')
    .filter((w) => w && !STOP.has(w))
  if (!words.length || words.join('').length < 2) return { hits: [], words }
  const qPhrase = words.join(' ')
  const full = key(segment)
  const hits: Hit[] = []
  for (const e of searchIndex()) {
    let sum = 0
    let matched = 0
    let foodWord = false
    let minWord = 9
    for (let i = 0; i < words.length; i++) {
      const w = words[i]
      let fs = wordScore(w, e.tokens, e.compacts)
      let bs = wordScore(w, e.brandTokens, e.brandCompacts)
      // "dairy milk" typed as "dairymilk", or "mc donalds" typed apart
      if (!fs && !bs && i + 1 < words.length) {
        const two = w + words[i + 1]
        if (e.compacts.some((c) => c.startsWith(two))) fs = 2
        else if (e.brandCompacts.some((c) => c.startsWith(two))) bs = 2
      }
      const best = Math.max(fs, bs)
      if (best > 0) matched++
      if (fs > 0) foodWord = true
      minWord = Math.min(minWord, best)
      sum += best
    }
    if (!matched) continue
    const strict = matched === words.length
    if (!strict && (words.length < 2 || matched < Math.ceil(words.length / 2))) continue
    let s = sum + (strict ? 0 : -4)
    let bonus = 0
    let whole = false
    for (const p of e.phrases) {
      if (p === qPhrase) bonus = Math.max(bonus, 3)
      else if (p.startsWith(qPhrase)) bonus = Math.max(bonus, 1.5 - p.length / 100)
      if (full !== qPhrase && /\d/.test(full) && p.startsWith(full)) whole = true
    }
    s += bonus + (whole ? 6 : 0)
    if (e.food.custom) s += 4 // your own foods first
    if (!e.food.brand && !e.food.place) s += 0.3 // everyday items before brands on a plain search
    hits.push({ food: e.food, s, order: e.order, strict, brandOnly: strict && !foodWord, minWord, whole })
  }
  hits.sort((a, b) => b.s - a.s || a.order - b.order)
  return { hits, words }
}

/**
 * Type-ahead search: every food whose words match what you typed, best first.
 *  • "coffee" → Coffee with milk, Black coffee, Filter coffee, Starbucks latte…
 *  • "mcd fries", "dominos farmhouse", "sagar ratna dosa" — brand first, any order
 *  • typos are fine: "macdonalds", "dominoes", "sagar ratan", "panner"
 *  • a restaurant on its own ("dominos") lists its whole menu
 * A leading amount is understood ("2 cups filter coffee").
 */
export function searchFoods(query: string, limit = 10): { food: Food; qty?: number }[] {
  const segment = query.split(/,|;|\n/).pop() ?? ''
  const [item] = parseFoods(segment)
  if (!item || key(segment).length < 2) return []
  const { hits } = searchCore(segment)
  let strict = hits.filter((h) => h.strict)
  // Real word matches exist? Then drop typo look-alikes ("zinger" ≠ ginger tea)
  if (strict.some((h) => h.minWord >= 2)) strict = strict.filter((h) => h.minWord >= 1.5)
  // "5 star": a name that includes the number beats "5 × something-star"
  if (strict.some((h) => h.whole)) strict = strict.filter((h) => h.whole)
  const brandMenu = strict.length > 0 && strict.every((h) => h.brandOnly)
  let list = strict.length ? strict : hits
  // Nothing at all? Fall back to old typo matching ("panner" → paneer)
  if (!list.length) {
    const n = norm(segment)
    if (n.length >= 4) {
      const loose = allFoods().map((food) => ({ food, s: score(n, food) })).filter((x) => x.s >= 60)
      list = (loose.some((x) => x.s >= 100) ? loose.filter((x) => x.s >= 100) : loose).sort((a, b) => b.s - a.s).map((x) => ({ food: x.food, s: x.s, order: 0, strict: false, brandOnly: false, minWord: 1, whole: false }))
    }
  }
  return list.slice(0, brandMenu ? Math.max(limit, 40) : limit).map((h) => ({ food: h.food, qty: item.qtyGiven && !h.whole ? item.qty : undefined }))
}

/** Restaurants / brands whose name fuzzily matches what you typed (for the "From" field). */
export function searchBrands(query: string, limit = 6): Brand[] {
  const q = key(query)
  if (q.length < 2) return []
  const qc = q.replace(/ /g, '')
  return BRANDS.map((b) => {
    const keys = brandKeys(b)
    let s = 0
    for (const k of keys) {
      const c = k.replace(/ /g, '')
      if (c === qc) s = Math.max(s, 3)
      else if (c.startsWith(qc)) s = Math.max(s, 2)
      else if (qc.length >= 4 && osa(qc, c.slice(0, qc.length)) <= tolerance(qc.length)) s = Math.max(s, 1.2)
    }
    return { b, s }
  })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.b)
}

/** Brand named at the start of what you typed ("sagar ratan rava dosa" → Sagar Ratna, "rava dosa"). */
export function splitBrand(text: string): { brand?: Brand; rest: string } {
  const words = key(text).split(' ').filter(Boolean)
  for (let n = Math.min(3, words.length); n >= 1; n--) {
    const head = words.slice(0, n).join('')
    if (head.length < 3) continue
    for (const b of BRANDS)
      for (const k of brandKeys(b)) {
        const c = k.replace(/ /g, '')
        if (c === head || (head.length >= 5 && osa(head, c) <= tolerance(head.length))) return { brand: b, rest: words.slice(n).join(' ') }
      }
  }
  return { rest: text.trim() }
}

/** Popular restaurants and packaged brands, for one-tap browsing. */
export const POPULAR_RESTAURANTS = ['mcd', 'dominos', 'kfc', 'bk', 'subway', 'pizzahut', 'starbucks', 'sagar', 'haldirams', 'behrouz', 'wowmomo', 'chaayos', 'ccd', 'tacobell', 'bakery', 'cinema']
export const POPULAR_PACKAGED = ['cadbury', 'nestle', 'amul', 'lays', 'pepsico', 'itc', 'britannia', 'parle', 'haldiramspack', 'actii', 'cocacola', 'yogabar', 'ritebite', 'kwality']
