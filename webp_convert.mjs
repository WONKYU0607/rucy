/**
 * paleo-defense 이미지 일괄 WebP 변환 (Node + sharp)
 *
 * 준비:  npm i -D sharp
 * 사용:  node webp_convert.mjs public                      // 미리보기 (아무것도 안 바꿈)
 *        node webp_convert.mjs public --apply              // 실제 변환 (원본 유지)
 *        node webp_convert.mjs public --apply --delete-src // 원본까지 삭제
 *
 * 규칙
 *   png  → WebP 무손실 (픽셀 손실 0)
 *   jpg  → WebP 손실 품질 92 (원본이 이미 손실이라 무손실은 오히려 커짐)
 *   webp → 건너뜀
 *   해상도는 건드리지 않음 — 스킬 위치·크기 재조정 불필요
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const args = process.argv.slice(2)
const root = args[0]
const APPLY = args.includes('--apply')
const DEL = args.includes('--delete-src')
const JPG_QUALITY = 92

if (!root) {
  console.log('사용법: node webp_convert.mjs public [--apply] [--delete-src]')
  process.exit(1)
}
if (DEL && !APPLY) {
  console.log('--delete-src 는 --apply 와 함께 써야 합니다.')
  process.exit(1)
}

const human = n => {
  const u = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return n.toFixed(1) + u[i]
}

async function walk(dir, out = []) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) await walk(p, out)
    else {
      const ext = path.extname(e.name).toLowerCase()
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') out.push(p)
    }
  }
  return out
}

const files = (await walk(root)).sort()
if (!files.length) {
  console.log('변환할 png/jpg 가 없습니다. 경로 확인:', root)
  process.exit(0)
}
console.log(`${APPLY ? '변환' : '미리보기'} 대상 ${files.length}장\n`)

const stats = new Map()   // 최상위 폴더별 [장수, before, after]
const errors = []
let done = 0

for (const src of files) {
  const rel = path.relative(root, src)
  const top = rel.includes(path.sep) ? rel.split(path.sep)[0] : '(루트)'
  const ext = path.extname(src).toLowerCase()
  const dst = src.slice(0, -ext.length) + '.webp'
  let before = 0, after = 0
  try {
    before = (await fs.stat(src)).size
    const img = sharp(src)
    const opts = ext === '.png'
      ? { lossless: true, quality: 100, effort: 4 }
      : { quality: JPG_QUALITY, effort: 4 }
    const buf = await img.webp(opts).toBuffer()
    after = buf.length
    if (APPLY) {
      await fs.writeFile(dst, buf)
      if (DEL) await fs.rm(src)
    }
  } catch (e) {
    after = before
    errors.push([rel, e.message])
  }
  const s = stats.get(top) || [0, 0, 0]
  s[0]++; s[1] += before; s[2] += after
  stats.set(top, s)
  if (++done % 50 === 0) console.log(`  … ${done}/${files.length}`)
}

const pad = (s, n) => String(s).padEnd(n)
const padS = (s, n) => String(s).padStart(n)
console.log(`\n${pad('폴더', 18)}${padS('장수', 6)}${padS('변환 전', 12)}${padS('변환 후', 12)}${padS('절감', 8)}`)
console.log('-'.repeat(56))
let tb = 0, ta = 0
for (const k of [...stats.keys()].sort()) {
  const [n, b, a] = stats.get(k)
  tb += b; ta += a
  console.log(`${pad(k, 18)}${padS(n, 6)}${padS(human(b), 12)}${padS(human(a), 12)}${padS(((1 - a / b) * 100).toFixed(0) + '%', 8)}`)
}
console.log('-'.repeat(56))
console.log(`${pad('합계', 18)}${padS(files.length, 6)}${padS(human(tb), 12)}${padS(human(ta), 12)}${padS(((1 - ta / tb) * 100).toFixed(0) + '%', 8)}`)

if (errors.length) {
  console.log(`\n실패 ${errors.length}건 (원본 그대로 둠):`)
  for (const [rel, msg] of errors.slice(0, 30)) console.log('  ', rel, '—', msg)
  if (errors.length > 30) console.log(`   … 외 ${errors.length - 30}건`)
}
console.log(APPLY
  ? '\n변환 완료. 코드의 이미지 경로 확장자를 .webp 로 바꿔야 화면에 나옵니다.'
  : '\n실제로 바꾸려면 --apply 를 붙여 다시 실행하세요.')
