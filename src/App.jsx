import React, { useEffect, useRef, useState } from 'react'

// ── 스프라이트 프레임 (flip: 좌우 반전 여부 — 방향 틀리면 여기만 수정) ──
const FRAMES = {
  idle:     { src: '/hero_idle.png',     flip: true  },
  windup:   { src: '/hero_windup.png',   flip: false },
  release:  { src: '/hero_release.png',  flip: false },
  recovery: { src: '/hero_recovery.png', flip: false },
  hit:      { src: '/hero_hit.png',      flip: false },
}
const IMG = {}
for (const k in FRAMES) { const im = new Image(); im.src = FRAMES[k].src; IMG[k] = im }
const BG = new Image(); BG.src = '/bg.jpg'

const HERO_X = 70
const HERO_H = 130
const THROW = { windupEnd: 0.14, releaseEnd: 0.30, total: 0.42 } // 초 단위, releaseEnd 시작 시 돌 발사

// ── 적 정의 ──
const ENEMY_TYPES = {
  boar:  { name: '멧돼지', hp: 25,  speed: 55, dmg: 6,  reward: 5,  size: 26, color: '#8d6e63' },
  wolf:  { name: '늑대',   hp: 45,  speed: 75, dmg: 10, reward: 9,  size: 30, color: '#78909c' },
  hyena: { name: '하이에나', hp: 90, speed: 48, dmg: 16, reward: 15, size: 34, color: '#a1887f' },
  tiger: { name: '검치호', hp: 800, speed: 38, dmg: 45, reward: 200, size: 60, color: '#ef9a3c' },
}

const STAT_DEFS = {
  atk:  { name: '공격력',   base: 10, add: 4,    cost: 15, growth: 1.13 },
  aspd: { name: '공격 속도', base: 1.0, add: 0.04, cost: 25, growth: 1.18 },
  hp:   { name: '체력',     base: 100, add: 25,   cost: 20, growth: 1.15 },
}
const statCost = (k, lv) => Math.floor(STAT_DEFS[k].cost * Math.pow(STAT_DEFS[k].growth, lv))

const EVOS = [
  { name: '오스트랄로피테쿠스', mult: 1 },
  { name: '진화한 오스트랄로피테쿠스', mult: 3, cost: 1500 },
  { name: '각성한 오스트랄로피테쿠스', mult: 9, cost: 30000 },
]

const SAVE_KEY = 'paleoDefSave_v2'
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY))
    if (s) return { meat: s.meat ?? 0, wave: s.wave ?? 1, lv: { atk: 0, aspd: 0, hp: 0, ...s.lv }, evo: s.evo ?? 0 }
  } catch (e) {}
  return { meat: 0, wave: 1, lv: { atk: 0, aspd: 0, hp: 0 }, evo: 0 }
}
const fmt = n => n >= 1e8 ? (n/1e8).toFixed(1)+'억' : n >= 1e4 ? (n/1e4).toFixed(1)+'만' : Math.floor(n).toLocaleString()

export default function App() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const init = useRef(loadSave()).current

  const [meat, setMeat] = useState(init.meat)
  const [wave, setWave] = useState(init.wave)
  const [lv, setLv] = useState(init.lv)
  const [evo, setEvo] = useState(init.evo)
  const [tab, setTab] = useState('강화')
  const [phase, setPhase] = useState('fighting')
  const [heroHpUI, setHeroHpUI] = useState(100)
  const [progress, setProgress] = useState(0)

  const maxHp = STAT_DEFS.hp.base + STAT_DEFS.hp.add * lv.hp * (1 + lv.hp * 0.02)
  const S = useRef({})
  S.current = {
    atk: (STAT_DEFS.atk.base + STAT_DEFS.atk.add * lv.atk * (1 + lv.atk * 0.02)) * EVOS[evo].mult,
    cd: 1000 / (STAT_DEFS.aspd.base + STAT_DEFS.aspd.add * lv.aspd),
    maxHp, wave, phase,
  }

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ meat, wave, lv, evo }))
  }, [meat, wave, lv, evo])

  const world = useRef(null)
  if (!world.current) {
    world.current = {
      enemies: [], stones: [], dmgTexts: [], particles: [],
      hero: { hp: maxHp, cd: 0, state: 'idle', t: 0, thrown: false },
      spawnLeft: 0, spawnTimer: 0, killed: 0, total: 1,
      shake: 0, needStart: true, W: 0, H: 0, groundY: 0,
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false // 도트 그래픽 선명 유지
    const w = world.current
    let raf = 0, last = performance.now()

    function resize() {
      const r = wrapRef.current.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = r.width * dpr; canvas.height = r.height * dpr
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      w.W = r.width; w.H = r.height
      w.groundY = w.H - 36
    }
    resize()
    window.addEventListener('resize', resize)

    function startWave(n) {
      w.enemies = []; w.stones = []; w.dmgTexts = []; w.particles = []
      const boss = n % 5 === 0
      w.spawnLeft = boss ? 5 : 5 + Math.min(n, 15)
      w.total = w.spawnLeft
      w.killed = 0
      w.bossPending = boss
      w.spawnTimer = 300
      w.waveNum = n
      w.clearedFlag = false
    }

    function spawnEnemy(n) {
      let key
      if (w.bossPending && w.spawnLeft === 1) key = 'tiger'
      else {
        const pool = n < 3 ? ['boar'] : n < 6 ? ['boar','wolf'] : ['boar','wolf','hyena']
        key = pool[Math.floor(Math.random() * pool.length)]
      }
      const t = ENEMY_TYPES[key]
      const sc = 1 + 0.4 * (w.waveNum - 1)
      w.enemies.push({
        type: key, x: w.W + 40, hp: t.hp * sc, maxHp: t.hp * sc,
        speed: t.speed * (0.9 + Math.random() * 0.2), dmg: t.dmg * (1 + 0.1 * (w.waveNum - 1)),
        reward: Math.floor(t.reward * (1 + 0.2 * (w.waveNum - 1))),
        size: t.size, color: t.color, cd: 0, flash: 0, legT: Math.random() * 10,
      })
    }

    function addDmg(x, y, val, crit) { w.dmgTexts.push({ x, y, val: fmt(val), life: 0.8, crit }) }
    function burst(x, y, color, n = 10) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160
        w.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5, color })
      }
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const st = S.current
      const hero = w.hero

      if (st.phase === 'fighting') {
        if (w.needStart) { startWave(st.wave); w.needStart = false; hero.hp = st.maxHp; hero.state = 'idle'; hero.t = 0 }

        if (w.spawnLeft > 0) {
          w.spawnTimer -= dt * 1000
          if (w.spawnTimer <= 0) { spawnEnemy(w.waveNum); w.spawnLeft--; w.spawnTimer = 700 }
        }

        // 적 이동/근접 공격
        const meleeX = HERO_X + 50
        for (const e of w.enemies) {
          e.flash = Math.max(0, e.flash - dt * 5)
          if (e.x > meleeX + e.size * 0.6) {
            e.x -= e.speed * dt
            e.legT += dt * 10
          } else {
            e.cd -= dt * 1000
            if (e.cd <= 0) {
              hero.hp -= e.dmg
              w.shake = 4
              burst(HERO_X + 15, w.groundY - 70, '#e05a4e', 6)
              if (hero.state === 'idle') { hero.state = 'hit'; hero.t = 0 }
              e.cd = 1200
            }
          }
        }

        // 주인공: 돌 던지기 상태머신
        hero.cd -= dt * 1000
        if (hero.state === 'throw') {
          hero.t += dt
          if (!hero.thrown && hero.t >= THROW.windupEnd) {
            hero.thrown = true
            const target = w.enemies.find(e => !e.dead)
            if (target) {
              const sx = HERO_X + 32, sy = w.groundY - HERO_H * 0.78
              const d = Math.hypot(target.x - sx, (w.groundY - target.size) - sy)
              w.stones.push({
                sx, sy, x: sx, y: sy, target, t: 0,
                T: Math.min(0.6, Math.max(0.22, d / 700)),   // 거리 비례 비행시간
                arc: Math.min(70, 25 + d * 0.18),            // 포물선 높이
                rot: 0,
              })
            }
          }
          if (hero.t >= THROW.total) { hero.state = 'idle'; hero.t = 0; hero.thrown = false }
        } else if (hero.state === 'hit') {
          hero.t += dt
          if (hero.t >= 0.22) { hero.state = 'idle'; hero.t = 0 }
        } else if (hero.cd <= 0 && w.enemies.some(e => !e.dead)) {
          hero.state = 'throw'; hero.t = 0; hero.thrown = false
          hero.cd = st.cd
        }

        // 돌 투사체 (포물선 아치, 목표 추적 보간 → 부드러운 궤적)
        for (const p of w.stones) {
          if (!p.target || p.target.dead) {
            p.target = w.enemies.find(e => !e.dead) || null
            if (!p.target) { p.dead = true; continue }
          }
          const t = p.target
          p.t += dt
          const k = Math.min(1, p.t / p.T)
          const ty = w.groundY - t.size
          p.x = p.sx + (t.x - p.sx) * k
          p.y = p.sy + (ty - p.sy) * k - p.arc * Math.sin(Math.PI * k)
          p.rot += dt * 10
          if (k >= 1) {
            p.dead = true
            const crit = Math.random() < 0.15
            const dmg = st.atk * (crit ? 2 : 1)
            t.hp -= dmg
            t.flash = 1
            t.x += 6
            addDmg(t.x, ty - t.size - 16, dmg, crit)
            burst(t.x, ty, '#ffd54f', crit ? 16 : 8)
            w.shake = Math.max(w.shake, crit ? 5 : 2)
            if (t.hp <= 0) {
              t.dead = true
              w.killed++
              w.killMeat = (w.killMeat || 0) + t.reward
              burst(t.x, ty, t.color, 14)
            }
          }
        }

        w.enemies = w.enemies.filter(e => !e.dead)
        w.stones = w.stones.filter(p => !p.dead)

        if (w.killMeat) { const g = w.killMeat; w.killMeat = 0; setMeat(m => m + g) }
        const prog = w.total ? w.killed / w.total : 0
        if (prog !== w.shownProg) { w.shownProg = prog; setProgress(prog) }
        if (Math.ceil(hero.hp) !== w.shownHp) { w.shownHp = Math.ceil(hero.hp); setHeroHpUI(Math.max(0, w.shownHp)) }

        if (hero.hp <= 0) setPhase('gameover')
        else if (w.spawnLeft === 0 && w.enemies.length === 0 && !w.clearedFlag) {
          w.clearedFlag = true
          setMeat(m => m + 15 + w.waveNum * 5)
          setPhase('cleared')
          w.clearTimer = 1200
        }
      } else if (st.phase === 'cleared') {
        w.clearTimer -= dt * 1000
        if (w.clearTimer <= 0) { w.needStart = true; setWave(v => v + 1); setPhase('fighting') }
      }

      for (const d of w.dmgTexts) { d.life -= dt; d.y -= 45 * dt }
      w.dmgTexts = w.dmgTexts.filter(d => d.life > 0)
      for (const p of w.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt }
      w.particles = w.particles.filter(p => p.life > 0)
      w.shake = Math.max(0, w.shake - dt * 25)

      draw(ctx, now)
      raf = requestAnimationFrame(loop)
    }

    function heroFrameKey(hero) {
      if (hero.state === 'hit') return 'hit'
      if (hero.state === 'throw') {
        if (hero.t < THROW.windupEnd) return 'windup'
        if (hero.t < THROW.releaseEnd) return 'release'
        return 'recovery'
      }
      return 'idle'
    }

    function drawEnemy(ctx, e) {
      const y = w.groundY
      const s = e.size
      ctx.save()
      ctx.translate(e.x, y)
      if (e.flash > 0.5) ctx.filter = 'brightness(3)'
      ctx.strokeStyle = e.color; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round'
      const sw = Math.sin(e.legT) * s * 0.25
      ctx.beginPath()
      ctx.moveTo(-s * 0.5, -s * 0.7); ctx.lineTo(-s * 0.5 + sw, 0)
      ctx.moveTo(s * 0.5, -s * 0.7); ctx.lineTo(s * 0.5 - sw, 0)
      ctx.stroke()
      ctx.fillStyle = e.color
      ctx.beginPath(); ctx.ellipse(0, -s * 0.9, s, s * 0.55, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(-s * 0.95, -s * 1.05, s * 0.42, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(-s * 1.1, -s * 1.12, s * 0.08, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      const bw = s * 2
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(e.x - bw / 2, y - s * 2 - 10, bw, 5)
      ctx.fillStyle = '#e05a4e'
      ctx.fillRect(e.x - bw / 2, y - s * 2 - 10, bw * Math.max(0, e.hp / e.maxHp), 5)
    }

    function draw(ctx, now) {
      ctx.clearRect(0, 0, w.W, w.H)
      ctx.save()
      if (w.shake > 0.3) ctx.translate((Math.random() - 0.5) * w.shake, (Math.random() - 0.5) * w.shake)

      // 배경 이미지 (cover, 하단 기준 정렬 — 지면과 맞춤)
      if (BG.complete && BG.naturalWidth > 0) {
        const scale = Math.max(w.W / BG.naturalWidth, w.H / BG.naturalHeight)
        const bw = BG.naturalWidth * scale, bh = BG.naturalHeight * scale
        ctx.drawImage(BG, (w.W - bw) / 2, w.H - bh, bw, bh)
      } else {
        ctx.fillStyle = '#3a2f1d'; ctx.fillRect(0, 0, w.W, w.H)
      }

      // 주인공 (프레임 애니메이션)
      const hero = w.hero
      const key = heroFrameKey(hero)
      const fr = FRAMES[key]
      const im = IMG[key]
      const bob = hero.state === 'idle' ? Math.sin(now * 0.004) * 2 : 0
      if (im.complete && im.naturalWidth > 0) {
        const hw = HERO_H * (im.naturalWidth / im.naturalHeight)
        ctx.save()
        ctx.translate(HERO_X, w.groundY + bob)
        if (fr.flip) ctx.scale(-1, 1)
        if (key === 'hit') ctx.rotate(-0.08)
        ctx.drawImage(im, -hw / 2, -HERO_H, hw, HERO_H)
        ctx.restore()
      }

      // 적
      for (const e of w.enemies) drawEnemy(ctx, e)

      // 돌 투사체
      for (const p of w.stones) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = '#9e9384'
        ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.beginPath(); ctx.ellipse(2, 2, 3, 2, 0, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }

      // 파티클
      for (const p of w.particles) {
        ctx.globalAlpha = Math.max(0, p.life * 2)
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
      }
      ctx.globalAlpha = 1

      // 데미지 숫자
      ctx.textAlign = 'center'
      for (const d of w.dmgTexts) {
        ctx.globalAlpha = Math.min(1, d.life * 2.5)
        ctx.font = (d.crit ? '900 22px' : '800 16px') + ' sans-serif'
        ctx.fillStyle = d.crit ? '#ffca28' : '#fff'
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3
        ctx.strokeText(d.val, d.x, d.y)
        ctx.fillText(d.val, d.x, d.y)
      }
      ctx.globalAlpha = 1
      ctx.restore()
    }

    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  function buyStat(k) {
    const c = statCost(k, lv[k])
    if (meat < c) return
    setMeat(m => m - c)
    setLv(v => ({ ...v, [k]: v[k] + 1 }))
  }
  function evolve() {
    if (evo >= EVOS.length - 1) return
    const c = EVOS[evo + 1].cost
    if (meat < c) return
    setMeat(m => m - c)
    setEvo(v => v + 1)
  }
  function retry() { world.current.needStart = true; setPhase('fighting') }

  const statValue = k =>
    k === 'atk' ? fmt(S.current.atk)
    : k === 'aspd' ? (1000 / S.current.cd).toFixed(2) + '/초'
    : fmt(S.current.maxHp)
  const statNext = k => {
    const n = lv[k] + 1
    if (k === 'atk') return fmt((STAT_DEFS.atk.base + STAT_DEFS.atk.add * n * (1 + n * 0.02)) * EVOS[evo].mult)
    if (k === 'aspd') return (STAT_DEFS.aspd.base + STAT_DEFS.aspd.add * n).toFixed(2) + '/초'
    return fmt(STAT_DEFS.hp.base + STAT_DEFS.hp.add * n * (1 + n * 0.02))
  }

  return (
    <div style={st.root}>
      <div style={st.topBar}>
        <div>고기 <b style={{ color: '#f0b060' }}>{fmt(meat)}</b></div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          웨이브 <b>{wave}</b>{wave % 5 === 0 && <span style={{ color: '#ef9a3c' }}> 보스</span>}
        </div>
        <div style={{ width: 90 }}>
          <div style={st.progOuter}><div style={{ ...st.progInner, width: progress * 100 + '%' }} /></div>
        </div>
      </div>

      <div ref={wrapRef} style={st.canvasWrap}>
        <canvas ref={canvasRef} />
        <div style={st.heroHpWrap}>
          <div style={st.hpOuter}><div style={{ ...st.hpInner, width: Math.min(100, heroHpUI / maxHp * 100) + '%' }} /></div>
          <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{fmt(heroHpUI)} / {fmt(maxHp)}</div>
        </div>
        {phase === 'cleared' && <div style={st.overlayText}>웨이브 {wave} 클리어!</div>}
        {phase === 'gameover' && (
          <div style={st.overlay}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>쓰러졌다...</div>
            <button style={st.retryBtn} onClick={retry}>다시 도전</button>
          </div>
        )}
      </div>

      <div style={st.tabs}>
        {['강화', '진화'].map(t => (
          <button key={t} style={{ ...st.tabBtn, ...(tab === t ? st.tabActive : {}) }} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div style={st.panel}>
        {tab === '강화' && Object.keys(STAT_DEFS).map(k => {
          const c = statCost(k, lv[k])
          const ok = meat >= c
          return (
            <div key={k} style={st.row}>
              <div style={{ flex: 1 }}>
                <div style={st.rowName}>{STAT_DEFS[k].name} <span style={st.rowLv}>Lv.{lv[k]}</span></div>
                <div style={st.rowVal}>{statValue(k)} <span style={{ color: '#7cb35c' }}>→ {statNext(k)}</span></div>
              </div>
              <button style={{ ...st.costBtn, opacity: ok ? 1 : 0.4 }} onClick={() => buyStat(k)}>{fmt(c)}</button>
            </div>
          )
        })}
        {tab === '진화' && (
          <div style={st.row}>
            <img src={FRAMES.idle.src} alt="" style={{ height: 64, transform: FRAMES.idle.flip ? 'scaleX(-1)' : 'none' }} />
            <div style={{ flex: 1, marginLeft: 12 }}>
              <div style={st.rowName}>{EVOS[evo].name}</div>
              <div style={st.rowVal}>
                공격력 ×{EVOS[evo].mult}
                {evo < EVOS.length - 1 && <span style={{ color: '#7cb35c' }}> → ×{EVOS[evo + 1].mult}</span>}
              </div>
            </div>
            {evo < EVOS.length - 1
              ? <button style={{ ...st.costBtn, opacity: meat >= EVOS[evo + 1].cost ? 1 : 0.4 }} onClick={evolve}>{fmt(EVOS[evo + 1].cost)}</button>
              : <div style={{ fontSize: 12, opacity: 0.6 }}>최종 단계</div>}
          </div>
        )}
      </div>
    </div>
  )
}

const st = {
  root: {
    position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
    background: '#1a120b', color: '#f5ead9',
    fontFamily: "'Pretendard', -apple-system, 'Noto Sans KR', sans-serif",
  },
  topBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', paddingTop: 'max(10px, env(safe-area-inset-top))',
    fontSize: 14, background: '#241a10', borderBottom: '1px solid #3a2c1c',
  },
  progOuter: { height: 8, background: '#3a2c1c', borderRadius: 4, overflow: 'hidden' },
  progInner: { height: '100%', background: '#f0b060', transition: 'width 0.2s' },
  canvasWrap: { height: '42%', position: 'relative', minHeight: 220 },
  heroHpWrap: { position: 'absolute', left: 12, top: 10, width: 130 },
  hpOuter: { height: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 4, overflow: 'hidden' },
  hpInner: { height: '100%', background: '#7cb35c', transition: 'width 0.15s' },
  overlay: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', background: 'rgba(10,6,3,0.75)',
  },
  overlayText: {
    position: 'absolute', top: '40%', left: 0, right: 0, textAlign: 'center',
    fontSize: 22, fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.8)', pointerEvents: 'none',
  },
  retryBtn: { padding: '12px 32px', fontSize: 16, fontWeight: 700, borderRadius: 12, border: 'none', background: '#c9772e', color: '#fff' },
  tabs: { display: 'flex', gap: 6, padding: '8px 10px 0', background: '#241a10' },
  tabBtn: {
    flex: 1, padding: '9px 0', borderRadius: '10px 10px 0 0', border: 'none',
    background: '#2c2012', color: '#a89880', fontSize: 14, fontWeight: 700,
  },
  tabActive: { background: '#3a2c1a', color: '#f5ead9' },
  panel: {
    flex: 1, overflowY: 'auto', background: '#241a10',
    padding: '10px 10px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#312415', border: '1px solid #4a3822', borderRadius: 12, padding: '12px 12px',
  },
  rowName: { fontWeight: 700, fontSize: 14 },
  rowLv: { fontSize: 12, color: '#f0b060', marginLeft: 4 },
  rowVal: { fontSize: 12, opacity: 0.85, marginTop: 3 },
  costBtn: {
    minWidth: 84, padding: '12px 10px', borderRadius: 10, border: 'none',
    background: '#c9772e', color: '#fff', fontSize: 14, fontWeight: 800,
  },
}
