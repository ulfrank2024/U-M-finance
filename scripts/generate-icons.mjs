import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'

const sizes = [192, 512]

// SVG de l'icône — cœur + "U&M" sur fond dégradé fuchsia/violet
function makeSvg(size) {
  const pad = size * 0.12
  const inner = size - pad * 2
  const fontSize = size * 0.22
  const subSize = size * 0.13
  const heartY = size * 0.35
  const heartSize = size * 0.28

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a0a2e"/>
      <stop offset="100%" style="stop-color:#0d0d1a"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#e879f9"/>
      <stop offset="100%" style="stop-color:#818cf8"/>
    </linearGradient>
  </defs>

  <!-- Fond -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>

  <!-- Cercle glow -->
  <circle cx="${size / 2}" cy="${size * 0.42}" r="${size * 0.32}" fill="url(#glow)" opacity="0.15"/>

  <!-- Cœur -->
  <text
    x="${size / 2}"
    y="${heartY + heartSize * 0.85}"
    text-anchor="middle"
    font-size="${heartSize}"
    fill="url(#glow)"
  >💑</text>

  <!-- U&M -->
  <text
    x="${size / 2}"
    y="${size * 0.75}"
    text-anchor="middle"
    font-family="Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="#fafafa"
    letter-spacing="2"
  >U&amp;M</text>

  <!-- Finance -->
  <text
    x="${size / 2}"
    y="${size * 0.88}"
    text-anchor="middle"
    font-family="Arial, sans-serif"
    font-size="${subSize}"
    fill="#a1a1aa"
    letter-spacing="1"
  >Finance</text>
</svg>`
}

async function generate() {
  const outDir = new URL('../public/icons', import.meta.url).pathname.replace(/%20/g, ' ')
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true })

  for (const size of sizes) {
    const svg = Buffer.from(makeSvg(size))
    const outPath = `${outDir}/icon-${size}.png`
    await sharp(svg).png().toFile(outPath)
    console.log(`✓ icon-${size}.png`)
  }

  console.log('\n✅ Icônes PWA générées dans public/icons/')
}

generate().catch(console.error)
