// scripts/generate-icon.js
import { createCanvas } from 'canvas'
import fs from 'fs'

const size = 144
const canvas = createCanvas(size, size)
const ctx = canvas.getContext('2d')

// background
ctx.fillStyle = '#111827' // slate-900
ctx.fillRect(0, 0, size, size)

// text
ctx.fillStyle = '#ffffff'
ctx.font = 'bold 64px sans-serif'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('X', size / 2, size / 2)

fs.mkdirSync('public/icons', { recursive: true })
fs.writeFileSync(
  'public/icons/icon-144x144.png',
  canvas.toBuffer('image/png')
)

console.log('icon-144x144.png generated')
