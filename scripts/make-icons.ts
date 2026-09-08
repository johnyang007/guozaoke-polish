import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

function crc32(buf: Buffer): number {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

type RGBA = [number, number, number, number]

/** 生成 size×size 的 RGBA PNG。pixel(x, y) 返回 [r, g, b, a]。 */
function png(size: number, pixel: (x: number, y: number) => RGBA): Buffer {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y)
      raw[o++] = r
      raw[o++] = g
      raw[o++] = b
      raw[o++] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const BG = [217, 119, 6] as const // --gzk-accent
const FG = [255, 255, 255] as const

fs.mkdirSync(path.join('extension', 'images'), { recursive: true })

for (const size of [16, 32, 48, 128]) {
  const r = size * 0.22
  const buf = png(size, (x, y): RGBA => {
    const cx = Math.min(x + 0.5, size - x - 0.5)
    const cy = Math.min(y + 0.5, size - y - 0.5)
    // 圆角矩形遮罩
    if (cx < r && cy < r && Math.hypot(r - cx, r - cy) > r) return [0, 0, 0, 0]
    // 三条白色横杠，象征主题列表
    const unit = size / 16
    const inX = x > 3.5 * unit && x < 12.5 * unit
    const bars = [4.5, 7.5, 10.5].some((by) => y > by * unit && y < (by + 1.2) * unit)
    if (inX && bars) return [FG[0], FG[1], FG[2], 255]
    return [BG[0], BG[1], BG[2], 255]
  })
  fs.writeFileSync(path.join('extension', 'images', `icon-${size}.png`), buf)
}

console.log('icons generated')
