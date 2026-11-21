// Generates PWA PNG icons + favicon.svg with zero image dependencies.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const NAVY = [10, 37, 64], GREEN = [16, 185, 129], AMBER = [245, 158, 11], CORAL = [244, 63, 94], YELLOW = [249, 198, 66]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
const png = (size, px) => {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

// Shapes in a 0..1 unit space. Bars = Ceiling / Floor / Miss staircase.
const roundRect = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}
const shapes = (s) => [ // s = content scale (smaller for maskable safe zone)
  { c: GREEN, t: (x, y) => roundRect(x, y, 0.5 - 0.3 * s, 0.5 - 0.22 * s, 0.5 + 0.3 * s, 0.5 - 0.1 * s, 0.06 * s) },
  { c: AMBER, t: (x, y) => roundRect(x, y, 0.5 - 0.3 * s, 0.5 - 0.06 * s, 0.5 + 0.14 * s, 0.5 + 0.06 * s, 0.06 * s) },
  { c: CORAL, t: (x, y) => roundRect(x, y, 0.5 - 0.3 * s, 0.5 + 0.1 * s, 0.5 - 0.06 * s, 0.5 + 0.22 * s, 0.06 * s) },
  { c: YELLOW, t: (x, y) => (x - (0.5 + 0.24 * s)) ** 2 + (y - (0.5 + 0.16 * s)) ** 2 <= (0.065 * s) ** 2 },
]

const render = (size, { maskable = false, rounded = false } = {}) => {
  const px = Buffer.alloc(size * size * 4)
  const SS = 4, sh = shapes(maskable ? 0.78 : 1)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const u = (x + (sx + 0.5) / SS) / size, v = (y + (sy + 0.5) / SS) / size
      const inBg = rounded ? roundRect(u, v, 0, 0, 1, 1, 0.22) : true
      if (!inBg) continue
      let col = NAVY
      for (const s of sh) if (s.t(u, v)) col = s.c
      r += col[0]; g += col[1]; b += col[2]; a += 255
    }
    const n = SS * SS, i = (y * size + x) * 4
    const cov = a / 255 || 1
    px[i] = r / cov; px[i + 1] = g / cov; px[i + 2] = b / cov; px[i + 3] = a / n
  }
  return png(size, px)
}

mkdirSync('public', { recursive: true })
writeFileSync('public/pwa-192x192.png', render(192, { rounded: true }))
writeFileSync('public/pwa-512x512.png', render(512, { rounded: true }))
writeFileSync('public/maskable-512x512.png', render(512, { maskable: true }))
writeFileSync('public/apple-touch-icon.png', render(180)) // iOS applies its own mask
writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="22" fill="#0A2540"/>
<rect x="20" y="28" width="60" height="12" rx="6" fill="#10B981"/>
<rect x="20" y="44" width="44" height="12" rx="6" fill="#F59E0B"/>
<rect x="20" y="60" width="24" height="12" rx="6" fill="#F43F5E"/>
<circle cx="74" cy="66" r="6.5" fill="#F9C642"/>
</svg>
`)
console.log('Icons written to public/')
