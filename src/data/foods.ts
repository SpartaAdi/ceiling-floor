/**
 * Everyday Indian food list with easy household units. Nutrition is a typical
 * estimate per ONE unit (approximate, for rough daily tracking — not medical advice).
 * katori ≈ 150 ml cooked • glass ≈ 200 ml • portion = 100 g • handful ≈ 30 g
 */
export type FoodUnit = 'piece' | 'katori' | 'glass' | 'cup' | 'tsp' | 'tbsp' | 'scoop' | 'portion' | 'handful' | 'plate' | 'slice' | 'bowl'

export interface Food {
  id: string
  name: string
  aliases: string[]
  unit: FoodUnit
  /** Singular label shown with quantities, e.g. "egg", "katori" */
  unitLabel?: string
  /** grams or ml in one unit (lets "150 g chicken" convert) */
  grams?: number
  defaultQty: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const f = (id: string, name: string, aliases: string[], unit: FoodUnit, defaultQty: number, kcal: number, protein: number, carbs: number, fat: number, extra: Partial<Food> = {}): Food => ({
  id, name, aliases, unit, defaultQty, kcal, protein, carbs, fat, ...extra,
})

export const FOODS: Food[] = [
  // Eggs
  f('egg', 'Boiled egg', ['egg', 'eggs', 'boiled egg', 'boiled eggs', 'anda', 'ande', 'whole egg'], 'piece', 2, 75, 6.3, 0.6, 5, { unitLabel: 'egg', grams: 50 }),
  f('eggwhite', 'Egg white', ['egg white', 'egg whites', 'whites', 'white'], 'piece', 2, 17, 3.6, 0.2, 0, { unitLabel: 'white', grams: 33 }),
  f('omelette', 'Omelette', ['omelette', 'omelet', 'amlet', 'omlet'], 'piece', 1, 150, 11, 2, 11, { unitLabel: '2-egg omelette' }),
  f('bhurji', 'Egg bhurji', ['bhurji', 'egg bhurji', 'scrambled eggs', 'scrambled egg'], 'katori', 1, 220, 14, 4, 16),
  // Breakfast
  f('poha', 'Poha', ['poha', 'pohe', 'chivda poha'], 'katori', 1, 180, 3.5, 32, 4.5),
  f('upma', 'Upma', ['upma', 'uppittu', 'rava upma', 'suji upma'], 'katori', 1, 200, 5, 30, 7),
  f('idli', 'Idli', ['idli', 'idly', 'idlis'], 'piece', 2, 40, 1.5, 8, 0.2, { unitLabel: 'idli' }),
  f('dosa', 'Plain dosa', ['dosa', 'plain dosa', 'dosai'], 'piece', 1, 170, 4, 28, 4, { unitLabel: 'dosa' }),
  f('masaladosa', 'Masala dosa', ['masala dosa'], 'piece', 1, 300, 6, 45, 10, { unitLabel: 'dosa' }),
  f('sambar', 'Sambar', ['sambar', 'sambhar'], 'katori', 1, 130, 6, 20, 3),
  f('oats', 'Oats', ['oats', 'oatmeal', 'porridge', 'daliya', 'dalia'], 'katori', 1, 150, 5, 27, 3),
  f('besanchilla', 'Besan chilla', ['besan chilla', 'chilla', 'cheela', 'besan cheela', 'chillas'], 'piece', 2, 150, 7, 15, 6, { unitLabel: 'chilla' }),
  f('moongchilla', 'Moong chilla', ['moong chilla', 'moong dal chilla', 'moong cheela'], 'piece', 2, 140, 8, 18, 4, { unitLabel: 'chilla' }),
  f('dhokla', 'Dhokla', ['dhokla', 'khaman'], 'piece', 3, 40, 2, 6, 1, { unitLabel: 'piece' }),
  f('bread', 'Bread', ['bread', 'brown bread', 'toast', 'slice bread'], 'slice', 2, 70, 3, 12, 1, { unitLabel: 'slice' }),
  f('paratha', 'Paratha', ['paratha', 'parantha', 'plain paratha'], 'piece', 1, 200, 4, 28, 8, { unitLabel: 'paratha' }),
  f('alooparatha', 'Aloo paratha', ['aloo paratha', 'alu paratha', 'stuffed paratha'], 'piece', 1, 280, 6, 40, 10, { unitLabel: 'paratha' }),
  // Breads & rice
  f('roti', 'Roti', ['roti', 'rotis', 'chapati', 'chapatti', 'phulka', 'fulka', 'chapathi'], 'piece', 2, 100, 3, 18, 2, { unitLabel: 'roti', grams: 40 }),
  f('rice', 'Rice', ['rice', 'chawal', 'steamed rice', 'white rice', 'brown rice'], 'katori', 1, 195, 4, 43, 0.4, { grams: 150 }),
  f('khichdi', 'Khichdi', ['khichdi', 'khichri'], 'katori', 1, 180, 7, 30, 4),
  f('biryani', 'Biryani', ['biryani', 'biriyani', 'pulao', 'pulav'], 'plate', 1, 500, 22, 60, 18),
  // Dal & curries
  f('dal', 'Dal', ['dal', 'daal', 'dhal', 'lentils', 'moong dal', 'masoor dal', 'toor dal', 'arhar dal'], 'katori', 1, 150, 9, 20, 4),
  f('rajma', 'Rajma', ['rajma', 'kidney beans'], 'katori', 1, 210, 11, 30, 5),
  f('chole', 'Chole', ['chole', 'chhole', 'chana masala', 'chickpea curry'], 'katori', 1, 230, 11, 32, 7),
  f('sabzi', 'Sabzi', ['sabzi', 'sabji', 'subzi', 'vegetable curry', 'mixed veg', 'bhaji', 'aloo gobi', 'bhindi', 'lauki'], 'katori', 1, 120, 3, 12, 7),
  f('veggies', 'Stir-fried veggies', ['veggies', 'vegetables', 'veg', 'stir fry', 'stir fried veggies', 'sauteed vegetables', 'roasted veggies'], 'katori', 1, 80, 3, 10, 3),
  f('paneer', 'Paneer (low-fat)', ['paneer', 'cottage cheese', 'paneer tikka', 'paneer bhurji'], 'katori', 0.5, 200, 18, 4, 12, { grams: 100 }),
  f('soya', 'Soya chunks', ['soya', 'soya chunks', 'soy chunks', 'nutrela', 'soyabean chunks'], 'portion', 1, 105, 15.5, 10, 0.2, { unitLabel: '30 g dry', grams: 30 }),
  f('tofu', 'Tofu', ['tofu'], 'portion', 1, 145, 15, 3, 9, { grams: 100 }),
  // Meat & fish
  f('chickenbreast', 'Chicken breast (roasted)', ['chicken', 'chicken breast', 'roasted chicken', 'grilled chicken', 'boiled chicken', 'murgh'], 'portion', 1.5, 165, 31, 0, 3.6, { grams: 100 }),
  f('chickencurry', 'Chicken curry', ['chicken curry', 'butter chicken', 'chicken gravy', 'chicken masala'], 'katori', 1, 250, 22, 6, 15),
  f('tandoori', 'Tandoori chicken', ['tandoori chicken', 'tandoori', 'chicken tikka', 'tikka', 'kebab', 'kabab'], 'plate', 1, 400, 45, 5, 20),
  f('fish', 'Fish curry', ['fish', 'fish curry', 'machli', 'fish fry'], 'katori', 1, 220, 20, 6, 12),
  // Dairy & drinks
  f('curd', 'Curd', ['curd', 'dahi', 'yogurt', 'yoghurt', 'raita'], 'katori', 1, 90, 5, 7, 5, { grams: 150 }),
  f('hungcurd', 'Hung curd / Greek yogurt', ['hung curd', 'greek yogurt', 'greek yoghurt', 'chakka'], 'katori', 1, 150, 18, 7, 5, { grams: 200 }),
  f('milk', 'Milk (toned)', ['milk', 'doodh', 'toned milk'], 'glass', 1, 120, 6.5, 9.5, 6, { grams: 200 }),
  f('whey', 'Whey protein', ['whey', 'whey protein', 'protein powder', 'protein', 'scoop whey'], 'scoop', 1, 120, 24, 3, 1.5, { grams: 30 }),
  f('chaas', 'Buttermilk', ['buttermilk', 'chaas', 'chhaas', 'mattha'], 'glass', 1, 40, 2, 3, 2, { grams: 200 }),
  f('lassi', 'Sweet lassi', ['lassi', 'sweet lassi'], 'glass', 1, 250, 7, 40, 7),
  f('chai', 'Chai (milk + sugar)', ['chai', 'tea', 'masala chai', 'milk tea'], 'cup', 1, 70, 2, 10, 2.5),
  f('coffee', 'Black coffee', ['black coffee', 'coffee', 'americano', 'espresso'], 'cup', 1, 2, 0.3, 0, 0),
  f('jeera', 'Jeera water', ['jeera water', 'jeera', 'ajwain water', 'cinnamon water', 'jeera ajwain'], 'glass', 1, 0, 0, 0, 0),
  f('coconutwater', 'Coconut water', ['coconut water', 'nariyal pani', 'tender coconut'], 'glass', 1, 45, 0.5, 10, 0),
  f('juice', 'Fruit juice', ['juice', 'orange juice', 'fruit juice'], 'glass', 1, 110, 1, 26, 0.3),
  // Fruit
  f('apple', 'Apple', ['apple', 'seb', 'saib'], 'piece', 1, 95, 0.5, 25, 0.3, { unitLabel: 'apple' }),
  f('banana', 'Banana', ['banana', 'kela', 'bananas'], 'piece', 1, 105, 1.3, 27, 0.4, { unitLabel: 'banana' }),
  f('orange', 'Orange', ['orange', 'santra', 'mosambi'], 'piece', 1, 60, 1.2, 15, 0.2, { unitLabel: 'orange' }),
  f('papaya', 'Papaya', ['papaya', 'papita'], 'katori', 1, 55, 0.6, 14, 0.2),
  f('guava', 'Guava', ['guava', 'amrood', 'amrud'], 'piece', 1, 70, 2.6, 14, 1, { unitLabel: 'guava' }),
  f('dates', 'Date', ['date', 'dates', 'khajur', 'khajoor'], 'piece', 2, 23, 0.2, 6, 0, { unitLabel: 'date' }),
  // Nuts & seeds & snacks
  f('almond', 'Almonds', ['almond', 'almonds', 'badam'], 'piece', 4, 7, 0.25, 0.25, 0.6, { unitLabel: 'almond' }),
  f('walnut', 'Walnut', ['walnut', 'walnuts', 'akhrot'], 'piece', 1, 26, 0.6, 0.5, 2.6, { unitLabel: 'walnut' }),
  f('peanuts', 'Peanuts', ['peanuts', 'peanut', 'moongphali', 'mungfali', 'groundnuts'], 'handful', 1, 170, 7.5, 5, 14, { grams: 30 }),
  f('chana', 'Roasted chana', ['chana', 'roasted chana', 'bhuna chana', 'chickpeas', 'black chana'], 'handful', 1, 110, 6, 17, 1.7, { grams: 30 }),
  f('makhana', 'Makhana', ['makhana', 'fox nuts', 'lotus seeds'], 'katori', 1, 110, 3, 23, 0.2),
  f('sprouts', 'Sprouts', ['sprouts', 'moong sprouts', 'ankurit'], 'katori', 1, 100, 7, 15, 0.5),
  f('pb', 'Peanut butter', ['peanut butter', 'pb'], 'tsp', 1, 32, 1.3, 1, 2.7),
  f('flax', 'Flaxseed', ['flax', 'flaxseed', 'flax seeds', 'alsi'], 'tsp', 1, 12, 0.4, 0.6, 0.9),
  f('ghee', 'Ghee / oil', ['ghee', 'oil', 'butter', 'makhan'], 'tsp', 1, 45, 0, 0, 5),
  f('sugar', 'Sugar', ['sugar', 'cheeni', 'shakkar'], 'tsp', 1, 16, 0, 4, 0),
  // Salads
  f('saladclassic', 'Beet • Cucumber • Tomato salad', ['salad', 'beetroot salad', 'cucumber salad', 'kachumber', 'green salad'], 'bowl', 1, 55, 2, 11, 0.3),
  f('saladsprouts', 'Sprouts & carrot salad', ['sprouts salad', 'carrot salad'], 'bowl', 1, 110, 7, 18, 1),
  f('saladspinach', 'Spinach & amla salad', ['spinach salad', 'amla salad', 'palak salad'], 'bowl', 1, 40, 2, 7, 0.5),
  f('saladpepper', 'Bell pepper & cabbage salad', ['bell pepper salad', 'cabbage salad', 'capsicum salad'], 'bowl', 1, 40, 2, 8, 0.3),
  f('cucumber', 'Cucumber', ['cucumber', 'kheera', 'kakdi'], 'piece', 1, 30, 1.2, 7, 0.2, { unitLabel: 'cucumber' }),
  f('tomato', 'Tomato', ['tomato', 'tamatar'], 'piece', 1, 22, 1, 5, 0.2, { unitLabel: 'tomato' }),
  f('beetroot', 'Beetroot', ['beetroot', 'beet', 'chukandar'], 'piece', 1, 45, 1.7, 10, 0.2, { unitLabel: 'beetroot' }),
  f('carrot', 'Carrot', ['carrot', 'gajar'], 'piece', 1, 25, 0.6, 6, 0.1, { unitLabel: 'carrot' }),
  // Eating out / treats
  f('samosa', 'Samosa', ['samosa', 'samose'], 'piece', 1, 260, 4, 30, 14, { unitLabel: 'samosa' }),
  f('pizza', 'Pizza', ['pizza'], 'slice', 2, 285, 12, 36, 10, { unitLabel: 'slice' }),
  f('burger', 'Burger', ['burger'], 'piece', 1, 450, 20, 45, 20, { unitLabel: 'burger' }),
  f('sweet', 'Indian sweet', ['sweet', 'mithai', 'gulab jamun', 'rasgulla', 'laddoo', 'ladoo', 'barfi', 'jalebi'], 'piece', 1, 150, 2, 25, 5, { unitLabel: 'piece' }),
  f('chips', 'Chips / namkeen', ['chips', 'namkeen', 'bhujia', 'mixture'], 'handful', 1, 160, 2, 15, 10, { grams: 30 }),
  f('noodles', 'Noodles', ['noodles', 'maggi', 'chowmein', 'hakka noodles'], 'plate', 1, 400, 9, 55, 15),
]

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(FOODS.map((x) => [x.id, x]))

export const UNIT_CHOICES: Record<FoodUnit, number[]> = {
  piece: [1, 2, 3, 4, 5, 6],
  slice: [1, 2, 3, 4],
  katori: [0.5, 1, 1.5, 2],
  bowl: [0.5, 1, 1.5, 2],
  glass: [0.5, 1, 1.5, 2],
  cup: [1, 2, 3],
  tsp: [0.5, 1, 2, 3],
  tbsp: [0.5, 1, 2],
  scoop: [0.5, 1, 1.5, 2],
  portion: [0.5, 1, 1.5, 2],
  handful: [0.5, 1, 2],
  plate: [0.5, 1, 1.5],
}

const fracText = (n: number) => {
  const whole = Math.floor(n)
  const rest = Math.round((n - whole) * 4) / 4
  const frac = rest === 0.5 ? '½' : rest === 0.25 ? '¼' : rest === 0.75 ? '¾' : ''
  return whole === 0 && frac ? frac : `${whole}${frac}`
}

/** "3 eggs", "½ katori", "1½ glasses", "2 × 100 g" */
export function qtyLabel(food: Food, qty: number) {
  const n = fracText(qty)
  if (food.unit === 'piece' || food.unit === 'slice') {
    const label = food.unitLabel ?? food.unit
    return `${n} ${qty === 1 || qty < 1 ? label : label.endsWith('s') ? label : `${label}s`}`
  }
  if (food.unit === 'portion') return food.unitLabel ? `${n} × ${food.unitLabel}` : `${Math.round(qty * (food.grams ?? 100))} g`
  const plural: Partial<Record<FoodUnit, string>> = { glass: 'glasses', katori: 'katori', bowl: 'bowls', cup: 'cups', handful: 'handfuls', plate: 'plates', scoop: 'scoops' }
  return `${n} ${qty > 1 ? (plural[food.unit] ?? food.unit) : food.unit}`
}
