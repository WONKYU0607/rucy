import React, { useEffect, useRef, useState } from 'react'

// ── 진화 단계 (분리한 3마리) ──
const EVOS = [
  { name: '오스트랄로피테쿠스', img: '/ape1.png', mult: 1 },
  { name: '진화한 오스트랄로피테쿠스', img: '/ape2.png', mult: 3, cost: 1500 },
  { name: '각성한 오스트랄로피테쿠스', img: '/ape3.png', mult: 9, cost: 30000 },
]
const IMGS = EVOS.map(e => { const im = new Image(); im.src = e.img; return im })

// ── 적 정의 ──
const ENEMY_TYPES = {
  boar:  { name: '멧돼지', hp: 25,  speed: 55, dmg: 6,  reward: 5,  size: 26, color: '#8d6e63' },
  wolf:  { name: '늑대',   hp: 45,  speed: 75, dmg: 10, reward: 9,  size: 30, color: '#78909c' },
  hyena: { name: '하이에나', hp: 90, speed: 48, dmg: 16, reward: 15, size: 34, color: '#a1887f' },
  tiger: { name: '검치호', hp: 800, speed: 38, dmg: 45, reward: 200, size: 60, color: '#ef9a3c' },
}

// ── 강화 항목 ──
const STAT_DEFS = {
  atk:  { name: '공격력',   base: 10, add: 4,   cost: 15, growth: 1.13 },
  aspd: { name: '공격 속도', base: 1.0, add: 0.04, cost: 25, growth: 1.18 },
  hp:   { name: '체력',     base: 100, add: 25,  cost: 20, growth: 1.15 },
}
const statCost = (k, lv) => Math.floor(STAT_DEFS[k].cost * Math.pow(STAT_DEFS[k].growth, lv))

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

  // 파생 스탯 (루프는 ref로 접근 — 클로저 방지)
  const maxHp = STAT_DEFS.hp.base + STAT_DEFS.hp.add * lv.hp * (1 + lv.hp * 0.02)
  const S = useRef({})
  S.current = {
    atk: (STAT_DEFS.atk.base + STAT_DEFS.atk.add * lv.atk * (1 + lv.atk * 0.02)) * EVOS[evo].mult,
    cd: 1000 / (STAT_DEFS.aspd.base + STAT_DEFS.aspd.add * lv.aspd),
    maxHp, wave, phase, evo,
  }

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ meat, wave, lv, evo }))
  }, [meat, wave, lv, evo])

  const world = useRef(null)
  if (!world.current) {
    world.current = {
      enemies: [], dmgTexts: [], particles: [],
      hero: { hp: maxHp, cd: 0, anim: 0, animT: 0 }, // anim: 0=idle 1=attack
      spawnLeft: 0, spawnTimer: 0, killed: 0, total: 1,
      shake: 0, needStart: true, W: 0, H: 0, groundY: 0,
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const w = world.current
    let raf = 0, last = performance.now()

    function resize() {
      const r = wrapRef.current.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = r.width * dpr; canvas.height = r.height * dpr
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      w.W = r.width; w.H = r.height
      w.groundY = w.H - 40
    }
    resize()
    window.addEventListener('resize', resize)

    const HERO_X = 70, HERO_H = 110

    function startWave(n) {
      w.enemies = []; w.dmgTexts = []; w.particles = []
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

    function addDmg(x, y, val, crit) {
      w.dmgTexts.push({ x, y, val: fmt(val), life: 0.8, crit })
    }
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
        if (w.needStart) { startWave(st.wave); w.needStart = false; hero.hp = st.maxHp }

        if (w.spawnLeft > 0) {
          w.spawnTimer -= dt * 1000
          if (w.spawnTimer <= 0) { spawnEnemy(w.waveNum); w.spawnLeft--; w.spawnTimer = 700 }
        }

        // 적 이동/공격
        const meleeX = HERO_X + 55
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
              burst(HERO_X + 20, w.groundY - 60, '#e05a4e', 6)
              e.cd = 1200
            }
          }
        }

        // 주인공 공격 (근접, 가장 가까운 적)
        hero.cd -= dt * 1000
        if (hero.anim === 1) {
          hero.animT += dt
          if (!hero.hitDone && hero.animT > 0.12) {
            hero.hitDone = true
            const t = w.enemies.find(e => !e.dead && e.x < meleeX + 140)
            if (t) {
              const crit = Math.random() < 0.15
              const dmg = st.atk * (crit ? 2 : 1)
              t.hp -= dmg
              t.flash = 1
              t.x += 8
              addDmg(t.x, w.groundY - t.size * 2 - 20, dmg, crit)
              burst(t.x, w.groundY - t.size, '#ffd54f', crit ? 16 : 8)
              w.shake = Math.max(w.shake, crit ? 5 : 2)
              if (t.hp <= 0) {
                t.dead = true
                w.killed++
                w.killMeat = (w.killMeat || 0) + t.reward
                burst(t.x, w.groundY - t.size, t.color, 14)
              }
            }
          }
          if (hero.animT > 0.28) { hero.anim = 0; hero.animT = 0; hero.hitDone = false }
        } else if (hero.cd <= 0 && w.enemies.some(e => !e.dead && e.x < meleeX + 140)) {
          hero.anim = 1; hero.animT = 0; hero.hitDone = false
          hero.cd = st.cd
        }

        w.enemies = w.enemies.filter(e => !e.dead)

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

      // 이펙트 갱신
      for (const d of w.dmgTexts) { d.life -= dt; d.y -= 45 * dt }
      w.dmgTexts = w.dmgTexts.filter(d => d.life > 0)
      for (const p of w.particles) {
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt
      }
      w.particles = w.particles.filter(p => p.life > 0)
      w.shake = Math.max(0, w.shake - dt * 25)

      draw(ctx, now)
      raf = requestAnimationFrame(loop)
    }

    function drawEnemy(ctx, e) {
      const y = w.groundY
      const s = e.size
      ctx.save()
      ctx.translate(e.x, y)
      if (e.flash > 0.5) { ctx.filter = 'brightness(3)' }
      // 다리 (걷기 모션)
      ctx.strokeStyle = e.color; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round'
      const sw = Math.sin(e.legT) * s * 0.25
      ctx.beginPath()
      ctx.moveTo(-s * 0.5, -s * 0.7); ctx.lineTo(-s * 0.5 + sw, 0)
      ctx.moveTo(s * 0.5, -s * 0.7); ctx.lineTo(s * 0.5 - sw, 0)
      ctx.stroke()
      // 몸통
      ctx.fillStyle = e.color
      ctx.beginPath()
      ctx.ellipse(0, -s * 0.9, s, s * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
      // 머리 (왼쪽 = 진행 방향)
      ctx.beginPath()
      ctx.arc(-s * 0.95, -s * 1.05, s * 0.42, 0, Math.PI * 2)
      ctx.fill()
      // 눈
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(-s * 1.1, -s * 1.12, s * 0.08, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      // 체력바
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

      // 배경: 하늘 + 원경 언덕
      const g = ctx.createLinearGradient(0, 0, 0, w.H)
      g.addColorStop(0, '#2c3e57'); g.addColorStop(0.6, '#5a4a35'); g.addColorStop(1, '#3a2f1d')
      ctx.fillStyle = g; ctx.fillRect(-10, -10, w.W + 20, w.H + 20)
      ctx.fillStyle = 'rgba(30,40,55,0.6)'
      ctx.beginPath()
      ctx.moveTo(-10, w.groundY - 90)
      for (let x = 0; x <= w.W + 20; x += 40) ctx.lineTo(x, w.groundY - 90 - Math.sin(x * 0.01 + 2) * 35)
      ctx.lineTo(w.W + 10, w.groundY); ctx.lineTo(-10, w.groundY); ctx.fill()
      // 지면
      ctx.fillStyle = '#4a3a24'; ctx.fillRect(-10, w.groundY, w.W + 20, w.H - w.groundY + 10)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-10, w.groundY, w.W + 20, 4)

      // 주인공 (진화 단계 이미지 + 대기 바운스/공격 돌진)
      const hero = w.hero
      const im = IMGS[S.current.evo]
      const bob = hero.anim === 0 ? Math.sin(now * 0.004) * 3 : 0
      const lunge = hero.anim === 1 ? Math.sin((hero.animT / 0.28) * Math.PI) * 26 : 0
      const HERO_H = 110
      if (im.complete && im.naturalWidth > 0) {
        const hw = HERO_H * (im.naturalWidth / im.naturalHeight)
        ctx.save()
        ctx.translate(70 + lunge, w.groundY + bob)
        if (hero.anim === 1) ctx.rotate(0.12)
        ctx.drawImage(im, -hw / 2, -HERO_H)
        ctx.restore()
      } else {
        ctx.fillStyle = '#c9a06c'
        ctx.fillRect(70 - 20 + lunge, w.groundY - HERO_H + bob, 40, HERO_H)
      }

      // 적
      for (const e of w.enemies) drawEnemy(ctx, e)

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
  function retry() {
    const w = world.current
    w.needStart = true
    setPhase('fighting')
  }

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
            <img src={EVOS[evo].img} alt="" style={{ height: 64 }} />
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
