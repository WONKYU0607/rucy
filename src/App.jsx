import React, { useEffect, useRef, useState } from 'react'

// ── 디버그 모드: 업그레이드 비용 무료 + 레벨 직접입력 (출시 전 false로) ──
const DEBUG = true

// ── 주인공 애니메이션 (flip 틀리면 해당 값만 수정) ──
const ANIM = {
  quad:  { srcs: ['/hero/quad/quad_1.png', '/hero/quad/quad_2.png', '/hero/quad/quad_3.png', '/hero/quad/quad_4.png'], h: 76,  flip: false },
  walk:  { srcs: ['/hero/walk/walk_1.png', '/hero/walk/walk_2.png', '/hero/walk/walk_3.png', '/hero/walk/walk_4.png'], h: 130, flip: false },
  run:   { srcs: ['/hero/run/run_1.png', '/hero/run/run_2.png', '/hero/run/run_3.png', '/hero/run/run_4.png'], h: 119, flip: false },
  punch: { srcs: ['/hero/punch/punch_1.png', '/hero/punch/punch_2.png', '/hero/punch/punch_3.png'], h: 102, flip: false },
  throw: { srcs: ['/hero/throw/hero_windup.png', '/hero/throw/hero_release.png'], h: 130, flip: false },
  idle:  { srcs: ['/hero/idle/idle_1.png'], h: 130, flip: false },
}
// 스킬 정의 — charSeq: 히어로가 재생할 프레임(1-based, 없으면 전체), fx: 분리 이펙트
//   fx proj  = 투사체: fly 프레임이 몬스터 쪽으로 날아가 명중 시 데미지(+impact 프레임)
//   fx strike = 낙하/타격: 적 위치에 frames 재생, 중반에 데미지
// stage — 0:4족보행 1:직립보행 2:하빌리스 3:에렉투스 4:네안데르탈렌시스 5:사피엔스 6:인간
const SKILL_SHEET = [
  { id: 1, n: 6, h: 280, stage: 4, charSeq: [1, 2, 3, 4], fx: { type: 'strike', frames: [5, 6] } },
  { id: 2, n: 5, h: 280, stage: 4, charSeq: [1, 2], fx: { type: 'proj', fly: [3, 4], impact: 5 } },
  { id: 3, n: 4, h: 235, stage: 4, charSeq: [1, 2, 3], fx: { type: 'proj', fly: [4], impact: 4, flyScale: 0.45 } },
  { id: 7, n: 6, h: 110, stage: 0 },
  { id: 8, n: 6, h: 140, stage: 0 },
  { id: 12, n: 7, h: 120, stage: 0 },
  { id: 13, n: 7, h: 125, stage: 0 },
  { id: 15, n: 5, h: 131, stage: 1 },
  { id: 16, n: 6, h: 150, stage: 1, charSeq: [1, 2], fx: { type: 'strike', frames: [3, 4, 5, 6] } },
  { id: 17, n: 5, h: 133, stage: 1 },
  { id: 18, n: 5, h: 205, stage: 2, charSeq: [1, 2], fx: { type: 'strike', frames: [3, 4, 5] } },
  { id: 19, n: 4, h: 235, stage: 2, charSeq: [1], fx: { type: 'proj', fly: [2, 3, 4, 4, 4], flyScale: 0.6 } },
  { id: 20, n: 5, h: 171, stage: 2, charSeq: [1, 2, 3, 5], fx: { type: 'proj', fly: [4], flyScale: 0.9, yOff: 0 } },
]
// 스킬 전체 프레임 이미지 (이펙트 렌더용)
const SIMG = {}
SKILL_SHEET.forEach(c => {
  SIMG[c.id] = Array.from({ length: c.n }, (_, j) => { const im = new Image(); im.src = `/skill/s${c.id}/s${c.id}_${j + 1}.png`; return im })
  const seq = c.charSeq || Array.from({ length: c.n }, (_, j) => j + 1)
  ANIM['s_' + c.id] = { srcs: seq.map(j => `/skill/s${c.id}/s${c.id}_${j}.png`), h: c.h, flip: false }
})
const AIMG = {}
for (const k in ANIM) AIMG[k] = ANIM[k].srcs.map(s => { const i = new Image(); i.src = s; return i })
const BG = new Image(); BG.src = '/bg/bg.jpg'
const STONE = new Image(); STONE.src = '/misc/stone.png'

// ── 스킬 프레임 시간 설정 (초, 직접 수정) ─────────────────────────
// 각 원소 = 그 순서의 히어로 프레임 표시 시간. 배열 길이 = 히어로 프레임 수.
// 시전 총 시간 = 합계. 없는 스킬은 프레임당 0.15초.
const SKILL_FRAME_T = {
  1:  [0.15, 0.15, 0.15, 0.15],           // 몽둥이번개 (4프레임)
  2:  [0.20, 0.20],                        // 창던지기 (2)
  3:  [0.15, 0.15, 0.15],                  // 불창 (3)
  7:  [0.15, 0.15, 0.15, 0.15, 0.15, 0.15],       // (6)
  8:  [0.15, 0.15, 0.15, 0.15, 0.15, 0.15],       // (6)
  12: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15], // (7)
  13: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15], // (7)
  15: [0.15, 0.15, 0.15, 0.15, 0.15],      // (5)
  16: [0.25, 0.25],                        // 낙석 시전 (2)
  17: [0.15, 0.15, 0.15, 0.15, 0.15],      // (5)
  18: [0.25, 0.25],                        // 점프낙석 시전 (2)
  19: [0.30],                              // 화염 시전 (1)
  20: [0.15, 0.15, 0.15, 0.15],            // 토네이도 (4: 휘두르기3+복귀1)
}
// 이펙트 타이밍
const STRIKE_DUR = 0.55   // 낙뢰/낙석 이펙트 재생 시간(초) 기본값
const PROJ_FPS = 8        // 투사체 프레임 전환 속도(초당) 기본값

// ── 날아가는 이펙트(투사체) 프레임 시간 (초, 직접 수정) ──────────
// fly 배열과 같은 길이. 순환 재생됨. 없는 스킬은 1/PROJ_FPS 균등.
const FX_FRAME_T = {
  2:  [0.12, 0.12],                       // 창 (fly 2프레임)
  3:  [0.12],                             // 불덩이 (1)
  19: [0.06, 0.10, 0.20, 0.20, 0.20],     // 화염 (빔,빔,곰,곰,곰)
  20: [0.12],                             // 회오리 (1)
}
// 낙하/타격 이펙트 재생 시간 (초, 스킬별) — 없으면 STRIKE_DUR
const STRIKE_DUR_BY = {
  1: 0.55,    // 번개
  16: 0.55,   // 낙석
  18: 0.55,   // 점프낙석
}

const SKILLS = SKILL_SHEET.map(c => {
  const len = c.charSeq ? c.charSeq.length : c.n
  const ft = SKILL_FRAME_T[c.id] || Array(len).fill(0.15)
  const ends = []; let acc = 0
  for (const t of ft) { acc += t; ends.push(acc) }
  return {
    key: 's' + c.id, id: c.id, name: '스킬 ' + c.id, anim: 's_' + c.id, icon: String(c.id), stage: c.stage,
    h: c.h, fx: c.fx || null, frameEnds: ends,
    cd: 1, cast: acc, hitAt: 0.55, dmgMult: 2, aoe: false, maxTargets: 1,
    desc: c.n + '프레임 · 임시값',
  }
})
// 대시 프레임 타이밍: 0=기모으기 앞부분 짧게, 주먹뻗기(3,4번) 길게

const HERO_X = 90
const SPEED = 1                                      // 전역 속도 배율
const SCROLL = 140 * SPEED                            // 전진 속도 (px/s)
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
  bear:     { name: '동굴곰', hp: 260, speed: 40, dmg: 32, reward: 35, h: 88, color: '#6b4f35', flip: true,
              frames: ['/monster/bear/bear_1.png', '/monster/bear/bear_2.png', '/monster/bear/bear_3.png', '/monster/bear/bear_4.png'] },
  rhino:    { name: '털코뿔소', hp: 450, speed: 45, dmg: 40, reward: 55, h: 82, color: '#9c988f', flip: true,
              frames: ['/monster/rhino/rhino_1.png', '/monster/rhino/rhino_2.png', '/monster/rhino/rhino_3.png', '/monster/rhino/rhino_4.png'] },
  mammoth:  { name: '매머드', hp: 900, speed: 32, dmg: 55, reward: 110, h: 100, color: '#5f4a34', flip: true,
              frames: ['/monster/mammoth/mammoth_1.png', '/monster/mammoth/mammoth_2.png', '/monster/mammoth/mammoth_3.png', '/monster/mammoth/mammoth_4.png'] },
  tiger:    { name: '검치호', hp: 600, speed: 80, dmg: 60, reward: 130, h: 84, color: '#c68a3c', flip: true,
              frames: ['/monster/tiger/tiger_1.png', '/monster/tiger/tiger_2.png', '/monster/tiger/tiger_3.png', '/monster/tiger/tiger_4.png'] },
}
const EIMG = {}
for (const k in ENEMY_TYPES) {
  const e = ENEMY_TYPES[k]
  EIMG[k] = e.frames.map(src => { const i = new Image(); i.src = src; return i })
  // reward를 고기 획득량으로, 경험치는 reward의 1.5배로 파생
  e.meat = e.reward
  e.exp = Math.round(e.reward * 1.5)
  // 명중/회피: 빠른 동물일수록 회피↑, 큰 동물일수록 명중↑(피하기 어려움 대신 잘 맞음)
  e.eva = Math.min(0.4, e.speed / 400)        // 회피율 (늑대 0.3, 매머드 0.08)
  e.acc = Math.min(0.35, e.dmg / 200)         // 명중률 (강한 적일수록 잘 맞춤)
}
const WAVE_CYCLE = ['rabbit', 'antelope', 'deer', 'boar', 'wolf', 'hyena', 'bear', 'rhino', 'tiger', 'mammoth']

// 9종 스탯 — 강화탭(고기)·스킬탭(스킬포인트) 양쪽에서 사용
// eff(lv): 레벨당 효과 텍스트 / 강화는 고기비용, 스킬은 SP 1/레벨
const STAT_LIST = {
  atk:      { name: '공격력',       icon: '⚔', per: 8,  suffix: '%', cost: 15, growth: 1.13 },
  hp:       { name: '체력',         icon: '❤', per: 10, suffix: '%', cost: 20, growth: 1.15 },
  regen:    { name: '체력 회복',    icon: '✚', per: 2,  suffix: '/초', cost: 25, growth: 1.16 },
  critRate: { name: '치명타 확률',  icon: '✧', per: 0.1, suffix: '%', cost: 30, growth: 1.20, cap: 100 },
  critDmg:  { name: '치명타 공격력', icon: '✦', per: 15, suffix: '%', cost: 25, growth: 1.17 },
  meatUp:   { name: '고기 획득량',  icon: '🍖', per: 5,  suffix: '%', cost: 20, growth: 1.15 },
  expUp:    { name: '경험치 획득량', icon: '📖', per: 5,  suffix: '%', cost: 20, growth: 1.15 },
  acc:      { name: '명중률',       icon: '◎', per: 3,  suffix: '%', cost: 30, growth: 1.18 },
  eva:      { name: '회피율',       icon: '➰', per: 2,  suffix: '%', cost: 30, growth: 1.18 },
  aspd:     { name: '공격 속도',    icon: '⚡', per: 0.1, suffix: '%', cost: 25, growth: 1.18, cap: 200 },
  mspd:     { name: '이동 속도',    icon: '👟', per: 0.1, suffix: '%', cost: 25, growth: 1.18, cap: 200 },
}
const STAT_KEYS = Object.keys(STAT_LIST)
const statInit = () => STAT_KEYS.reduce((o, k) => (o[k] = 0, o), {})
const statText = (k, lv) => {
  const d = STAT_LIST[k]
  let v = d.cap ? Math.min(d.cap, lv * d.per) : lv * d.per
  v = Math.round(v * 10) / 10
  return d.suffix === '/초' ? `${v}/초` : `+${v}%`
}
// 강화(고기) 비용
const buyCost = (k, lv) => Math.floor(STAT_LIST[k].cost * Math.pow(STAT_LIST[k].growth, lv))

// 히어로 레벨업 필요 경험치
const heroExpReq = lv => Math.floor(50 * Math.pow(1.18, lv - 1))


// mode: quad = 4족 질주 + 주먹질 / biped = 직립 보행 + 돌 던지기
const EVOS = [
  { name: '오스트랄로피테쿠스 (4족보행)', mult: 1, mode: 'quad' },
  { name: '오스트랄로피테쿠스 (직립보행)', mult: 3, cost: 1500, mode: 'biped' },
  { name: '호모 하빌리스', mult: 9, cost: 30000, mode: 'biped' },
  { name: '호모 에렉투스', mult: 27, cost: 300000, mode: 'biped' },
  { name: '호모 네안데르탈렌시스', mult: 81, cost: 3000000, mode: 'biped' },
  { name: '호모 사피엔스', mult: 243, cost: 30000000, mode: 'biped' },
  { name: '인간', mult: 729, cost: 300000000, mode: 'biped' },
]

const SAVE_KEY = 'paleoDefSave_v5'
const SLOT_COUNT = 4
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY))
    if (s) return {
      meat: s.meat ?? 0, wave: s.wave ?? 1,
      lv: { ...statInit(), ...s.lv }, evo: s.evo ?? 0,
      hlv: s.hlv ?? 1, hexp: s.hexp ?? 0, sp: s.sp ?? 0,
      skill: { ...statInit(), ...s.skill },
      equipped: (Array.isArray(s.equipped) ? s.equipped.slice(0, SLOT_COUNT) : [null, null, null, null]).map(si => (si != null && si < SKILLS.length ? si : null)),
      cdConf: Array.isArray(s.cdConf) && s.cdConf.length === SKILLS.length ? s.cdConf : SKILLS.map(k => k.cd),
    }
  } catch (e) {}
  return { meat: 0, wave: 1, lv: statInit(), evo: 0, hlv: 1, hexp: 0, sp: 0, skill: statInit(), equipped: [null, null, null, null], cdConf: SKILLS.map(k => k.cd) }
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
  const [hlv, setHlv] = useState(init.hlv)     // 히어로 레벨
  const [hexp, setHexp] = useState(init.hexp)  // 히어로 경험치
  const [sp, setSp] = useState(init.sp)        // 스킬포인트
  const [skill, setSkill] = useState(init.skill)
  const [nav, setNav] = useState('영웅')     // 하단 네비: 영웅/스킬/장비/동료/퀴즈/상점
  const [tab, setTab] = useState('강화')      // 영웅 서브탭: 강화/성장/진화
  const [phase, setPhase] = useState('fighting')
  const [heroHpUI, setHeroHpUI] = useState(100)
  const [progress, setProgress] = useState(0)
  const [gains, setGains] = useState([])       // 획득 팝업 리스트
  const [skillCdUI, setSkillCdUI] = useState(SKILLS.map(() => 0))  // 스킬 남은 쿨타임(초)
  const [equipped, setEquipped] = useState(init.equipped)          // 장착 슬롯 (스킬 index or null)
  const [cdConf, setCdConf] = useState(init.cdConf)                // 스킬별 쿨타임 설정(초, 직접입력)

  // 스탯 총 레벨 = 강화(고기) + 스킬(SP), 효과는 STAT_LIST.per 기준
  const tot = k => (lv[k] || 0) + (skill[k] || 0)
  const ATK_BASE = 10, HP_BASE = 100, ASPD = 1.0
  const aspdMult = 1 + Math.min(200, tot('aspd') * STAT_LIST.aspd.per) / 100   // 공격속도 배율
  const mspdMult = 1 + Math.min(200, tot('mspd') * STAT_LIST.mspd.per) / 100   // 이동속도 배율
  const maxHp = HP_BASE * (1 + tot('hp') * STAT_LIST.hp.per / 100)
  const S = useRef({})
  S.current = {
    atk: ATK_BASE * EVOS[evo].mult * (1 + tot('atk') * STAT_LIST.atk.per / 100),
    cd: 1000 / (ASPD * aspdMult) / SPEED,
    aspdMult, mspdMult,
    maxHp, wave, phase,
    mode: EVOS[evo].mode,
    evo,
    critRate: Math.min(1, tot('critRate') * STAT_LIST.critRate.per / 100),
    critMult: 2 + tot('critDmg') * STAT_LIST.critDmg.per / 100,
    regen: tot('regen') * STAT_LIST.regen.per,
    meatMult: 1 + tot('meatUp') * STAT_LIST.meatUp.per / 100,
    expMult: 1 + tot('expUp') * STAT_LIST.expUp.per / 100,
    acc: tot('acc') * STAT_LIST.acc.per / 100,
    eva: tot('eva') * STAT_LIST.eva.per / 100,
    equipped,
    cdConf,
  }

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ meat, wave, lv, evo, hlv, hexp, sp, skill, equipped, cdConf }))
  }, [meat, wave, lv, evo, hlv, hexp, sp, skill, equipped, cdConf])

  // 진화 시 현재 단계가 아닌 장착 스킬 자동 해제
  useEffect(() => {
    setEquipped(eq => eq.map(si => (si != null && SKILLS[si].stage === evo ? si : null)))
  }, [evo])

  // 히어로 레벨업: 경험치가 필요량 넘으면 레벨↑ + 스킬포인트 지급
  useEffect(() => {
    let cl = hlv, ce = hexp, gained = 0
    while (ce >= heroExpReq(cl)) { ce -= heroExpReq(cl); cl++; gained++ }
    if (gained > 0) { setHlv(cl); setHexp(ce); setSp(s => s + gained) }
  }, [hexp])

  // 획득 팝업 자동 소멸 (1.2초)
  useEffect(() => {
    if (!gains.length) return
    const t = setInterval(() => {
      const now = performance.now()
      setGains(g => g.filter(x => now - x.born < 1200))
    }, 300)
    return () => clearInterval(t)
  }, [gains.length])

  const world = useRef(null)
  if (!world.current) {
    world.current = {
      enemies: [], stones: [], dmgTexts: [], particles: [],
      hero: { hp: maxHp, cd: 0, state: 'move', t: 0, did: false, flash: 0, animT: 0 },
      spawnLeft: 0, spawnTimer: 0, killed: 0, total: 1,
      shake: 0, scrollX: 0, needStart: true, W: 0, H: 0, groundY: 0,
      skillCd: SKILLS.map(() => 0), skill: null, skillT: 0, skillDid: false, rocks: [], projs: [], strikes: [],
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
      w.enemies = []; w.stones = []; w.dmgTexts = []; w.particles = []; w.pools = []; w.rocks = []; w.waves = []; w.projs = []; w.strikes = []; w.skill = null; w.skillT = 0
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
        meat: Math.floor(t.meat * (1 + 0.2 * (w.waveNum - 1))) * (boss ? 15 : 1),
        exp: Math.floor(t.exp * (1 + 0.2 * (w.waveNum - 1))) * (boss ? 15 : 1),
        acc: t.acc, eva: t.eva,
        h: t.h * (boss ? 1.9 : 1), color: t.color, cd: 0, flash: 0, animT: Math.random() * 10,
      })
    }

    function addDmg(x, y, val, crit, miss) { w.dmgTexts.push({ x, y, val: typeof val === 'number' ? fmt(val) : val, life: 0.8, crit, miss }) }
    function burst(x, y, color, n = 10, blood = false) {
      for (let i = 0; i < n; i++) {
        const a = blood ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2
        const sp = blood ? 80 + Math.random() * 240 : 60 + Math.random() * 160
        w.particles.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (blood ? 40 : 60),
          life: blood ? 0.4 + Math.random() * 0.4 : 0.5,
          r: blood ? 1.5 + Math.random() * 3 : 2,
          color, blood,
        })
      }
    }
    function bloodPool(x, y) {
      w.pools = w.pools || []
      w.pools.push({ x, y, r: 4, max: 14 + Math.random() * 10, life: 1.2 })
    }
    function dealDamage(t, st) {
      // 명중 판정: 적 회피율 − 내 명중 보너스
      const missChance = Math.max(0, t.eva - st.acc)
      if (Math.random() < missChance) {
        addDmg(t.x, w.groundY - t.h - 20, 'MISS', false, true)
        return
      }
      const crit = Math.random() < st.critRate
      const dmg = st.atk * (crit ? st.critMult : 1)
      t.hp -= dmg
      t.flash = 1
      t.x += 8
      const ty = w.groundY - t.h * 0.55
      addDmg(t.x, ty - t.h * 0.5 - 12, Math.round(dmg), crit)
      burst(t.x, ty, '#c81818', crit ? 20 : 10, true)   // 빨간 피 튀김
      w.shake = Math.max(w.shake, crit ? 5 : 2)
      if (t.hp <= 0 && !t.dead) killEnemy(t, st)
    }
    function killEnemy(t, st) {
      t.dead = true
      w.killed++
      const gm = Math.floor(t.meat * st.meatMult)
      const ge = Math.floor(t.exp * st.expMult)
      w.killMeat = (w.killMeat || 0) + gm
      w.killExp = (w.killExp || 0) + ge
      w.gainQueue = w.gainQueue || []
      w.gainQueue.push({ meat: gm, exp: ge })
      const ty = w.groundY - t.h * 0.55
      burst(t.x, ty, '#a01010', 24, true)
      bloodPool(t.x, w.groundY - 4)
    }
    // 스킬 데미지 (명중 무시, 항상 적중 + 큰 피 이펙트)
    function applySkillDmg(t, dmg) {
      t.hp -= dmg
      t.flash = 1
      const ty = w.groundY - t.h * 0.55
      addDmg(t.x, ty - t.h * 0.5 - 12, Math.round(dmg), true)
      burst(t.x, ty, '#c81818', 18, true)
      if (t.hp <= 0 && !t.dead) killEnemy(t, S.current)
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const st = S.current
      const hero = w.hero
      const atkRange = st.mode === 'quad' ? PUNCH.range : THROW.range

      // 배경 스크롤: 이동 상태일 때만 전진
      const moving = (st.phase === 'fighting' || st.phase === 'cleared') && hero.state === 'move'
      const scroll = moving ? SCROLL * st.mspdMult : 0
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
          if (e.stun > 0) { e.stun -= dt; continue }  // 기절 중 정지
          const stopX = HERO_X + Math.min(atkRange - 15, 45 + e.h * 0.4)
          if (e.x > stopX) {
            e.x -= (e.speed * SPEED * 1.3 + scroll) * dt
            e.animT += dt * SPEED * (1 + scroll / SCROLL * 0.4)
          } else {
            e.cd -= dt * 1000
            if (e.cd <= 0) {
              // 회피 판정: 적 명중률 − 내 회피 보너스
              const hitChance = Math.max(0.05, e.acc + 0.5 - st.eva)
              if (Math.random() < hitChance) {
                hero.hp -= e.dmg
                hero.flash = 0.2
                w.shake = 4
                burst(HERO_X + 15, w.groundY - 70, '#c81818', 8, true)
              } else {
                addDmg(HERO_X, w.groundY - 130, 'DODGE', false, true)
              }
              e.cd = 1200
            }
          }
        }

        // 히어로 체력 회복 (스킬)
        if (st.regen > 0 && hero.hp < st.maxHp) {
          hero.hp = Math.min(st.maxHp, hero.hp + st.regen * dt)
        }

        // ── 스킬 시스템 (자동 발동) ──
        for (let i = 0; i < SKILLS.length; i++) if (w.skillCd[i] > 0) w.skillCd[i] = Math.max(0, w.skillCd[i] - dt)
        if (w.skill == null) {
          // 시전 중 아님: 장착된 스킬 중 쿨 끝난 첫 번째를 적이 있을 때 발동
          if (w.enemies.some(e => !e.dead)) {
            const slots = st.equipped || []
            let ready = -1
            for (const si of slots) {
              if (si != null && SKILLS[si].stage === st.evo && w.skillCd[si] <= 0) { ready = si; break }
            }
            if (ready >= 0) { w.skill = ready; w.skillT = 0; w.skillDid = false; w.skillCd[ready] = st.cdConf?.[ready] ?? SKILLS[ready].cd }
          }
        } else {
          const sk = SKILLS[w.skill]
          w.skillT += dt * SPEED
          if (!w.skillDid && w.skillT >= sk.cast * sk.hitAt) {
            w.skillDid = true
            const dmg = st.atk * sk.dmgMult
            if (sk.fx && sk.fx.type === 'proj') {
              // 투사체: 히어로 앞에서 생성, 명중 시 데미지
              const ft = FX_FRAME_T[sk.id] || sk.fx.fly.map(() => 1 / PROJ_FPS)
              const fe = []; let fa = 0; for (const t of ft) { fa += t; fe.push(fa) }
              w.projs.push({ id: sk.id, fly: sk.fx.fly, impact: sk.fx.impact || null, x: HERO_X + 70, t: 0, dmg, h: sk.fx.fxH ?? sk.h, scale: sk.fx.flyScale || 1, yOff: sk.fx.yOff ?? 40, fe, feTotal: fa })
            } else if (sk.fx && sk.fx.type === 'strike') {
              // 낙하/타격: 살아있는 적 위치마다 (최대 5), 없으면 전방
              const ts = w.enemies.filter(e => !e.dead).slice(0, 5)
              const xs = ts.length ? ts.map(e => e.x) : [HERO_X + 260]
              for (const x of xs) w.strikes.push({ id: sk.id, frames: sk.fx.frames, x, t: 0, dur: STRIKE_DUR_BY[sk.id] ?? STRIKE_DUR, dmg, hitDone: false, h: sk.fx.fxH ?? sk.h })
            } else if (sk.aoe) {
              for (const t of w.enemies) if (!t.dead) { applySkillDmg(t, dmg); if (sk.stun) t.stun = sk.stun }
            } else {
              const targets = w.enemies.filter(e => !e.dead).sort((a, b) => a.x - b.x).slice(0, sk.maxTargets || 1)
              for (const t of targets) applySkillDmg(t, dmg)
            }
            w.shake = 8
          }
          if (w.skillT >= sk.cast) { w.skill = null; w.skillT = 0 }
        }
        // UI 동기화 (0.2초 간격)
        w.skillUiT = (w.skillUiT || 0) + dt
        if (w.skillUiT > 0.15) { w.skillUiT = 0; setSkillCdUI([...w.skillCd]) }

        // 스킬 투사체: 전진, 지나는 모든 적 관통 타격 (완전관통)
        for (const prj of w.projs) {
          prj.t += dt
          prj.x += 520 * dt * SPEED
          prj.hitSet = prj.hitSet || new Set()
          for (const e of w.enemies) {
            if (!e.dead && !prj.hitSet.has(e) && Math.abs(e.x - prj.x) < 45) {
              prj.hitSet.add(e)
              applySkillDmg(e, prj.dmg)
              if (prj.impact) w.strikes.push({ id: prj.id, frames: [prj.impact], x: e.x, t: 0, dur: 0.35, dmg: 0, hitDone: true, h: prj.h })
            }
          }
          if (prj.x > w.W + 100) prj.dead = true
        }
        w.projs = w.projs.filter(p => !p.dead)

        // 스킬 타격(낙뢰/낙석): 재생 중반에 해당 위치 적 데미지
        for (const stk of w.strikes) {
          stk.t += dt
          if (!stk.hitDone && stk.t >= stk.dur * 0.45) {
            stk.hitDone = true
            if (stk.dmg > 0) for (const e of w.enemies) if (!e.dead && Math.abs(e.x - stk.x) < 70) applySkillDmg(e, stk.dmg)
          }
        }
        w.strikes = w.strikes.filter(s => s.t < s.dur)

        // 낙석 업데이트
        for (const rk of w.rocks) {
          if (rk.hit) { rk.life -= dt; continue }
          rk.y += rk.vy * dt
          if (rk.y >= w.groundY - 10) { rk.hit = true; rk.life = 0.3; burst(rk.x, w.groundY, '#9e9384', 8) }
        }
        w.rocks = w.rocks.filter(rk => !rk.hit || rk.life > 0)

        // 음파 링 확산
        if (w.waves) {
          for (const wv of w.waves) {
            if (wv.delay > 0) { wv.delay -= dt; continue }
            wv.r += 260 * dt
            wv.life -= dt
          }
          w.waves = w.waves.filter(wv => wv.life > 0)
        }

        // 주인공 상태머신 (스킬 시전 중엔 일반 공격 안 함)
        hero.cd -= dt * 1000
        hero.flash = Math.max(0, hero.flash - dt)
        if (w.skill != null) {
          // 스킬 시전 중: 상태 유지, 이동/공격 정지
        } else if (hero.state === 'move') {
          hero.animT += dt * SPEED * st.mspdMult
          const target = w.enemies.find(e => !e.dead && e.x - HERO_X < atkRange)
          if (hero.cd <= 0 && target) {
            hero.state = 'attack'; hero.t = 0; hero.did = false
            hero.cd = st.cd
          }
        } else if (hero.state === 'attack') {
          hero.t += dt * SPEED * st.aspdMult
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
          p.t += dt * SPEED
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
        if (w.killExp) { const e = w.killExp; w.killExp = 0; setHexp(x => x + e) }
        if (w.gainQueue && w.gainQueue.length) {
          const q = w.gainQueue; w.gainQueue = []
          setGains(g => [...g, ...q.map(x => ({ ...x, id: w.gainId = (w.gainId || 0) + 1, born: now }))].slice(-6))
        }
        const prog = w.total ? w.killed / w.total : 0
        if (prog !== w.shownProg) { w.shownProg = prog; setProgress(prog) }
        if (Math.ceil(hero.hp) !== w.shownHp) { w.shownHp = Math.ceil(hero.hp); setHeroHpUI(Math.max(0, w.shownHp)) }

        if (hero.hp <= 0) setPhase('gameover')
        else if (w.spawnLeft === 0 && w.enemies.length === 0 && !w.clearedFlag) {
          w.clearedFlag = true
          setMeat(m => m + 15 + w.waveNum * 5)
          setPhase('cleared')
          w.clearTimer = 1200
          hero.state = 'move'; hero.t = 0   // 시전/공격 중단하고 전진 자세로
          w.skill = null; w.skillT = 0
        }
      } else if (st.phase === 'cleared') {
        hero.state = 'move'
        hero.animT += dt * SPEED * st.mspdMult
        w.clearTimer -= dt * 1000
        if (w.clearTimer <= 0) { w.needStart = true; setWave(v => v + 1); setPhase('fighting') }
      }

      for (const d of w.dmgTexts) { d.life -= dt; d.y -= 45 * dt }
      w.dmgTexts = w.dmgTexts.filter(d => d.life > 0)
      for (const p of w.particles) { p.life -= dt; p.x += p.vx * dt * SPEED; p.y += p.vy * dt * SPEED; p.vy += 600 * dt }
      w.particles = w.particles.filter(p => p.life > 0)
      if (w.pools) {
        for (const pl of w.pools) { pl.life -= dt; pl.r = Math.min(pl.max, pl.r + 40 * dt) }
        w.pools = w.pools.filter(pl => pl.life > 0)
      }
      w.shake = Math.max(0, w.shake - dt * 25)

      draw(ctx, now)
      raf = requestAnimationFrame(loop)
    }

    function heroAnim(hero, st) {
      if (w.skill != null) {
        const sk = SKILLS[w.skill]
        const arr = ANIM[sk.anim].srcs
        let k = sk.frameEnds.findIndex(e => w.skillT <= e)
        if (k < 0 || k >= arr.length) k = arr.length - 1
        return [sk.anim, k]
      }
      if (hero.state === 'attack') {
        if (st.mode === 'quad') {
          const k = hero.t < PUNCH.hitAt ? 0 : hero.t < PUNCH.hitAt + 0.1 ? 1 : 2
          return ['punch', k]
        }
        const k = hero.t < THROW.windupEnd ? 0 : 1
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

    function drawEnemy(ctx, e, now) {
      const y = w.groundY
      const t = ENEMY_TYPES[e.type]
      const imgs = EIMG[e.type]
      const stunned = e.stun > 0
      const gall = e.animT * 9
      const fi = stunned ? 0 : Math.floor(gall / Math.PI) % imgs.length  // 기절 시 프레임 고정
      const bounce = stunned ? 0 : Math.abs(Math.sin(gall)) * e.h * 0.08
      const rock = stunned ? 0 : Math.sin(gall) * 0.06
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
      const bw = Math.min(52, e.h * 0.9)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(e.x - bw / 2, y - e.h - 12, bw, 4)
      ctx.fillStyle = '#d51616'
      ctx.fillRect(e.x - bw / 2, y - e.h - 12, bw * Math.max(0, e.hp / e.maxHp), 4)
      // 기절: 머리 위로 노란 별 3개 원 궤도 회전
      if (stunned) {
        const cx = e.x, cy = y - e.h - 14, rad = 14
        for (let s = 0; s < 3; s++) {
          const ang = now * 0.005 + (s * Math.PI * 2 / 3)
          const sx = cx + Math.cos(ang) * rad, sy = cy + Math.sin(ang) * rad * 0.5
          drawStar(ctx, sx, sy, 5, 3, '#ffd42a')
        }
      }
    }
    function drawStar(ctx, cx, cy, outer, inner, color) {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.fillStyle = color
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner
        const a = -Math.PI / 2 + i * Math.PI / 5
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r)
      }
      ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.restore()
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

      // 바닥 핏자국 (배경 위, 캐릭터 아래)
      if (w.pools) for (const pl of w.pools) {
        ctx.globalAlpha = Math.min(0.55, pl.life * 0.5)
        ctx.fillStyle = '#5c0d0d'
        ctx.beginPath(); ctx.ellipse(pl.x, pl.y, pl.r, pl.r * 0.35, 0, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1

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

      for (const e of w.enemies) drawEnemy(ctx, e, now)

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

      // 음파 링 (포효)
      if (w.waves) for (const wv of w.waves) {
        if (wv.delay > 0) continue
        ctx.globalAlpha = Math.max(0, wv.life)
        ctx.strokeStyle = '#ffe08a'
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(wv.x, wv.y, wv.r, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.globalAlpha = 1

      // 스킬 타격 이펙트 (적 위치 낙뢰/낙석/임팩트)
      for (const stk of w.strikes) {
        const fi = Math.min(stk.frames.length - 1, Math.floor(stk.t / stk.dur * stk.frames.length))
        const im = SIMG[stk.id][stk.frames[fi] - 1]
        if (im && im.complete && im.naturalWidth > 0) {
          const hh = stk.h
          const ww = hh * (im.naturalWidth / im.naturalHeight)
          ctx.drawImage(im, stk.x - ww / 2, w.groundY - hh, ww, hh)
        }
      }
      // 스킬 투사체 (몬스터 쪽으로 비행)
      for (const prj of w.projs) {
        const tm = prj.t % prj.feTotal
        let pfi = prj.fe.findIndex(e => tm <= e); if (pfi < 0) pfi = prj.fly.length - 1
        const im = SIMG[prj.id][prj.fly[pfi] - 1]
        if (im && im.complete && im.naturalWidth > 0) {
          const hh = prj.h * prj.scale
          const ww = hh * (im.naturalWidth / im.naturalHeight)
          ctx.drawImage(im, prj.x - ww / 2, w.groundY - prj.yOff - hh, ww, hh)
        }
      }

      // 낙석 (하늘에서 떨어지는 돌)
      for (const rk of w.rocks) {
        if (rk.hit) continue
        if (STONE.complete && STONE.naturalWidth > 0) {
          ctx.drawImage(STONE, rk.x - 12, rk.y - 12, 24, 24)
        } else {
          ctx.fillStyle = '#9e9384'
          ctx.beginPath(); ctx.arc(rk.x, rk.y, 11, 0, Math.PI * 2); ctx.fill()
        }
      }

      for (const p of w.particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 3))
        ctx.fillStyle = p.color
        if (p.blood) {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
        } else {
          ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
        }
      }
      ctx.globalAlpha = 1

      ctx.textAlign = 'center'
      for (const d of w.dmgTexts) {
        ctx.globalAlpha = Math.min(1, d.life * 2.5)
        ctx.font = (d.crit ? '900 22px' : d.miss ? '800 14px' : '800 16px') + ' sans-serif'
        ctx.fillStyle = d.miss ? '#8ab4ff' : d.crit ? '#ffca28' : '#fff'
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

  // 강화(고기) — 레벨 직접 설정
  function setStatLv(k, n) {
    n = Math.max(0, Math.floor(Number(n) || 0))
    setLv(v => ({ ...v, [k]: n }))
  }
  function buyStat(k, delta = 1) {
    if (delta < 0) { setLv(v => ({ ...v, [k]: Math.max(0, v[k] + delta) })); return }
    const c = DEBUG ? 0 : buyCost(k, lv[k])
    if (meat < c) return
    setMeat(m => m - c)
    setLv(v => ({ ...v, [k]: v[k] + 1 }))
  }
  // 스킬(SP) — 레벨 직접 설정 (DEBUG 시 SP 무시)
  function setSkillLv(k, n) {
    n = Math.max(0, Math.floor(Number(n) || 0))
    setSkill(s => ({ ...s, [k]: n }))
  }
  function upSkill(k, delta = 1) {
    if (delta < 0) { setSkill(s => ({ ...s, [k]: Math.max(0, s[k] + delta) })); return }
    if (!DEBUG && sp <= 0) return
    if (!DEBUG) setSp(s => s - 1)
    setSkill(s => ({ ...s, [k]: s[k] + 1 }))
  }
  function evolve() {
    if (evo >= EVOS.length - 1) return
    const c = DEBUG ? 0 : EVOS[evo + 1].cost
    if (meat < c) return
    setMeat(m => m - c)
    setEvo(v => v + 1)
  }
  function retry() { world.current.needStart = true; setPhase('fighting') }
  function equipSkill(i) {
    setEquipped(eq => {
      if (eq.includes(i)) return eq
      const slot = eq.indexOf(null)
      if (slot < 0) return eq  // 슬롯 가득
      const next = [...eq]; next[slot] = i; return next
    })
  }
  function unequipSkill(slot) {
    setEquipped(eq => { const next = [...eq]; next[slot] = null; return next })
  }

  return (
    <div style={st.outer}>
    <div style={st.root}>
      <div style={st.topBar}>
        <img src="/hero/misc/face.png" alt="" style={st.avatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={st.nickRow}>
            <span style={st.nick}>Australo_원규</span>
            <span style={st.lvBadge}>Lv.{hlv}</span>
          </div>
          <div style={st.expOuter}>
            <div style={{ ...st.expInner, width: Math.min(100, hexp / heroExpReq(hlv) * 100) + '%' }} />
          </div>
        </div>
        <div style={st.currency}>
          <div>🍖 <b style={{ color: '#f0b060' }}>{fmt(meat)}</b></div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>웨이브 {wave}{wave % 5 === 0 && <span style={{ color: '#ef9a3c' }}> 보스</span>}</div>
        </div>
      </div>
      <div style={st.waveProg}>
        <div style={{ ...st.progInner, width: progress * 100 + '%' }} />
      </div>

      <div ref={wrapRef} style={st.canvasWrap}>
        <canvas ref={canvasRef} />
        <div style={st.gainWrap}>
          {gains.map(g => (
            <div key={g.id} style={st.gainItem}>
              <span style={{ color: '#8ab4ff' }}>EXP +{g.exp}</span>
              <span style={{ color: '#f0b060' }}>🍖 +{g.meat}</span>
            </div>
          ))}
        </div>
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

      {nav === '영웅' && <>
      <div style={st.tabs}>
        {['강화', '성장', '진화'].map(t => (
          <button key={t} style={{ ...st.tabBtn, ...(tab === t ? st.tabActive : {}) }} onClick={() => setTab(t)}>
            {t}{t === '성장' && sp > 0 && <span style={st.spDot}>{sp}</span>}
          </button>
        ))}
      </div>

      <div style={st.panel}>
        {tab === '강화' && STAT_KEYS.map(k => {
          const d = STAT_LIST[k]
          const c = buyCost(k, lv[k])
          const ok = DEBUG || meat >= c
          return (
            <div key={k} style={st.row}>
              <div style={st.skillIcon}>{d.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={st.rowName}>{d.name} <span style={st.rowLv}>Lv.{lv[k]}</span></div>
                <div style={st.rowVal}>{statText(k, lv[k] + skill[k])} <span style={{ color: '#7cb35c' }}>→ {statText(k, lv[k] + 1 + skill[k])}</span></div>
              </div>
              <button style={st.dbgBtn} onClick={() => buyStat(k, -1)}>−</button>
              <input style={st.dbgInput} type="number" inputMode="numeric" value={lv[k]} onChange={e => setStatLv(k, e.target.value)} />
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
        {tab === '성장' && (
          <>
            <div style={st.spBar}>스킬포인트 <b style={{ color: '#7ce0ff', fontSize: 18 }}>{sp}</b> <span style={{ opacity: 0.6, fontSize: 11 }}>· 레벨업 시 획득</span></div>
            {STAT_KEYS.map(k => {
              const d = STAT_LIST[k]
              const ok = DEBUG || sp > 0
              return (
                <div key={k} style={st.row}>
                  <div style={st.skillIcon}>{d.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={st.rowName}>{d.name} <span style={st.rowLv}>Lv.{skill[k]}</span></div>
                    <div style={st.rowVal}>{statText(k, lv[k] + skill[k])} <span style={{ color: '#7cb35c' }}>→ {statText(k, lv[k] + skill[k] + 1)}</span></div>
                  </div>
                  <button style={st.dbgBtn} onClick={() => upSkill(k, -1)}>−</button>
                  <input style={st.dbgInput} type="number" inputMode="numeric" value={skill[k]} onChange={e => setSkillLv(k, e.target.value)} />
                  <button style={{ ...st.spBtn, opacity: ok ? 1 : 0.4 }} onClick={() => upSkill(k)}>+1</button>
                </div>
              )
            })}
          </>
        )}
      </div>
      </>}

      {nav === '스킬' && (
        <div style={st.panel}>
          <div style={st.spBar}>장착 슬롯 · 올린 스킬만 자동 발동</div>
          <div style={st.slotRow}>
            {equipped.map((si, slot) => (
              <button key={slot} style={st.slot} onClick={() => si != null && unequipSkill(slot)}>
                {si != null ? <span style={{ fontSize: 22 }}>{SKILLS[si].icon}</span> : <span style={st.slotEmpty}>+</span>}
              </button>
            ))}
          </div>
          <div style={{ ...st.spBar, marginTop: 4 }}>보유 스킬 · 탭하여 장착 <span style={{ opacity: 0.6, fontSize: 11 }}>· {EVOS[evo].name} 전용</span></div>
          {SKILLS.map((s, i) => {
            if (s.stage !== evo) return null
            const cd = skillCdUI[i] || 0
            const ready = cd <= 0
            const eqSlot = equipped.indexOf(i)
            const isEq = eqSlot >= 0
            return (
              <div key={s.key} style={{ ...st.row, opacity: isEq ? 0.55 : 1 }} onClick={() => isEq ? unequipSkill(eqSlot) : equipSkill(i)}>
                <div style={{ ...st.skillIcon, position: 'relative', overflow: 'hidden' }}>
                  {s.icon}
                  {isEq && !ready && <div style={st.cdOverlay}>{cd.toFixed(1)}</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={st.rowName}>{s.name} {isEq && <span style={{ ...st.rowLv, color: '#7ce0ff' }}>장착됨</span>}</div>
                  <div style={st.rowVal}>{s.desc} · 데미지 ×{s.dmgMult}</div>
                </div>
                <span style={{ fontSize: 11, opacity: 0.7 }}>쿨</span>
                <input
                  style={st.dbgInput} type="number" inputMode="decimal" value={cdConf[i]}
                  onClick={e => e.stopPropagation()}
                  onChange={e => { const v = Math.max(0.1, Number(e.target.value) || 0.1); setCdConf(c => { const n = [...c]; n[i] = v; return n }) }}
                />
                <button style={{ ...st.spBtn, background: isEq ? '#6b4f35' : '#2f8fb0' }}>{isEq ? '해제' : '장착'}</button>
              </div>
            )
          })}
        </div>
      )}

      {nav !== '영웅' && nav !== '스킬' && (
        <div style={st.comingSoon}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{nav}</div>
          <div style={{ fontSize: 13, opacity: 0.6, marginTop: 6 }}>준비 중입니다</div>
        </div>
      )}

      <div style={st.bottomNav}>
        {[['영웅', '🦍'], ['스킬', '✨'], ['장비', '⚔'], ['동료', '🤝'], ['퀴즈', '❓'], ['상점', '💰']].map(([n, ic]) => (
          <button key={n} style={{ ...st.navBtn, ...(nav === n ? st.navActive : {}) }} onClick={() => setNav(n)}>
            <div style={{ fontSize: 20 }}>{ic}</div>
            <div style={{ fontSize: 10 }}>{n}</div>
          </button>
        ))}
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
    padding: '10px 14px', paddingTop: 'max(10px, env(safe-area-inset-top))',    fontSize: 14, background: '#241a10', borderBottom: '1px solid #3a2c1c',
  },
  avatar: { width: 40, height: 40, borderRadius: 8, border: '2px solid #6b4f35', background: '#1a120b', imageRendering: 'pixelated' },
  nickRow: { display: 'flex', alignItems: 'center', gap: 6 },
  nick: { fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  lvBadge: { fontSize: 11, fontWeight: 800, color: '#7ce0ff', background: '#12303a', padding: '1px 6px', borderRadius: 6, flexShrink: 0 },
  expOuter: { height: 7, background: '#12222a', borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  expInner: { height: '100%', background: 'linear-gradient(90deg,#3ba7d0,#7ce0ff)', transition: 'width 0.2s' },
  currency: { textAlign: 'right', fontSize: 13, whiteSpace: 'nowrap' },
  waveProg: { height: 6, background: '#241a10', overflow: 'hidden' },
  gainWrap: { position: 'absolute', left: 8, top: 44, display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' },
  gainItem: {
    display: 'flex', gap: 8, fontSize: 12, fontWeight: 700,
    background: 'rgba(10,6,3,0.6)', padding: '2px 8px', borderRadius: 6,
    animation: 'none',
  },
  spBar: { padding: '4px 6px 8px', fontSize: 13 },
  spBtn: {
    minWidth: 46, padding: '10px 6px', borderRadius: 8, border: 'none',
    background: '#2f8fb0', color: '#fff', fontSize: 13, fontWeight: 800, flexShrink: 0,
  },
  spDot: {
    marginLeft: 5, fontSize: 10, fontWeight: 800, color: '#fff',
    background: '#e05a4e', borderRadius: 8, padding: '0 5px',
  },
  bottomNav: {
    display: 'flex', background: '#1a120b', borderTop: '1px solid #3a2c1c',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  navBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: '8px 0', border: 'none', background: 'transparent', color: '#8a7a63', cursor: 'pointer',
  },
  navActive: { color: '#f0b060' },
  comingSoon: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', background: '#241a10', color: '#f5ead9',
  },
  cdOverlay: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'rgba(10,6,3,0.7)', fontSize: 12,
    fontWeight: 800, color: '#7ce0ff',
  },
  slotRow: { display: 'flex', gap: 8, padding: '4px 2px 8px' },
  slot: {
    flex: 1, aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#312415', border: '2px solid #4a3822', borderRadius: 12, cursor: 'pointer',
  },
  slotEmpty: { fontSize: 26, color: '#5a4632' },
  skillIcon: {
    width: 32, height: 32, borderRadius: 8, background: '#241a10',
    border: '1px solid #4a3822', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 16, flexShrink: 0,
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
    padding: '10px 10px 14px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: '#312415', border: '1px solid #4a3822', borderRadius: 12, padding: '10px 10px',
  },
  rowName: { fontWeight: 700, fontSize: 13 },
  rowLv: { fontSize: 11, color: '#f0b060', marginLeft: 4 },
  rowVal: { fontSize: 11, opacity: 0.85, marginTop: 2, whiteSpace: 'nowrap' },
  dbgBtn: {
    width: 32, padding: '10px 0', borderRadius: 8, border: '1px solid #4a3822',
    background: '#241a10', color: '#f5ead9', fontSize: 15, fontWeight: 800, flexShrink: 0,
  },
  dbgInput: {
    width: 42, padding: '9px 2px', borderRadius: 8, border: '1px solid #4a3822',
    background: '#1a120b', color: '#f0b060', fontSize: 13, fontWeight: 700, textAlign: 'center', flexShrink: 0,
  },
  costBtn: {
    minWidth: 46, padding: '10px 6px', borderRadius: 8, border: 'none',
    background: '#c9772e', color: '#fff', fontSize: 13, fontWeight: 800, flexShrink: 0,
  },
}
