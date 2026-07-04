import React, { useEffect, useRef, useState } from 'react'

// ── 디버그 모드: 업그레이드 비용 무료 + 레벨 직접입력 (출시 전 false로) ──
const DEBUG = true

// ── 주인공 애니메이션 (flip 틀리면 해당 값만 수정) ──
const ANIM = {
  quad:  { srcs: ['/hero/quad/quad_1.png', '/hero/quad/quad_2.png', '/hero/quad/quad_3.png'], h: 85,  flip: false },
  walk:  { srcs: ['/hero/walk/walk_1.png', '/hero/walk/walk_2.png', '/hero/walk/walk_3.png'], h: 130, flip: false },
  punch: { srcs: ['/hero/punch/punch_1.png', '/hero/punch/punch_2.png', '/hero/punch/punch_3.png'], h: 125, flip: false },
  throw: { srcs: ['/hero/throw/hero_windup.png', '/hero/throw/hero_release.png', '/hero/throw/hero_recovery.png'], h: 130, flip: false },
  idle:  { srcs: ['/hero/misc/hero_idle.png'], h: 130, flip: false },
}
const AIMG = {}
for (const k in ANIM) AIMG[k] = ANIM[k].srcs.map(s => { const i = new Image(); i.src = s; return i })
const BG = new Image(); BG.src = '/bg/bg.jpg'
const STONE = new Image(); STONE.src = '/misc/stone.png'

const HERO_X = 90
const SCROLL = 140                                   // 전진 속도 (px/s)
const PUNCH = { hitAt: 0.12, total: 0.3, range: 95 } // 4족 주먹질
const THROW = { windupEnd: 0.14, releaseEnd: 0.30, total: 0.42, range: 340 }

// ── 적 정의 ──
const ENEMY_TYPES = {
  rabbit:   { name: '토끼', hp: 20, speed: 85, dmg: 5,  reward: 4,  h: 34, color: '#a1887f', flip: true,
              frames: ['/monster/rabbit/rabbit_1.png', '/monster/rabbit/rabbit_2.png', '/monster/rabbit/rabbit_3.png', '/monster/rabbit/rabbit_4.png'] },
  antelope: { name: '영양', hp: 45, speed: 65, dmg: 10, reward: 8,  h: 60, color: '#c98a4b', flip: true,
              frames: ['/monster/antelope/antelope_1.png', '/monster/antelope/antelope_2.png', '/monster/antelope/antelope_3.png'] },
  deer:     { name: '사슴', hp: 90, speed: 50, dmg: 16, reward: 14, h: 72, color: '#b5794a', flip: true,
              frames: ['/monster/deer/deer_1.png', '/monster/deer/deer_2.png', '/monster/deer/deer_3.png'] },
  boar:     { name: '멧돼지', hp: 70, speed: 60, dmg: 14, reward: 12, h: 62, color: '#7a6a52', flip: true,
              frames: ['/monster/boar/boar_1.png', '/monster/boar/boar_2.png', '/monster/boar/boar_3.png', '/monster/boar/boar_4.png'] },
  wolf:     { name: '늑대', hp: 40, speed: 120, dmg: 12, reward: 10, h: 56, color: '#9a8f7a', flip: true,
              frames: ['/monster/wolf/wolf_1.png', '/monster/wolf/wolf_2.png', '/monster/wolf/wolf_3.png', '/monster/wolf/wolf_4.png'] },
  hyena:    { name: '하이에나', hp: 110, speed: 55, dmg: 20, reward: 18, h: 68, color: '#b0a15f', flip: true,
              frames: ['/monster/hyena/hyena_1.png', '/monster/hyena/hyena_2.png', '/monster/hyena/hyena_3.png', '/monster/hyena/hyena_4.png'] },
}
const EIMG = {}
for (const k in ENEMY_TYPES) {
  EIMG[k] = ENEMY_TYPES[k].frames.map(src => { const i = new Image(); i.src = src; return i })
}
const WAVE_CYCLE = ['rabbit', 'antelope', 'deer', 'boar', 'wolf', 'hyena']

const STAT_DEFS = {
  atk:  { name: '공격력',   base: 10, add: 4,    cost: 15, growth: 1.13 },
  aspd: { name: '공격 속도', base: 1.0, add: 0.04, cost: 25, growth: 1.18 },
  hp:   { name: '체력',     base: 100, add: 25,   cost: 20, growth: 1.15 },
}
const statCost = (k, lv) => Math.floor(STAT_DEFS[k].cost * Math.pow(STAT_DEFS[k].growth, lv))

// mode: quad = 4족 질주 + 주먹질 / biped = 직립 보행 + 돌 던지기
const EVOS = [
  { name: '오스트랄로피테쿠스', mult: 1, mode: 'quad' },
  { name: '직립 오스트랄로피테쿠스', mult: 3, cost: 1500, mode: 'biped' },
  { name: '각성한 오스트랄로피테쿠스', mult: 9, cost: 30000, mode: 'biped' },
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
    mode: EVOS[evo].mode,
  }

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ meat, wave, lv, evo }))
  }, [meat, wave, lv, evo])

  const world = useRef(null)
  if (!world.current) {
    world.current = {
      enemies: [], stones: [], dmgTexts: [], particles: [],
      hero: { hp: maxHp, cd: 0, state: 'move', t: 0, did: false, flash: 0, animT: 0 },
      spawnLeft: 0, spawnTimer: 0, killed: 0, total: 1,
      shake: 0, scrollX: 0, needStart: true, W: 0, H: 0, groundY: 0,
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
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

    function spawnEnemy() {
      const key = WAVE_CYCLE[(w.waveNum - 1) % WAVE_CYCLE.length]
      const boss = w.bossPending && w.spawnLeft === 1
      const t = ENEMY_TYPES[key]
      const sc = (1 + 0.4 * (w.waveNum - 1)) * (boss ? 12 : 1)
      w.enemies.push({
        type: key, boss, x: w.W + 40, hp: t.hp * sc, maxHp: t.hp * sc,
        speed: t.speed * (boss ? 0.6 : 0.9 + Math.random() * 0.2),
        dmg: t.dmg * (1 + 0.1 * (w.waveNum - 1)) * (boss ? 3 : 1),
        reward: Math.floor(t.reward * (1 + 0.2 * (w.waveNum - 1))) * (boss ? 15 : 1),
        h: t.h * (boss ? 1.9 : 1), color: t.color, cd: 0, flash: 0, animT: Math.random() * 10,
      })
    }

    function addDmg(x, y, val, crit) { w.dmgTexts.push({ x, y, val: fmt(val), life: 0.8, crit }) }
    function burst(x, y, color, n = 10) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160
        w.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 0.5, color })
      }
    }
    function dealDamage(t, st) {
      const crit = Math.random() < 0.15
      const dmg = st.atk * (crit ? 2 : 1)
      t.hp -= dmg
      t.flash = 1
      t.x += 8
      const ty = w.groundY - t.h * 0.55
      addDmg(t.x, ty - t.h * 0.5 - 12, dmg, crit)
      burst(t.x, ty, '#ffd54f', crit ? 16 : 8)
      w.shake = Math.max(w.shake, crit ? 5 : 2)
      if (t.hp <= 0 && !t.dead) {
        t.dead = true
        w.killed++
        w.killMeat = (w.killMeat || 0) + t.reward
        burst(t.x, ty, t.color, 14)
      }
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const st = S.current
      const hero = w.hero
      const atkRange = st.mode === 'quad' ? PUNCH.range : THROW.range

      // 배경 스크롤: 이동 상태일 때만 전진
      const moving = (st.phase === 'fighting' || st.phase === 'cleared') && hero.state === 'move'
      const scroll = moving ? SCROLL : 0
      w.scrollX += scroll * dt

      if (st.phase === 'fighting') {
        if (w.needStart) { startWave(st.wave); w.needStart = false; hero.hp = st.maxHp; hero.state = 'move'; hero.t = 0 }

        if (w.spawnLeft > 0) {
          w.spawnTimer -= dt * 1000
          if (w.spawnTimer <= 0) { spawnEnemy(); w.spawnLeft--; w.spawnTimer = 700 }
        }

        // 적: 접근 (전진 스크롤만큼 상대속도 가산) + 근접 공격
        for (const e of w.enemies) {
          e.flash = Math.max(0, e.flash - dt * 5)
          const stopX = HERO_X + 45 + e.h * 0.4
          if (e.x > stopX) {
            e.x -= (e.speed + scroll) * dt
            e.animT += dt * (1 + scroll / SCROLL * 0.4)
          } else {
            e.cd -= dt * 1000
            if (e.cd <= 0) {
              hero.hp -= e.dmg
              hero.flash = 0.2
              w.shake = 4
              burst(HERO_X + 15, w.groundY - 70, '#e05a4e', 6)
              e.cd = 1200
            }
          }
        }

        // 주인공 상태머신
        hero.cd -= dt * 1000
        hero.flash = Math.max(0, hero.flash - dt)
        if (hero.state === 'move') {
          hero.animT += dt
          const target = w.enemies.find(e => !e.dead && e.x - HERO_X < atkRange)
          if (hero.cd <= 0 && target) {
            hero.state = 'attack'; hero.t = 0; hero.did = false
            hero.cd = st.cd
          }
        } else if (hero.state === 'attack') {
          hero.t += dt
          if (st.mode === 'quad') {
            if (!hero.did && hero.t >= PUNCH.hitAt) {
              hero.did = true
              const t = w.enemies.find(e => !e.dead && e.x - HERO_X < PUNCH.range + 40)
              if (t) dealDamage(t, st)
            }
            if (hero.t >= PUNCH.total) { hero.state = 'move'; hero.t = 0 }
          } else {
            if (!hero.did && hero.t >= THROW.windupEnd) {
              hero.did = true
              const target = w.enemies.find(e => !e.dead)
              if (target) {
                const sx = HERO_X + 32, sy = w.groundY - 130 * 0.78
                const d = Math.hypot(target.x - sx, (w.groundY - target.h * 0.55) - sy)
                w.stones.push({
                  sx, sy, x: sx, y: sy, target, t: 0,
                  T: Math.min(0.45, Math.max(0.18, d / 900)),
                  arc: Math.min(40, 15 + d * 0.12),
                  rot: 0,
                })
              }
            }
            if (hero.t >= THROW.total) { hero.state = 'move'; hero.t = 0 }
          }
        }

        // 돌 투사체 (포물선 아치)
        for (const p of w.stones) {
          if (!p.target || p.target.dead) {
            p.target = w.enemies.find(e => !e.dead) || null
            if (!p.target) { p.dead = true; continue }
          }
          const t = p.target
          p.t += dt
          const k = Math.min(1, p.t / p.T)
          const ty = w.groundY - t.h * 0.55
          p.x = p.sx + (t.x - p.sx) * k
          p.y = p.sy + (ty - p.sy) * k - p.arc * Math.sin(Math.PI * k)
          p.rot += dt * 10
          if (k >= 1) { p.dead = true; dealDamage(t, st) }
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
        hero.animT += dt
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

    function heroAnim(hero, st) {
      if (hero.state === 'attack') {
        if (st.mode === 'quad') {
          const k = hero.t < PUNCH.hitAt ? 0 : hero.t < PUNCH.hitAt + 0.1 ? 1 : 2
          return ['punch', k]
        }
        const k = hero.t < THROW.windupEnd ? 0 : hero.t < THROW.releaseEnd ? 1 : 2
        return ['throw', k]
      }
      const key = st.mode === 'quad' ? 'quad' : 'walk'
      const fi = Math.floor(hero.animT * 10) % ANIM[key].srcs.length
      return [key, fi]
    }
    function safeImg(key, fi) {
      const arr = AIMG[key]
      if (!arr || !arr.length) return AIMG.idle[0]
      return arr[fi] || arr[0]
    }

    function drawEnemy(ctx, e) {
      const y = w.groundY
      const t = ENEMY_TYPES[e.type]
      const imgs = EIMG[e.type]
      const gall = e.animT * 9
      const fi = Math.floor(gall / Math.PI) % imgs.length
      const bounce = Math.abs(Math.sin(gall)) * e.h * 0.08
      const rock = Math.sin(gall) * 0.06
      const im = imgs[fi]
      ctx.save()
      ctx.translate(e.x, y - bounce)
      ctx.rotate(rock)
      if (e.flash > 0.5) ctx.filter = 'brightness(3)'
      if (im.complete && im.naturalWidth > 0) {
        const eh = e.h
        const ew = eh * (im.naturalWidth / im.naturalHeight)
        if (t.flip) ctx.scale(-1, 1)
        ctx.drawImage(im, -ew / 2, -eh, ew, eh)
      } else {
        ctx.fillStyle = e.color
        ctx.beginPath(); ctx.ellipse(0, -e.h * 0.5, e.h * 0.6, e.h * 0.4, 0, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()
      const bw = Math.min(80, e.h * 1.4)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(e.x - bw / 2, y - e.h - 12, bw, 5)
      ctx.fillStyle = '#e05a4e'
      ctx.fillRect(e.x - bw / 2, y - e.h - 12, bw * Math.max(0, e.hp / e.maxHp), 5)
    }

    function draw(ctx, now) {
      ctx.clearRect(0, 0, w.W, w.H)
      ctx.save()
      if (w.shake > 0.3) ctx.translate((Math.random() - 0.5) * w.shake, (Math.random() - 0.5) * w.shake)

      // 배경: 가로 무한 타일 스크롤
      if (BG.complete && BG.naturalWidth > 0) {
        const scale = Math.max(w.W / BG.naturalWidth, w.H / BG.naturalHeight)
        const bw = BG.naturalWidth * scale, bh = BG.naturalHeight * scale
        let x = -(w.scrollX % bw)
        if (x > 0) x -= bw
        for (; x < w.W; x += bw) ctx.drawImage(BG, x, w.H - bh, bw, bh)
      } else {
        ctx.fillStyle = '#3a2f1d'; ctx.fillRect(0, 0, w.W, w.H)
      }

      // 주인공
      const hero = w.hero
      const [key, fi] = heroAnim(hero, S.current)
      const a = ANIM[key]
      const im = safeImg(key, fi)
      if (im.complete && im.naturalWidth > 0) {
        const hh = a.h
        const hw = hh * (im.naturalWidth / im.naturalHeight)
        ctx.save()
        ctx.translate(HERO_X, w.groundY)
        if (hero.flash > 0) ctx.filter = 'brightness(2.5)'
        if (a.flip) ctx.scale(-1, 1)
        ctx.drawImage(im, -hw / 2, -hh, hw, hh)
        ctx.restore()
      }

      for (const e of w.enemies) drawEnemy(ctx, e)

      for (const p of w.stones) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        if (STONE.complete && STONE.naturalWidth > 0) {
          const sw = 18, sh = sw * (STONE.naturalHeight / STONE.naturalWidth)
          ctx.drawImage(STONE, -sw / 2, -sh / 2, sw, sh)
        } else {
          ctx.fillStyle = '#b09a72'
          ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2); ctx.fill()
        }
        ctx.restore()
      }

      for (const p of w.particles) {
        ctx.globalAlpha = Math.max(0, p.life * 2)
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
      }
      ctx.globalAlpha = 1

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

  function setStatLv(k, n) {
    n = Math.max(0, Math.floor(Number(n) || 0))
    setLv(v => ({ ...v, [k]: n }))
  }
  function buyStat(k) {
    const c = DEBUG ? 0 : statCost(k, lv[k])
    if (meat < c) return
    setMeat(m => m - c)
    setLv(v => ({ ...v, [k]: v[k] + 1 }))
  }
  function evolve() {
    if (evo >= EVOS.length - 1) return
    const c = DEBUG ? 0 : EVOS[evo + 1].cost
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
    <div style={st.outer}>
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
          const ok = DEBUG || meat >= c
          return (
            <div key={k} style={st.row}>
              <div style={{ flex: 1 }}>
                <div style={st.rowName}>{STAT_DEFS[k].name} <span style={st.rowLv}>Lv.{lv[k]}</span></div>
                <div style={st.rowVal}>{statValue(k)} <span style={{ color: '#7cb35c' }}>→ {statNext(k)}</span></div>
              </div>
              {DEBUG && (
                <>
                  <button style={st.dbgBtn} onClick={() => setStatLv(k, lv[k] - 1)}>−</button>
                  <input
                    style={st.dbgInput}
                    type="number"
                    inputMode="numeric"
                    value={lv[k]}
                    onChange={e => setStatLv(k, e.target.value)}
                  />
                </>
              )}
              <button style={{ ...st.costBtn, opacity: ok ? 1 : 0.4 }} onClick={() => buyStat(k)}>{DEBUG ? '+1' : fmt(c)}</button>
            </div>
          )
        })}
        {tab === '진화' && (
          <div style={st.row}>
            <img
              src={EVOS[evo].mode === 'quad' ? '/hero/quad/quad_1.png' : '/hero/misc/hero_idle.png'}
              alt=""
              style={{ height: 64 }}
            />
            <div style={{ flex: 1, marginLeft: 12 }}>
              <div style={st.rowName}>{EVOS[evo].name}</div>
              <div style={st.rowVal}>
                {EVOS[evo].mode === 'quad' ? '4족 질주 · 주먹질' : '직립 보행 · 돌 던지기'} · 공격력 ×{EVOS[evo].mult}
                {evo < EVOS.length - 1 && <span style={{ color: '#7cb35c' }}> → ×{EVOS[evo + 1].mult}</span>}
              </div>
            </div>
            {DEBUG && <button style={st.dbgBtn} onClick={() => setEvo(v => Math.max(0, v - 1))}>−</button>}
            {evo < EVOS.length - 1
              ? <button style={{ ...st.costBtn, opacity: DEBUG || meat >= EVOS[evo + 1].cost ? 1 : 0.4 }} onClick={evolve}>{DEBUG ? '+1' : fmt(EVOS[evo + 1].cost)}</button>
              : <div style={{ fontSize: 12, opacity: 0.6 }}>최종 단계</div>}
          </div>
        )}
      </div>
    </div>
    </div>
  )
}

const st = {
  outer: {
    position: 'fixed', inset: 0, background: '#000',
    display: 'flex', justifyContent: 'center',
  },
  root: {
    width: '100%', maxWidth: 420, height: '100%',
    position: 'relative', display: 'flex', flexDirection: 'column',
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
  dbgBtn: {
    width: 40, padding: '12px 0', borderRadius: 10, border: '1px solid #4a3822',
    background: '#241a10', color: '#f5ead9', fontSize: 16, fontWeight: 800,
  },
  dbgInput: {
    width: 54, padding: '10px 6px', borderRadius: 10, border: '1px solid #4a3822',
    background: '#1a120b', color: '#f0b060', fontSize: 14, fontWeight: 700, textAlign: 'center',
  },
  costBtn: {
    minWidth: 84, padding: '12px 10px', borderRadius: 10, border: 'none',
    background: '#c9772e', color: '#fff', fontSize: 14, fontWeight: 800,
  },
}
