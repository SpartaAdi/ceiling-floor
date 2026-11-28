/**
 * Restaurant chains and packaged foods popular in India. Values are typical
 * per-serving figures (from published menus/labels where known, otherwise
 * close estimates) — rough tracking, not medical advice. Search is fuzzy, so
 * brand spellings don't have to be exact ("macdonalds", "dominoes", "sagar ratan").
 */
import type { Food, FoodUnit } from './foods'

export interface Brand {
  id: string
  name: string
  /** Other ways people write it (fuzzy search also forgives typos) */
  aliases: string[]
  kind: 'restaurant' | 'packaged'
}

/** [id suffix, name, aliases, unit, default qty, kcal, protein, carbs, fat, unit label] */
type Row = [string, string, string[], FoodUnit, number, number, number, number, number, string?]

export const BRANDS: Brand[] = []
export const BRAND_FOODS: Food[] = []

function brand(id: string, name: string, aliases: string[], kind: Brand['kind'], rows: Row[]) {
  BRANDS.push({ id, name, aliases, kind })
  for (const [sfx, n, al, unit, q, kcal, p, c, f, label] of rows)
    BRAND_FOODS.push({ id: `${id}-${sfx}`, name: n, aliases: al, unit, defaultQty: q, kcal, protein: p, carbs: c, fat: f, brand: id, ...(label ? { unitLabel: label } : {}) })
}

/* ───────────────────────── Restaurants ───────────────────────── */

brand('mcd', "McDonald's", ['mcdonalds', 'mc donalds', 'mcd', 'mac d', 'macdonalds', 'mcdonald', 'mickey d', 'maccas'], 'restaurant', [
  ['mcaloo', 'McAloo Tikki burger', ['mcaloo tikki', 'aloo tikki burger', 'mcaloo'], 'piece', 1, 339, 8.5, 50, 11.8, 'burger'],
  ['mcveggie', 'McVeggie burger', ['mcveggie', 'veggie burger'], 'piece', 1, 402, 10, 49, 18, 'burger'],
  ['mcchicken', 'McChicken burger', ['mcchicken', 'chicken burger'], 'piece', 1, 400, 15, 45, 17, 'burger'],
  ['mcspicychicken', 'McSpicy Chicken burger', ['mcspicy chicken', 'spicy chicken burger'], 'piece', 1, 451, 20, 44, 22, 'burger'],
  ['mcspicypaneer', 'McSpicy Paneer burger', ['mcspicy paneer', 'paneer burger'], 'piece', 1, 652, 21, 56, 38, 'burger'],
  ['chickenmaharaja', 'Chicken Maharaja Mac', ['maharaja mac', 'chicken maharaja'], 'piece', 1, 689, 34, 58, 36, 'burger'],
  ['vegmaharaja', 'Veg Maharaja Mac', ['veg maharaja', 'maharaja mac veg'], 'piece', 1, 640, 17, 69, 32, 'burger'],
  ['filetofish', 'Filet-O-Fish', ['filet o fish', 'fish burger'], 'piece', 1, 348, 14, 38, 15, 'burger'],
  ['mcegg', 'McEgg', ['mcegg', 'egg burger'], 'piece', 1, 290, 13, 30, 13, 'burger'],
  ['friesm', 'Fries (medium)', ['fries', 'french fries', 'fries medium'], 'piece', 1, 340, 4, 44, 16, 'medium fries'],
  ['friess', 'Fries (small)', ['fries small', 'french fries small'], 'piece', 1, 230, 3, 30, 11, 'small fries'],
  ['friesl', 'Fries (large)', ['fries large', 'large fries'], 'piece', 1, 450, 5, 58, 21, 'large fries'],
  ['nuggets', 'Chicken McNuggets', ['nuggets', 'mcnuggets', 'chicken nuggets'], 'piece', 6, 45, 2.5, 2.7, 2.7, 'nugget'],
  ['hashbrown', 'Hash brown', ['hash brown', 'hashbrown'], 'piece', 1, 140, 1, 15, 8, 'hash brown'],
  ['mcflurry', 'McFlurry Oreo', ['mcflurry', 'oreo mcflurry'], 'piece', 1, 290, 7, 45, 9, 'cup'],
  ['softserve', 'Soft serve cone', ['soft serve', 'ice cream cone', 'cone'], 'piece', 1, 150, 4, 22, 5, 'cone'],
  ['sundae', 'Hot fudge sundae', ['sundae', 'hot fudge'], 'piece', 1, 290, 6, 45, 10, 'cup'],
  ['cappuccino', 'McCafé cappuccino', ['mccafe cappuccino', 'cappuccino'], 'cup', 1, 120, 6, 10, 6],
  ['coldcoffee', 'McCafé cold coffee', ['mccafe cold coffee', 'cold coffee'], 'glass', 1, 250, 7, 36, 8],
])

brand('dominos', "Domino's", ['dominos', 'dominoes', 'domino', 'dominos pizza', 'dominoz'], 'restaurant', [
  ['margherita', 'Margherita pizza (medium slice)', ['margherita', 'margarita pizza', 'cheese pizza'], 'slice', 2, 175, 7, 22, 6.5, 'slice'],
  ['dblcheese', 'Double Cheese Margherita (medium slice)', ['double cheese margherita', 'double cheese'], 'slice', 2, 230, 10, 22, 11, 'slice'],
  ['farmhouse', 'Farmhouse pizza (medium slice)', ['farmhouse', 'farm house'], 'slice', 2, 190, 7.5, 24, 7, 'slice'],
  ['peppypaneer', 'Peppy Paneer pizza (medium slice)', ['peppy paneer', 'paneer pizza'], 'slice', 2, 210, 9, 24, 9, 'slice'],
  ['vegparadise', 'Veggie Paradise pizza (medium slice)', ['veggie paradise', 'veg paradise'], 'slice', 2, 190, 7, 24, 7, 'slice'],
  ['mexican', 'Mexican Green Wave pizza (medium slice)', ['mexican green wave', 'green wave'], 'slice', 2, 195, 7, 25, 7.5, 'slice'],
  ['cheesecorn', 'Cheese n Corn pizza (medium slice)', ['cheese n corn', 'cheese corn', 'corn pizza'], 'slice', 2, 200, 8, 26, 7, 'slice'],
  ['vegextrav', 'Veg Extravaganza (medium slice)', ['veg extravaganza', 'extravaganza'], 'slice', 2, 225, 9, 25, 10, 'slice'],
  ['pepperbbq', 'Pepper Barbecue Chicken (medium slice)', ['pepper barbecue chicken', 'bbq chicken pizza'], 'slice', 2, 200, 9, 22, 8, 'slice'],
  ['dominator', 'Chicken Dominator (medium slice)', ['chicken dominator', 'dominator'], 'slice', 2, 260, 13, 23, 13, 'slice'],
  ['goldendelight', 'Chicken Golden Delight (medium slice)', ['chicken golden delight', 'golden delight'], 'slice', 2, 210, 10, 22, 9, 'slice'],
  ['nvsupreme', 'Non Veg Supreme (medium slice)', ['non veg supreme', 'chicken supreme'], 'slice', 2, 240, 11, 23, 11, 'slice'],
  ['breadsticks', 'Garlic breadsticks', ['garlic bread', 'garlic breadsticks', 'breadsticks'], 'piece', 4, 70, 2, 10, 2.5, 'stick'],
  ['stuffedgarlic', 'Stuffed garlic bread', ['stuffed garlic bread', 'stuffed garlic'], 'piece', 2, 120, 4, 14, 5, 'piece'],
  ['chocolava', 'Choco lava cake', ['choco lava', 'lava cake', 'chocolava'], 'piece', 1, 350, 4, 45, 17, 'cake'],
  ['taco', 'Taco Mexicana (veg)', ['taco mexicana', 'taco'], 'piece', 1, 280, 7, 35, 12, 'taco'],
  ['pasta', 'Pasta Italiano (white)', ['pasta italiano', 'white pasta', 'pasta'], 'piece', 1, 400, 12, 45, 19, 'box'],
])

brand('pizzahut', 'Pizza Hut', ['pizza hut', 'pizzahut', 'pizza hutt', 'hut'], 'restaurant', [
  ['margherita', 'Margherita pan pizza (medium slice)', ['margherita', 'pan pizza'], 'slice', 2, 200, 8, 24, 8, 'slice'],
  ['vegsupreme', 'Veggie Supreme (medium slice)', ['veggie supreme', 'veg supreme'], 'slice', 2, 220, 8, 25, 10, 'slice'],
  ['tandooripaneer', 'Tandoori Paneer (medium slice)', ['tandoori paneer', 'paneer pizza'], 'slice', 2, 230, 10, 25, 10, 'slice'],
  ['chickensupreme', 'Chicken Supreme (medium slice)', ['chicken supreme', 'chicken pizza'], 'slice', 2, 240, 11, 24, 11, 'slice'],
  ['garlicbread', 'Garlic bread', ['garlic bread'], 'piece', 2, 110, 3, 15, 4.5, 'piece'],
])

brand('kfc', 'KFC', ['kfc', 'kentucky', 'kentucky fried chicken', 'k f c'], 'restaurant', [
  ['hotcrispy', 'Hot & Crispy chicken', ['hot and crispy', 'hot crispy', 'fried chicken'], 'piece', 2, 290, 20, 10, 19, 'piece'],
  ['original', 'Original recipe chicken', ['original recipe', 'chicken piece'], 'piece', 2, 250, 22, 8, 14, 'piece'],
  ['popcorn', 'Chicken popcorn (regular)', ['chicken popcorn', 'popcorn chicken'], 'piece', 1, 330, 17, 20, 20, 'regular'],
  ['zinger', 'Zinger burger', ['zinger', 'chicken zinger'], 'piece', 1, 480, 24, 45, 22, 'burger'],
  ['vegzinger', 'Veg Zinger burger', ['veg zinger', 'veg burger'], 'piece', 1, 450, 11, 50, 22, 'burger'],
  ['strips', 'Chicken strips', ['strips', 'chicken strips'], 'piece', 3, 100, 8, 6, 5, 'strip'],
  ['wings', 'Hot wings', ['hot wings', 'wings', 'chicken wings'], 'piece', 4, 80, 6, 3, 5, 'wing'],
  ['ricebowl', 'Chicken rice bowl', ['rice bowl', 'rice bowlz', 'chicken rice'], 'piece', 1, 550, 25, 70, 18, 'bowl'],
  ['fries', 'Fries (medium)', ['fries', 'french fries'], 'piece', 1, 320, 4, 42, 15, 'medium fries'],
])

brand('bk', 'Burger King', ['burger king', 'burgerking', 'bk', 'burger kings'], 'restaurant', [
  ['vegwhopper', 'Veg Whopper', ['veg whopper', 'whopper veg'], 'piece', 1, 540, 13, 60, 27, 'burger'],
  ['chickenwhopper', 'Chicken Whopper', ['chicken whopper', 'whopper'], 'piece', 1, 620, 29, 55, 31, 'burger'],
  ['crispyveg', 'Crispy Veg burger', ['crispy veg', 'veg burger'], 'piece', 1, 330, 8, 45, 13, 'burger'],
  ['crispychicken', 'Crispy Chicken burger', ['crispy chicken', 'chicken burger'], 'piece', 1, 380, 15, 40, 17, 'burger'],
  ['fries', 'Fries (medium)', ['fries', 'french fries'], 'piece', 1, 330, 4, 42, 16, 'medium fries'],
  ['nuggets', 'Chicken nuggets', ['nuggets', 'chicken nuggets'], 'piece', 6, 45, 2.5, 3, 2.7, 'nugget'],
])

brand('subway', 'Subway', ['subway', 'sub way', 'subways'], 'restaurant', [
  ['veggiedelite', 'Veggie Delite sub (6 inch)', ['veggie delite', 'veg sub'], 'piece', 1, 230, 9, 40, 3, '6-inch sub'],
  ['paneertikka', 'Paneer Tikka sub (6 inch)', ['paneer tikka', 'paneer sub'], 'piece', 1, 380, 18, 45, 14, '6-inch sub'],
  ['alooPatty', 'Aloo Patty sub (6 inch)', ['aloo patty', 'aloo sub'], 'piece', 1, 350, 9, 60, 8, '6-inch sub'],
  ['chickenteriyaki', 'Chicken Teriyaki sub (6 inch)', ['chicken teriyaki', 'teriyaki'], 'piece', 1, 330, 23, 45, 5, '6-inch sub'],
  ['roastedchicken', 'Roasted Chicken sub (6 inch)', ['roasted chicken', 'chicken sub'], 'piece', 1, 310, 22, 42, 5, '6-inch sub'],
  ['chickentikka', 'Chicken Tikka sub (6 inch)', ['chicken tikka', 'tikka sub'], 'piece', 1, 340, 24, 44, 7, '6-inch sub'],
  ['saladchicken', 'Chicken salad bowl', ['salad bowl', 'chicken salad'], 'piece', 1, 150, 18, 10, 4, 'bowl'],
  ['cookie', 'Cookie', ['cookie', 'choco chip cookie'], 'piece', 1, 210, 2, 30, 10, 'cookie'],
])

brand('tacobell', 'Taco Bell', ['taco bell', 'tacobell', 'taco bel'], 'restaurant', [
  ['crunchyveg', 'Crunchy taco (veg)', ['crunchy taco', 'veg taco'], 'piece', 2, 170, 4, 18, 9, 'taco'],
  ['crunchychicken', 'Crunchy taco (chicken)', ['chicken taco'], 'piece', 2, 180, 8, 13, 10, 'taco'],
  ['burrito', 'Chicken burrito', ['burrito', 'chicken burrito'], 'piece', 1, 450, 20, 55, 16, 'burrito'],
  ['quesadilla', 'Chicken quesadilla', ['quesadilla'], 'piece', 1, 520, 25, 40, 28, 'quesadilla'],
  ['nachos', 'Nachos with cheese', ['nachos', 'nachos cheese'], 'piece', 1, 350, 5, 40, 19, 'portion'],
])

brand('starbucks', 'Starbucks', ['starbucks', 'star bucks', 'sbux', 'starbuck', 'tata starbucks'], 'restaurant', [
  ['latte', 'Caffè latte (tall)', ['latte', 'cafe latte'], 'cup', 1, 150, 10, 15, 6],
  ['cappuccino', 'Cappuccino (tall)', ['cappuccino'], 'cup', 1, 110, 7, 10, 4],
  ['americano', 'Americano (tall)', ['americano', 'black coffee'], 'cup', 1, 10, 1, 2, 0],
  ['mocha', 'Caffè mocha (tall)', ['mocha', 'cafe mocha'], 'cup', 1, 260, 10, 35, 9],
  ['javachip', 'Java Chip Frappuccino (tall)', ['java chip', 'frappuccino', 'java chip frappuccino'], 'glass', 1, 340, 5, 52, 13],
  ['caramelfrap', 'Caramel Frappuccino (tall)', ['caramel frappuccino', 'caramel frappe'], 'glass', 1, 280, 3, 50, 9],
  ['coldbrew', 'Cold brew (tall)', ['cold brew'], 'glass', 1, 5, 0, 1, 0],
  ['croissant', 'Butter croissant', ['croissant'], 'piece', 1, 260, 5, 28, 14, 'croissant'],
  ['muffin', 'Blueberry muffin', ['muffin', 'blueberry muffin'], 'piece', 1, 380, 5, 55, 15, 'muffin'],
])

brand('ccd', 'Café Coffee Day', ['ccd', 'cafe coffee day', 'coffee day', 'cafe cofee day'], 'restaurant', [
  ['cappuccino', 'Cappuccino (regular)', ['cappuccino'], 'cup', 1, 140, 7, 12, 7],
  ['latte', 'Caffè latte (regular)', ['latte'], 'cup', 1, 170, 9, 15, 8],
  ['frappe', 'Café frappé', ['frappe', 'cafe frappe', 'cold coffee'], 'glass', 1, 300, 7, 48, 9],
  ['hotchoc', 'Hot chocolate', ['hot chocolate'], 'cup', 1, 250, 8, 35, 9],
  ['sandwich', 'Veg sandwich', ['sandwich', 'veg sandwich'], 'piece', 1, 300, 9, 38, 12, 'sandwich'],
])

brand('chaayos', 'Chaayos', ['chaayos', 'chayos', 'chaayos chai'], 'restaurant', [
  ['desichai', 'Desi chai (regular)', ['desi chai', 'masala chai', 'chai'], 'cup', 1, 110, 3, 16, 3.5],
  ['bunmaska', 'Bun maska', ['bun maska', 'bun butter'], 'piece', 1, 300, 6, 40, 13, 'bun'],
  ['poha', 'Poha', ['poha'], 'katori', 1, 250, 5, 40, 8],
  ['vadapav', 'Vada pav', ['vada pav'], 'piece', 1, 290, 6, 40, 12, 'vada pav'],
])

brand('chaipoint', 'Chai Point', ['chai point', 'chaipoint'], 'restaurant', [
  ['chai', 'Masala chai (regular)', ['masala chai', 'chai'], 'cup', 1, 110, 3, 16, 3.5],
  ['bunmaska', 'Bun maska', ['bun maska'], 'piece', 1, 300, 6, 40, 13, 'bun'],
  ['samosa', 'Samosa', ['samosa'], 'piece', 1, 260, 4, 30, 14, 'samosa'],
])

brand('thirdwave', 'Third Wave Coffee', ['third wave', 'third wave coffee', 'twc'], 'restaurant', [
  ['latte', 'Latte (regular)', ['latte'], 'cup', 1, 160, 9, 14, 7],
  ['cappuccino', 'Cappuccino (regular)', ['cappuccino'], 'cup', 1, 120, 7, 10, 6],
  ['coldbrew', 'Cold brew', ['cold brew'], 'glass', 1, 5, 0, 1, 0],
])

brand('sagar', 'Sagar Ratna', ['sagar ratna', 'sagar', 'sagar ratnaa', 'sagarratna'], 'restaurant', [
  ['masaladosa', 'Masala dosa', ['masala dosa'], 'piece', 1, 380, 8, 52, 15, 'dosa'],
  ['plaindosa', 'Plain dosa', ['plain dosa', 'dosa'], 'piece', 1, 220, 5, 34, 7, 'dosa'],
  ['paperdosa', 'Paper dosa', ['paper dosa'], 'piece', 1, 300, 6, 45, 10, 'dosa'],
  ['ravamasala', 'Rava masala dosa', ['rava dosa', 'rava masala dosa'], 'piece', 1, 420, 7, 55, 19, 'dosa'],
  ['mysoremasala', 'Mysore masala dosa', ['mysore masala dosa', 'mysore dosa'], 'piece', 1, 450, 9, 58, 20, 'dosa'],
  ['onionuttapam', 'Onion uttapam', ['uttapam', 'onion uttapam'], 'piece', 1, 280, 7, 42, 9, 'uttapam'],
  ['idlisambar', 'Idli sambar (2 idli)', ['idli', 'idli sambar'], 'plate', 1, 220, 8, 40, 3],
  ['vada', 'Medu vada', ['vada', 'medu vada'], 'piece', 2, 130, 4, 13, 7, 'vada'],
  ['sambarvada', 'Sambar vada (2 vada)', ['sambar vada'], 'plate', 1, 350, 12, 40, 16],
  ['ravaidli', 'Rava idli', ['rava idli'], 'piece', 2, 110, 3, 15, 4, 'idli'],
  ['thali', 'South Indian thali', ['thali', 'south indian thali', 'meals'], 'plate', 1, 850, 22, 120, 30],
  ['filtercoffee', 'Filter coffee', ['filter coffee'], 'cup', 1, 100, 3.5, 12, 4],
  ['rasam', 'Rasam', ['rasam'], 'katori', 1, 60, 2, 8, 2],
])

brand('saravana', 'Saravana Bhavan', ['saravana bhavan', 'saravana', 'hsb', 'saravanaa bhavan'], 'restaurant', [
  ['minitiffin', 'Mini tiffin', ['mini tiffin', 'tiffin'], 'plate', 1, 550, 14, 80, 18],
  ['gheeroast', 'Ghee roast dosa', ['ghee roast', 'ghee dosa'], 'piece', 1, 420, 7, 50, 21, 'dosa'],
  ['masaladosa', 'Masala dosa', ['masala dosa'], 'piece', 1, 380, 8, 52, 15, 'dosa'],
  ['meals', 'South Indian meals', ['meals', 'thali'], 'plate', 1, 850, 22, 120, 30],
])

brand('haldirams', "Haldiram's", ['haldirams', 'haldiram', 'haldi ram', 'haldiraam'], 'restaurant', [
  ['rajkachori', 'Raj kachori', ['raj kachori'], 'plate', 1, 420, 10, 55, 18],
  ['cholebhature', 'Chole bhature', ['chole bhature'], 'plate', 1, 650, 16, 75, 30],
  ['pavbhaji', 'Pav bhaji', ['pav bhaji'], 'plate', 1, 500, 11, 65, 22],
  ['dahibhalla', 'Dahi bhalla (2 pcs)', ['dahi bhalla', 'dahi vada'], 'plate', 1, 300, 9, 40, 11],
  ['tikkichaat', 'Aloo tikki chaat', ['aloo tikki', 'tikki chaat'], 'plate', 1, 350, 6, 45, 16],
  ['samosa', 'Samosa', ['samosa'], 'piece', 1, 260, 4, 30, 14, 'samosa'],
  ['rasmalai', 'Rasmalai', ['rasmalai', 'ras malai'], 'piece', 1, 180, 6, 22, 8, 'piece'],
  ['gulabjamun', 'Gulab jamun', ['gulab jamun'], 'piece', 1, 175, 2, 28, 6, 'piece'],
  ['rasgulla', 'Rasgulla', ['rasgulla', 'rasagulla'], 'piece', 1, 125, 2, 28, 0.5, 'piece'],
  ['kajukatli', 'Kaju katli', ['kaju katli', 'kaju barfi'], 'piece', 2, 60, 1, 8, 3, 'piece'],
  ['sonpapdi', 'Soan papdi', ['soan papdi', 'son papdi'], 'piece', 1, 100, 1.5, 13, 5, 'piece'],
  ['aloobhujia', 'Aloo bhujia (30 g)', ['aloo bhujia', 'bhujia'], 'piece', 1, 165, 3.5, 14, 11, 'serving'],
  ['moongdal', 'Moong dal namkeen (30 g)', ['moong dal', 'moong dal namkeen'], 'piece', 1, 160, 7, 15, 8, 'serving'],
  ['navratan', 'Navratan mix (30 g)', ['navratan', 'navrattan', 'mixture'], 'piece', 1, 160, 4, 14, 10, 'serving'],
  ['khattameetha', 'Khatta meetha (30 g)', ['khatta meetha'], 'piece', 1, 155, 4, 17, 8, 'serving'],
])

brand('bikanervala', 'Bikanervala', ['bikanervala', 'bikaner wala', 'bikanerwala', 'bikano', 'bikaji'], 'restaurant', [
  ['rajkachori', 'Raj kachori', ['raj kachori'], 'plate', 1, 420, 10, 55, 18],
  ['cholebhature', 'Chole bhature', ['chole bhature'], 'plate', 1, 650, 16, 75, 30],
  ['rasmalai', 'Rasmalai', ['rasmalai'], 'piece', 1, 180, 6, 22, 8, 'piece'],
  ['bhujia', 'Bikaneri bhujia (30 g)', ['bhujia', 'bikaneri bhujia'], 'piece', 1, 165, 4, 13, 11, 'serving'],
])

brand('wowmomo', 'Wow! Momo', ['wow momo', 'wowmomo', 'wow momos', 'wow'], 'restaurant', [
  ['vegsteamed', 'Veg steamed momo', ['veg momo', 'steamed momo', 'veg steamed'], 'piece', 5, 40, 1.5, 6, 1, 'momo'],
  ['chickensteamed', 'Chicken steamed momo', ['chicken momo', 'chicken steamed'], 'piece', 5, 45, 3, 5, 1.5, 'momo'],
  ['panfried', 'Pan fried momo', ['pan fried momo', 'pan fried'], 'piece', 5, 60, 2, 7, 3, 'momo'],
  ['fried', 'Fried chicken momo', ['fried momo', 'fried chicken momo'], 'piece', 5, 70, 3, 6, 4, 'momo'],
])

brand('behrouz', 'Behrouz Biryani', ['behrouz', 'behrouz biryani', 'behroz', 'behrooz'], 'restaurant', [
  ['chicken', 'Chicken biryani (regular)', ['chicken biryani'], 'plate', 1, 750, 35, 85, 28],
  ['mutton', 'Mutton biryani (regular)', ['mutton biryani'], 'plate', 1, 820, 38, 85, 34],
  ['veg', 'Veg biryani (regular)', ['veg biryani'], 'plate', 1, 600, 13, 90, 20],
  ['paneer', 'Paneer biryani (regular)', ['paneer biryani'], 'plate', 1, 700, 22, 85, 30],
])

brand('paradise', 'Paradise Biryani', ['paradise', 'paradise biryani', 'paradice'], 'restaurant', [
  ['chicken', 'Chicken biryani', ['chicken biryani'], 'plate', 1, 800, 35, 90, 30],
  ['mutton', 'Mutton biryani', ['mutton biryani'], 'plate', 1, 850, 38, 88, 36],
  ['veg', 'Veg biryani', ['veg biryani'], 'plate', 1, 620, 13, 92, 21],
])

brand('faasos', 'Faasos', ['faasos', 'fasos', 'faasoos'], 'restaurant', [
  ['chickenwrap', 'Chicken tikka wrap', ['chicken wrap', 'chicken tikka wrap', 'chicken roll'], 'piece', 1, 480, 25, 50, 20, 'wrap'],
  ['paneerwrap', 'Paneer tikka wrap', ['paneer wrap', 'paneer roll'], 'piece', 1, 520, 20, 55, 24, 'wrap'],
  ['vegwrap', 'Aloo / veg wrap', ['veg wrap', 'aloo wrap'], 'piece', 1, 420, 9, 60, 16, 'wrap'],
])

brand('lapinoz', "La Pino'z", ['la pinoz', 'lapinoz', 'la pinos', 'pinoz'], 'restaurant', [
  ['margherita', 'Margherita (medium slice)', ['margherita'], 'slice', 2, 180, 7, 22, 7, 'slice'],
  ['cheeseburst', 'Cheese burst pizza (medium slice)', ['cheese burst'], 'slice', 2, 260, 10, 25, 13, 'slice'],
  ['paneertikka', 'Paneer tikka pizza (medium slice)', ['paneer tikka pizza', 'paneer pizza'], 'slice', 2, 220, 9, 24, 10, 'slice'],
])

brand('baskin', 'Baskin Robbins', ['baskin robbins', 'baskin', 'br', 'baskin robins'], 'restaurant', [
  ['scoop', 'Ice cream (1 scoop)', ['ice cream', 'scoop'], 'scoop', 1, 160, 3, 20, 8],
  ['mudpie', 'Mississippi mud (1 scoop)', ['mississippi mud', 'mud pie'], 'scoop', 1, 180, 3, 22, 9],
  ['sundae', 'Sundae', ['sundae'], 'piece', 1, 400, 6, 50, 20, 'sundae'],
])

brand('naturals', 'Naturals Ice Cream', ['naturals', 'natural ice cream', 'naturals ice cream'], 'restaurant', [
  ['tendercoconut', 'Tender coconut (1 scoop)', ['tender coconut'], 'scoop', 1, 120, 2, 15, 6],
  ['sitaphal', 'Sitaphal (1 scoop)', ['sitaphal', 'custard apple'], 'scoop', 1, 130, 2, 17, 6],
])

brand('theobroma', 'Theobroma', ['theobroma', 'theo broma', 'theobromma'], 'restaurant', [
  ['brownie', 'Overload brownie', ['brownie', 'overload brownie'], 'piece', 1, 350, 4, 40, 20, 'brownie'],
  ['truffle', 'Chocolate truffle pastry', ['truffle pastry', 'chocolate pastry'], 'piece', 1, 380, 5, 40, 22, 'pastry'],
  ['redvelvet', 'Red velvet pastry', ['red velvet'], 'piece', 1, 400, 4, 50, 20, 'pastry'],
  ['croissant', 'Butter croissant', ['croissant'], 'piece', 1, 260, 5, 28, 14, 'croissant'],
])

/* ───────────────────────── Packaged foods ───────────────────────── */

brand('cadbury', 'Cadbury', ['cadbury', 'cadburys', 'cadbary'], 'packaged', [
  ['dm13', 'Dairy Milk (13 g)', ['dairy milk', 'dairymilk', 'dairy milk small'], 'piece', 1, 70, 1, 7.5, 3.9, 'bar'],
  ['dm23', 'Dairy Milk (23 g)', ['dairy milk', 'dairy milk 23g'], 'piece', 1, 125, 2, 13, 7, 'bar'],
  ['dm50', 'Dairy Milk (50 g)', ['dairy milk', 'dairy milk large', 'dairy milk 50g'], 'piece', 1, 265, 4, 29, 15, 'bar'],
  ['silk', 'Dairy Milk Silk (60 g)', ['silk', 'dairy milk silk'], 'piece', 1, 330, 5, 34, 19, 'bar'],
  ['fruitnut', 'Dairy Milk Fruit & Nut (36 g)', ['fruit and nut', 'fruit n nut'], 'piece', 1, 190, 3, 20, 11, 'bar'],
  ['fivestar', '5 Star (40 g)', ['5 star', 'five star', 'fivestar'], 'piece', 1, 190, 1.5, 27, 8.5, 'bar'],
  ['perk', 'Perk (13 g)', ['perk'], 'piece', 1, 65, 0.8, 8.5, 3.2, 'bar'],
  ['gems', 'Gems (17.8 g)', ['gems'], 'piece', 1, 85, 1, 13, 3.3, 'pack'],
  ['bournville', 'Bournville dark (2 squares)', ['bournville', 'dark chocolate'], 'piece', 1, 100, 1.2, 10, 6, 'serving'],
  ['oreo', 'Oreo biscuit', ['oreo'], 'piece', 3, 55, 0.5, 8, 2.3, 'biscuit'],
  ['bournvita', 'Bournvita (20 g)', ['bournvita'], 'piece', 1, 77, 1.4, 17, 0.4, 'serving'],
])

brand('nestle', 'Nestlé', ['nestle', 'nestlé', 'nestly'], 'packaged', [
  ['kitkat4', 'KitKat 4 finger (37 g)', ['kitkat', 'kit kat', 'kitkat 4 finger'], 'piece', 1, 195, 2.5, 23, 10, 'bar'],
  ['kitkat2', 'KitKat 2 finger (18 g)', ['kitkat', 'kitkat 2 finger', 'kitkat small'], 'piece', 1, 95, 1.2, 11, 5, 'bar'],
  ['munch', 'Munch (10 g)', ['munch'], 'piece', 1, 50, 0.6, 6.5, 2.5, 'bar'],
  ['milkybar', 'Milkybar (12.5 g)', ['milkybar', 'milky bar'], 'piece', 1, 70, 1, 7, 4, 'bar'],
  ['maggi', 'Maggi masala noodles (70 g)', ['maggi', 'maggi noodles', 'masala noodles'], 'piece', 1, 313, 6.7, 45, 12, 'pack'],
  ['maggiatta', 'Maggi atta noodles (72 g)', ['maggi atta', 'atta noodles'], 'piece', 1, 300, 8, 42, 11, 'pack'],
  ['cornflakes', 'Corn flakes (30 g, dry)', ['corn flakes', 'cornflakes'], 'piece', 1, 115, 2, 26, 0.2, 'serving'],
  ['nescafe', 'Nescafé Classic (1 tsp, black)', ['nescafe', 'instant coffee'], 'cup', 1, 3, 0.3, 0.3, 0],
])

brand('mars', 'Mars Wrigley', ['mars', 'snickers', 'galaxy'], 'packaged', [
  ['snickers', 'Snickers (50 g)', ['snickers'], 'piece', 1, 245, 4, 30, 12, 'bar'],
  ['snickers22', 'Snickers mini (22 g)', ['snickers mini', 'snickers small'], 'piece', 1, 108, 2, 13, 5.3, 'bar'],
  ['galaxy', 'Galaxy smooth milk (2 squares)', ['galaxy'], 'piece', 1, 110, 1.5, 12, 6.5, 'serving'],
])

brand('ferrero', 'Ferrero', ['ferrero', 'ferrero rocher', 'nutella'], 'packaged', [
  ['rocher', 'Ferrero Rocher', ['ferrero rocher', 'rocher'], 'piece', 2, 73, 1, 5, 5, 'piece'],
  ['nutella', 'Nutella (1 tbsp)', ['nutella'], 'tbsp', 1, 80, 1, 9, 4.6],
  ['kinderjoy', 'Kinder Joy', ['kinder joy', 'kinder'], 'piece', 1, 110, 1.6, 10, 7, 'egg'],
])

brand('amul', 'Amul', ['amul', 'amool', 'amul india'], 'packaged', [
  ['darkchoc', 'Amul dark chocolate (2 squares)', ['dark chocolate', 'amul dark'], 'piece', 1, 100, 1.4, 9, 6.5, 'serving'],
  ['kool', 'Amul Kool (180 ml)', ['kool', 'amul kool', 'flavoured milk', 'kool cafe'], 'piece', 1, 160, 5, 25, 4.5, 'bottle'],
  ['lassi', 'Amul lassi (200 ml)', ['lassi'], 'piece', 1, 180, 5, 28, 5, 'pack'],
  ['proteinlassi', 'Amul high protein lassi (200 ml)', ['protein lassi', 'high protein lassi'], 'piece', 1, 130, 15, 14, 1.5, 'pack'],
  ['proteinbm', 'Amul high protein buttermilk (200 ml)', ['protein buttermilk', 'high protein buttermilk'], 'piece', 1, 76, 15, 3, 0.5, 'pack'],
  ['masti', 'Amul Masti buttermilk (200 ml)', ['masti', 'buttermilk', 'chaas'], 'piece', 1, 40, 2, 3, 2, 'pack'],
  ['cheese', 'Amul cheese slice', ['cheese slice', 'cheese'], 'piece', 1, 62, 4, 1, 4.6, 'slice'],
  ['butter', 'Amul butter (10 g)', ['butter'], 'piece', 1, 72, 0, 0, 8, 'serving'],
  ['icecreamcup', 'Amul ice cream cup (100 ml)', ['ice cream cup', 'ice cream'], 'piece', 1, 120, 2, 15, 6, 'cup'],
  ['proteinmilk', 'Amul protein milkshake (200 ml)', ['protein shake', 'protein milkshake'], 'piece', 1, 150, 20, 10, 3, 'bottle'],
  ['dahi', 'Amul masti dahi (200 g)', ['dahi', 'curd'], 'piece', 1, 180, 7, 10, 12, 'cup'],
])

brand('motherdairy', 'Mother Dairy', ['mother dairy', 'motherdairy'], 'packaged', [
  ['mishtidoi', 'Mishti doi (cup)', ['mishti doi'], 'piece', 1, 160, 5, 24, 4.5, 'cup'],
  ['lassi', 'Lassi (200 ml)', ['lassi'], 'piece', 1, 170, 5, 26, 5, 'pack'],
  ['chocobar', 'Chocobar', ['chocobar', 'choco bar'], 'piece', 1, 140, 2, 15, 8, 'bar'],
])

brand('kwality', "Kwality Wall's", ['kwality walls', 'kwality', 'walls', 'cornetto', 'magnum'], 'packaged', [
  ['cornetto', 'Cornetto double chocolate', ['cornetto'], 'piece', 1, 200, 3, 24, 10, 'cone'],
  ['magnum', 'Magnum classic', ['magnum'], 'piece', 1, 250, 3, 25, 15, 'bar'],
  ['feastchoco', 'Feast chocolate', ['feast'], 'piece', 1, 230, 3, 22, 14, 'bar'],
])

brand('epigamia', 'Epigamia', ['epigamia', 'epigamea'], 'packaged', [
  ['greek', 'Greek yogurt (90 g)', ['greek yogurt', 'greek yoghurt'], 'piece', 1, 100, 8, 8, 4, 'cup'],
  ['proteinyogurt', 'Protein yogurt (120 g)', ['protein yogurt'], 'piece', 1, 120, 15, 9, 2.5, 'cup'],
])

brand('yakult', 'Yakult', ['yakult', 'yakul'], 'packaged', [['bottle', 'Yakult (65 ml)', ['yakult'], 'piece', 1, 50, 0.8, 11, 0.1, 'bottle']])

brand('lays', "Lay's", ['lays', 'lay s', 'lais', 'lay'], 'packaged', [
  ['classic', "Lay's Classic Salted (52 g)", ['classic salted', 'salted chips'], 'piece', 1, 280, 3.5, 28, 17, 'pack'],
  ['magicmasala', "Lay's India's Magic Masala (52 g)", ['magic masala', 'blue lays'], 'piece', 1, 275, 3.5, 29, 16, 'pack'],
  ['cream', "Lay's American Style Cream & Onion (52 g)", ['cream and onion', 'cream onion'], 'piece', 1, 278, 3.5, 28, 17, 'pack'],
  ['small', "Lay's small pack (26 g)", ['small lays', 'chips small'], 'piece', 1, 140, 1.8, 14, 8.5, 'pack'],
])

brand('pepsico', 'Kurkure & Doritos', ['kurkure', 'doritos', 'cheetos', 'kurkure masala munch'], 'packaged', [
  ['kurkure', 'Kurkure Masala Munch (40 g)', ['kurkure', 'masala munch'], 'piece', 1, 220, 2.5, 24, 13, 'pack'],
  ['kurkurebig', 'Kurkure Masala Munch (90 g)', ['kurkure big', 'kurkure large'], 'piece', 1, 495, 5.5, 54, 29, 'pack'],
  ['doritos', 'Doritos Nacho Cheese (50 g)', ['doritos', 'nacho chips'], 'piece', 1, 250, 3.5, 30, 13, 'pack'],
])

brand('itc', 'ITC (Bingo, Yippee, Sunfeast)', ['itc', 'bingo', 'yippee', 'sunfeast', 'dark fantasy'], 'packaged', [
  ['madangles', 'Bingo Mad Angles (66 g)', ['mad angles', 'bingo'], 'piece', 1, 335, 4.5, 40, 17, 'pack'],
  ['tedhemedhe', 'Bingo Tedhe Medhe (60 g)', ['tedhe medhe'], 'piece', 1, 310, 4, 36, 17, 'pack'],
  ['yippee', 'Yippee noodles (70 g)', ['yippee', 'yippee noodles'], 'piece', 1, 330, 7, 44, 14, 'pack'],
  ['darkfantasy', 'Dark Fantasy Choco Fills', ['dark fantasy', 'choco fills'], 'piece', 2, 70, 0.8, 8.5, 3.5, 'biscuit'],
  ['marielight', 'Sunfeast Marie Light', ['marie light'], 'piece', 4, 25, 0.4, 4.2, 0.7, 'biscuit'],
  ['moms', 'Sunfeast Mom’s Magic (cashew)', ['moms magic'], 'piece', 3, 50, 0.6, 6.5, 2.4, 'biscuit'],
])

brand('unclechipps', 'Uncle Chipps', ['uncle chipps', 'uncle chips'], 'packaged', [['plain', 'Uncle Chipps (55 g)', ['uncle chipps', 'spicy treat'], 'piece', 1, 300, 3.5, 30, 18, 'pack']])
brand('pringles', 'Pringles', ['pringles', 'pringle'], 'packaged', [['original', 'Pringles (30 g serving)', ['pringles'], 'piece', 1, 160, 1.5, 15, 10, 'serving']])

brand('parle', 'Parle', ['parle', 'parle g', 'parleg', 'parle-g'], 'packaged', [
  ['parleg', 'Parle-G biscuit', ['parle g', 'glucose biscuit'], 'piece', 4, 25, 0.3, 3.8, 0.8, 'biscuit'],
  ['monaco', 'Monaco biscuit', ['monaco'], 'piece', 6, 15, 0.2, 2, 0.6, 'biscuit'],
  ['krackjack', 'KrackJack biscuit', ['krackjack', 'krack jack'], 'piece', 4, 30, 0.5, 4, 1.3, 'biscuit'],
  ['hideseek', 'Hide & Seek biscuit', ['hide and seek', 'hide n seek'], 'piece', 3, 40, 0.5, 5.5, 1.8, 'biscuit'],
  ['bourbon', 'Parle Bourbon', ['bourbon'], 'piece', 3, 55, 0.6, 8, 2.3, 'biscuit'],
  ['melody', 'Melody toffee', ['melody'], 'piece', 2, 20, 0, 4, 0.4, 'toffee'],
  ['frooti', 'Frooti (160 ml)', ['frooti', 'mango drink'], 'piece', 1, 100, 0, 25, 0, 'pack'],
  ['appy', 'Appy Fizz (250 ml)', ['appy fizz', 'appy'], 'piece', 1, 120, 0, 30, 0, 'bottle'],
])

brand('britannia', 'Britannia', ['britannia', 'britania', 'brittania'], 'packaged', [
  ['goodday', 'Good Day cashew biscuit', ['good day', 'goodday'], 'piece', 3, 50, 0.7, 6.5, 2.4, 'biscuit'],
  ['marie', 'Marie Gold biscuit', ['marie gold', 'marie'], 'piece', 4, 26, 0.4, 4.5, 0.7, 'biscuit'],
  ['bourbon', 'Bourbon biscuit', ['bourbon'], 'piece', 3, 55, 0.6, 8, 2.3, 'biscuit'],
  ['nutrichoice', 'NutriChoice digestive', ['nutrichoice', 'digestive'], 'piece', 3, 65, 1, 9, 2.7, 'biscuit'],
  ['jimjam', 'Jim Jam', ['jim jam', 'jimjam'], 'piece', 3, 55, 0.6, 8.5, 2, 'biscuit'],
  ['50-50', '50-50 biscuit', ['50 50', 'fifty fifty'], 'piece', 4, 30, 0.5, 3.8, 1.4, 'biscuit'],
  ['cake', 'Britannia fruit cake slice', ['fruit cake', 'cake slice'], 'piece', 1, 110, 1.5, 15, 5, 'slice'],
  ['muffin', 'Britannia choco muffin', ['muffin'], 'piece', 1, 180, 2.5, 22, 9, 'muffin'],
  ['bread', 'Britannia brown bread', ['brown bread'], 'slice', 2, 65, 2.5, 12, 0.8, 'slice'],
])

brand('mcvities', "McVitie's", ['mcvities', 'mc vities'], 'packaged', [['digestive', "McVitie's digestive", ['digestive'], 'piece', 2, 70, 1, 9, 3, 'biscuit']])

brand('actii', 'Act II', ['act ii', 'act 2', 'act two', 'act2'], 'packaged', [
  ['butter', 'Act II butter popcorn (popped bag)', ['butter popcorn', 'microwave popcorn'], 'piece', 1, 330, 5, 40, 17, 'bag'],
  ['classic', 'Act II classic salted (popped bag)', ['salted popcorn', 'classic salted'], 'piece', 1, 310, 5, 40, 15, 'bag'],
  ['rte', 'Act II ready-to-eat popcorn (40 g)', ['ready to eat popcorn', 'popcorn pack'], 'piece', 1, 200, 3, 24, 10, 'pack'],
])

brand('cinema', 'PVR / INOX cinema', ['pvr', 'inox', 'cinepolis', 'cinema', 'movie theatre', 'multiplex'], 'restaurant', [
  ['saltedpop', 'Salted popcorn (regular tub)', ['salted popcorn', 'popcorn'], 'piece', 1, 400, 6, 45, 22, 'tub'],
  ['caramelpop', 'Caramel popcorn (regular tub)', ['caramel popcorn'], 'piece', 1, 500, 4, 85, 16, 'tub'],
  ['nachos', 'Nachos with cheese dip', ['nachos'], 'piece', 1, 450, 6, 50, 25, 'tray'],
  ['coke', 'Soft drink (regular)', ['coke', 'pepsi', 'soft drink'], 'piece', 1, 180, 0, 45, 0, 'cup'],
])

brand('cocacola', 'Coca-Cola', ['coca cola', 'coke', 'cocacola', 'thums up', 'sprite', 'fanta', 'limca'], 'packaged', [
  ['can', 'Coke / Thums Up can (300 ml)', ['coke can', 'thums up can', 'coke'], 'piece', 1, 126, 0, 32, 0, 'can'],
  ['zero', 'Coke Zero / Diet Coke can', ['coke zero', 'diet coke'], 'piece', 1, 1, 0, 0, 0, 'can'],
  ['maaza', 'Maaza (250 ml)', ['maaza'], 'piece', 1, 150, 0, 37, 0, 'bottle'],
  ['spritecan', 'Sprite can (300 ml)', ['sprite'], 'piece', 1, 120, 0, 30, 0, 'can'],
])

brand('pepsi', 'Pepsi', ['pepsi', 'mountain dew', '7up', 'mirinda', 'slice drink'], 'packaged', [
  ['can', 'Pepsi can (300 ml)', ['pepsi'], 'piece', 1, 130, 0, 33, 0, 'can'],
  ['slice', 'Slice mango (250 ml)', ['slice', 'slice mango'], 'piece', 1, 150, 0, 37, 0, 'bottle'],
])

brand('redbull', 'Red Bull', ['red bull', 'redbull', 'energy drink'], 'packaged', [['can', 'Red Bull (250 ml)', ['red bull', 'energy drink'], 'piece', 1, 112, 0, 28, 0, 'can']])
brand('sting', 'Sting', ['sting'], 'packaged', [['can', 'Sting (250 ml)', ['sting'], 'piece', 1, 110, 0, 27, 0, 'bottle']])
brand('paperboat', 'Paper Boat', ['paper boat', 'paperboat'], 'packaged', [['drink', 'Paper Boat drink (200 ml)', ['aam panna', 'jaljeera', 'paper boat'], 'piece', 1, 100, 0, 25, 0, 'pack']])
brand('real', 'Real juice', ['real juice', 'real fruit power', 'tropicana', 'b natural'], 'packaged', [['juice', 'Packaged fruit juice (200 ml)', ['juice', 'fruit juice', 'tropicana'], 'piece', 1, 110, 0.5, 27, 0, 'pack']])

brand('kelloggs', "Kellogg's", ['kelloggs', 'kellogs', 'kellog'], 'packaged', [
  ['cornflakes', 'Corn Flakes (30 g, dry)', ['corn flakes', 'cornflakes'], 'piece', 1, 115, 2, 26, 0.2, 'serving'],
  ['chocos', 'Chocos (30 g, dry)', ['chocos'], 'piece', 1, 115, 2, 25, 1, 'serving'],
  ['muesli', 'Muesli (45 g, dry)', ['muesli'], 'piece', 1, 175, 4, 32, 3, 'serving'],
])

brand('yogabar', 'Yoga Bar', ['yoga bar', 'yogabar'], 'packaged', [
  ['protein', 'Yoga Bar protein bar (60 g)', ['protein bar'], 'piece', 1, 257, 20, 24, 9, 'bar'],
  ['muesli', 'Yoga Bar muesli (50 g)', ['muesli'], 'piece', 1, 200, 6, 32, 5, 'serving'],
])
brand('ritebite', 'RiteBite Max Protein', ['ritebite', 'rite bite', 'max protein'], 'packaged', [
  ['daily', 'Max Protein Daily bar (50 g)', ['protein bar', 'max protein'], 'piece', 1, 198, 10, 26, 6, 'bar'],
  ['professional', 'Max Protein Professional (70 g)', ['professional bar'], 'piece', 1, 270, 20, 28, 9, 'bar'],
])
brand('wholetruth', 'The Whole Truth', ['the whole truth', 'whole truth', 'twt'], 'packaged', [['bar', 'Whole Truth protein bar (52 g)', ['protein bar'], 'piece', 1, 230, 12, 22, 11, 'bar']])
brand('muscleblaze', 'MuscleBlaze', ['muscleblaze', 'muscle blaze', 'mb'], 'packaged', [
  ['bar', 'MuscleBlaze protein bar (72 g)', ['protein bar'], 'piece', 1, 280, 22, 30, 8, 'bar'],
  ['whey', 'MuscleBlaze whey (1 scoop)', ['whey', 'whey protein'], 'scoop', 1, 130, 25, 4, 1.8],
])
brand('haldiramspack', "Haldiram's (packets)", ['haldirams namkeen', 'haldiram namkeen', 'haldirams packet'], 'packaged', [
  ['bananachips', 'Banana chips (30 g)', ['banana chips', 'kerala chips'], 'piece', 1, 155, 0.7, 17, 10, 'serving'],
  ['bhujiapack', 'Aloo bhujia pack (200 g)', ['aloo bhujia pack'], 'piece', 0.25, 1100, 23, 92, 73, 'pack'],
])
brand('bakery', 'Bakery (any)', ['bakery', 'monginis', 'cake shop', 'patisserie'], 'restaurant', [
  ['blackforest', 'Black forest pastry', ['black forest', 'pastry'], 'piece', 1, 300, 4, 38, 15, 'pastry'],
  ['truffle', 'Chocolate truffle pastry', ['chocolate truffle', 'truffle pastry', 'chocolate pastry'], 'piece', 1, 380, 5, 40, 22, 'pastry'],
  ['pineapple', 'Pineapple pastry', ['pineapple pastry'], 'piece', 1, 280, 3, 40, 12, 'pastry'],
  ['redvelvet', 'Red velvet pastry', ['red velvet'], 'piece', 1, 380, 4, 48, 19, 'pastry'],
  ['vegpuff', 'Veg puff', ['veg puff', 'puff', 'patties', 'veg patty'], 'piece', 1, 280, 5, 28, 17, 'puff'],
  ['eggpuff', 'Egg puff', ['egg puff'], 'piece', 1, 300, 8, 26, 18, 'puff'],
  ['chickenpuff', 'Chicken puff', ['chicken puff', 'chicken patty'], 'piece', 1, 320, 10, 26, 19, 'puff'],
  ['donut', 'Glazed donut', ['donut', 'doughnut'], 'piece', 1, 250, 3, 30, 13, 'donut'],
  ['cookie', 'Bakery cookie', ['cookie', 'cookies'], 'piece', 2, 90, 1, 12, 4.5, 'cookie'],
  ['creamroll', 'Cream roll', ['cream roll'], 'piece', 1, 220, 3, 25, 12, 'roll'],
])

export const BRAND_BY_ID: Record<string, Brand> = Object.fromEntries(BRANDS.map((b) => [b.id, b]))
