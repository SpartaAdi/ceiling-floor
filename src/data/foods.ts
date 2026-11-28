/**
 * Everyday Indian food list with easy household units. Nutrition is a typical
 * estimate per ONE unit (approximate, for rough daily tracking — not medical advice).
 * katori ≈ 150 ml cooked • glass ≈ 200 ml • portion = 100 g • handful ≈ 30 g
 */
import { BRAND_BY_ID, BRAND_FOODS } from './brands'

export type FoodUnit = 'piece' | 'katori' | 'glass' | 'cup' | 'tsp' | 'tbsp' | 'scoop' | 'portion' | 'handful' | 'plate' | 'slice' | 'bowl'

export interface Food {
  id: string
  name: string
  aliases: string[]
  unit: FoodUnit
  /** Singular label shown with quantities, e.g. "egg", "katori" */
  unitLabel?: string
  /** Restaurant chain or packaged-food brand (id in BRANDS) */
  brand?: string
  /** Restaurant/shop name you typed for your own food (when it isn't a known brand) */
  place?: string
  /** Made by you (not in the built-in list) */
  custom?: boolean
  /** Your own food made from ingredients, or "like" another food */
  recipe?: { food: string; qty: number }[]
  servings?: number
  like?: string
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

const GENERIC_FOODS: Food[] = [
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
  f('coffee', 'Black coffee', ['black coffee', 'americano', 'espresso', 'kaali coffee', 'long black'], 'cup', 1, 2, 0.3, 0, 0),
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
  // ── More drinks ──
  f('milkcoffee', 'Coffee with milk', ['coffee', 'milk coffee', 'regular coffee', 'instant coffee', 'nescafe', 'hot coffee'], 'cup', 1, 90, 3.5, 11, 3.5),
  f('coffeenosugar', 'Coffee with milk (no sugar)', ['coffee without sugar', 'sugar free coffee', 'unsweetened coffee', 'coffee no sugar'], 'cup', 1, 60, 3.5, 5, 3.5),
  f('filtercoffee', 'Filter coffee', ['filter coffee', 'south indian coffee', 'kaapi', 'degree coffee'], 'cup', 1, 100, 3.5, 12, 4),
  f('cappuccino', 'Cappuccino / latte', ['cappuccino', 'latte', 'cafe latte', 'flat white', 'mocha'], 'cup', 1, 130, 7, 11, 6.5),
  f('coldcoffee', 'Cold coffee', ['cold coffee', 'iced coffee', 'frappe', 'frappuccino'], 'glass', 1, 220, 6, 32, 7),
  f('chainosugar', 'Chai (no sugar)', ['chai without sugar', 'tea without sugar', 'sugar free chai', 'chai no sugar'], 'cup', 1, 45, 2, 4, 2.5),
  f('greentea', 'Green tea', ['green tea', 'herbal tea', 'tulsi tea'], 'cup', 1, 2, 0, 0, 0),
  f('blacktea', 'Black / lemon tea', ['black tea', 'lemon tea', 'kali chai', 'kahwa', 'ginger tea'], 'cup', 1, 5, 0, 1, 0),
  f('wholemilk', 'Milk (full cream)', ['full cream milk', 'whole milk', 'buffalo milk'], 'glass', 1, 150, 6.5, 9.5, 9.5, { grams: 200 }),
  f('haldidoodh', 'Haldi doodh', ['haldi doodh', 'turmeric milk', 'golden milk', 'haldi milk'], 'glass', 1, 140, 6.5, 13, 6),
  f('almondmilk', 'Almond milk', ['almond milk', 'oat milk', 'soy milk'], 'glass', 1, 40, 1.5, 3, 2.5),
  f('nimbupani', 'Nimbu pani', ['nimbu pani', 'lemonade', 'shikanji', 'lemon water', 'shikanjvi'], 'glass', 1, 60, 0, 15, 0),
  f('smoothie', 'Fruit smoothie', ['smoothie', 'fruit smoothie', 'mango smoothie'], 'glass', 1, 200, 5, 38, 3),
  f('milkshake', 'Milkshake', ['milkshake', 'banana shake', 'mango shake', 'chocolate shake', 'shake'], 'glass', 1, 250, 8, 40, 7),
  f('softdrink', 'Soft drink', ['coke', 'pepsi', 'soda', 'soft drink', 'cola', 'sprite', 'thums up', 'cold drink', 'fanta'], 'glass', 1, 85, 0, 22, 0),
  f('dietcoke', 'Diet soft drink', ['diet coke', 'coke zero', 'diet soda', 'pepsi black'], 'glass', 1, 1, 0, 0, 0),
  f('sugarcane', 'Sugarcane juice', ['sugarcane juice', 'ganne ka juice', 'ganna juice'], 'glass', 1, 180, 0, 45, 0),
  f('beer', 'Beer', ['beer', 'lager', 'pint'], 'piece', 1, 150, 1.5, 13, 0, { unitLabel: 'bottle' }),
  f('wine', 'Wine', ['wine', 'red wine', 'white wine'], 'glass', 1, 125, 0, 4, 0, { unitLabel: 'glass' }),
  f('spirits', 'Whisky / rum / vodka', ['whisky', 'whiskey', 'rum', 'vodka', 'gin', 'peg', 'drink'], 'piece', 1, 100, 0, 0, 0, { unitLabel: 'peg' }),
  // ── More breakfast ──
  f('sandwich', 'Veg sandwich', ['sandwich', 'veg sandwich', 'grilled sandwich', 'bombay sandwich', 'cheese sandwich'], 'piece', 1, 250, 7, 35, 9, { unitLabel: 'sandwich' }),
  f('eggsandwich', 'Egg sandwich', ['egg sandwich', 'omelette sandwich', 'bread omelette', 'chicken sandwich'], 'piece', 1, 300, 16, 30, 13, { unitLabel: 'sandwich' }),
  f('cornflakes', 'Cornflakes with milk', ['cornflakes', 'corn flakes', 'cereal', 'chocos', 'kelloggs'], 'bowl', 1, 220, 7, 40, 4),
  f('muesli', 'Muesli / granola with milk', ['muesli', 'granola', 'overnight oats'], 'bowl', 1, 300, 10, 45, 9),
  f('uttapam', 'Uttapam', ['uttapam', 'uthappam', 'onion uttapam'], 'piece', 1, 200, 5, 32, 6, { unitLabel: 'uttapam' }),
  f('vada', 'Medu vada', ['vada', 'medu vada', 'vadai', 'sambar vada'], 'piece', 2, 130, 4, 13, 7, { unitLabel: 'vada' }),
  f('pongal', 'Pongal', ['pongal', 'ven pongal', 'khara pongal'], 'katori', 1, 230, 6, 32, 9),
  f('thepla', 'Thepla', ['thepla', 'methi thepla'], 'piece', 2, 120, 3, 16, 5, { unitLabel: 'thepla' }),
  f('sabudana', 'Sabudana khichdi', ['sabudana khichdi', 'sabudana', 'sago khichdi', 'sabudana vada'], 'katori', 1, 300, 3, 50, 10),
  f('puribhaji', 'Puri bhaji (3 puris)', ['puri bhaji', 'poori bhaji', 'puri', 'poori', 'puri sabzi', 'aloo puri'], 'plate', 1, 450, 8, 55, 22),
  f('cholebhature', 'Chole bhature', ['chole bhature', 'bhature', 'bhatura', 'chole bhatura'], 'plate', 1, 650, 16, 75, 30),
  f('misalpav', 'Misal pav', ['misal pav', 'misal', 'usal pav'], 'plate', 1, 450, 15, 55, 18),
  f('pavbhaji', 'Pav bhaji', ['pav bhaji', 'pao bhaji'], 'plate', 1, 500, 11, 65, 22),
  f('vadapav', 'Vada pav', ['vada pav', 'wada pav', 'vadapav'], 'piece', 1, 290, 6, 40, 12, { unitLabel: 'vada pav' }),
  f('appam', 'Appam', ['appam', 'hoppers'], 'piece', 2, 120, 2, 24, 2, { unitLabel: 'appam' }),
  f('pancake', 'Pancake', ['pancake', 'pancakes', 'waffle', 'crepe'], 'piece', 2, 120, 3, 17, 4, { unitLabel: 'pancake' }),
  f('milletroti', 'Bajra / jowar roti', ['bajra roti', 'jowar roti', 'makki roti', 'bhakri', 'millet roti', 'ragi roti'], 'piece', 2, 110, 3, 22, 1.5, { unitLabel: 'roti' }),
  // ── More mains ──
  f('dalmakhani', 'Dal makhani', ['dal makhani', 'makhani dal', 'maa ki dal'], 'katori', 1, 280, 10, 25, 15),
  f('palakpaneer', 'Palak paneer', ['palak paneer', 'saag paneer', 'sarson ka saag', 'saag'], 'katori', 1, 260, 13, 9, 19),
  f('paneergravy', 'Paneer butter masala', ['paneer butter masala', 'shahi paneer', 'kadai paneer', 'paneer masala', 'matar paneer', 'paneer curry'], 'katori', 1, 350, 14, 12, 27),
  f('kadhi', 'Kadhi', ['kadhi', 'kadhi pakora', 'kadhi chawal'], 'katori', 1, 180, 6, 15, 10),
  f('eggcurry', 'Egg curry', ['egg curry', 'anda curry', 'egg masala'], 'katori', 1, 240, 14, 8, 17),
  f('mutton', 'Mutton curry', ['mutton curry', 'mutton', 'goat curry', 'lamb curry', 'rogan josh', 'keema'], 'katori', 1, 320, 25, 6, 22),
  f('prawns', 'Prawns', ['prawns', 'shrimp', 'prawn curry', 'jhinga'], 'katori', 1, 200, 20, 5, 11),
  f('grilledfish', 'Grilled fish', ['grilled fish', 'salmon', 'fish tikka', 'baked fish', 'tuna'], 'portion', 1.5, 150, 22, 0, 6, { grams: 100 }),
  f('friedchicken', 'Fried chicken', ['fried chicken', 'chicken wings', 'chicken 65', 'chicken lollipop'], 'piece', 2, 250, 18, 9, 16, { unitLabel: 'piece' }),
  f('friedrice', 'Fried rice', ['fried rice', 'veg fried rice', 'egg fried rice', 'schezwan rice'], 'plate', 1, 450, 9, 65, 16),
  f('vegbiryani', 'Veg biryani / pulao', ['veg biryani', 'veg pulao', 'jeera rice', 'matar pulao'], 'plate', 1, 420, 9, 65, 13),
  f('curdrice', 'Curd rice', ['curd rice', 'dahi chawal', 'thayir sadam'], 'katori', 1, 220, 6, 33, 7),
  f('lemonrice', 'Lemon / tamarind rice', ['lemon rice', 'tamarind rice', 'pulihora', 'puliyogare'], 'katori', 1, 260, 4, 40, 9),
  f('naan', 'Naan / kulcha', ['naan', 'butter naan', 'garlic naan', 'kulcha', 'tandoori roti', 'rumali roti'], 'piece', 1, 300, 9, 50, 7, { unitLabel: 'naan' }),
  f('pasta', 'Pasta', ['pasta', 'white sauce pasta', 'red sauce pasta', 'macaroni', 'spaghetti', 'penne'], 'plate', 1, 450, 14, 65, 14),
  f('wrap', 'Wrap / roll', ['wrap', 'roll', 'frankie', 'kathi roll', 'chicken roll', 'paneer roll', 'burrito'], 'piece', 1, 400, 18, 45, 16, { unitLabel: 'roll' }),
  f('shawarma', 'Shawarma', ['shawarma', 'shawarma roll'], 'piece', 1, 450, 25, 40, 20, { unitLabel: 'shawarma' }),
  f('thali', 'Restaurant thali', ['thali', 'veg thali', 'full thali', 'meals', 'gujarati thali'], 'plate', 1, 900, 25, 120, 32),
  f('soup', 'Soup', ['soup', 'tomato soup', 'sweet corn soup', 'manchow soup', 'clear soup', 'chicken soup'], 'bowl', 1, 100, 4, 14, 3.5),
  f('momos', 'Momos (steamed)', ['momos', 'momo', 'dumplings', 'dim sum'], 'piece', 6, 40, 2, 6, 1, { unitLabel: 'momo' }),
  // ── More snacks & treats ──
  f('bhel', 'Bhel puri', ['bhel', 'bhel puri', 'bhelpuri', 'jhalmuri', 'murmura'], 'plate', 1, 250, 6, 40, 8),
  f('panipuri', 'Pani puri', ['pani puri', 'golgappa', 'golgappe', 'puchka', 'gol gappe'], 'piece', 6, 36, 0.7, 6, 1, { unitLabel: 'puri' }),
  f('chaat', 'Chaat', ['chaat', 'sev puri', 'dahi puri', 'papdi chaat', 'aloo tikki', 'ragda'], 'plate', 1, 300, 7, 38, 13),
  f('pakora', 'Pakora', ['pakora', 'pakode', 'pakoda', 'bhajiya', 'bajji', 'onion pakoda'], 'piece', 4, 75, 2, 6, 5, { unitLabel: 'pakora' }),
  f('kachori', 'Kachori', ['kachori', 'khasta kachori'], 'piece', 1, 300, 5, 30, 18, { unitLabel: 'kachori' }),
  f('springroll', 'Spring roll', ['spring roll', 'spring rolls', 'cutlet'], 'piece', 2, 150, 3, 17, 8, { unitLabel: 'roll' }),
  f('fries', 'French fries', ['french fries', 'fries', 'finger chips'], 'plate', 1, 365, 4, 48, 17),
  f('biscuit', 'Biscuit', ['biscuit', 'biscuits', 'marie', 'parle g', 'digestive', 'cookie', 'cookies', 'rusk'], 'piece', 2, 45, 0.7, 7, 1.7, { unitLabel: 'biscuit' }),
  f('khakhra', 'Khakhra', ['khakhra', 'khakra'], 'piece', 2, 60, 2, 9, 2, { unitLabel: 'khakhra' }),
  f('papad', 'Papad (roasted)', ['papad', 'papadum', 'appalam'], 'piece', 1, 40, 2, 6, 1, { unitLabel: 'papad' }),
  f('proteinbar', 'Protein bar', ['protein bar', 'energy bar', 'granola bar'], 'piece', 1, 200, 20, 20, 7, { unitLabel: 'bar' }),
  f('darkchoc', 'Dark chocolate', ['dark chocolate', 'dark choco'], 'piece', 2, 55, 0.7, 4, 4, { unitLabel: 'square' }),
  f('chocolate', 'Chocolate bar', ['chocolate', 'candy', 'chocolate bar'], 'piece', 1, 230, 3, 27, 12, { unitLabel: 'bar' }),
  f('icecream', 'Ice cream', ['ice cream', 'icecream', 'kulfi', 'gelato', 'sundae'], 'scoop', 1, 140, 2.5, 17, 7),
  f('cake', 'Cake / pastry', ['cake', 'pastry', 'brownie', 'muffin', 'cupcake', 'donut'], 'slice', 1, 350, 4, 45, 17, { unitLabel: 'piece' }),
  f('halwa', 'Halwa / kheer', ['halwa', 'sheera', 'gajar halwa', 'kheer', 'payasam', 'suji halwa'], 'katori', 0.5, 350, 5, 45, 17),
  f('popcorn', 'Popcorn', ['popcorn'], 'bowl', 1, 110, 3, 20, 2),
  f('trailmix', 'Mixed nuts / dry fruits', ['trail mix', 'dry fruits', 'mixed nuts', 'nuts'], 'handful', 1, 170, 5, 10, 13, { grams: 30 }),
  f('cashew', 'Cashews', ['cashew', 'cashews', 'kaju'], 'piece', 8, 9, 0.3, 0.5, 0.7, { unitLabel: 'cashew' }),
  f('pistachio', 'Pistachios', ['pistachio', 'pistachios', 'pista'], 'handful', 1, 160, 6, 8, 13, { grams: 30 }),
  f('raisins', 'Raisins', ['raisins', 'kishmish', 'munakka'], 'tbsp', 1, 30, 0.3, 8, 0),
  f('seeds', 'Pumpkin / sunflower seeds', ['pumpkin seeds', 'sunflower seeds', 'seeds', 'mixed seeds'], 'tbsp', 1, 50, 2.5, 1, 4.5),
  f('chia', 'Chia / sabja seeds', ['chia', 'chia seeds', 'sabja', 'basil seeds'], 'tsp', 1, 20, 0.7, 1.7, 1.3),
  f('chikki', 'Chikki', ['chikki', 'peanut chikki', 'gajak', 'til chikki'], 'piece', 1, 120, 3, 14, 6, { unitLabel: 'piece' }),
  f('fruitchaat', 'Fruit bowl', ['fruit chaat', 'fruit salad', 'fruit bowl', 'mixed fruit', 'fruits'], 'bowl', 1, 120, 1.5, 29, 0.5),
  f('sweetcorn', 'Sweet corn', ['sweet corn', 'corn', 'bhutta', 'corn chaat', 'masala corn'], 'katori', 1, 130, 4, 27, 2),
  f('cheese', 'Cheese slice', ['cheese', 'cheese slice', 'cheddar', 'mozzarella'], 'slice', 1, 70, 4, 1, 5.5, { unitLabel: 'slice' }),
  f('honey', 'Honey', ['honey', 'shahad', 'jaggery', 'gud'], 'tsp', 1, 21, 0, 6, 0),
  f('jam', 'Jam', ['jam', 'ketchup', 'sauce'], 'tsp', 1, 18, 0, 4.5, 0),
  // ── Cooking ingredients (for building your own recipes) ──
  f('atta', 'Wheat flour (atta)', ['atta', 'wheat flour', 'whole wheat flour', 'gehun ka atta'], 'tbsp', 2, 27, 1, 5.8, 0.15, { grams: 8 }),
  f('maida', 'Maida (refined flour)', ['maida', 'refined flour', 'all purpose flour', 'flour'], 'tbsp', 2, 29, 0.8, 6.1, 0.1, { grams: 8 }),
  f('besan', 'Besan (gram flour)', ['besan', 'gram flour', 'chickpea flour'], 'tbsp', 2, 31, 1.8, 4.6, 0.5, { grams: 8 }),
  f('suji', 'Suji / rava', ['suji', 'sooji', 'rava', 'semolina'], 'tbsp', 2, 36, 1.2, 7.3, 0.1, { grams: 10 }),
  f('rawrice', 'Rice (uncooked)', ['uncooked rice', 'raw rice', 'rice grains'], 'tbsp', 2, 43, 0.8, 9.5, 0.1, { grams: 12 }),
  f('rawdal', 'Dal (uncooked)', ['uncooked dal', 'raw dal', 'dal grains', 'lentils raw'], 'tbsp', 2, 42, 2.9, 7, 0.2, { grams: 12 }),
  f('rawoats', 'Oats (dry)', ['dry oats', 'rolled oats', 'raw oats', 'oats dry'], 'tbsp', 3, 30, 1.1, 5.4, 0.6, { grams: 8 }),
  f('cornflour', 'Cornflour', ['cornflour', 'corn starch', 'cornstarch'], 'tbsp', 1, 30, 0, 7.3, 0, { grams: 8 }),
  f('cream', 'Fresh cream', ['cream', 'fresh cream', 'malai'], 'tbsp', 1, 50, 0.3, 0.5, 5.3, { grams: 15 }),
  f('coconut', 'Grated coconut', ['grated coconut', 'coconut', 'nariyal'], 'tbsp', 1, 25, 0.2, 1, 2.4, { grams: 7 }),
  f('milkpowder', 'Milk powder', ['milk powder', 'dairy whitener'], 'tbsp', 1, 40, 2, 3, 2, { grams: 8 }),
  f('condensed', 'Condensed milk', ['condensed milk', 'milkmaid'], 'tbsp', 1, 64, 1.6, 11, 1.7, { grams: 20 }),
  f('potato', 'Potato', ['potato', 'aloo', 'alu', 'boiled potato'], 'piece', 1, 130, 3, 30, 0.2, { unitLabel: 'potato', grams: 150 }),
  f('onion', 'Onion', ['onion', 'pyaz', 'kanda'], 'piece', 1, 40, 1.1, 9, 0.1, { unitLabel: 'onion', grams: 100 }),
  f('peas', 'Green peas', ['peas', 'green peas', 'matar'], 'katori', 0.5, 80, 5, 14, 0.4, { grams: 100 }),
  f('mushroom', 'Mushrooms', ['mushroom', 'mushrooms'], 'katori', 1, 25, 3, 3, 0.4, { grams: 100 }),
  // ── More fruit ──
  f('mango', 'Mango', ['mango', 'aam'], 'piece', 1, 150, 2, 38, 0.6, { unitLabel: 'mango' }),
  f('grapes', 'Grapes', ['grapes', 'angoor'], 'katori', 1, 100, 1, 27, 0.2),
  f('watermelon', 'Watermelon', ['watermelon', 'tarbooz', 'tarbuj'], 'katori', 1, 45, 1, 11, 0.2),
  f('muskmelon', 'Muskmelon', ['muskmelon', 'kharbooza', 'cantaloupe', 'melon'], 'katori', 1, 55, 1.3, 13, 0.3),
  f('pomegranate', 'Pomegranate', ['pomegranate', 'anar', 'anaar'], 'katori', 1, 120, 2.5, 26, 1.7),
  f('pineapple', 'Pineapple', ['pineapple', 'ananas'], 'katori', 1, 80, 1, 20, 0.2),
  f('pear', 'Pear', ['pear', 'nashpati'], 'piece', 1, 100, 0.6, 27, 0.2, { unitLabel: 'pear' }),
  f('chikoo', 'Chikoo', ['chikoo', 'chiku', 'sapota'], 'piece', 1, 85, 0.5, 20, 1, { unitLabel: 'chikoo' }),
  f('kiwi', 'Kiwi', ['kiwi'], 'piece', 1, 42, 0.8, 10, 0.4, { unitLabel: 'kiwi' }),
  f('berries', 'Berries', ['berries', 'strawberries', 'blueberries', 'strawberry', 'jamun'], 'katori', 1, 60, 1, 14, 0.4),
]

/** Everyday foods first, then restaurant and packaged items. */
export const FOODS: Food[] = [...GENERIC_FOODS, ...BRAND_FOODS]
export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(FOODS.map((x) => [x.id, x]))

/* Your own foods (made from ingredients or copied from a similar food) — synced with your data. */
let custom: Food[] = []
let customById: Record<string, Food> = {}
let lastList: Food[] | undefined
let version = 0
/** Changes whenever your own foods change (lets search rebuild its index). */
export const foodsVersion = () => version
export function setCustomFoods(list: Food[] | undefined) {
  if (list === lastList) return
  lastList = list
  version++
  custom = (list ?? []).filter((x) => x && x.id && !FOOD_BY_ID[x.id])
  customById = Object.fromEntries(custom.map((x) => [x.id, x]))
}
/** Built-in or personal food by id. */
export const foodById = (id: string | undefined): Food | undefined => (id ? (FOOD_BY_ID[id] ?? customById[id]) : undefined)
/** Everything searchable: personal foods first so your own names win ties. */
export const allFoods = () => [...custom, ...FOODS]

export const UNIT_CHOICES: Record<FoodUnit, number[]> = {
  piece: [1, 2, 3, 4, 5, 6],
  slice: [1, 2, 3, 4],
  katori: [0.5, 1, 1.5, 2, 3],
  bowl: [0.5, 1, 1.5, 2],
  glass: [0.5, 1, 1.5, 2],
  cup: [1, 2, 3],
  tsp: [0.5, 1, 2, 3, 4, 6],
  tbsp: [0.5, 1, 2, 3, 4, 6, 8],
  scoop: [0.5, 1, 1.5, 2],
  portion: [0.5, 1, 1.5, 2],
  handful: [0.5, 1, 2],
  plate: [0.5, 1, 1.5],
}

/** Restaurant / brand shown with a food ("Domino's"), if any. */
export const brandLabel = (food?: Food) => (food?.brand ? BRAND_BY_ID[food.brand]?.name : food?.place) || undefined

/** Things you might have half of (a pack, a bar, a pizza…) also offer ½. */
const HALF_OK = new Set(['pack', 'bar', 'can', 'bottle', 'bag', 'tub', 'box', 'serving', 'regular', 'cup', 'tray', 'sundae', 'burrito', 'quesadilla', 'portion', 'wrap', 'pastry', 'brownie', 'cake', 'muffin', 'sandwich', '6-inch sub'])
export function qtyChoices(food: Food): number[] {
  const base = UNIT_CHOICES[food.unit]
  return food.unit === 'piece' && food.unitLabel && HALF_OK.has(food.unitLabel) ? [0.5, 1, 1.5, 2, 3, 4] : base
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
