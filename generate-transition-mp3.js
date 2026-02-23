// scripts/generate-transition-mp3.js
import fs from 'fs'
import lamejs from 'lamejs'

const sampleRate = 44100
const durationSeconds = 0.3
const samples = sampleRate * durationSeconds

const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128)
const buffer = []

for (let i = 0; i < samples; i++) {
  const t = i / sampleRate
  const sample =
    Math.sin(2 * Math.PI * 880 * t) * (1 - t / durationSeconds)
  buffer.push(sample * 32767)
}

const mp3Data = []
let mp3buf = mp3encoder.encodeBuffer(Int16Array.from(buffer))
if (mp3buf.length) mp3Data.push(Buffer.from(mp3buf))
mp3buf = mp3encoder.flush()
if (mp3buf.length) mp3Data.push(Buffer.from(mp3buf))

fs.mkdirSync('public', { recursive: true })
fs.writeFileSync('public/transition.mp3', Buffer.concat(mp3Data))

console.log('transition.mp3 generated')
