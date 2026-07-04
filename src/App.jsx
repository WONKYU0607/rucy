import React, { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────
// 그래픽 교체 지점: 이미지가 준비되면 img에 URL만 넣으면 됨.
// img가 null이면 도형(색상 원)으로 대체 렌더링.
// ─────────────────────────────────────────────
const SPRITES = {
  cave:   { img: null, color: '#4a3222', r: 52 },
  ally:   { img: null, color: '#c9a06c', r: 14 },
  stone:  { img: null, color: '#9e9e9e', r: 4 },
  boar:   { img: null, color: '#8d6e63', r: 13 },
  wolf:   { img: null, color: '#78909c', r: 15 },
  hyena:  { img: null, color: '#a1887f', r: 16 },
  tiger:  { img: null, color: '#ef9a3c', r: 30 }, // 검치호 (보스)
}
const IMG_CACHE = {}
function getImg(key) {
  const s = SPRITES[key]
  if (!s || !s.img) return null
  if (!IMG_CACHE[key]) {
    const im = new Image()
    im.src = s.img
    IMG_CACHE[key] = im
  }
  return IMG_CACHE[key].complete && IMG_CACHE[key].naturalWidth > 0 ? IMG_CACHE[key] : null
}

// ── 적 정의 (기본 수치, 웨이브에 따라 배율 적용) ──
const ENEMY_TYPES = {
  boar:  { name: '멧돼지', hp: 20,  speed: 42, dmg: 8,  reward: 4 },
  wolf:  { name: '늑대',   hp: 35,  speed: 55, dmg: 12, reward: 7 },
  hyena: { name: '하이에나', hp: 70, speed: 36, dmg: 18, reward: 12 },
  tiger: { name: '검치호', hp: 600, speed: 26, dmg: 60, reward: 150 }, // 보스
}

// ── 무기 티어 ──
const WEAPONS = [
  { name: '돌멩이',   mult: 1,   cost: 0 },
  { name: '뗀석기',   mult: 2,   cost: 150 },
  { name: '나무 창',  mult: 3.5, cost: 800 },
  { name: '뼈 창',    mult: 6,   cost: 4000 },
  { name: '흑요석 창', mult: 10,  cost: 20000 },
]

// ── 능력치 정의 ──
const STAT_DEFS = {
  power: { name: '악력 발달',    desc: '공격력',   base: 20, growth: 1.55 },
  speed: { name: '뇌 용량 증가', desc: '공격 속도', base: 30, growth: 1.65 },
  range: { name: '두 발 서기',   desc: '사정거리',  base: 25, growth: 1.65 },
}
const statCost = (key, lv) => Math.floor(STAT_DEFS[key].base * Math.pow(STAT_DEFS[key].growth, lv))

const SAVE_KEY = 'paleoDefSave_v1'
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      return {
        meat: s.meat ?? 0,
        wave: s.wave ?? 1,
        lv: { power: s.lv?.power ?? 0, speed: s.lv?.speed ?? 0, range: s.lv?.range ?? 0 },
        weapon: s.weapon ?? 0,
      }
    }
  } catch (e) { /* 저장 손상 시 초기화 */ }
  return { meat: 0, wave: 1, lv: { power: 0, speed: 0, range: 0 }, weapon: 0 }
}

export default function App() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)

  const init = useRef(loadSave()).current
  const [meat, setMeat] = useState(init.meat)
  const [wave, setWave] = useState(init.wave)
  const [lv, setLv] = useState(init.lv)
  const [weapon, setWeapon] = useState(init.weapon)
  const [baseHp, setBaseHp] = useState(100)
  const [phase, setPhase] = useState('fighting') // fighting | cleared | gameover

  // 게임 루프에서 읽는 최신 값 (클로저 방지: ref로 접근)
  const statRef = useRef({})
  statRef.current = {
    damage: 5 * (1 + 0.5 * lv.power) * WEAPONS[weapon].mult,
    cooldown: 1000 / (1 + 0.15 * lv.speed),
    range: 220 + 20 * lv.range,
    wave, phase,
  }

  // 저장
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ meat, wave, lv, weapon }))
  }, [meat, wave, lv, weapon])

  // ── 게임 월드 (렌더와 무관한 mutable 상태) ──
  const world = useRef(null)
  if (!world.current) {
    world.current = {
      enemies: [], projectiles: [], allies: [],
      spawnLeft: 0, spawnTimer: 0, clearTimer: 0,
      baseHp: 100, maxBaseHp: 100,
      W: 0, H: 0, caveX: 0, caveY: 0,
      needStartWave: true,
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const w = world.current
    let raf = 0
    let last = performance.now()

    function resize() {
      const rect = wrapRef.current.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      w.W = rect.width
      w.H = rect.height
      w.caveX = w.W / 2
      w.caveY = w.H - 70
      // 부족원 3명: 동굴 앞 호(arc) 배치
      w.allies = [-1, 0, 1].map(i => ({
        x: w.caveX + i * 55,
        y: w.caveY - 55 - (i === 0 ? 14 : 0),
        cd: 0,
      }))
    }
    resize()
    window.addEventListener('resize', resize)

    function startWave(n) {
      w.enemies = []
      w.projectiles = []
      const boss = n % 5 === 0
      w.spawnLeft = boss ? 4 : 4 + n
      w.bossPending = boss
      w.spawnTimer = 400
      w.waveNum = n
      w.clearedFlag = false
    }
    w.startWave = startWave

    function spawnEnemy(n) {
      let typeKey
      if (w.bossPending && w.spawnLeft === 1) {
        typeKey = 'tiger'
      } else {
        const pool = n < 3 ? ['boar'] : n < 6 ? ['boar', 'wolf'] : ['boar', 'wolf', 'hyena']
        typeKey = pool[Math.floor(Math.random() * pool.length)]
      }
      const t = ENEMY_TYPES[typeKey]
      const scale = 1 + 0.35 * (n - 1)
      w.enemies.push({
        type: typeKey,
        x: 30 + Math.random() * (w.W - 60),
        y: -20,
        hp: t.hp * scale,
        maxHp: t.hp * scale,
        speed: t.speed * (0.9 + Math.random() * 0.2),
        dmg: t.dmg,
        reward: Math.floor(t.reward * (1 + 0.15 * (n - 1))),
      })
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const S = statRef.current

      if (S.phase === 'fighting') {
        if (w.needStartWave) { startWave(S.wave); w.needStartWave = false }

        // 스폰
        if (w.spawnLeft > 0) {
          w.spawnTimer -= dt * 1000
          if (w.spawnTimer <= 0) {
            spawnEnemy(w.waveNum)
            w.spawnLeft--
            w.spawnTimer = 800
          }
        }

        // 적 이동 (기지를 향해 직진)
        for (const e of w.enemies) {
          const dx = w.caveX - e.x, dy = w.caveY - e.y
          const d = Math.hypot(dx, dy) || 1
          e.x += (dx / d) * e.speed * dt
          e.y += (dy / d) * e.speed * dt
          if (d < 55) {
            e.dead = true
            w.baseHp -= e.dmg
          }
        }

        // 부족원 공격
        for (const a of w.allies) {
          a.cd -= dt * 1000
          if (a.cd <= 0) {
            let target = null, best = Infinity
            for (const e of w.enemies) {
              if (e.dead) continue
              const d = Math.hypot(e.x - a.x, e.y - a.y)
              if (d < S.range && d < best) { best = d; target = e }
            }
            if (target) {
              w.projectiles.push({ x: a.x, y: a.y, target, speed: 420 })
              a.cd = S.cooldown
            }
          }
        }

        // 투사체 (유도)
        for (const p of w.projectiles) {
          const t = p.target
          if (!t || t.dead) { p.dead = true; continue }
          const dx = t.x - p.x, dy = t.y - p.y
          const d = Math.hypot(dx, dy) || 1
          if (d < 12) {
            t.hp -= S.damage
            p.dead = true
            if (t.hp <= 0 && !t.dead) {
              t.dead = true
              w.killMeat = (w.killMeat || 0) + t.reward
            }
          } else {
            p.x += (dx / d) * p.speed * dt
            p.y += (dy / d) * p.speed * dt
          }
        }

        w.enemies = w.enemies.filter(e => !e.dead)
        w.projectiles = w.projectiles.filter(p => !p.dead)

        // 처치 보상 → React state로 반영 (프레임당 1회)
        if (w.killMeat) {
          const gain = w.killMeat
          w.killMeat = 0
          setMeat(m => m + gain)
        }
        if (w.baseHp !== w.shownHp) {
          w.shownHp = w.baseHp
          setBaseHp(Math.max(0, Math.ceil(w.baseHp)))
        }

        // 패배 판정
        if (w.baseHp <= 0) {
          setPhase('gameover')
        }
        // 클리어 판정 (리렌더 전 중복 실행 방지 플래그)
        else if (w.spawnLeft === 0 && w.enemies.length === 0 && !w.clearedFlag) {
          w.clearedFlag = true
          const bonus = 10 + w.waveNum * 3
          setMeat(m => m + bonus)
          setPhase('cleared')
          w.clearTimer = 1500
        }
      } else if (S.phase === 'cleared') {
        w.clearTimer -= dt * 1000
        if (w.clearTimer <= 0) {
          w.baseHp = Math.min(w.maxBaseHp, w.baseHp + 20) // 웨이브 클리어 시 소량 회복
          w.needStartWave = true
          setWave(v => v + 1)
          setPhase('fighting')
        }
      }

      draw(ctx)
      raf = requestAnimationFrame(loop)
    }

    function drawEntity(ctx, key, x, y, rOverride) {
      const s = SPRITES[key]
      const r = rOverride || s.r
      const im = getImg(key)
      if (im) {
        ctx.drawImage(im, x - r, y - r, r * 2, r * 2)
      } else {
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    function draw(ctx) {
      ctx.clearRect(0, 0, w.W, w.H)
      // 배경 (밤 초원)
      const g = ctx.createLinearGradient(0, 0, 0, w.H)
      g.addColorStop(0, '#141b26')
      g.addColorStop(0.7, '#2a2418')
      g.addColorStop(1, '#3a2f1d')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w.W, w.H)

      // 사정거리 표시 (은은하게)
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.beginPath()
      ctx.arc(w.caveX, w.caveY - 55, statRef.current.range, 0, Math.PI * 2)
      ctx.stroke()

      // 동굴
      drawEntity(ctx, 'cave', w.caveX, w.caveY)
      ctx.fillStyle = '#1a120b'
      ctx.beginPath()
      ctx.arc(w.caveX, w.caveY + 8, 26, Math.PI, 0)
      ctx.fill()

      // 부족원
      for (const a of w.allies) drawEntity(ctx, 'ally', a.x, a.y)

      // 적 + 체력바
      for (const e of w.enemies) {
        drawEntity(ctx, e.type, e.x, e.y)
        const s = SPRITES[e.type]
        const bw = s.r * 2
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(e.x - bw / 2, e.y - s.r - 9, bw, 4)
        ctx.fillStyle = '#e05a4e'
        ctx.fillRect(e.x - bw / 2, e.y - s.r - 9, bw * Math.max(0, e.hp / e.maxHp), 4)
      }

      // 투사체
      for (const p of w.projectiles) drawEntity(ctx, 'stone', p.x, p.y)
    }

    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // ── 업그레이드 핸들러 ──
  function buyStat(key) {
    const cost = statCost(key, lv[key])
    if (meat < cost) return
    setMeat(m => m - cost)
    setLv(v => ({ ...v, [key]: v[key] + 1 }))
  }
  function buyWeapon() {
    if (weapon >= WEAPONS.length - 1) return
    const cost = WEAPONS[weapon + 1].cost
    if (meat < cost) return
    setMeat(m => m - cost)
    setWeapon(v => v + 1)
  }
  function retry() {
    const w = world.current
    w.baseHp = w.maxBaseHp
    w.shownHp = w.maxBaseHp
    w.needStartWave = true
    setBaseHp(100)
    setPhase('fighting')
  }

  const fmt = n => n >= 10000 ? (n / 10000).toFixed(1) + '만' : Math.floor(n).toLocaleString()

  return (
    <div style={st.root}>
      {/* 상단 정보 */}
      <div style={st.topBar}>
        <div style={st.topItem}>고기 <b style={{ color: '#f0b060' }}>{fmt(meat)}</b></div>
        <div style={st.topItem}>웨이브 <b>{wave}</b>{wave % 5 === 0 && <span style={{ color: '#ef9a3c' }}> · 보스</span>}</div>
        <div style={{ ...st.topItem, flex: 1, maxWidth: 130 }}>
          <div style={st.hpOuter}><div style={{ ...st.hpInner, width: baseHp + '%' }} /></div>
        </div>
      </div>

      {/* 전투 화면 */}
      <div ref={wrapRef} style={st.canvasWrap}>
        <canvas ref={canvasRef} />
        {phase === 'cleared' && <div style={st.overlayText}>웨이브 {wave} 클리어!</div>}
        {phase === 'gameover' && (
          <div style={st.overlay}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>동굴 함락...</div>
            <div style={{ opacity: 0.8, marginBottom: 16 }}>웨이브 {wave}에서 무리가 전멸했다</div>
            <button style={st.retryBtn} onClick={retry}>다시 도전</button>
          </div>
        )}
      </div>

      {/* 하단 성장 패널 */}
      <div style={st.panel}>
        {Object.keys(STAT_DEFS).map(key => {
          const d = STAT_DEFS[key]
          const cost = statCost(key, lv[key])
          const ok = meat >= cost
          return (
            <button key={key} style={{ ...st.upBtn, opacity: ok ? 1 : 0.45 }} onClick={() => buyStat(key)}>
              <div style={st.upName}>{d.name}</div>
              <div style={st.upDesc}>{d.desc} Lv.{lv[key]}</div>
              <div style={{ ...st.upCost, color: ok ? '#f0b060' : '#888' }}>{fmt(cost)}</div>
            </button>
          )
        })}
        {(() => {
          const maxed = weapon >= WEAPONS.length - 1
          const next = maxed ? null : WEAPONS[weapon + 1]
          const ok = !maxed && meat >= next.cost
          return (
            <button style={{ ...st.upBtn, opacity: maxed ? 0.45 : ok ? 1 : 0.45 }} onClick={buyWeapon}>
              <div style={st.upName}>무기 제작</div>
              <div style={st.upDesc}>{WEAPONS[weapon].name}{!maxed && ' → ' + next.name}</div>
              <div style={{ ...st.upCost, color: ok ? '#f0b060' : '#888' }}>{maxed ? '최대' : fmt(next.cost)}</div>
            </button>
          )
        })()}
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
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '10px 14px', paddingTop: 'max(10px, env(safe-area-inset-top))',
    fontSize: 14, background: '#241a10', borderBottom: '1px solid #3a2c1c',
  },
  topItem: { whiteSpace: 'nowrap' },
  hpOuter: { height: 10, background: '#3a2c1c', borderRadius: 5, overflow: 'hidden' },
  hpInner: { height: '100%', background: '#7cb35c', transition: 'width 0.2s' },
  canvasWrap: { flex: 1, position: 'relative', minHeight: 0 },
  overlay: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', background: 'rgba(10,6,3,0.75)',
  },
  overlayText: {
    position: 'absolute', top: '38%', left: 0, right: 0, textAlign: 'center',
    fontSize: 24, fontWeight: 800, textShadow: '0 2px 8px rgba(0,0,0,0.8)', pointerEvents: 'none',
  },
  retryBtn: {
    padding: '12px 32px', fontSize: 16, fontWeight: 700, borderRadius: 12,
    border: 'none', background: '#c9772e', color: '#fff',
  },
  panel: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
    padding: '10px 10px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
    background: '#241a10', borderTop: '1px solid #3a2c1c',
  },
  upBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '10px 4px', borderRadius: 10, border: '1px solid #4a3822',
    background: '#312415', color: '#f5ead9', fontSize: 12,
  },
  upName: { fontWeight: 700, fontSize: 12 },
  upDesc: { fontSize: 10, opacity: 0.7 },
  upCost: { fontSize: 12, fontWeight: 700 },
}
