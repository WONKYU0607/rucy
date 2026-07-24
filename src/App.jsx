import React, { useEffect, useRef, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

// ── Firebase 클라우드 세이브 설정: 콘솔 웹앱 구성값 붙여넣기 ──
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAxUsbLJI5aoWprLk8zBFy-INt2RHOF9fs',
  authDomain: 'rucy-5640a.firebaseapp.com',
  projectId: 'rucy-5640a',
  appId: '1:711322673029:web:2c11067daedf428425eeec',
}
const FB_ON = true
const fbAuth = FB_ON ? getAuth(initializeApp(FIREBASE_CONFIG)) : null
const fbDb = FB_ON ? getFirestore() : null

// ── 디버그 모드: 업그레이드 비용 무료 + 레벨 직접입력 (출시 전 false로) ──
const DEBUG = true

// ── 주인공 애니메이션 (flip 틀리면 해당 값만 수정) ──
const ANIM = {
  quad:  { srcs: ['/hero/quad/quad_1.png', '/hero/quad/quad_2.png', '/hero/quad/quad_3.png', '/hero/quad/quad_4.png'], h: 75,  flip: false },
  walk:  { srcs: ['/hero/walk/walk_1.png', '/hero/walk/walk_2.png', '/hero/walk/walk_3.png', '/hero/walk/walk_4.png'], h: 120, flip: false },
  run:   { srcs: ['/hero/run/run_1.png', '/hero/run/run_2.png', '/hero/run/run_3.png', '/hero/run/run_4.png'], h: 120, flip: false },
  punch: { srcs: ['/hero/punch/punch_1.png', '/hero/punch/punch_2.png', '/hero/punch/punch_3.png'], h: 100, flip: false },
  throw: { srcs: ['/hero/throw/hero_windup.png', '/hero/throw/hero_release.png'], h: 120, flip: false },
  idle:  { srcs: ['/hero/idle/idle_1.png'], h: 120, flip: false },
  ewalk: { srcs: ['/hero/erectus_walk/ewalk_1.png', '/hero/erectus_walk/ewalk_2.png', '/hero/erectus_walk/ewalk_3.png', '/hero/erectus_walk/ewalk_4.png'], h: 120, flip: false },
  eatk1: { srcs: ['/hero/erectus_atk1/eatk1_1.png', '/hero/erectus_atk1/eatk1_2.png', '/hero/erectus_atk1/eatk1_3.png'], h: 135, flip: false },
  nwalk: { srcs: ['/hero/neander_walk/nwalk_1.png', '/hero/neander_walk/nwalk_2.png', '/hero/neander_walk/nwalk_3.png', '/hero/neander_walk/nwalk_4.png'], h: 120, flip: false },
  natk1: { srcs: ['/hero/neander_atk1/natk1_1.png', '/hero/neander_atk1/natk1_2.png'], h: 130, flip: false },
  pwalk: { srcs: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `/hero/sapiens_walk/pwalk_${i}.png`), h: 140, flip: false },
  patk1: { srcs: [1, 2, 3, 4, 5].map(i => `/hero/sapiens_atk1/patk1_${i}.png`), h: 157, flip: false },
  hmwalk: { srcs: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `/hero/human_walk/hmwalk_${i}.png`), h: 140, flip: false },
  hmatk1: { srcs: [1, 2, 3, 4].map(i => `/hero/human_atk1/hmatk1_${i}.png`), h: 157, flip: false },
}
// 스킬 정의 — charSeq: 히어로가 재생할 프레임(1-based, 없으면 전체), fx: 분리 이펙트
//   fx proj  = 투사체: fly 프레임이 몬스터 쪽으로 날아가 명중 시 데미지(+impact 프레임)
//   fx strike = 낙하/타격: 적 위치에 frames 재생, 중반에 데미지
// stage — 0:4족보행 1:직립보행 2:에렉투스 3:네안데르탈인 4:사피엔스 5:인간
const SKILL_SHEET = [
  { id: 1, n: 6, h: 280, stage: 1, title: '번개 바위', charSeq: [1, 2, 3, 4], fx: { type: 'strike', frames: [5, 6], fxH: 240 } },
  { id: 2, n: 5, h: 250, stage: 1, title: '전기 작살', charSeq: [1, 2], fx: { type: 'proj', fly: [3, 4], impact: 5, fxH: 200 } },
  { id: 7, n: 6, h: 110, stage: 0, title: '할퀴기' },
  { id: 8, n: 6, h: 140, stage: 0, title: '내려치기' },
  { id: 12, n: 7, h: 110, stage: 0, title: '빙글빙글' },
  { id: 13, n: 7, h: 120, stage: 0, title: '데굴데굴' },
  { id: 15, n: 5, h: 120, stage: 0, title: '로우킥' },
  { id: 16, n: 6, h: 145, stage: 0, title: '바위치기', charSeq: [1, 2], fx: { type: 'strike', frames: [3, 4, 5, 6] } },
  { id: 17, n: 5, h: 133, stage: 0, title: '포효' },
  { id: 18, n: 5, h: 210, stage: 1, title: '바위치기 (강화)', charSeq: [1, 2], fx: { type: 'strike', frames: [3, 4, 5] } },
  { id: 20, n: 5, h: 195, stage: 1, title: '바위 회오리', charSeq: [1, 2, 3, 5], fx: { type: 'proj', fly: [4], flyScale: 0.9, yOff: 0 } },
]
// 스킬 전체 프레임 이미지 (이펙트 렌더용)
// 스킬 아이콘: 해당 스킬 시트의 지정 프레임 사용 (없으면 번호 텍스트)
const SKILL_ICON_FRAME = { 1: 6, 2: 5, 7: 3, 8: 4, 12: 4, 13: 4, 15: 3, 16: 3, 17: 4, 18: 4, 20: 4 }
const skillIconSrc = id => SKILL_ICON_FRAME[id] ? `/skill/s${id}/s${id}_${SKILL_ICON_FRAME[id]}.png` : null
// ── 전리품 조각 (사망 드롭 → 상단 재화칸 흡수 연출) ──
const LOOT_IMG = { meat: '/ui/ic_meat.png', exp: '/ui/ic_exp.png', dia: '/ui/gem.png', mat: '/ui/mat4.png' }
const LOOT_CIMG = {}
for (const k in LOOT_IMG) { const i = new Image(); i.src = LOOT_IMG[k]; LOOT_CIMG[k] = i }
const DROP_DIA_P = 0.3, DROP_MAT_P = 0.3   // 임시 확률 — 추후 웨이브 비례 공식으로 교체
function LootPiece({ p, done }) {
  const r = useRef(null)
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = r.current
      if (el) { el.style.transform = `translate(${p.tx - p.x}px, ${p.ty - p.y}px) scale(0.35)`; el.style.opacity = '0.5' }
    }))
    const t = setTimeout(done, 700)
    return () => clearTimeout(t)
  }, [])
  return <img ref={r} src={LOOT_IMG[p.k]} alt="" style={{ position: 'fixed', left: p.x - 5, top: p.y - 5, width: 10, height: 10, objectFit: 'contain', imageRendering: 'pixelated', transition: 'transform 0.55s cubic-bezier(0.55,-0.05,0.85,0.4), opacity 0.55s', zIndex: 55, pointerEvents: 'none' }} />
}
// 모험 대륙 (지도 위 버튼 → 진입창 → 전투). x/y=지도상 기본 위치%
const CONTINENTS = [
  { key: 'africa', name: '아프리카', x: 50, y: 55, mon: '스피노사우루스', boss: 'spino' },
  { key: 'middle_east', name: '중동', x: 57, y: 43, mon: '안킬로사우루스', boss: 'anky' },
  { key: 'asia', name: '아시아', x: 67, y: 36, mon: '벨로키랍토르', boss: 'raptor' },
  { key: 'europe', name: '유럽', x: 46, y: 23, mon: '트리케라톱스', boss: 'trike' },
  { key: 'north_america', name: '북아메리카', x: 15, y: 28, mon: '티라노사우루스', boss: 'trex' },
  { key: 'south_america', name: '남아메리카', x: 23, y: 66, mon: '브라키오사우루스', boss: 'brachio' },
  { key: 'oceania', name: '오세아니아', x: 82, y: 72, mon: '프테라노돈', boss: 'ptera' },
  { key: 'greenland', name: '그린란드', x: 22, y: 9, mon: '스테고사우루스', boss: 'stego' },
]
// UI 기준 해상도 — 모든 편집값(px)이 이 판 위에서 맞춰짐. 실제 화면은 이 판을 통째로 확대/축소
const ADV_STAGES = 10          // 대륙당 탐험 단계 수
const ADV_COST_RUBY = 1        // 진입 1회당 루비 소모
const advReward = st => ({ dia: 50 * st, mat: 10 * st })   // 단계별 보상 (임시 수치)
const BASE_W = 420, BASE_H = 695
const SIMG = {}
SKILL_SHEET.forEach(c => {
  SIMG[c.id] = Array.from({ length: c.n }, (_, j) => { const im = new Image(); im.src = `/skill/s${c.id}/s${c.id}_${j + 1}.png`; return im })
  const seq = c.charSeq || Array.from({ length: c.n }, (_, j) => j + 1)
  ANIM['s_' + c.id] = { srcs: seq.map(j => `/skill/s${c.id}/s${c.id}_${j}.png`), h: c.h, flip: false }
})
const AIMG = {}
for (const k in ANIM) AIMG[k] = ANIM[k].srcs.map(s => { const i = new Image(); i.src = s; return i })
const BG_THEMES = ['wasteland', 'forest', 'volcano', 'snow', 'swamp', 'night']
const BG_NORMAL = BG_THEMES.map(t => { const i = new Image(); i.src = `/bg/n_${t}.jpg`; return i })
const BG_BOSS = BG_THEMES.map(t => { const i = new Image(); i.src = `/bg/b_${t}.jpg`; return i })
const bgFor = (wave, boss) => (boss ? BG_BOSS : BG_NORMAL)[Math.floor((wave - 1) / 10) % BG_THEMES.length]
const STONE = new Image(); STONE.src = '/misc/stone.png'
// 타격 이펙트 (effect/eN_1~8.png · 8프레임, 시트 절반축소본)
const FXF = 8, FX_DUR = 0.045
const FX_IMGS = {}
for (let n = 1; n <= 5; n++) FX_IMGS[n] = Array.from({ length: FXF }, (_, f) => { const i = new Image(); i.src = `/effect/effect_frames/effect${n}/e${n}-${f + 1}.png`; return i })

// ── 스킬 프레임 시간 설정 (초, 직접 수정) ─────────────────────────
// 각 원소 = 그 순서의 히어로 프레임 표시 시간. 배열 길이 = 히어로 프레임 수.
// 시전 총 시간 = 합계. 없는 스킬은 프레임당 0.15초.
const SKILL_FRAME_T = {
  1:  [0.15, 0.15, 0.15, 0.15],           // 몽둥이번개 (4프레임)
  2:  [0.20, 0.20],                        // 창던지기 (2)
  7:  [0.15, 0.15, 0.15, 0.15, 0.15, 0.15],       // (6)
  8:  [0.15, 0.15, 0.15, 0.15, 0.15, 0.15],       // (6)
  12: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15], // (7)
  13: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15], // (7)
  15: [0.15, 0.15, 0.15, 0.15, 0.15],      // (5)
  16: [0.25, 0.25],                        // 낙석 시전 (2)
  17: [0.15, 0.15, 0.15, 0.15, 0.15],      // (5)
  18: [0.25, 0.25],                        // 점프낙석 시전 (2)
  20: [0.15, 0.15, 0.15, 0.15],            // 토네이도 (4: 휘두르기3+복귀1)
}
// 이펙트 타이밍
const STRIKE_DUR = 0.55   // 낙뢰/낙석 이펙트 재생 시간(초) 기본값
const PROJ_FPS = 8        // 투사체 프레임 전환 속도(초당) 기본값

// ── 날아가는 이펙트(투사체) 프레임 시간 (초, 직접 수정) ──────────
// fly 배열과 같은 길이. 순환 재생됨. 없는 스킬은 1/PROJ_FPS 균등.
const FX_FRAME_T = {
  2:  [0.08, 0.08],                       // 창 (fly 2프레임)
  20: [0.12],                             // 회오리 (1)
}
// 낙하/타격 이펙트 재생 시간 (초, 스킬별) — 없으면 STRIKE_DUR
const STRIKE_DUR_BY = {
  1: 0.55,    // 번개
  16: 0.55,   // 낙석
  18: 0.55,   // 점프낙석
}

// 무기/방어구/유물 각 30개 (6등급대 × 5티어, 1→30 강해짐). /equip/A/w01.png 등
const EQUIP_CATS = ['무기', '방어구', '유물']
const CAT_DIR = { 무기: '/equip/A/w', 방어구: '/equip/B/a', 유물: '/relic/r' }
const pad2 = i => String(i).padStart(2, '0')
const equipImg = (cat, i) => `${CAT_DIR[cat]}${pad2(i)}.png`
const GACHA_CATS = { 무기: {}, 방어구: {}, 유물: {} }   // 3 카테고리, 각 30개 동일 규격
const GACHA_COST = { 1: 10, 10: 100, 30: 300 }
const EQUIP_MAX = 30
// 등급: 5개 묶음이 한 등급대(줄), 줄 안에서 5등급(약)→1등급(강)
const GRADE_NAMES = ['일반', '고급', '레어', '영웅', '전설', '신화']
const GRADE_COLOR = { 일반: '#b7bcc2', 고급: '#54c964', 레어: '#4aa3ff', 영웅: '#c05cff', 전설: '#ff9430', 신화: '#ff4038' }
const bandOf = i => Math.floor((i - 1) / 5)          // 0~5 (등급대 = 줄)
const tierOf = i => 5 - ((i - 1) % 5)                // 5→1 (줄 안 등급)
const gradeNameOf = i => GRADE_NAMES[bandOf(i)]
const gradeColorOf = i => GRADE_COLOR[GRADE_NAMES[bandOf(i)]]
// 가챠 확률: 등급대 가중치 × 티어 가중치 (낮은 등급 흔함)
const BAND_W = [40, 26, 17, 10, 5, 2]
const TIER_W = [40, 27, 18, 10, 5]                   // 5등급→1등급
const itemWeight = i => BAND_W[bandOf(i)] * TIER_W[5 - tierOf(i)]
const _WSUM = Array.from({ length: EQUIP_MAX }, (_, x) => itemWeight(x + 1)).reduce((a, b) => a + b, 0)
const rollItem = () => {
  let r = Math.random() * _WSUM
  for (let i = 1; i <= EQUIP_MAX; i++) { r -= itemWeight(i); if (r <= 0) return i }
  return EQUIP_MAX
}
const invKey = (cat, i) => `${cat}:${i}`
// 장착 능력치 (임시 수치 — 추후 교체). 주능력치: 1번 10%, ×1.5. 보조: 번호 비례
const ATK_MULT = i => 10 * Math.pow(1.5, i - 1)
const gearStats = (cat, i, lv = 0) => {
  const m = Math.pow(1.2, lv)                          // 강화당 ×1.2
  const b = ATK_MULT(i) * m
  if (cat === '무기') return [['공격력 증가', b], ['치명타 데미지', i * m], ['골드 획득량', i * 0.7 * m]]
  if (cat === '방어구') return [['체력 증가', b], ['체력 회복량', i * m], ['경험치 획득량', i * 0.7 * m]]
  return [['회피 증가', i * 0.5 * m], ['명중률 증가', i * m], ['이동속도 증가', i * 0.3 * m]]
}
const enhCost = lv => Math.floor(100 * Math.pow(1.5, lv))   // 강화 비용: 100, 150, 225 …
const MAT_IMG = i => `/ui/mat${i}.png`

// ── 오프라인 보상 설정 (직접 수정 가능) ─────────────────────────
const OFFLINE_MIN_SEC = 0           // 부재 시간 조건 없음 (잠깐 나갔다 와도 지급)
const OFFLINE_CAP_SEC = 8 * 3600    // 최대 인정 시간 (8시간)
const OFFLINE_RATE = 0.5            // 온라인 대비 효율 (50%)

const SKILLS = SKILL_SHEET.map(c => {
  const len = c.charSeq ? c.charSeq.length : c.n
  const ft = SKILL_FRAME_T[c.id] || Array(len).fill(0.15)
  const ends = []; let acc = 0
  for (const t of ft) { acc += t; ends.push(acc) }
  return {
    key: 's' + c.id, id: c.id, name: c.title || ('스킬 ' + c.id), anim: 's_' + c.id, icon: String(c.id), stage: c.stage,
    h: c.h, fx: c.fx || null, frameEnds: ends,
    cd: 1, cast: acc, hitAt: 0.55, dmgMult: 2, aoe: false, maxTargets: 1,
    desc: c.n + '프레임 · 임시값',
  }
})
// 대시 프레임 타이밍: 0=기모으기 앞부분 짧게, 주먹뻗기(3,4번) 길게

// ── 동료 정의: 영웅 뒤에서 투사체 공격 (겹침 허용, 소형) ──
// cd는 미사용 — 동료 공격은 히어로 기본공격에 동기화되고, 투사체는 히어로 타격 순간에 맞춰 속도가 역산됨
const ALLY_DEFS = {
  hunter: {
    name: '헌터', h: 68, xOff: -75, yOff: 27, atkMult: 0.45, cd: 1.15, range: 450,
    projSpd: 560, projW: 62, projBob: 0, atkDur: 0.42, throwAt: 0.16, projYr: 0.62,
    walk: [1, 2, 3, 4].map(i => `/ally/hunter/hwalk_${i}.png`),
    atk: [1, 2].map(i => `/ally/hunter/hatk_${i}.png`),
    proj: '/ally/hunter/spear.png',
  },
  shaman: {
    name: '주술사', h: 68, xOff: -75, yOff: -34, atkMult: 0.55, cd: 1.6, range: 450,
    projSpd: 400, projW: 26, projBob: 5, atkDur: 0.5, throwAt: 0.2, projYr: 0.75,
    walk: [1, 2, 3, 4].map(i => `/ally/shaman/swalk_${i}.png`),
    atk: [1].map(i => `/ally/shaman/satk_${i}.png`),
    proj: '/ally/shaman/fire.png',
  },
  healer: {
    // 공격 없음 — 장착 시 히어로+동료 전체에 이동속도·공격속도·공격력 +5% (패시브)
    name: '힐러', kind: 'buff', buff: 0.05, h: 60, xOff: -108, yOff: -5,
    walk: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `/ally/healer/heal_${i}.png`),
    atk: [],
  },
  giant: {
    // 근접 주먹 — 투사체 없이 히어로 타격 순간에 맨 앞 적을 직접 타격
    name: '거인', kind: 'melee', h: 125, xOff: -155, yOff: 3, atkMult: 0.8, range: 360,
    atkDur: 0.5,
    walk: [1, 2, 3].map(i => `/ally/giant/gwalk_${i}.png`),
    atk: [1, 2, 3].map(i => `/ally/giant/gatk_${i}.png`),
  },
}
const ALLY_IMG = {}
for (const k in ALLY_DEFS) {
  const d = ALLY_DEFS[k]
  const mk = s => { const i = new Image(); i.onerror = () => console.warn('[ally] 로드 실패:', s); i.src = s; return i }
  ALLY_IMG[k] = {
    walk: d.walk.map(mk),
    atk: (d.atk || []).map(mk),
    proj: d.proj ? mk(d.proj) : null,
  }
}
const BOSS_TIME = 20  // 보스 제한시간(초)
// 죽음 실루엣 색 처리용 오프스크린(스프라이트만 있는 투명 캔버스에서 source-atop 사용 → 메인 배경 오염 방지)
const _deadCv = typeof document !== 'undefined' ? document.createElement('canvas') : null
const _deadCtx = _deadCv ? _deadCv.getContext('2d') : null
const HERO_X = 200  // 평상시 영웅 x (동료가 설 왼쪽 공간 확보 / 보스전에선 화면 중앙 쪽으로 이동)
const SPEED = 1                                      // 전역 속도 배율
const SCROLL = 140 * SPEED                            // 전진 속도 (px/s)
const PUNCH = { hitAt: 0.12, total: 0.3, range: 95 } // 4족 주먹질
const THROW = { windupEnd: 0.14, releaseEnd: 0.30, total: 0.42, range: 340 }
// 에렉투스 몽둥이: 1타 내려치기(위→아래), 2타 올려치기(아래→위) 번갈아
const ECLUB = { total: 0.65, range: 150, hitAt: 0.55 }  // 몽둥이 내려치기 (단일 모션)
const SPIN = { total: 0.6, range: 160, hitAt: 0.7 }    // 사피엔스 회전 베기 (5프레임)
const HSLASH = { total: 0.55, range: 175, hitAt: 0.6 } // 인간 검격 (4프레임)
const MC = m => (m === 'sapiens' ? SPIN : m === 'human' ? HSLASH : ECLUB)   // 근접 모드별 타이밍
const MELEE_MODES = ['erectus', 'neander', 'sapiens', 'human']

// ── 적 정의 ──
const ENEMY_TYPES = {
  // 기존 10종 (신규 도트 시트, 7프레임, 원본이 왼쪽을 향해 flip 불필요)
  rabbit:   { name: '토끼', hp: 20, speed: 85, dmg: 5,  reward: 4,  h: 30, color: '#a1887f', flip: false, frames: ['/monster/rabbit/rabbit_1.png', '/monster/rabbit/rabbit_2.png', '/monster/rabbit/rabbit_3.png', '/monster/rabbit/rabbit_4.png', '/monster/rabbit/rabbit_5.png', '/monster/rabbit/rabbit_6.png', '/monster/rabbit/rabbit_7.png'] },
  antelope: { name: '영양', hp: 45, speed: 65, dmg: 10, reward: 8,  h: 55, color: '#c98a4b', flip: false, frames: ['/monster/antelope/antelope_1.png', '/monster/antelope/antelope_2.png', '/monster/antelope/antelope_3.png', '/monster/antelope/antelope_4.png', '/monster/antelope/antelope_5.png', '/monster/antelope/antelope_6.png', '/monster/antelope/antelope_7.png'] },
  deer:     { name: '사슴', hp: 90, speed: 50, dmg: 16, reward: 14, h: 75, color: '#b5794a', flip: false, frames: ['/monster/deer/deer_1.png', '/monster/deer/deer_2.png', '/monster/deer/deer_3.png', '/monster/deer/deer_4.png', '/monster/deer/deer_5.png', '/monster/deer/deer_6.png', '/monster/deer/deer_7.png'] },
  boar:     { name: '멧돼지', hp: 70, speed: 60, dmg: 14, reward: 12, h: 65, color: '#7a6a52', flip: false, frames: ['/monster/boar/boar_1.png', '/monster/boar/boar_2.png', '/monster/boar/boar_3.png', '/monster/boar/boar_4.png', '/monster/boar/boar_5.png', '/monster/boar/boar_6.png', '/monster/boar/boar_7.png'] },
  wolf:     { name: '늑대', hp: 40, speed: 120, dmg: 12, reward: 10, h: 55, color: '#9a8f7a', flip: false, frames: ['/monster/wolf/wolf_1.png', '/monster/wolf/wolf_2.png', '/monster/wolf/wolf_3.png', '/monster/wolf/wolf_4.png', '/monster/wolf/wolf_5.png', '/monster/wolf/wolf_6.png', '/monster/wolf/wolf_7.png'] },
  hyena:    { name: '하이에나', hp: 110, speed: 55, dmg: 20, reward: 18, h: 55, color: '#b0a15f', flip: false, frames: ['/monster/hyena/hyena_1.png', '/monster/hyena/hyena_2.png', '/monster/hyena/hyena_3.png', '/monster/hyena/hyena_4.png', '/monster/hyena/hyena_5.png', '/monster/hyena/hyena_6.png', '/monster/hyena/hyena_7.png'] },
  bear:     { name: '동굴곰', hp: 260, speed: 40, dmg: 32, reward: 35, h: 75, color: '#6b4f35', flip: false, frames: ['/monster/bear/bear_1.png', '/monster/bear/bear_2.png', '/monster/bear/bear_3.png', '/monster/bear/bear_4.png', '/monster/bear/bear_5.png', '/monster/bear/bear_6.png', '/monster/bear/bear_7.png'] },
  rhino:    { name: '털코뿔소', hp: 450, speed: 45, dmg: 40, reward: 55, h: 70, color: '#9c988f', flip: false, frames: ['/monster/rhino/rhino_1.png', '/monster/rhino/rhino_2.png', '/monster/rhino/rhino_3.png', '/monster/rhino/rhino_4.png', '/monster/rhino/rhino_5.png', '/monster/rhino/rhino_6.png', '/monster/rhino/rhino_7.png'] },
  mammoth:  { name: '매머드', hp: 900, speed: 32, dmg: 55, reward: 110, h: 120, color: '#5f4a34', flip: false, frames: ['/monster/mammoth/mammoth_1.png', '/monster/mammoth/mammoth_2.png', '/monster/mammoth/mammoth_3.png', '/monster/mammoth/mammoth_4.png', '/monster/mammoth/mammoth_5.png', '/monster/mammoth/mammoth_6.png', '/monster/mammoth/mammoth_7.png'] },
  tiger:    { name: '검치호', hp: 600, speed: 80, dmg: 60, reward: 130, h: 60, color: '#c68a3c', flip: false, frames: ['/monster/tiger/tiger_5.png', '/monster/tiger/tiger_6.png', '/monster/tiger/tiger_7.png'] },  // 검치호: 5~7번 3프레임만 사용 (1~4는 미사용)
  // 신규 10종 (5프레임, 스탯 임시값)
  monkey:   { name: '원숭이', hp: 30, speed: 100, dmg: 8,  reward: 6,  h: 55, color: '#8a6a4a', flip: false, frames: ['/monster/monkey/monkey_1.png', '/monster/monkey/monkey_2.png', '/monster/monkey/monkey_3.png', '/monster/monkey/monkey_4.png', '/monster/monkey/monkey_5.png'] },
  croc:     { name: '악어', hp: 200, speed: 45, dmg: 30, reward: 30, h: 40, color: '#5f7a3a', flip: false, frames: ['/monster/croc/croc_1.png', '/monster/croc/croc_2.png', '/monster/croc/croc_3.png', '/monster/croc/croc_4.png', '/monster/croc/croc_5.png'] },
  elephant: { name: '코끼리', hp: 700, speed: 35, dmg: 50, reward: 90, h: 105, color: '#8d8d94', flip: false, frames: ['/monster/elephant/elephant_1.png', '/monster/elephant/elephant_2.png', '/monster/elephant/elephant_3.png', '/monster/elephant/elephant_4.png', '/monster/elephant/elephant_5.png'] },
  giraffe:  { name: '기린', hp: 300, speed: 70, dmg: 25, reward: 45, h: 145, color: '#d0a04a', flip: false, frames: ['/monster/giraffe/giraffe_1.png', '/monster/giraffe/giraffe_2.png', '/monster/giraffe/giraffe_3.png', '/monster/giraffe/giraffe_4.png', '/monster/giraffe/giraffe_5.png'] },
  ostrich:  { name: '타조', hp: 80, speed: 130, dmg: 15, reward: 16, h: 95, color: '#3a3a3a', flip: false, frames: ['/monster/ostrich/ostrich_1.png', '/monster/ostrich/ostrich_2.png', '/monster/ostrich/ostrich_3.png', '/monster/ostrich/ostrich_4.png', '/monster/ostrich/ostrich_5.png'] },
  lion:     { name: '사자', hp: 350, speed: 90, dmg: 45, reward: 60, h: 70, color: '#c68a3c', flip: false, frames: ['/monster/lion/lion_1.png', '/monster/lion/lion_2.png', '/monster/lion/lion_3.png', '/monster/lion/lion_4.png', '/monster/lion/lion_5.png'] },
  snake:    { name: '뱀', hp: 60, speed: 70, dmg: 18, reward: 14, h: 30, color: '#6a7a4a', flip: false, frames: ['/monster/snake/snake_1.png', '/monster/snake/snake_2.png', '/monster/snake/snake_3.png', '/monster/snake/snake_4.png', '/monster/snake/snake_5.png'] },
  turtle:   { name: '거북이', hp: 400, speed: 30, dmg: 15, reward: 40, h: 45, color: '#5a6a3a', flip: false, frames: ['/monster/turtle/turtle_1.png', '/monster/turtle/turtle_2.png', '/monster/turtle/turtle_3.png', '/monster/turtle/turtle_4.png', '/monster/turtle/turtle_5.png'] },
  komodo:   { name: '코모도 드래곤', hp: 250, speed: 55, dmg: 35, reward: 40, h: 40, color: '#6a5a5a', flip: false, frames: ['/monster/komodo/komodo_1.png', '/monster/komodo/komodo_2.png', '/monster/komodo/komodo_3.png', '/monster/komodo/komodo_4.png', '/monster/komodo/komodo_5.png'] },
  eagle:    { name: '독수리', hp: 120, speed: 140, dmg: 22, reward: 28, h: 70, color: '#5a4a3a', flip: false, air: 90, frames: ['/monster/eagle/eagle_1.png', '/monster/eagle/eagle_2.png', '/monster/eagle/eagle_3.png', '/monster/eagle/eagle_4.png', '/monster/eagle/eagle_5.png'] },
  // 신규 30종 (4프레임, 스탯 임시값 — 웨이브 스케일이 주 난이도)
  pig: { name: '돼지', hp: 60, speed: 60, dmg: 12, reward: 10, h: 50, color: '#e8a8a8', flip: false, frames: ['/monster/pig/pig_1.png', '/monster/pig/pig_2.png', '/monster/pig/pig_3.png', '/monster/pig/pig_4.png'] },
  chicken: { name: '닭', hp: 25, speed: 75, dmg: 6, reward: 5, h: 45, color: '#e8e0d0', flip: false, frames: ['/monster/chicken/chicken_1.png', '/monster/chicken/chicken_2.png', '/monster/chicken/chicken_3.png', '/monster/chicken/chicken_4.png'] },
  duck: { name: '오리', hp: 35, speed: 85, dmg: 8, reward: 7, h: 40, color: '#4a6a3a', flip: false, frames: ['/monster/duck/duck_1.png', '/monster/duck/duck_2.png', '/monster/duck/duck_3.png', '/monster/duck/duck_4.png'] },
  frog: { name: '개구리', hp: 45, speed: 70, dmg: 10, reward: 8, h: 35, color: '#6a9a3a', flip: false, frames: ['/monster/frog/frog_1.png', '/monster/frog/frog_2.png', '/monster/frog/frog_3.png', '/monster/frog/frog_4.png'] },
  bat: { name: '박쥐', hp: 55, speed: 135, dmg: 14, reward: 12, h: 50, color: '#4a3a4a', flip: false, air: 80, frames: ['/monster/bat/bat_1.png', '/monster/bat/bat_2.png', '/monster/bat/bat_3.png', '/monster/bat/bat_4.png'] },
  pelican: { name: '펠리컨', hp: 90, speed: 110, dmg: 16, reward: 15, h: 70, color: '#e0d8c8', flip: false, air: 60, frames: ['/monster/pelican/pelican_1.png', '/monster/pelican/pelican_2.png', '/monster/pelican/pelican_3.png', '/monster/pelican/pelican_4.png'] },
  mantis: { name: '사마귀', hp: 75, speed: 95, dmg: 20, reward: 15, h: 60, color: '#7aa03a', flip: false, frames: ['/monster/mantis/mantis_1.png', '/monster/mantis/mantis_2.png', '/monster/mantis/mantis_3.png', '/monster/mantis/mantis_4.png'] },
  polarbear: { name: '북극곰', hp: 420, speed: 42, dmg: 38, reward: 52, h: 75, color: '#e8e8e0', flip: false, frames: ['/monster/polarbear/polarbear_1.png', '/monster/polarbear/polarbear_2.png', '/monster/polarbear/polarbear_3.png', '/monster/polarbear/polarbear_4.png'] },
  alpaca: { name: '알파카', hp: 110, speed: 72, dmg: 15, reward: 18, h: 70, color: '#e8dcc0', flip: false, frames: ['/monster/alpaca/alpaca_1.png', '/monster/alpaca/alpaca_2.png', '/monster/alpaca/alpaca_3.png', '/monster/alpaca/alpaca_4.png'] },
  buffalo: { name: '버팔로', hp: 520, speed: 45, dmg: 42, reward: 60, h: 80, color: '#5a4028', flip: false, frames: ['/monster/buffalo/buffalo_1.png', '/monster/buffalo/buffalo_2.png', '/monster/buffalo/buffalo_3.png', '/monster/buffalo/buffalo_4.png'] },
  camel: { name: '낙타', hp: 260, speed: 58, dmg: 24, reward: 34, h: 90, color: '#c89a5a', flip: false, frames: ['/monster/camel/camel_1.png', '/monster/camel/camel_2.png', '/monster/camel/camel_3.png', '/monster/camel/camel_4.png'] },
  horse: { name: '말', hp: 180, speed: 115, dmg: 22, reward: 28, h: 80, color: '#7a4a2a', flip: false, frames: ['/monster/horse/horse_1.png', '/monster/horse/horse_2.png', '/monster/horse/horse_3.png', '/monster/horse/horse_4.png'] },
  panda: { name: '판다', hp: 330, speed: 40, dmg: 28, reward: 40, h: 65, color: '#e8e8e8', flip: false, frames: ['/monster/panda/panda_1.png', '/monster/panda/panda_2.png', '/monster/panda/panda_3.png', '/monster/panda/panda_4.png'] },
  scorpion: { name: '전갈', hp: 150, speed: 60, dmg: 32, reward: 26, h: 40, color: '#5a3a4a', flip: false, frames: ['/monster/scorpion/scorpion_1.png', '/monster/scorpion/scorpion_2.png', '/monster/scorpion/scorpion_3.png', '/monster/scorpion/scorpion_4.png'] },
  tarantula: { name: '타란툴라', hp: 130, speed: 80, dmg: 28, reward: 22, h: 40, color: '#3a2a2a', flip: false, frames: ['/monster/tarantula/tarantula_1.png', '/monster/tarantula/tarantula_2.png', '/monster/tarantula/tarantula_3.png', '/monster/tarantula/tarantula_4.png'] },
  cobra: { name: '킹코브라', hp: 100, speed: 65, dmg: 30, reward: 20, h: 50, color: '#8a7a3a', flip: false, frames: ['/monster/cobra/cobra_1.png', '/monster/cobra/cobra_2.png', '/monster/cobra/cobra_3.png', '/monster/cobra/cobra_4.png'] },
  zebra: { name: '얼룩말', hp: 170, speed: 105, dmg: 20, reward: 26, h: 75, color: '#d8d8d8', flip: false, frames: ['/monster/zebra/zebra_1.png', '/monster/zebra/zebra_2.png', '/monster/zebra/zebra_3.png', '/monster/zebra/zebra_4.png'] },
  cheetah: { name: '치타', hp: 220, speed: 150, dmg: 35, reward: 38, h: 55, color: '#d0a04a', flip: false, frames: ['/monster/cheetah/cheetah_1.png', '/monster/cheetah/cheetah_2.png', '/monster/cheetah/cheetah_3.png', '/monster/cheetah/cheetah_4.png'] },
  koala: { name: '코알라', hp: 95, speed: 55, dmg: 12, reward: 14, h: 50, color: '#9a9aa0', flip: false, frames: ['/monster/koala/koala_1.png', '/monster/koala/koala_2.png', '/monster/koala/koala_3.png', '/monster/koala/koala_4.png'] },
  kangaroo: { name: '캥거루', hp: 240, speed: 100, dmg: 30, reward: 30, h: 90, color: '#b08a5a', flip: false, frames: ['/monster/kangaroo/kangaroo_1.png', '/monster/kangaroo/kangaroo_2.png', '/monster/kangaroo/kangaroo_3.png', '/monster/kangaroo/kangaroo_4.png'] },
  cat: { name: '고양이', hp: 50, speed: 110, dmg: 10, reward: 9, h: 40, color: '#8a8a8a', flip: false, frames: ['/monster/cat/cat_1.png', '/monster/cat/cat_2.png', '/monster/cat/cat_3.png', '/monster/cat/cat_4.png'] },
  dog: { name: '개', hp: 85, speed: 95, dmg: 16, reward: 15, h: 50, color: '#c8985a', flip: false, frames: ['/monster/dog/dog_1.png', '/monster/dog/dog_2.png', '/monster/dog/dog_3.png', '/monster/dog/dog_4.png'] },
  hippo: { name: '하마', hp: 780, speed: 38, dmg: 48, reward: 90, h: 80, color: '#9a7a9a', flip: false, frames: ['/monster/hippo/hippo_1.png', '/monster/hippo/hippo_2.png', '/monster/hippo/hippo_3.png', '/monster/hippo/hippo_4.png'] },
  gorilla: { name: '고릴라', hp: 560, speed: 55, dmg: 50, reward: 75, h: 75, color: '#3a3a3a', flip: false, frames: ['/monster/gorilla/gorilla_1.png', '/monster/gorilla/gorilla_2.png', '/monster/gorilla/gorilla_3.png', '/monster/gorilla/gorilla_4.png'] },
  gator: { name: '앨리게이터', hp: 280, speed: 42, dmg: 36, reward: 42, h: 40, color: '#4a6a3a', flip: false, frames: ['/monster/gator/gator_1.png', '/monster/gator/gator_2.png', '/monster/gator/gator_3.png', '/monster/gator/gator_4.png'] },
  squirrel: { name: '다람쥐', hp: 22, speed: 95, dmg: 5, reward: 4, h: 35, color: '#b06a3a', flip: false, frames: ['/monster/squirrel/squirrel_1.png', '/monster/squirrel/squirrel_2.png', '/monster/squirrel/squirrel_3.png', '/monster/squirrel/squirrel_4.png'] },
  penguin: { name: '펭귄', hp: 70, speed: 50, dmg: 10, reward: 11, h: 50, color: '#2a2a3a', flip: false, frames: ['/monster/penguin/penguin_1.png', '/monster/penguin/penguin_2.png', '/monster/penguin/penguin_3.png', '/monster/penguin/penguin_4.png'] },
  seal: { name: '물개', hp: 140, speed: 45, dmg: 18, reward: 20, h: 40, color: '#9a9aa8', flip: false, frames: ['/monster/seal/seal_1.png', '/monster/seal/seal_2.png', '/monster/seal/seal_3.png', '/monster/seal/seal_4.png'] },
  cow: { name: '소', hp: 300, speed: 50, dmg: 26, reward: 38, h: 70, color: '#e8e8e0', flip: false, frames: ['/monster/cow/cow_1.png', '/monster/cow/cow_2.png', '/monster/cow/cow_3.png', '/monster/cow/cow_4.png'] },
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
// 보스 20종: 10웨이브마다 순서대로 순환 (웨이브10=boss1, 20=boss2, ... 200=boss20, 210=boss1)
const BOSS_TYPES = [
  { name: '저주받은 검치호', h: 125 }, { name: '뇌전 매머드', h: 145 }, { name: '암흑 고릴라', h: 135 },
  { name: '용암 곰', h: 130 }, { name: '독왕 코브라', h: 125 },
  { name: '서리 마수', h: 130 }, { name: '뇌전 기린', h: 175 }, { name: '수정 코뿔소', h: 135 },
  { name: '심연 악어', h: 110 }, { name: '맹독 전갈', h: 120 },
  { name: '바위 골렘', h: 150 }, { name: '숲 골렘', h: 150 }, { name: '용암 골렘', h: 150 },
  { name: '얼음 골렘', h: 150 }, { name: '뇌전 거인', h: 150 },
  { name: '원석 골렘', h: 150 }, { name: '고목 정령', h: 155 }, { name: '화염 골렘', h: 155 },
  { name: '빙정 골렘', h: 150 }, { name: '폭풍 정령', h: 150 },
].map((b, i) => ({ ...b, frames: [1, 2, 3, 4].map(f => `/boss/boss${i + 1}/boss${i + 1}_${f}.png`) }))
const BIMG = BOSS_TYPES.map(b => b.frames.map(src => { const im = new Image(); im.src = src; return im }))
const WAVE_CYCLE = ['rabbit', 'antelope', 'deer', 'boar', 'wolf', 'hyena', 'bear', 'rhino', 'tiger', 'mammoth', 'monkey', 'snake', 'ostrich', 'turtle', 'croc', 'komodo', 'eagle', 'giraffe', 'lion', 'elephant',
  'pig', 'chicken', 'duck', 'frog', 'bat', 'pelican', 'mantis', 'polarbear', 'alpaca', 'buffalo',
  'camel', 'horse', 'panda', 'scorpion', 'tarantula', 'cobra', 'zebra', 'cheetah', 'koala', 'kangaroo',
  'cat', 'dog', 'hippo', 'gorilla', 'gator', 'squirrel', 'penguin', 'seal', 'cow']

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
  { name: '호모 에렉투스', mult: 27, cost: 300000, mode: 'erectus' },
  { name: '호모 네안데르탈인', mult: 81, cost: 3000000, mode: 'neander' },
  { name: '호모 사피엔스', mult: 243, cost: 30000000, mode: 'sapiens' },
  { name: '인간', mult: 729, cost: 300000000, mode: 'human' },
]

const SAVE_KEY = 'paleoDefSave_v5'
const SLOT_COUNT = 4
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY))
    if (s) return {
      meat: s.meat ?? 0, wave: s.wave ?? 1,
      lv: { ...statInit(), ...s.lv }, evo: s.evo ?? 0,
      hlv: s.hlv ?? 1, hexp: s.hexp ?? 0, sp: s.sp ?? 0, ts: s.ts ?? null,
      skill: { ...statInit(), ...s.skill },
      equipped: (Array.isArray(s.equipped) ? s.equipped.slice(0, SLOT_COUNT) : [null, null, null, null]).map(si => (si != null && si < SKILLS.length ? si : null)),
      cdConf: Array.isArray(s.cdConf) && s.cdConf.length === SKILLS.length ? s.cdConf : SKILLS.map(k => k.cd),
      // 장착·재화·기록: 저장된 값 그대로 복원 (누락 시 기본값)
      alliesOn: s.alliesOn && typeof s.alliesOn === 'object' ? s.alliesOn : {},
      gem: s.gem ?? 0, inv: s.inv && typeof s.inv === 'object' ? s.inv : {}, best: s.best ?? s.wave ?? 1,
      gearEq: s.gearEq && typeof s.gearEq === 'object' ? s.gearEq : { 무기: null, 방어구: null, 유물: null },
      mats: Array.isArray(s.mats) && s.mats.some(x => x > 0) ? s.mats : [99999, 99999, 99999, 99999, 99999], enh: s.enh && typeof s.enh === 'object' ? s.enh : {},
      ruby: typeof s.ruby === 'number' ? s.ruby : 50, advStage: s.advStage && typeof s.advStage === 'object' ? s.advStage : {},   // ruby 50 = 임시 지급(퀘스트 연동 전)
    }
  } catch (e) {}
  return { meat: 0, wave: 1, lv: statInit(), evo: 0, hlv: 1, hexp: 0, sp: 0, skill: statInit(), equipped: [null, null, null, null], cdConf: SKILLS.map(k => k.cd), alliesOn: {}, gem: 0, inv: {}, best: 1, ts: null, gearEq: { 무기: null, 방어구: null, 유물: null }, mats: [99999, 99999, 99999, 99999, 99999], enh: {}, ruby: 50, advStage: {} }
}
const fmt = n => n >= 1e8 ? (n/1e8).toFixed(1)+'억' : n >= 1e4 ? (n/1e4).toFixed(1)+'만' : Math.floor(n).toLocaleString()
const fmtPct = v => v >= 10000 ? fmt(Math.round(v)) : (Math.round(v * 10) / 10).toString()

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
  const [equipTab, setEquipTab] = useState('무기')  // 장비 서브탭: 무기/방어구/유물
  const [detailItem, setDetailItem] = useState(null)  // 장비 상세창 { cat, i } | null
  const [lootFly, setLootFly] = useState([])          // 재화칸으로 비행 중인 전리품 조각
  const [detailTab, setDetailTab] = useState('강화')  // 상세창 탭: 강화/융합
  const [fuseQty, setFuseQty] = useState(0)           // 융합 수량
  const [gearEq, setGearEq] = useState(init.gearEq || { 무기: null, 방어구: null, 유물: null })  // 장착 슬롯
  const [mats, setMats] = useState(init.mats || [0, 0, 0, 0, 0])   // 재화 5종 (0~3 동료용, 4 무기강화용)
  const [ruby, setRuby] = useState(init.ruby ?? 0)                 // 루비 수정 (모험 진입 재화)
  const [advStage, setAdvStage] = useState(init.advStage || {})    // 대륙별 클리어 단계 { key: 0~10 }
  const [enh, setEnh] = useState(init.enh || {})                   // 강화레벨 { '무기:1': lv }
  const [tab, setTab] = useState('강화')      // 영웅 서브탭: 강화/성장/진화
  const [phase, setPhase] = useState('fighting')
  const [clearMsg, setClearMsg] = useState(null)   // 웨이브 클리어 배너 (멈춤 없음)
  const [bossReady, setBossReady] = useState(false) // 10웨이브 클리어 후 보스 도전 대기
  const [gem, setGem] = useState(init.gem || 0)      // 다이아 재화 (DEBUG 시 무한)
  const [inv, setInv] = useState(init.inv || {})     // 뽑은 장비 보유 수량 { 'w1_3': n }
  const [gacha, setGacha] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [splash, setSplash] = useState(true)
  const [alliesOn, setAlliesOn] = useState(init.alliesOn || {})  // 장착된 동료 (보유/성장 시스템은 추후)
  const [allySub, setAllySub] = useState('동료')
  useEffect(() => {
    const upd = () => {
      const sw = window.innerWidth, sh = window.innerHeight
      const s = Math.min(sw / BASE_W, sh / BASE_H)
      uiScaleRef.current = s
      setView({ s, h: Math.max(BASE_H, sh / s), sw, sh })   // 남는 세로는 판 높이로 → 캔버스가 흡수
    }
    upd()
    window.addEventListener('resize', upd)
    window.addEventListener('orientationchange', upd)
    return () => { window.removeEventListener('resize', upd); window.removeEventListener('orientationchange', upd) }
  }, [])
  const [advSel, setAdvSel] = useState(null)  // 진입창에 띄울 대륙
  const [mapSeg, setMapSeg] = useState(1)  // 모험 지도 구간(0~2), 아프리카 중심=1 시작
  const [advLoaded, setAdvLoaded] = useState(false)  // 지도 이미지 로드 완료(초기 위치 점프 방지)
  const advTrackRef = useRef(null)
  const [advMax, setAdvMax] = useState(0)  // 좌우로 밀 수 있는 최대 px (지도폭-뷰폭)
  function recalcAdv() {
    const el = advTrackRef.current
    if (!el) return
    const viewW = el.parentElement.clientWidth
    const mapW = el.scrollWidth
    setAdvMax(Math.max(0, mapW - viewW))
  }
  useEffect(() => {
    if (nav !== '모험') return
    recalcAdv()
    window.addEventListener('resize', recalcAdv)
    return () => window.removeEventListener('resize', recalcAdv)
  }, [nav])
  const advOffset = -(advMax * (mapSeg / 2))  // 0→0, 1→중앙, 2→끝           // 소환 결과 오버레이 { cat, items:[{k,t}] }
  const [uiCfg, setUiCfg] = useState(() => { try { const sv = JSON.parse(localStorage.getItem('paleoUiCfg') || '{}'); return { ...UI_DEFAULT, ...Object.fromEntries(Object.entries(sv).filter(([k]) => k in UI_DEFAULT)) } } catch { return { ...UI_DEFAULT } } })
  const [uiEdit, setUiEdit] = useState(false)
  const rootRef = useRef(null)
  const uiScaleRef = useRef(1)
  const [view, setView] = useState({ s: 1, h: BASE_H, sw: 0, sh: 0 })   // 화면 맞춤 배율/판 높이
  const [canvasBox, setCanvasBox] = useState({ top: 0, h: 0 })          // 전투화면 영역 위치(판 기준) — 보물상자 배치용
  useEffect(() => {
    const upd = () => {
      const el = wrapRef.current
      if (el && el.offsetHeight) setCanvasBox({ top: el.offsetTop, h: el.offsetHeight })
    }
    upd()
    const ro = new ResizeObserver(upd)
    if (wrapRef.current) ro.observe(wrapRef.current)
    const id = setInterval(upd, 400)
    return () => { ro.disconnect(); clearInterval(id) }
  }, [])
  const [copiedUi, setCopiedUi] = useState(false)
  const [editSel, setEditSel] = useState(null)   // 편집 모드에서 선택된 요소
  useEffect(() => { localStorage.setItem('paleoUiCfg', JSON.stringify(uiCfg)) }, [uiCfg])
  const [offReward, setOffReward] = useState(null) // 오프라인 보상 대기(pending)
  const [offOpen, setOffOpen] = useState(false)    // 오프라인 보상 창 열림
  const offDone = useRef(false)

  // 오프라인 보상: 부재 시간 동안 나갈 당시 웨이브에서 무한 전투한 것으로 계산
  useEffect(() => {
    if (offDone.current) return
    offDone.current = true
    const away = init.ts ? Math.min(OFFLINE_CAP_SEC, (Date.now() - init.ts) / 1000) : 60   // ts 없으면 1분으로 간주
    if (away < OFFLINE_MIN_SEC) return
    const types = Object.values(ENEMY_TYPES)
    const avg = arr => arr.reduce((x, y) => x + y, 0) / arr.length
    const wv = init.wave
    const avgHp = avg(types.map(t => t.hp)) * (1 + 0.4 * (wv - 1))
    const avgMeat = avg(types.map(t => Math.floor(t.meat * (1 + 0.2 * (wv - 1)))))
    const avgExp = avg(types.map(t => Math.floor(t.exp * (1 + 0.2 * (wv - 1)))))
    const st2 = S.current
    const dps = st2.atk * (1000 / st2.cd)
    const killT = Math.min(6, Math.max(1, avgHp / Math.max(1, dps) + 1.2))  // 마리당 처치+접근 시간
    const kills = Math.max(1, Math.floor(away * OFFLINE_RATE / killT))   // 짧게 나갔다 와도 최소 1마리
    const gm = Math.floor(kills * avgMeat * st2.meatMult)
    const ge = Math.floor(kills * avgExp * st2.expMult)
    const mins = Math.max(1, away / 60)
    // 지급은 보물상자 → 받기 버튼에서. 여기선 대기 보상만 저장 (다이아는 추후 공식)
    setOffReward({ sec: Math.floor(away), kills, wave: init.best || init.wave || 1, meat: gm, exp: ge, gem: 0, meatRate: Math.floor(gm / mins), expRate: Math.floor(ge / mins), gemRate: 0 })
  }, [])
  const [heroHpUI, setHeroHpUI] = useState(100)
  const [bossUI, setBossUI] = useState(null)   // 보스전 타이머/체력 바
  const [paused, setPaused] = useState(false)  // 디버그 일시정지
  const [waveJump, setWaveJump] = useState(null) // 웨이브 이동 모달 입력값(null=닫힘)
  const [best, setBest] = useState(init.best || init.wave || 1) // 도달 최고 웨이브(이동 상한)
  const [progress, setProgress] = useState(0)
  const [gains, setGains] = useState([])       // 획득 팝업 리스트
  const [skillCdUI, setSkillCdUI] = useState(SKILLS.map(() => 0))  // 스킬 남은 쿨타임(초)
  const [equipped, setEquipped] = useState(init.equipped)          // 장착 슬롯 (스킬 index or null)
  const [cdConf, setCdConf] = useState(init.cdConf)                // 스킬별 쿨타임 설정(초, 직접입력)

  // 스탯 총 레벨 = 강화(고기) + 스킬(SP), 효과는 STAT_LIST.per 기준
  const tot = k => (lv[k] || 0) + (skill[k] || 0)
  const ATK_BASE = 10, HP_BASE = 100, ASPD = 1.0
  // 힐러 패시브: 장착 시 히어로+동료 전체 공격력·공속·이속 상승
  const allyBuff = alliesOn.healer ? 1 + (ALLY_DEFS.healer.buff || 0) : 1
  const aspdMult = (1 + Math.min(200, tot('aspd') * STAT_LIST.aspd.per) / 100) * allyBuff   // 공격속도 배율
  const mspdMult = (1 + Math.min(200, tot('mspd') * STAT_LIST.mspd.per) / 100) * allyBuff   // 이동속도 배율
  const maxHp = HP_BASE * (1 + tot('hp') * STAT_LIST.hp.per / 100)
  const S = useRef({})
  S.current = {
    atk: ATK_BASE * EVOS[evo].mult * (1 + tot('atk') * STAT_LIST.atk.per / 100) * allyBuff,
    cd: 1000 / (ASPD * aspdMult) / SPEED,
    aspdMult, mspdMult,
    maxHp, wave, phase, alliesOn,
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
    localStorage.setItem(SAVE_KEY, JSON.stringify({ meat, wave, lv, evo, hlv, hexp, sp, skill, equipped, cdConf, gem, inv, best, alliesOn, gearEq, mats, enh, ruby, advStage, ts: Date.now() }))
  }, [meat, wave, lv, evo, hlv, hexp, sp, skill, equipped, cdConf, gem, inv, best, alliesOn, gearEq, mats, enh, ruby, advStage])

  // 진화 시 현재 단계가 아닌 장착 스킬 자동 해제
  useEffect(() => {
    setEquipped(eq => eq.map(si => (si != null && SKILLS[si].stage === evo ? si : null)))
  }, [evo])

  // 클리어 배너 1.3초 후 소멸
  useEffect(() => {
    if (clearMsg == null) return
    const t = setTimeout(() => setClearMsg(null), 1300)
    return () => clearTimeout(t)
  }, [clearMsg])

  // 히어로 레벨업: 경험치가 필요량 넘으면 레벨↑ + 스킬포인트 지급
  useEffect(() => {
    let cl = hlv, ce = hexp, gained = 0
    while (ce >= heroExpReq(cl)) { ce -= heroExpReq(cl); cl++; gained++ }
    if (gained > 0) { setHlv(cl); setHexp(ce); setSp(s => s + gained * 3) }
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
      shake: 0, scrollX: 0, needStart: true, W: 0, H: 0, groundY: 0, heroX: HERO_X, bossTimer: 0, hitstop: 0, allyU: {}, spears: [],
      skillCd: SKILLS.map(() => 0), skill: null, skillT: 0, skillDid: false, rocks: [], projs: [], strikes: [], fx: [],
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const w = world.current
    let raf = 0, last = performance.now()

    function resize() {
      const el = wrapRef.current; if (!el) return
      const cw = el.clientWidth, ch = el.clientHeight   // 레이아웃 px (transform 영향 없음)
      if (!cw || !ch) return
      const dpr = Math.min((window.devicePixelRatio || 1) * (uiScaleRef.current || 1), 2.5)
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr)
      canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      w.W = cw; w.H = ch
      w.groundY = w.H - 36
    }
    resize()
    const ro = new ResizeObserver(resize); if (wrapRef.current) ro.observe(wrapRef.current)
    window.addEventListener('resize', resize)

    function startWave(n) {
      w.enemies = []; w.stones = []; w.rocks = []; w.waves = []
      // 주의: dmgTexts/particles/pools/projs/strikes/skill은 유지 — 클리어 넘어갈 때 이펙트 끊김 방지
      w.bossBattle = false
      w.spawnLeft = 10
      w.total = w.spawnLeft
      w.killed = 0
      w.bossPending = false
      w.spawnTimer = 200
      w.waveNum = n
      w.clearedFlag = false
    }

    function startBossBattle() {
      w.enemies = []; w.stones = []; w.rocks = []; w.waves = []
      w.bossBattle = true
      w.bossTimer = BOSS_TIME
      w.spawnLeft = 1
      w.total = 1
      w.killed = 0
      w.bossPending = true
      w.spawnTimer = 200
      w.clearedFlag = false
    }

    function spawnEnemy() {
      const key = WAVE_CYCLE[(w.waveNum - 1) % WAVE_CYCLE.length]
      const boss = w.bossPending && w.spawnLeft === 1
      const t = ENEMY_TYPES[key]
      const bi = Math.floor((w.waveNum - 1) / 10) % BOSS_TYPES.length
      const sc = (1 + 0.4 * (w.waveNum - 1)) * (boss ? 12 : 1)
      w.enemies.push({
        type: key, boss, bossIdx: bi, x: w.W + 40, hp: t.hp * sc, maxHp: t.hp * sc,
        speed: t.speed * (boss ? 0.6 : 0.9 + Math.random() * 0.2),
        dmg: t.dmg * (1 + 0.1 * (w.waveNum - 1)) * (boss ? 3 : 1),
        meat: Math.floor(t.meat * (1 + 0.2 * (w.waveNum - 1))) * (boss ? 15 : 1),
        exp: Math.floor(t.exp * (1 + 0.2 * (w.waveNum - 1))) * (boss ? 15 : 1),
        acc: t.acc, eva: t.eva, air: boss ? 0 : (t.air || 0),
        h: boss ? BOSS_TYPES[bi].h : t.h, color: t.color, cd: 0, flash: 0, animT: Math.random() * 10,
        scaleV: boss ? 1 : 0.95 + Math.random() * 0.1, yOff: boss ? 0 : Math.random() * 8 - 4, spdV: boss ? 1 : 0.93 + Math.random() * 0.14,
      })
    }

    function addDmg(x, y, val, crit, miss) { w.dmgTexts.push({ x, y, val: typeof val === 'number' ? Math.round(val).toLocaleString('en-US') : val, life: 0.8, crit, miss }) }
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
    function spawnFx(n, x, y, size) { (w.fx = w.fx || []).push({ n, x, y, size, t: 0 }) }
    function spawnLoot(x, y) {
      w.loot = w.loot || []
      const kinds = ['meat', 'meat', 'meat', 'exp', 'exp']
      if (Math.random() < DROP_DIA_P) kinds.push('dia')
      if (Math.random() < DROP_MAT_P) kinds.push('mat')
      const sx = Math.max(8, Math.min(w.W - 8, x))   // 스폰 x 화면 안쪽
      for (const k of kinds) w.loot.push({ k, x: sx + (Math.random() - 0.5) * 24, y, vx: (Math.random() - 0.5) * 170, vy: -(130 + Math.random() * 150), t: 0 })
    }
    function launchLoot(pieces) {
      const rootEl = rootRef.current; if (!rootEl) return
      const rr = rootEl.getBoundingClientRect()
      const sc = uiScaleRef.current || 1
      const toLX = sx => (sx - rr.left) / sc   // 화면 좌표 → 기준판 좌표
      const toLY = sy => (sy - rr.top) / sc
      const cr = canvas.getBoundingClientRect()
      const cx0 = toLX(cr.left), cy0 = toLY(cr.top)
      const items = []
      for (const L of pieces) {
        if (L.k === 'mat') continue   // 재화조각은 흡수 없음 (낙하 후 소멸)
        const sel = L.k === 'meat' ? '[data-edit="pillmeat"]' : L.k === 'exp' ? '[data-edit="expbar"]' : '[data-edit="pillgem"]'
        const el = document.querySelector(sel); if (!el) continue
        const tr = el.getBoundingClientRect()
        items.push({ id: Date.now() + Math.random(), k: L.k, x: cx0 + L.x, y: cy0 + L.y, tx: toLX(tr.left + tr.width / 2), ty: toLY(tr.top + tr.height / 2) })
      }
      if (items.length) setLootFly(v => [...v, ...items])
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
      t.kb = Math.max(t.kb || 0, t.boss ? 30 : 85)   // 넉백 초기속도(px/s), ease-out 감쇠
      t.sq = 0.16                                     // 피격 스쿼시
      if (t.boss && w.hsCd <= 0) { w.hitstop = Math.max(w.hitstop || 0, 0.06); w.hsCd = 0.35 }  // 연타 시 과도한 멈춤 방지
      const ty = w.groundY - t.h * 0.55
      addDmg(t.x, ty - t.h * 0.5 - 12, Math.round(dmg), crit)
      burst(t.x, ty, '#c81818', crit ? 20 : 10, true)   // 빨간 피 튀김
      spawnFx(1, t.x + (Math.random() - 0.5) * Math.max(34, t.h * 0.55), ty + (Math.random() - 0.5) * Math.max(26, t.h * 0.4), (crit ? 92 : 72) * (0.85 + Math.random() * 0.3))   // 기본공격: effect1, 몬스터 주변 랜덤
      w.shake = Math.max(w.shake, crit ? 5 : 2)
      if (t.hp <= 0 && !t.dead) killEnemy(t, st)
    }
    function killEnemy(t, st) {
      t.dead = true
      t.dieT = 0.5
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
      spawnFx(5, t.x, ty, 100)                           // 사망: effect5
      spawnLoot(t.x, ty)                                 // 전리품 조각 낙하
    }
    // 스킬 데미지 (명중 무시, 항상 적중 + 큰 피 이펙트)
    function applySkillDmg(t, dmg) {
      t.hp -= dmg
      t.flash = 1
      t.kb = Math.max(t.kb || 0, t.boss ? 55 : 150)
      t.sq = 0.18
      w.hitstop = Math.max(w.hitstop || 0, t.boss ? 0.09 : 0.05)
      const ty = w.groundY - t.h * 0.55
      addDmg(t.x, ty - t.h * 0.5 - 12, Math.round(dmg), true)
      burst(t.x, ty, '#c81818', 18, true)
      if (t.hp <= 0 && !t.dead) killEnemy(t, S.current)
    }

    function loop(now) {
      const rawDt = Math.min((now - last) / 1000, 0.05)
      last = now
      let dt = w.paused ? 0 : rawDt
      if (dt > 0 && w.hitstop > 0) { w.hitstop -= rawDt; dt = 0 }  // 히트스톱: 세계 정지, 렌더 유지
      w.hsCd = Math.max(0, (w.hsCd || 0) - rawDt)  // 기본공격 히트스톱 재발동 쿨
      const st = S.current
      const hero = w.hero
      const melee = MELEE_MODES.includes(st.mode)
      const atkRange = st.mode === 'quad' ? PUNCH.range : melee ? MC(st.mode).range : THROW.range

      // 배경 스크롤: 이동 상태 + 앞을 막는 적이 없을 때만 전진
      const heroTargetX = w.bossBattle ? Math.max(HERO_X, Math.round(w.W * 0.34)) : HERO_X
      w.heroX += (heroTargetX - w.heroX) * Math.min(1, dt * 4)
      const atkRange0 = st.mode === 'quad' ? PUNCH.range : MELEE_MODES.includes(st.mode) ? MC(st.mode).range : THROW.range
      const blocked = w.enemies.some(e => !e.dead && e.x - w.heroX < atkRange0)
      w._blocked = blocked
      const moving = (st.phase === 'fighting' || st.phase === 'cleared') && hero.state === 'move' && !blocked
      const scroll = moving ? SCROLL * st.mspdMult : 0
      w.scrollX += scroll * dt

      if (st.phase === 'fighting') {
        if (w.startBossFlag) { w.startBossFlag = false; w.needStart = false; startBossBattle(); hero.state = 'move'; hero.t = 0 }
        if (w.needStart) { startWave(st.wave); w.needStart = false; hero.hp = st.maxHp; hero.state = 'move'; hero.t = 0 }

        if (w.spawnLeft > 0) {
          w.spawnTimer -= dt * 1000
          if (w.spawnTimer <= 0) { spawnEnemy(); w.spawnLeft--; w.spawnTimer = 500 }
        }

        // 적: 접근 (전진 스크롤만큼 상대속도 가산) + 근접 공격
        for (const e of w.enemies) {
          if (e.dead) continue
          e.flash = Math.max(0, e.flash - dt * 5)
          if (e.stun > 0) { e.stun -= dt; continue }  // 기절 중 정지
          // 넉백: ease-out 감쇠하며 뒤로 밀림 / 스쿼시 타이머
          if (e.kb > 0.5) { e.x += e.kb * dt; e.kb -= e.kb * Math.min(1, dt * 9) } else e.kb = 0
          if (e.sq > 0) e.sq = Math.max(0, e.sq - dt)
          e.vt = Math.min(1, (e.vt ?? 0) + dt * 2.2)   // 스폰 직후 가속 (0→1)
          const stopX = w.heroX + Math.min(atkRange - 15, 60 + e.h * 0.4)
          if (e.x > stopX) {
            const near = Math.min(1, Math.max(0.3, (e.x - stopX) / 55))  // 정지 전 감속
            e.x -= (e.speed * (e.spdV || 1) * SPEED * 1.3 * e.vt * near + scroll) * dt
            e.animT += dt * SPEED * (0.4 + 0.6 * e.vt * near) * (1 + scroll / SCROLL * 0.4) * Math.min(1.5, Math.max(0.6, 0.55 + e.speed / 160))
          } else {
            e.cd -= dt * 1000
            if (e.cd <= 0) {
              // 회피 판정: 적 명중률 − 내 회피 보너스
              const hitChance = Math.max(0.05, e.acc + 0.5 - st.eva)
              if (Math.random() < hitChance) {
                hero.hp -= e.dmg
                hero.flash = 0.2
                w.shake = 4
                burst(w.heroX + 15, w.groundY - 70, '#c81818', 8, true)
              } else {
                addDmg(w.heroX, w.groundY - 130, 'DODGE', false, true)
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
              w.projs.push({ id: sk.id, fly: sk.fx.fly, impact: sk.fx.impact || null, x: w.heroX + 70, t: 0, dmg, h: sk.fx.fxH ?? sk.h, scale: sk.fx.flyScale || 1, yOff: sk.fx.yOff ?? 40, fe, feTotal: fa })
            } else if (sk.fx && sk.fx.type === 'strike') {
              // 낙하/타격: 살아있는 적 위치마다 (최대 5), 없으면 전방
              const ts = w.enemies.filter(e => !e.dead).slice(0, 5)
              const xs = ts.length ? ts.map(e => e.x) : [w.heroX + 260]
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
          if (!blocked) hero.animT += dt * SPEED * st.mspdMult   // 앞이 막히면 걷기 애니 정지
          const target = w.enemies.find(e => !e.dead && e.x - w.heroX < atkRange)
          if (hero.cd <= 0 && target) {
            hero.state = 'attack'; hero.t = 0; hero.did = false
            hero.cd = st.cd
            // 동료 동기화: 히어로 타격까지 걸리는 실제 시간(초) → 동료 투사체가 같은 순간 명중하도록 역산에 사용
            const rate = SPEED * st.aspdMult
            if (st.mode === 'quad') w.heroHitIn = PUNCH.hitAt / rate
            else if (MELEE_MODES.includes(st.mode)) w.heroHitIn = (MC(st.mode).total * MC(st.mode).hitAt) / rate
            else {
              const sx0 = w.heroX + 32, sy0 = w.groundY - 130 * 0.78
              const dd = Math.hypot(target.x - sx0, (w.groundY - target.h * 0.55) - sy0)
              w.heroHitIn = THROW.windupEnd / rate + Math.min(0.45, Math.max(0.18, dd / 900))
            }
            w.atkSeq = (w.atkSeq || 0) + 1
          }
        } else if (hero.state === 'attack') {
          hero.t += dt * SPEED * st.aspdMult
          if (st.mode === 'quad') {
            if (!hero.did && hero.t >= PUNCH.hitAt) {
              hero.did = true
              const t = w.enemies.find(e => !e.dead && e.x - w.heroX < PUNCH.range + 40)
              if (t) dealDamage(t, st)
            }
            if (hero.t >= PUNCH.total) { hero.state = 'move'; hero.t = 0 }
          } else if (MELEE_MODES.includes(st.mode)) {
            const mc = MC(st.mode)
            const prog = hero.t / mc.total
            const inRange = w.enemies.find(e => !e.dead && e.x - w.heroX < mc.range + 40)
            if (!hero.did && !inRange && prog < 0.35) {
              // 스윙 초반에 대상 소멸 → 취소 + 쿨다운 환불 (헛스윙/헛대기 방지)
              hero.state = 'move'; hero.t = 0; hero.cd = Math.min(hero.cd, 100)
            } else {
              if (!hero.did && prog >= mc.hitAt) {
                hero.did = true
                if (inRange) dealDamage(inRange, st)
              }
              if (hero.t >= mc.total) { hero.state = 'move'; hero.t = 0 }
            }
          } else {
            if (!hero.did && hero.t >= THROW.windupEnd) {
              hero.did = true
              const target = w.enemies.find(e => !e.dead)
              if (target) {
                const sx = w.heroX + 32, sy = w.groundY - 130 * 0.78
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

        for (const e of w.enemies) if (e.dead && e.dieT > 0) e.dieT -= dt
        w.enemies = w.enemies.filter(e => !e.dead || e.dieT > 0)
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
        if (w.bossBattle) {
          const bEn = w.enemies.find(e => e.boss && !e.dead)
          const tt = Math.ceil(Math.max(0, w.bossTimer) * 10)
          const hh = bEn ? Math.ceil(bEn.hp) : -1
          if (tt !== w._btShown || hh !== w._bhShown) {
            w._btShown = tt; w._bhShown = hh
            setBossUI({ t: Math.max(0, w.bossTimer), hp: bEn ? Math.max(0, bEn.hp) : 0, maxHp: bEn ? bEn.maxHp : 1, has: !!bEn })
          }
        } else if (w._btShown !== -1) { w._btShown = -1; w._bhShown = -1; setBossUI(null) }

        // ── 동료: 장착된 각 동료가 영웅 뒤에서 투사체 공격 ──
        if (st.phase === 'fighting') {
          for (const ak in ALLY_DEFS) {
            if (!st.alliesOn?.[ak]) continue
            const d = ALLY_DEFS[ak]
            const au = w.allyU[ak] || (w.allyU[ak] = { state: 'walk', t: 0, rt: 0, animT: 0, thrown: false, seq: -1, hitIn: 0.3 })
            au.x = w.heroX + d.xOff
            // 히어로가 공격을 시작하면 동료도 같은 프레임에 공격 개시 (버프형 제외)
            if (d.kind !== 'buff' && hero.state === 'attack' && au.seq !== w.atkSeq) {
              au.seq = w.atkSeq
              au.state = 'atk'; au.t = 0; au.rt = 0; au.thrown = false
              au.hitIn = w.heroHitIn || 0.3
            }
            if (au.state === 'atk') {
              au.t += dt * SPEED * st.aspdMult   // 공격 모션도 히어로 공속에 맞춤
              au.rt += dt
              if (d.kind === 'melee') {
                // 근접: 히어로 타격 순간에 맨 앞 적을 직접 타격
                if (!au.thrown && au.rt >= au.hitIn) {
                  au.thrown = true
                  const tgt = w.enemies.find(e => !e.dead && e.x > au.x && e.x - au.x < d.range)
                  if (tgt) dealDamage(tgt, { ...st, atk: st.atk * d.atkMult })
                }
              } else if (!au.thrown && au.t >= d.throwAt) {
                au.thrown = true
                const lx = au.x + d.h * 0.4
                const ly = w.groundY - d.h * d.projYr + (d.yOff || 0)
                const tgt = w.enemies.find(e => !e.dead && e.x > lx)
                // 남은 시간에 맞춰 속도 역산 → 히어로 타격 순간에 명중
                const remain = Math.max(0.05, au.hitIn - au.rt)
                let spd = d.projSpd
                if (tgt) spd = Math.min(2000, Math.max(200, (tgt.x - (26 + tgt.h * 0.2) - lx) / remain))
                w.spears.push({ ally: ak, t: 0, x: lx, y: ly, spd })
              }
              if (au.t >= d.atkDur) { au.state = 'walk'; au.t = 0 }
            } else if (!w._blocked && hero.state === 'move') {
              au.animT += dt * 6 * (st.mspdMult || 1)   // 걷기 애니: 히어로가 실제 이동 중일 때만
            }
          }
          for (const sp2 of w.spears) {
            const d = ALLY_DEFS[sp2.ally]
            sp2.t += dt
            sp2.x += (sp2.spd || d.projSpd) * dt
            const hit = w.enemies.find(e => !e.dead && Math.abs(e.x - sp2.x) < 26 + e.h * 0.2)
            if (hit) { sp2.dead = true; dealDamage(hit, { ...st, atk: st.atk * d.atkMult }) }
            else if (sp2.x > w.W + 80) sp2.dead = true
          }
          w.spears = w.spears.filter(sp2 => !sp2.dead)
        }

        // 보스 제한시간: 초과 시 실패 처리 후 같은 웨이브 재개 (재도전 가능)
        if (w.bossBattle) {
          w.bossTimer -= dt
          if (w.bossTimer <= 0 && !w.clearedFlag) {
            w.clearedFlag = true
            w.enemies = []; w.stones = []; w.rocks = []
            w.bossBattle = false
            setClearMsg('시간 초과 — 보스 실패')
            setBossReady(true)
            w.needStart = true
          }
        }

        if (hero.hp <= 0) setPhase('gameover')
        else if (w.spawnLeft === 0 && w.enemies.length === 0 && !w.clearedFlag) {
          w.clearedFlag = true
          if (w.bossBattle) {
            // 보스 처치: 보상 크게 + 다음 웨이브 블록으로 진행
            setMeat(m => m + 100 + w.waveNum * 20)
            setClearMsg('보스 격파!')
            w.bossBattle = false
            w.bossPrompted = false
            setBossReady(false)
            setWave(v => v + 1)
            w.needStart = true
          } else {
            setMeat(m => m + 15 + w.waveNum * 5)
            if (w.waveNum % 10 === 0) {
              // 10웨이브: 보스 도전 버튼 띄우되 멈추지 않고 같은 웨이브 계속 반복
              if (!w.bossPrompted) { w.bossPrompted = true; setClearMsg(w.waveNum); setBossReady(true) }
              w.needStart = true  // setWave 안 함 → 같은 웨이브 재시작(반복)
            } else {
              setClearMsg(w.waveNum)
              setWave(v => v + 1)
              w.needStart = true
            }
          }
        }
      }

      for (const d of w.dmgTexts) { d.life -= dt; d.y -= 45 * dt }
      w.dmgTexts = w.dmgTexts.filter(d => d.life > 0)
      for (const p of w.particles) { p.life -= dt; p.x += p.vx * dt * SPEED; p.y += p.vy * dt * SPEED; p.vy += 600 * dt }
      if (w.fx) { for (const f of w.fx) f.t += dt; w.fx = w.fx.filter(f => f.t < FX_DUR * FXF) }
      if (w.loot) {
        for (const L of w.loot) {
          L.t += dt
          L.x += L.vx * dt; L.y += L.vy * dt; L.vy += 720 * dt
          const gy = w.groundY - 5
          if (L.y > gy) { L.y = gy; L.vy *= -0.35; L.vx *= 0.6; if (Math.abs(L.vy) < 45) L.vy = 0 }
          const mx = 8   // 화면 좌우 안쪽 여백
          if (L.x < mx) { L.x = mx; L.vx = Math.abs(L.vx) * 0.5 }
          if (L.x > w.W - mx) { L.x = w.W - mx; L.vx = -Math.abs(L.vx) * 0.5 }
        }
        const fly = w.loot.filter(L => L.t >= 1.0)
        if (fly.length) { launchLoot(fly); w.loot = w.loot.filter(L => L.t < 1.0) }
      }
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
        if (MELEE_MODES.includes(st.mode)) {
          const ak = st.mode === 'neander' ? 'natk1' : st.mode === 'sapiens' ? 'patk1' : st.mode === 'human' ? 'hmatk1' : 'eatk1'
          const arr = ANIM[ak].srcs
          const k = Math.min(arr.length - 1, Math.floor(hero.t / MC(st.mode).total * arr.length))
          return [ak, k]
        }
        const k = hero.t < THROW.windupEnd ? 0 : 1
        return ['throw', k]
      }
      const key = st.mode === 'quad' ? 'quad' : st.mode === 'erectus' ? 'ewalk' : st.mode === 'neander' ? 'nwalk' : st.mode === 'sapiens' ? 'pwalk' : st.mode === 'human' ? 'hmwalk' : 'walk'
      // 근접 모드: 적을 앞에 두고 대기 중(막힘)일 땐 걷기 대신 마지막 스윙 프레임 유지 → 공격↔대기 스냅 깜빡임 방지
      if (st.mode === 'erectus' && key === 'ewalk' && w._blocked) {
        return ['eatk1', 0]
      }
      if (st.mode === 'neander' && key === 'nwalk' && w._blocked) {
        return ['natk1', 0]
      }
      if (st.mode === 'sapiens' && key === 'pwalk' && w._blocked) {
        return ['patk1', 0]
      }
      if (st.mode === 'human' && key === 'hmwalk' && w._blocked) {
        return ['hmatk1', 0]
      }
      const fi = Math.floor(hero.animT * 10) % ANIM[key].srcs.length
      return [key, fi]
    }
    function safeImg(key, fi) {
      const arr = AIMG[key]
      if (!arr || !arr.length) return AIMG.idle[0]
      return arr[fi] || arr[0]
    }

    function drawEnemy(ctx, e, now) {
      const air = e.air ? e.air * (e.airT ?? 1) : 0   // 공중 높이 (스폰부터 고정 고도)
      const y = w.groundY - air
      const t = ENEMY_TYPES[e.type]
      const imgs = e.boss ? BIMG[e.bossIdx] : EIMG[e.type]
      const stunned = e.stun > 0
      const gall = e.animT * 9
      const fi = stunned ? 0 : Math.floor(gall / Math.PI) % imgs.length  // 기절 시 프레임 고정
      const wf = e.boss ? 0.55 : Math.min(1.15, Math.max(0.45, 62 / e.h))  // 무게 차등: 클수록 덜 들썩임
      const bounce = stunned ? 0 : e.air
        ? Math.sin(gall * 0.45 + (e.yOff || 0)) * 5                        // 공중: 부드러운 부유
        : Math.abs(Math.sin(gall)) * e.h * 0.08 * wf
      const rock = stunned ? 0 : Math.sin(gall) * 0.06 * (e.air ? 0.35 : wf)
      const im = imgs[fi]
      ctx.save()
      ctx.translate(e.x, y - bounce + (e.air ? 0 : (e.yOff || 0)))
      ctx.rotate(rock)
      if (e.sq > 0) { const q = e.sq / 0.18; ctx.scale(1 + 0.10 * q, 1 - 0.14 * q) }
      if (e.dead) { const p = Math.max(0, e.dieT) / 0.5; ctx.globalAlpha = Math.min(1, p * 2) * 0.9 }
      if (!e.dead && e.flash > 0.5) ctx.filter = 'brightness(3)'
      if (im.complete && im.naturalWidth > 0) {
        const eh = e.h * (e.scaleV || 1)
        const ew = eh * (im.naturalWidth / im.naturalHeight)
        if (t.flip) ctx.scale(-1, 1)
        if (e.dead && _deadCtx) {
          const p = Math.max(0, e.dieT) / 0.5
          const rp = Math.max(0, (p - 0.5) * 2)  // 초반 진한 빨강 → 중반부터 검정
          const iw = im.naturalWidth, ih = im.naturalHeight
          if (_deadCv.width !== iw || _deadCv.height !== ih) { _deadCv.width = iw; _deadCv.height = ih } else _deadCtx.clearRect(0, 0, iw, ih)
          _deadCtx.globalCompositeOperation = 'source-over'
          _deadCtx.filter = 'brightness(0)'
          _deadCtx.drawImage(im, 0, 0, iw, ih)     // 검정 실루엣
          _deadCtx.filter = 'none'
          if (rp > 0) { _deadCtx.globalCompositeOperation = 'source-atop'; _deadCtx.fillStyle = `rgba(210,25,25,${rp})`; _deadCtx.fillRect(0, 0, iw, ih) }  // 스프라이트 위에만 빨강
          ctx.drawImage(_deadCv, -ew / 2, -eh, ew, eh)
        } else {
          ctx.drawImage(im, -ew / 2, -eh, ew, eh)
        }
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

      // 배경: 가로 무한 타일 스크롤 (10웨이브마다 테마 변경, 보스전투 시 보스 배경)
      const BG = bgFor(w.waveNum || 1, w.bossBattle)
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
        // 장착 동료 (영웅 왼쪽 뒤, 겹침 허용)
        // 주의: draw() 스코프에 게임 상태 st가 없음(파일 하단 스타일 객체 st와 충돌) → S.current 직접 참조
        const gs = S.current
        for (const ak in ALLY_DEFS) {
          if (!gs.alliesOn?.[ak]) continue
          const d = ALLY_DEFS[ak]
          const au = w.allyU[ak]
          if (!au) continue
          const atkArr = ALLY_IMG[ak].atk
          const arr = au.state === 'atk' && atkArr.length ? atkArr : ALLY_IMG[ak].walk
          const fi = (au.state === 'atk' && atkArr.length) ? Math.min(arr.length - 1, Math.floor(au.t / d.atkDur * arr.length)) : Math.floor(au.animT) % arr.length
          const im2 = arr[fi]
          const ok = im2 && im2.complete && im2.naturalWidth > 0
          const hh = d.h
          const ww2 = ok ? hh * (im2.naturalWidth / im2.naturalHeight) : hh * 0.7
          const bob = au.state === 'walk' ? Math.abs(Math.sin(au.animT * 3.1)) * 3 : 0
          const dx = au.x - ww2 / 2, dy = w.groundY - hh - bob + (d.yOff || 0)
          if (ok) ctx.drawImage(im2, dx, dy, ww2, hh)
          // 자가진단: 이미지 실패=빨간 박스 / window.__allyDebug=true → 위치 확인용 자홍 테두리
          if (!ok || window.__allyDebug) {
            ctx.save()
            ctx.lineWidth = 2
            ctx.strokeStyle = ok ? '#ff00ff' : '#ff2020'
            if (!ok) { ctx.fillStyle = 'rgba(255,32,32,0.45)'; ctx.fillRect(dx, dy, ww2, hh) }
            ctx.strokeRect(dx, dy, ww2, hh)
            ctx.restore()
          }
        }
        for (const sp2 of w.spears) {
          const d = ALLY_DEFS[sp2.ally]
          const si = ALLY_IMG[sp2.ally].proj
          if (si.complete && si.naturalWidth > 0) {
            const pw = d.projW
            const ph = pw * (si.naturalHeight / si.naturalWidth)
            const by = d.projBob ? Math.sin(sp2.t * 9) * d.projBob : 0
            ctx.drawImage(si, sp2.x - pw / 2, sp2.y - ph / 2 + by, pw, ph)
          }
        }
        const lunge = hero.state === 'attack' ? Math.sin(Math.min(1, hero.t / 0.4) * Math.PI) * 12 : 0
        ctx.translate(w.heroX + lunge, w.groundY)
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

      if (w.fx) for (const f of w.fx) {
        const fi = Math.min(FXF - 1, Math.floor(f.t / FX_DUR))
        const im = FX_IMGS[f.n] && FX_IMGS[f.n][fi]
        if (im && im.complete && im.naturalWidth) {
          const fh = f.size, fw = fh * 0.75
          ctx.drawImage(im, f.x - fw / 2, f.y - fh * 0.6, fw, fh)
        }
      }

      if (w.loot) for (const L of w.loot) {
        const im = LOOT_CIMG[L.k]
        if (im.complete && im.naturalWidth) ctx.drawImage(im, L.x - 4.5, L.y - 9, 9, 9)
      }

      ctx.textAlign = 'center'
      for (const d of w.dmgTexts) {
        ctx.globalAlpha = Math.min(1, d.life * 2.5)
        ctx.font = (d.crit ? '900 22px' : d.miss ? '800 14px' : '800 16px') + ' sans-serif'
        ctx.fillStyle = d.miss ? '#8ab4ff' : d.crit ? '#e01414' : '#ffffff'
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3
        ctx.strokeText(d.val, d.x, d.y)
        ctx.fillText(d.val, d.x, d.y)
      }
      ctx.globalAlpha = 1
      ctx.restore()
    }

    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); ro.disconnect() }
  }, [])

  // 강화(고기) — 레벨 직접 설정
  function setStatLv(k, n) {
    n = Math.max(0, Math.floor(Number(n) || 0))
    setLv(v => ({ ...v, [k]: n }))
  }
  const lvLive = useRef(lv); lvLive.current = lv
  const meatLive = useRef(meat); meatLive.current = meat
  const spLive = useRef(sp); spLive.current = sp
  useEffect(() => { world.current.paused = paused }, [paused])
  useEffect(() => { setBest(b => Math.max(b, wave)) }, [wave])
  function buyStat(k, delta = 1) {
    if (delta < 0) { setLv(v => ({ ...v, [k]: Math.max(0, v[k] + delta) })); return }
    const c = DEBUG ? 0 : buyCost(k, lvLive.current[k])
    if (meatLive.current < c) return
    setMeat(m => m - c)
    setLv(v => ({ ...v, [k]: v[k] + 1 }))
  }
  // 소환: n회 뽑기 → 인벤토리 반영 + 결과 오버레이
  function pullGacha(cat, n) {
    const cost = GACHA_COST[n]
    if (!DEBUG) {
      if (gem < cost) return
      setGem(g => g - cost)
    }
    const items = Array.from({ length: n }, () => ({ i: rollItem() }))
    setInv(v => {
      const nv = { ...v }
      for (const it of items) { const key = invKey(cat, it.i); nv[key] = (nv[key] || 0) + 1 }
      return nv
    })
    setGacha({ cat, items, roll: Date.now() })
  }
  // 융합: 같은 장비 5개 → 다음 장비 1개
  function fuseOne(cat, i) {
    if (i >= EQUIP_MAX) return
    setInv(v => {
      const k = invKey(cat, i), nk = invKey(cat, i + 1)
      if ((v[k] || 0) < 5) return v
      return { ...v, [k]: v[k] - 5, [nk]: (v[nk] || 0) + 1 }
    })
  }
  // 일괄 융합: 낮은 등급부터 가능한 만큼 연쇄 융합
  function fuseAll(cat) {
    setInv(v => {
      const nv = { ...v }
      for (let i = 1; i < EQUIP_MAX; i++) {
        const k = invKey(cat, i), nk = invKey(cat, i + 1)
        while ((nv[k] || 0) >= 5) { nv[k] -= 5; nv[nk] = (nv[nk] || 0) + 1 }
      }
      return nv
    })
  }
  // 길게 누르면 연속 실행 (400ms 후 80ms 간격)
  const holdRef = useRef(null)
  function holdStart(fn) {
    if (uiEdit) return
    holdEnd()
    fn()
    holdRef.current = { iv: null, t: setTimeout(() => { if (holdRef.current) holdRef.current.iv = setInterval(fn, 80) }, 400) }
  }
  function holdEnd() {
    const h = holdRef.current
    if (h) { clearTimeout(h.t); clearInterval(h.iv); holdRef.current = null }
  }
  useEffect(() => () => holdEnd(), [])
  // ── 클라우드 세이브: 로그인 시 웨이브 높은 쪽 채택, 이후 60초/백그라운드 전환 시 업로드 ──
  const [fbUser, setFbUser] = useState(null)
  const [cloudMsg, setCloudMsg] = useState('')
  async function pushCloud() {
    if (!FB_ON || !fbAuth.currentUser) return
    try {
      const sv = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')
      if (!sv) return
      sv.ui = JSON.parse(localStorage.getItem('paleoUiCfg') || 'null')
      await setDoc(doc(fbDb, 'paleoSaves', fbAuth.currentUser.uid), sv)
      setCloudMsg('저장됨 ' + new Date().toLocaleTimeString())
    } catch (e) { setCloudMsg('저장 실패: ' + (e.code || e.message)) }
  }
  useEffect(() => {
    if (!FB_ON) return
    return onAuthStateChanged(fbAuth, async u => {
      setFbUser(u)
      if (!u) return
      try {
        const snap = await getDoc(doc(fbDb, 'paleoSaves', u.uid))
        const cloud = snap.exists() ? snap.data() : null
        const local = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')
        // UI 편집값: 클라우드(PC에서 올린 값)를 항상 적용
        if (cloud?.ui) {
          localStorage.setItem('paleoUiCfg', JSON.stringify(cloud.ui))
          setUiCfg({ ...UI_DEFAULT, ...Object.fromEntries(Object.entries(cloud.ui).filter(([k]) => k in UI_DEFAULT)) })
        }
        if (cloud && (cloud.wave || 0) > (local?.wave || 0)) {
          localStorage.setItem(SAVE_KEY, JSON.stringify(cloud))
          location.reload()  // 클라우드 세이브로 재시작
        } else {
          pushCloud()
        }
      } catch (e) { setCloudMsg('동기화 실패: ' + (e.code || e.message)) }
    })
  }, [])
  useEffect(() => {
    if (!FB_ON) return
    const iv = setInterval(pushCloud, 60000)
    const onVis = () => { if (document.visibilityState === 'hidden') pushCloud() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  async function fbLogin() {
    try { await signInWithPopup(fbAuth, new GoogleAuthProvider()) }
    catch { try { await signInWithRedirect(fbAuth, new GoogleAuthProvider()) } catch (e) { setCloudMsg('로그인 실패: ' + (e.code || e.message)) } }
  }
  async function fbLogout() { await pushCloud(); await signOut(fbAuth) }

  // 스크롤 엣지 페이드: 위/아래 끝에서는 해제, 넘침 없으면 페이드 없음
  function updFade(el) {
    if (!el) return
    const over = el.scrollHeight - el.clientHeight > 2
    el.style.setProperty('--fadeT', over && el.scrollTop > 2 ? '14px' : '0px')
    el.style.setProperty('--fadeB', over && el.scrollHeight - el.scrollTop - el.clientHeight > 2 ? '28px' : '0px')
  }
  // 스킬(SP) — 레벨 직접 설정 (DEBUG 시 SP 무시)
  function setSkillLv(k, n) {
    n = Math.max(0, Math.floor(Number(n) || 0))
    setSkill(s => ({ ...s, [k]: n }))
  }
  function upSkill(k, delta = 1) {
    if (delta < 0) { setSkill(s => ({ ...s, [k]: Math.max(0, s[k] + delta) })); return }
    if (!DEBUG && spLive.current <= 0) return
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
  function jumpWave(n) {
    n = Math.max(1, Math.min(best, Math.floor(Number(n) || 0)))
    if (!n) return
    const w = world.current
    w.bossBattle = false
    w.startBossFlag = false
    w.bossPrompted = false  // 이동 후 10웨이브 클리어 시 보스 프롬프트 다시 뜨게
    setBossReady(false)
    setWave(n)
    w.needStart = true
    setWaveJump(null)
  }
  function challengeBoss() { setBossReady(false); world.current.startBossFlag = true }
  function equipSkill(i) {
    setEquipped(eq => {
      if (eq.includes(i)) return eq
      const slot = eq.indexOf(null)
      if (slot < 0) return eq  // 슬롯 가득
      const next = [...eq]; next[slot] = i; return next
    })
  }
  function enterAdventure() {
    if (uiEdit || !advSel || ruby < ADV_COST_RUBY) return
    setRuby(r => r - ADV_COST_RUBY)
    setAdvSel(null)   // 전투 연결은 다음 단계
  }
  function unequipSkill(slot) {
    setEquipped(eq => { const next = [...eq]; next[slot] = null; return next })
  }

  const offData = offReward || (uiEdit ? { sec: 7200, kills: 1234, wave: 670, meat: 12345, exp: 6789, gem: 0, meatRate: 102, expRate: 56, gemRate: 0 } : null)
  return (
    <div style={st.outer}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Do+Hyeon&family=Jua&display=swap');
      * { box-sizing: border-box; scrollbar-width: none; }
      *::-webkit-scrollbar { width: 0; height: 0; display: none; }
      button { cursor: pointer; font-family: inherit; }
      .pd-num { font-family: 'Do Hyeon', sans-serif; letter-spacing: 0.02em; }
      @keyframes pdPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
      @keyframes pdGachaPop { 0% { transform: scale(0.2); opacity: 0; } 70% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      .pd-gacha-pop { animation: pdGachaPop 0.35s ease-out backwards; }
      @keyframes pdBlink { 0%,100% { opacity: 0.12; } 50% { opacity: 1; } }
      @keyframes pdSplashOut { from { opacity: 1; } to { opacity: 0; } }
      .pd-fade { --fadeT: 0px; --fadeB: 28px;
        -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 var(--fadeT), #000 calc(100% - var(--fadeB)), transparent 100%);
        mask-image: linear-gradient(180deg, transparent 0, #000 var(--fadeT), #000 calc(100% - var(--fadeB)), transparent 100%); }
    `}</style>
    <style>{uiVars(uiCfg)}</style>
    <div ref={rootRef} style={{ ...st.root, width: BASE_W, maxWidth: 'none', height: view.h, flexShrink: 0, transform: `scale(${view.s})`, transformOrigin: 'top center' }} onClickCapture={e => {
      if (splash || !uiEdit) return
      const t = e.target.closest('[data-edit]')
      if (t) { e.stopPropagation(); e.preventDefault(); setEditSel(t.dataset.edit); if (t.dataset.edit === 'treasure') setOffOpen(true); const mAdv = /^adv(btn|txt)(\d)$/.exec(t.dataset.edit); if (mAdv) setAdvSel(CONTINENTS[+mAdv[2]]) }
    }}>
      {splash && (
        <div style={st.splashWrap} onClick={() => setSplash(false)}>
          <div style={st.splashTap}>TAP TO START</div>
        </div>
      )}
      {uiEdit && <style>{`[data-edit]{outline:1px dashed rgba(232,185,98,0.35);outline-offset:-1px;cursor:pointer}${editSel ? `[data-edit="${editSel}"]{outline:2px solid ${GOLD} !important}` : ''}`}</style>}
      <button onClick={() => { setUiEdit(v => !v); setEditSel(null) }} style={{ position: 'absolute', top: 4, right: 4, zIndex: 60, padding: '3px 8px', borderRadius: 6, border: '1px solid #6b4a24', background: uiEdit ? GOLD_D : 'rgba(20,13,7,0.8)', color: uiEdit ? '#fff' : GOLD, fontSize: 12 }}>{uiEdit ? '편집중' : '⚙'}</button>
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80 }} onClick={() => setMenuOpen(false)}>
          <div data-edit="menu" style={st.menuPanel} onClick={e => e.stopPropagation()}>
            <button style={{ ...st.menuItem, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => {}}><img data-edit="mailbox" src="/ui/mailbox.png" alt="" style={st.mailImg} />우편함 <span style={{ fontSize: 11, opacity: 0.7 }}>준비 중</span></button>
            <div style={{ borderTop: '1px solid #3a2a14', margin: '4px 0' }} />
            {FB_ON && (fbUser ? (
              <>
                <div style={{ ...st.menuItem, opacity: 0.8 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fbUser.email}</span></div>
                <button style={st.menuItem} onClick={pushCloud}>지금 저장 <span style={{ fontSize: 11, opacity: 0.6 }}>{cloudMsg}</span></button>
                <button style={st.menuItem} onClick={fbLogout}>로그아웃</button>
              </>
            ) : (
              <button style={st.menuItem} onClick={fbLogin}>구글 로그인 · 저장 연동</button>
            ))}
          </div>
        </div>
      )}
      {waveJump != null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.5)' }} onClick={() => setWaveJump(null)}>
          <div data-edit="wjump" style={st.wjPanel} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 6 }}>웨이브 이동 <span style={{ opacity: 0.6, fontSize: 11 }}>(최고 {best})</span></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="number" min={1} max={best} value={waveJump} onChange={e => setWaveJump(e.target.value)} style={st.wjInput} />
              <button style={st.cloudBtn} onClick={() => jumpWave(waveJump)}>이동</button>
              <button style={st.cloudBtn} onClick={() => jumpWave(best)}>최고로</button>
            </div>
          </div>
        </div>
      )}
      {nav === '장비' && detailItem && (() => {
            const { cat, i } = detailItem
            const key = invKey(cat, i)
            const cnt = inv[key] || 0
            const col = gradeColorOf(i)
            const isEq = gearEq[cat] === i
            const lv = enh[key] || 0
            const stats = gearStats(cat, i, lv)
            const statsNext = gearStats(cat, i, lv + 1)
            const cost = enhCost(lv)
            const canEnh = mats[4] >= cost
            const hasNext = i < EQUIP_MAX
            const nextCnt = hasNext ? (inv[invKey(cat, i + 1)] || 0) : 0
            const maxFuse = Math.floor(cnt / 5)
            const go = (ni) => { if (ni >= 1 && ni <= EQUIP_MAX) { setDetailItem({ cat, i: ni }); setFuseQty(0) } }
            return (
              <div style={st.dOverlay} onClick={e => { if (e.target === e.currentTarget) setDetailItem(null) }}>
                <div style={st.dBox}>
                  <div style={st.dTabs}>
                    <button data-edit="dtab" style={{ ...st.dTab, ...(detailTab === '강화' ? st.dTabOn : {}) }} onClick={() => setDetailTab('강화')}>강화</button>
                    <button data-edit="dtab" style={{ ...st.dTab, ...(detailTab === '융합' ? st.dTabOn : {}) }} onClick={() => setDetailTab('융합')}>융합</button>
                  </div>
                  {detailTab === '강화' ? (
                    <div style={st.dBody}>
                      <div data-edit="dtitle" style={{ ...st.dGrade, color: col }}>{gradeNameOf(i)}</div>
                      <div data-edit="dtitle" style={st.dName}>{cat} {i}번</div>
                      <div style={st.dIconRow}>
                        <button data-edit="darrow" style={st.dArrow} onClick={() => go(i - 1)}>◀</button>
                        <div data-edit="dicon" style={{ ...st.dIconWrap, borderColor: col }}>
                          <img src={equipImg(cat, i)} alt="" style={st.dIcon} />
                          {lv > 0 && <span style={st.dEnhLv}>+{lv}</span>}
                          <span style={{ ...st.dIconTier, color: col }}>{tierOf(i)}등급</span>
                        </div>
                        <button data-edit="darrow" style={st.dArrow} onClick={() => go(i + 1)}>▶</button>
                      </div>
                      <div style={st.dCnt}>{cnt}/5</div>
                      <div style={st.dSecTitle}>장착 효과</div>
                      <div style={st.dStatBox}>
                        {stats.map(([nm, val], x) => (
                          <div key={x} data-edit="dstat" style={st.dStatRow}>
                            <span>{nm}</span>
                            <span><span style={{ color: '#e8d5b0' }}>+{fmtPct(val)}%</span><span style={{ color: '#8fe36b', fontWeight: 700, marginLeft: 6 }}>▶ +{fmtPct(statsNext[x][1])}%</span></span>
                          </div>
                        ))}
                      </div>
                      <div style={st.dBtns}>
                        <button data-edit="denh" style={{ ...st.dEnhBtn, ...(canEnh ? st.dEnhBtnOn : {}) }} onClick={() => { if (canEnh) { setMats(m => { const n = [...m]; n[4] -= cost; return n }); setEnh(e => ({ ...e, [key]: lv + 1 })) } }}>
                          <img src={MAT_IMG(4)} alt="" style={st.dEnhIc} /><span style={{ fontFamily: "'Do Hyeon',sans-serif" }}>{fmt(cost)}</span>
                        </button>
                        <button data-edit="dequip" style={{ ...st.dEquipBtn, ...(isEq ? st.dEquipOn : {}) }} onClick={() => { if (cnt > 0 || isEq) setGearEq(g => ({ ...g, [cat]: isEq ? null : i })) }}>{isEq ? '장착중' : '장착'}</button>
                      </div>
                    </div>
                  ) : (
                    <div style={st.dBody}>
                      <div style={st.dFuseNote}>* 보유 {cat} 5개로 다음 단계 제작</div>
                      {hasNext ? (
                        <>
                          <div data-edit="dtitle" style={st.dName}>{cat} {i}번</div>
                          <div data-edit="dicon" style={{ ...st.dIconWrap, borderColor: col }}><img src={equipImg(cat, i)} alt="" style={st.dIcon} /><span style={{ ...st.dIconTier, color: col }}>{tierOf(i)}등급</span></div>
                          <div style={st.dCnt}>{cnt} <span style={{ color: '#ff6b6b' }}>(-{fuseQty * 5})</span></div>
                          <div style={st.dArrowDown}>▼</div>
                          <div data-edit="dtitle" style={st.dName}>{cat} {i + 1}번</div>
                          <div data-edit="dicon" style={{ ...st.dIconWrap, borderColor: gradeColorOf(i + 1) }}><img src={equipImg(cat, i + 1)} alt="" style={st.dIcon} /><span style={{ ...st.dIconTier, color: gradeColorOf(i + 1) }}>{tierOf(i + 1)}등급</span></div>
                          <div style={st.dCnt}>{nextCnt} <span style={{ color: '#8fe36b' }}>(+{fuseQty})</span></div>
                          <div style={st.dStepper}>
                            <button data-edit="dstep" style={st.dStepBtn} onClick={() => setFuseQty(q => Math.max(0, q - 1))}>-</button>
                            <span style={st.dStepVal}>{fuseQty}</span>
                            <button data-edit="dstep" style={st.dStepBtn} onClick={() => setFuseQty(q => Math.min(maxFuse, q + 1))}>+</button>
                          </div>
                          <button data-edit="dfusebtn" style={st.dFuseBtn} onClick={() => { if (fuseQty > 0) { setInv(v => { const k = invKey(cat, i), nk = invKey(cat, i + 1); const use = Math.min(fuseQty, Math.floor((v[k] || 0) / 5)); if (use <= 0) return v; return { ...v, [k]: v[k] - use * 5, [nk]: (v[nk] || 0) + use } }); setFuseQty(0) } }}>융합</button>
                        </>
                      ) : (<div style={st.dMaxNote}>최종 단계 장비입니다</div>)}
                    </div>
                  )}
                  <button style={st.dClose} onClick={() => setDetailItem(null)}>✕</button>
                </div>
              </div>
            )
          })()}
      {lootFly.map(p => <LootPiece key={p.id} p={p} done={() => setLootFly(v => v.filter(q => q.id !== p.id))} />)}
      {advSel && (() => {
        const cleared = advStage[advSel.key] || 0
        const stage = Math.min(ADV_STAGES, cleared + 1)
        const rw = advReward(stage)
        return (
        <div style={st.advOverlay} onClick={() => { if (!uiEdit) setAdvSel(null) }}>
          <div data-edit="advwin" style={st.advWin} onClick={e => e.stopPropagation()}>
            <div style={st.advTop}>
              <div style={st.advInfoCol}>
                <div data-edit="advmonb" style={{ ...st.advBoxBase, ...st.advMonBox }}>
                  <div data-edit="advmonk" style={st.advMonK}>몬스터 정보</div>
                  <div data-edit="advmonv" style={st.advMonV}>{advSel.mon}</div>
                </div>
                <div data-edit="advregb" style={{ ...st.advBoxBase, ...st.advRegBox }}>
                  <div data-edit="advregk" style={st.advRegK}>지역 정보</div>
                  <div data-edit="advregv" style={st.advRegV}>{advSel.name}</div>
                </div>
              </div>
              <div data-edit="adviconb" style={st.advIconBox}>
                <img data-edit="advicon" src={`/dino/boss_${advSel.boss}/w1.png`} alt="" style={st.advIcon} />
              </div>
            </div>

            <div data-edit="advrewb" style={st.advRewRow}>
              <span data-edit="advrewk" style={st.advRewK}>탐험 보상</span>
              <span data-edit="advrewd" style={st.advRewD}><img src="/ui/gem.png" alt="" style={st.advRewIc} />{fmt(rw.dia)}</span>
              <span data-edit="advrewm" style={st.advRewM}><img src="/ui/mat4.png" alt="" style={st.advRewIc} />{fmt(rw.mat)}</span>
            </div>

            <div data-edit="advsign" style={st.advSign}>
              <div data-edit="advsignt" style={st.advSignTxt}>({stage}/{ADV_STAGES})</div>
              <div data-edit="advbar" style={st.advBar}>
                {Array.from({ length: ADV_STAGES }, (_, i) => (
                  <div key={i} style={{ ...st.advBarCell, ...(i < cleared ? st.advBarFill : null) }} />
                ))}
              </div>
            </div>

            <div style={st.advWinBtns}>
              <button data-edit="adventer" style={{ ...st.advEnterBtn, ...(ruby < ADV_COST_RUBY ? st.advBtnOff : null) }} onClick={enterAdventure}>
                진입 <img src="/ui/ruby.png" alt="" style={st.advRuby} />{fmt(ruby)}
              </button>
              <button data-edit="advclose" style={st.advCloseBtn} onClick={() => { if (!uiEdit) setAdvSel(null) }}>닫기</button>
            </div>
          </div>
        </div>
        )
      })()}

      {gacha && (
        <div style={st.gachaOverlay}>
          <div className="pd-fade" ref={updFade} onScroll={e => updFade(e.currentTarget)} style={st.gachaScroll}>
            <div style={st.gachaGrid}>
              {gacha.items.map((it, i) => {
                const cellKey = `${gacha.roll}_${i}`
                const gr = gradeNameOf(it.i)
                const col = GRADE_COLOR[gr]
                const hi = gr === '전설' || gr === '신화'
                return (
                  <div key={cellKey} data-edit="gacha" className="pd-gacha-pop" style={{
                    ...st.gachaCell, borderColor: col, animationDelay: `${Math.min(i * 60, 1800)}ms`,
                    boxShadow: hi ? `0 0 18px 4px ${col}66` : 'none',
                  }}>
                    <span data-edit="ggrade" style={{ ...st.gachaGrade, color: col }}>{gr}</span>
                    <img src={equipImg(gacha.cat, it.i)} alt="" data-edit="gimg" style={st.gachaImg} />
                    <span data-edit="gtier" style={st.gachaTier}>{tierOf(it.i)}등급</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={st.gachaBtns}>
            <button data-edit="gbtn" style={st.gachaBtn} onClick={() => setGacha(null)}><span data-edit="gbtntext" style={st.gachaBtnText}>확인</span></button>
            <button data-edit="gbtn" style={st.gachaBtn} onClick={() => { if (!uiEdit) pullGacha(gacha.cat, 10) }}><span data-edit="gbtntext" style={st.gachaBtnText}>10회 소환 <span style={st.shopCost}><img src="/ui/gem.png" alt="" data-edit="shopgem" style={st.shopGemIc} />100</span></span></button>
            <button data-edit="gbtn" style={st.gachaBtn} onClick={() => { if (!uiEdit) pullGacha(gacha.cat, 30) }}><span data-edit="gbtntext" style={st.gachaBtnText}>30회 소환 <span style={st.shopCost}><img src="/ui/gem.png" alt="" data-edit="shopgem" style={st.shopGemIc} />300</span></span></button>
          </div>
        </div>
      )}
      {uiEdit && (
        <div style={{ position: 'fixed', left: 0, right: 0, ...(editSel ? { bottom: 0, borderBottom: 'none', borderRadius: '10px 10px 0 0' } : { top: 0, borderTop: 'none', borderRadius: '0 0 10px 10px' }), margin: '0 auto', maxWidth: 420, zIndex: 61, background: 'rgba(16,10,5,0.94)', border: `2px solid ${GOLD_D}`, textShadow: '0 1px 3px rgba(0,0,0,0.9)', padding: '8px 12px calc(8px + env(safe-area-inset-bottom))', maxHeight: '46%', overflowY: 'auto' }}>
          {!editSel && <div style={{ fontSize: 13, color: '#c9b596', textAlign: 'center', padding: '4px 0 8px' }}>조정할 요소를 화면에서 탭하세요 (틀·아이콘·글자·숫자·버튼)</div>}
          <div style={{ fontSize: 13, color: '#ffd98a', textAlign: 'center', padding: '0 0 6px', fontWeight: 800 }}>기준 {BASE_W}×{BASE_H} · 화면 {view.sw}×{view.sh} · 배율 {view.s.toFixed(3)}</div>
          {editSel && (() => {
            const g = EDIT_GROUPS[editSel]; if (!g) return null
            const nudge = (k, d, lo, hi) => setUiCfg(c => ({ ...c, [k]: Math.min(hi, Math.max(lo, Math.round((c[k] + d) * 2) / 2)) }))
            const nbtn = { width: 26, height: 26, flexShrink: 0, borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: GOLD, fontSize: 14, lineHeight: 1, padding: 0 }
            const rng = k => k.startsWith('adv') ? (k.endsWith('fz') ? 60 : k === 'advbw' || k === 'advbh' ? 200 : 600) : k === 'offw' ? 400 : k === 'fuseallw' ? 400 : k === 'offbtw' ? 260 : k === 'equipcols' ? 8 : k === 'equipimg' ? 100 : k === 'hph' ? 60 : k === 'btw' || k === 'bhpw' ? 320 : k === 'bth' || k === 'bhph' ? 70 : k === 'equipcell' ? 160 : (k === 'exph' || k.includes('bw') || k.includes('gap') || k === 'sph' || k.startsWith('nav') || k.startsWith('tab') ? 40 : (k === 'rowmin' ? 80 : 120))
            const rmin = k => k === 'equipcols' ? 3 : 0
            return <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <b style={{ color: GOLD, fontSize: 14 }}>{g.label}</b>
                <button onClick={() => setEditSel(null)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: '#cbb89a', fontSize: 12 }}>닫기</button>
              </div>
              {g.size.map(k => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 92, fontSize: 12, flexShrink: 0 }}>{UI_LABELS[k]}</span>
                  <button style={nbtn} onClick={() => nudge(k, k === 'val' ? -0.5 : -1, rmin(k), rng(k))}>−</button>
                  <input type="range" min={rmin(k)} max={rng(k)} step={k === 'val' ? 0.5 : 1} value={uiCfg[k]} onChange={e => setUiCfg({ ...uiCfg, [k]: parseFloat(e.target.value) })} style={{ flex: 1, minWidth: 0 }} />
                  <button style={nbtn} onClick={() => nudge(k, k === 'val' ? 0.5 : 1, rmin(k), rng(k))}>+</button>
                  <span style={{ width: 34, textAlign: 'right', fontSize: 12, color: GOLD }}>{uiCfg[k]}</span>
                </div>
              ))}
              {g.pos && ['X', 'Y'].map(ax => {
                const k = g.pos + ax
                const pmax = g.pos.startsWith('advbtn') ? 400 : 80
                return <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 92, fontSize: 12, flexShrink: 0 }}>위치 {ax === 'X' ? '←→' : '↑↓'}</span>
                  <button style={nbtn} onClick={() => nudge(k, -1, -pmax, pmax)}>−</button>
                  <input type="range" min={-pmax} max={pmax} step={1} value={uiCfg[k]} onChange={e => setUiCfg({ ...uiCfg, [k]: parseFloat(e.target.value) })} style={{ flex: 1, minWidth: 0 }} />
                  <button style={nbtn} onClick={() => nudge(k, 1, -pmax, pmax)}>+</button>
                  <span style={{ width: 34, textAlign: 'right', fontSize: 12, color: GOLD }}>{uiCfg[k]}</span>
                </div>
              })}
            </div>
          })()}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, borderTop: '1px solid #3a2a14', paddingTop: 8 }}>
            <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(uiCfg)); setCopiedUi(true); setTimeout(() => setCopiedUi(false), 1200) }} style={{ flex: 1, padding: '9px', borderRadius: 6, border: `1px solid ${GOLD_D}`, background: 'linear-gradient(180deg,#d4872e,#a85f1f)', color: '#fff', fontSize: 13 }}>{copiedUi ? '복사됨! 개발자에게 전달' : '전체 값 복사'}</button>
            <button onClick={() => setUiCfg({ ...UI_DEFAULT })} style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: '#cbb89a', fontSize: 13 }}>초기화</button>
          </div>
        </div>
      )}
      <div style={st.topBar}>
        <div data-edit="avatar" style={st.avatarWrap}><img src="/hero/misc/face.png" alt="" style={st.avatarFace} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div data-edit="nick" style={st.nickRow}>
            <span style={st.nick}>Australo_원규</span>
            <span style={st.lvBadge}>Lv.{hlv}</span>
          </div>
          <div data-edit="expbar" style={st.expOuter}>
            <div style={{ ...st.expInner, width: Math.min(100, hexp / heroExpReq(hlv) * 100) + '%' }} />
            <span className="pd-num" style={st.expText}>{Math.min(100, hexp / heroExpReq(hlv) * 100).toFixed(1)}%</span>
          </div>
        </div>
        <div data-edit="pill" style={{ ...st.currency, position: 'relative' }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
            <span data-edit="pillmeat" style={st.pillMeat}><b style={{ color: '#ffe6c0' }}>{fmt(meat)}</b></span>
            <span data-edit="pillgem" style={st.pillGem}><b style={{ color: '#cfe8ff' }}>{DEBUG ? '∞' : fmt(gem)}</b></span>
            <button data-edit="hamb" style={st.hambBtn} onClick={() => setMenuOpen(o => !o)}>☰</button>
          </div>
        </div>
      </div>
      <div style={st.statusBar}>
        <div data-edit="hppill" style={st.hpPill}>
          <img src="/ui/hp_heart.png" alt="" style={st.hpHeart} />
          <div style={st.hpTrack}><div style={{ ...st.hpFill, width: Math.min(100, heroHpUI / maxHp * 100) + '%' }} /></div>
          <span className="pd-num" style={st.hpText}>{fmt(heroHpUI)} / {fmt(maxHp)}</span>
        </div>
        <div data-edit="waveband" style={st.waveBanner} onClick={() => { if (!uiEdit) setWaveJump(String(wave)) }}>
          <div data-edit="wavetitle" style={st.waveTitle}>웨이브 {wave}</div>
          <div data-edit="diarow" style={st.diaRow}>
            {Array.from({ length: 10 }, (_, i) => (
              <img key={i} src={i < (wave - 1) % 10 + 1 ? '/ui/dia_on.png' : '/ui/dia_off.png'} alt="" style={st.dia} />
            ))}
          </div>
        </div>
        <div data-edit="bossbtn" style={st.bossWrap}>
          <button style={{ ...st.bossBtn, opacity: bossReady && phase === 'fighting' ? 1 : 0.45, animation: bossReady && phase === 'fighting' ? 'pdPulse 1.2s ease-in-out infinite' : 'none' }} disabled={!uiEdit && !(bossReady && phase === 'fighting')} onClick={() => { if (!uiEdit) challengeBoss() }}>
            <span data-edit="bosstext" style={st.bossText}>보스 도전</span>
          </button>
        </div>
      </div>

      <div ref={wrapRef} style={{ ...st.canvasWrap, height: Math.round(BASE_H * 0.42) + (view.h - BASE_H), ...(nav === '모험' ? { display: 'none' } : {}) }}>
        <canvas ref={canvasRef} />
        <button data-edit="pausebtn" style={{ ...st.pauseBtn, opacity: paused ? 1 : 0.65 }} onClick={() => { if (!uiEdit) setPaused(p => !p) }}>{paused ? '▶' : 'II'}</button>
        <button data-edit="quest" style={st.questBtn} onClick={() => { if (!uiEdit) { /* TODO: 퀘스트 */ } }}><img src="/ui/quest.png" alt="" style={st.iconImg} /></button>
        {bossUI && (
          <div style={st.bossBars}>
            <div data-edit="btimer" style={st.btOuter}>
              <div style={st.btTrack}><div style={{ ...st.btInner, width: Math.min(100, bossUI.t / BOSS_TIME * 100) + '%' }} /></div>
            </div>
            {bossUI.has && (
              <div data-edit="bosshp" style={st.bhOuter}>
                <div style={st.bhTrack}><div style={{ ...st.bhInner, width: Math.min(100, bossUI.hp / bossUI.maxHp * 100) + '%' }} /></div>
              </div>
            )}
          </div>
        )}
        <div data-edit="gain" style={{ ...st.gainWrap, ...(uiEdit ? { pointerEvents: 'auto' } : {}) }}>
          {(gains.length ? gains : (uiEdit ? [{ id: '__s', exp: 1234, meat: 567 }] : [])).map(g => (
            <div key={g.id} style={st.gainItem}>
              <span style={st.gainCell}><img data-edit="gainicon" src="/ui/ic_exp.png" alt="" style={st.gainIcon} /><span data-edit="gaintext" style={{ ...st.gainNum, color: '#6ec4ff' }}>+{g.exp}</span></span>
              <span style={st.gainCell}><img data-edit="gainicon" src="/ui/ic_meat.png" alt="" style={st.gainIcon} /><span data-edit="gaintext" style={{ ...st.gainNum, color: '#ff9d6a' }}>+{g.meat}</span></span>
            </div>
          ))}
        </div>
        {clearMsg != null && <div data-edit="clearmsg" style={{ ...st.overlayText, ...(uiEdit ? { pointerEvents: 'auto' } : {}) }}>{typeof clearMsg === 'number' ? `웨이브 ${clearMsg} 클리어!` : clearMsg}</div>}
        {phase === 'gameover' && (
          <div style={st.overlay}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>쓰러졌다...</div>
            <button style={st.retryBtn} onClick={retry}>다시 도전</button>
          </div>
        )}
      </div>

      {offData && !offOpen && nav !== '모험' && canvasBox.h > 0 && (
        <button data-edit="treasure" style={{ ...st.treasureBtn, top: canvasBox.top + canvasBox.h - 47, bottom: 'auto' }} onClick={() => { if (!uiEdit) setOffOpen(true) }}>
          <img src="/ui/treasure.png" alt="" style={st.treasureImg} />
          <span style={st.treasureDot} />
        </button>
      )}

      {nav === '영웅' && (
      <div data-edit="panel" style={st.frameBox}>
      <div data-edit="tab" style={st.tabsInner}>
        {['강화', '성장', '진화'].map(t => (
          <button key={t} style={{ ...st.tabBtn, ...(tab === t ? st.tabActive : {}) }} onClick={() => setTab(t)}>
            {t}{t === '성장' && sp > 0 && <span style={st.spDot}>{sp}</span>}
          </button>
        ))}
      </div>

      <div className="pd-fade" ref={updFade} onScroll={e => updFade(e.currentTarget)} style={st.panelInner}>
        {tab === '강화' && STAT_KEYS.map(k => {
          const d = STAT_LIST[k]
          const c = buyCost(k, lv[k])
          const ok = DEBUG || meat >= c
          return (
            <div key={k} data-edit="row" style={st.row}>
              <div data-edit="icon" style={st.skillIcon}><img src={`/icon/${k}.png`} alt="" style={st.statIconImg} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div data-edit="name" style={st.rowName}>{d.name} <span style={st.rowLv}>Lv.{lv[k]}</span></div>
                <div data-edit="val" style={st.rowVal}>{statText(k, lv[k] + skill[k])} <span style={{ color: '#7cb35c' }}>→ {statText(k, lv[k] + 1 + skill[k])}</span></div>
              </div>
              <input data-edit="input" style={st.dbgInput} type="number" inputMode="numeric" value={lv[k]} onChange={e => setStatLv(k, e.target.value)} />
              <button data-edit="cost" style={{ ...st.costBtn, opacity: ok ? 1 : 0.4 }} onPointerDown={() => holdStart(() => buyStat(k))} onPointerUp={holdEnd} onPointerLeave={holdEnd} onPointerCancel={holdEnd} onContextMenu={e => e.preventDefault()}>{DEBUG ? '+1' : fmt(c)}</button>
            </div>
          )
        })}
        {tab === '진화' && (
          <div data-edit="row" style={st.row}>
            <img
              src={EVOS[evo].mode === 'quad' ? '/hero/quad/quad_1.png' : EVOS[evo].mode === 'erectus' ? '/hero/erectus_walk/ewalk_1.png' : EVOS[evo].mode === 'neander' ? '/hero/neander_walk/nwalk_1.png' : EVOS[evo].mode === 'sapiens' ? '/hero/sapiens_walk/pwalk_1.png' : EVOS[evo].mode === 'human' ? '/hero/human_walk/hmwalk_1.png' : '/hero/misc/hero_idle.png'}
              alt=""
              data-edit={`evoimg${evo}`}
              style={{ height: `var(--pd-evoimg${evo})`, transform: `translate(var(--pd-evoimg${evo}-x), var(--pd-evoimg${evo}-y))` }}
            />
            <div style={{ flex: 1, marginLeft: 12 }}>
              <div data-edit="name" style={st.rowName}>{EVOS[evo].name}</div>
              <div data-edit="val" style={st.rowVal}>
                {EVOS[evo].mode === 'quad' ? '4족 질주 · 주먹질' : EVOS[evo].mode === 'erectus' ? '몽둥이 · 내려치기/올려치기' : EVOS[evo].mode === 'neander' ? '돌도끼 · 내려찍기' : EVOS[evo].mode === 'sapiens' ? '단검 · 회전 베기' : EVOS[evo].mode === 'human' ? '장검 · 검격' : '직립 보행 · 돌 던지기'} · 공격력 ×{EVOS[evo].mult}
                {evo < EVOS.length - 1 && <span style={{ color: '#7cb35c' }}> → ×{EVOS[evo + 1].mult}</span>}
              </div>
            </div>
            {DEBUG && <button style={st.dbgBtn} onClick={() => setEvo(v => Math.max(0, v - 1))}>−</button>}
            {evo < EVOS.length - 1
              ? <button data-edit="cost" style={{ ...st.costBtn, opacity: DEBUG || meat >= EVOS[evo + 1].cost ? 1 : 0.4 }} onClick={evolve}>{DEBUG ? '+1' : fmt(EVOS[evo + 1].cost)}</button>
              : <div style={{ fontSize: 12, opacity: 0.6 }}>최종 단계</div>}
          </div>
        )}
        {tab === '성장' && (
          <>
            <div data-edit="spbarC" style={{ ...st.spBar, transform: 'translate(var(--pd-spbarC-x), var(--pd-spbarC-y))' }}>스킬포인트 <b style={{ color: '#7ce0ff', fontSize: 'calc(var(--pd-spbarfz) + 2px)' }}>{sp}</b> <span style={{ opacity: 0.6, fontSize: 11 }}>· 레벨업 시 획득</span></div>
            {STAT_KEYS.map(k => {
              const d = STAT_LIST[k]
              const ok = DEBUG || sp > 0
              return (
                <div key={k} data-edit="row" style={st.row}>
                  <div data-edit="icon" style={st.skillIcon}><img src={`/icon/${k}.png`} alt="" style={st.statIconImg} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div data-edit="name" style={st.rowName}>{d.name} <span style={st.rowLv}>Lv.{skill[k]}</span></div>
                    <div data-edit="val" style={st.rowVal}>{statText(k, lv[k] + skill[k])} <span style={{ color: '#7cb35c' }}>→ {statText(k, lv[k] + skill[k] + 1)}</span></div>
                  </div>
                  <input data-edit="input" style={st.dbgInput} type="number" inputMode="numeric" value={skill[k]} onChange={e => setSkillLv(k, e.target.value)} />
                  <button data-edit="sp" style={{ ...st.spBtn, opacity: ok ? 1 : 0.4 }} onPointerDown={() => holdStart(() => upSkill(k))} onPointerUp={holdEnd} onPointerLeave={holdEnd} onPointerCancel={holdEnd} onContextMenu={e => e.preventDefault()}>+1</button>
                </div>
              )
            })}
          </>
        )}
      </div>
      </div>
      )}

      {nav === '스킬' && (
        <div data-edit="panel" style={st.panel}>
          <div style={st.skillFixed}>
          <div data-edit="spbarA" style={{ ...st.spBar, transform: 'translate(var(--pd-spbarA-x), var(--pd-spbarA-y))' }}>장착 슬롯 · 올린 스킬만 자동 발동</div>
          <div style={st.slotRow}>
            {equipped.map((si, slot) => (
              <button key={slot} data-edit="slot" style={st.slot} onClick={() => si != null && unequipSkill(slot)}>
                {si != null ? (skillIconSrc(SKILLS[si].id) ? <img src={skillIconSrc(SKILLS[si].id)} alt="" data-edit="slicon" style={st.slotIconImg} /> : <span style={{ fontSize: 'var(--pd-slotfz)' }}>{SKILLS[si].icon}</span>) : <span style={st.slotEmpty}>+</span>}
              </button>
            ))}
          </div>
          <div data-edit="spbarB" style={{ ...st.spBar, marginTop: 4, transform: 'translate(var(--pd-spbarB-x), var(--pd-spbarB-y))' }}>보유 스킬 · 탭하여 장착 <span style={{ opacity: 0.6, fontSize: 11 }}>· {EVOS[evo].name} 전용</span></div>
          </div>
          <div className="pd-fade" ref={updFade} onScroll={e => updFade(e.currentTarget)} style={st.skillScroll}>
          {SKILLS.map((s, i) => {
            if (s.stage !== evo) return null
            const cd = skillCdUI[i] || 0
            const ready = cd <= 0
            const eqSlot = equipped.indexOf(i)
            const isEq = eqSlot >= 0
            return (
              <div key={s.key} style={{ ...st.row, opacity: isEq ? 0.55 : 1 }} onClick={() => isEq ? unequipSkill(eqSlot) : equipSkill(i)}>
                <div style={{ ...st.skillIcon, position: 'relative', overflow: 'hidden' }}>
                  {skillIconSrc(s.id) ? <img src={skillIconSrc(s.id)} alt="" data-edit="skicon" style={st.skillIconImg} /> : s.icon}
                  {isEq && !ready && <div style={st.cdOverlay}>{cd.toFixed(1)}</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div data-edit="name" style={st.rowName}>{s.name} {isEq && <span style={{ ...st.rowLv, color: '#7ce0ff' }}>장착됨</span>}</div>
                  <div data-edit="val" style={st.rowVal}>{s.desc} · 데미지 ×{s.dmgMult}</div>
                </div>
                <span style={{ fontSize: 11, opacity: 0.7 }}>쿨</span>
                <input
                  data-edit="input" style={st.dbgInput} type="number" inputMode="decimal" value={cdConf[i]}
                  onClick={e => e.stopPropagation()}
                  onChange={e => { const v = Math.max(0.1, Number(e.target.value) || 0.1); setCdConf(c => { const n = [...c]; n[i] = v; return n }) }}
                />
                <button data-edit="sp" style={{ ...st.spBtn, background: isEq ? '#6b4f35' : '#2f8fb0' }}>{isEq ? '해제' : '장착'}</button>
              </div>
            )
          })}
          </div>
        </div>
      )}

      {nav === '장비' && (
        <div data-edit="panel" style={st.frameBox}>
          <div data-edit="tab" style={st.tabsInner}>
            {['무기', '방어구', '유물'].map(t => (
              <button key={t} style={{ ...st.tabBtn, ...(equipTab === t ? st.tabActive : {}) }} onClick={() => setEquipTab(t)}>{t}</button>
            ))}
          </div>
          <div className="pd-fade" ref={updFade} onScroll={e => updFade(e.currentTarget)} style={st.panelInner}>
          {EQUIP_CATS.includes(equipTab) && (
            <div style={st.equipGrid}>
              {Array.from({ length: EQUIP_MAX }, (_, idx) => {
                const i = idx + 1
                const cnt = inv[invKey(equipTab, i)] || 0
                const col = gradeColorOf(i)
                const canFuse = cnt >= 5 && i < EQUIP_MAX
                return (
                  <div key={i} data-edit="equip" style={{ ...st.equipCell, borderColor: col + '99' }} onClick={() => { if (!uiEdit) { setDetailItem({ cat: equipTab, i }); setDetailTab('강화'); setFuseQty(0) } }}>
                    <span data-edit="eqtier" style={{ ...st.equipTier, color: col }}>{tierOf(i)}등급</span>
                    <img src={equipImg(equipTab, i)} alt="" data-edit="eqimg" style={st.equipImg} />
                    <span style={{ ...st.eqCount, color: canFuse ? '#ffd24a' : '#d8ccb3' }}>{cnt}/5</span>
                    {canFuse && <span style={st.fuseBadge}>융합</span>}
                  </div>
                )
              })}
            </div>
          )}
          </div>
          {EQUIP_CATS.includes(equipTab) && (
            <div style={st.equipBottomBar}>
              <div data-edit="matchip" style={st.matChip}><img src={MAT_IMG(4)} alt="" style={st.matChipIc} /><span style={{ fontFamily: "'Do Hyeon',sans-serif" }}>{fmt(mats[4])}</span></div>
              <button data-edit="fuseall" style={st.fuseAllBtn} onClick={() => { if (!uiEdit) fuseAll(equipTab) }}>일괄 융합</button>
            </div>
          )}
        </div>
      )}

      {nav === '상점' && (
        <div data-edit="panel" style={st.frameBox}>
          <div className="pd-fade" ref={updFade} onScroll={e => updFade(e.currentTarget)} style={st.panelInner}>
            {Object.keys(GACHA_CATS).map((cat, ci) => (
              <div key={cat} data-edit="shoprow" style={{ ...st.row, minHeight: 'var(--pd-shoprowmin)', transform: 'translate(var(--pd-shoprow-x), var(--pd-shoprow-y))' }}>
                <img src={equipImg(cat, EQUIP_MAX)} alt="" data-edit={`shopic${ci}`} style={{ height: `var(--pd-shopic${ci})`, objectFit: 'contain', transform: `translate(var(--pd-shopic${ci}-x), var(--pd-shopic${ci}-y))` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div data-edit="shoptitle" style={{ fontWeight: 700, fontSize: 'var(--pd-shoptfz)', transform: 'translate(var(--pd-shopt-x), var(--pd-shopt-y))' }}>{cat} 소환</div>
                  <div data-edit="shopsub" style={{ fontSize: 'var(--pd-shopsubfz)', opacity: 0.6, transform: 'translate(var(--pd-shopsub-x), var(--pd-shopsub-y))' }}>상위 등급일수록 희귀 · 5개 융합</div>
                </div>
                <button data-edit="shopbtn" style={st.shopBtn} onClick={() => { if (!uiEdit) pullGacha(cat, 1) }}><span data-edit="shopbtext" style={st.shopBtnText}>1회<br /><span style={st.shopCost}><img src="/ui/gem.png" alt="" data-edit="shopgem" style={st.shopGemIc} />10</span></span></button>
                <button data-edit="shopbtn" style={st.shopBtn} onClick={() => { if (!uiEdit) pullGacha(cat, 10) }}><span data-edit="shopbtext" style={st.shopBtnText}>10회<br /><span style={st.shopCost}><img src="/ui/gem.png" alt="" data-edit="shopgem" style={st.shopGemIc} />100</span></span></button>
              </div>
            ))}
          </div>
        </div>
      )}
      {nav === '동료' && (
        <div data-edit="panel" style={st.frameBox}>
          <div style={st.allySubRow}>
            {['동료', '전직'].map(t => (
              <button key={t} data-edit="allytab" style={{ ...st.allySubTab, ...(allySub === t ? st.allySubOn : {}) }} onClick={() => setAllySub(t)}>{t}</button>
            ))}
            <div style={st.allyMats}>
              {[0, 1, 2, 3].map(mi => (
                <div key={mi} data-edit="allymat" style={st.allyChip}><img src={MAT_IMG(mi)} alt="" style={st.allyChipIc} /><span style={{ fontFamily: "'Do Hyeon',sans-serif" }}>{fmt(mats[mi])}</span></div>
              ))}
            </div>
          </div>
          {allySub === '동료' ? (
            <div style={st.allyGrid}>
              {['hunter', 'shaman', 'healer', 'giant'].map((ak, i) => {
                const a = ak ? ALLY_DEFS[ak] : null
                const on = ak && alliesOn[ak]
                return (
                  <div key={i} data-edit="allyslot" style={{ ...st.allySlot, opacity: a ? 1 : 0.45, borderColor: on ? GOLD : '#5a4028' }}>
                    {a ? (
                      <>
                        <div data-edit="allyname" style={st.allyName}>{a.name}</div>
                        <img data-edit="allyimg" src={a.walk[0]} alt="" style={st.allyImg} />
                        <button data-edit="allybtn" style={{ ...st.allyBtn, ...(on ? st.allyBtnOn : {}) }} onClick={() => setAlliesOn(v => ({ ...v, [ak]: !v[ak] }))}>{on ? '해제' : '장착'}</button>
                      </>
                    ) : (
                      <span style={{ opacity: 0.5, fontSize: 18 }}>?</span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 30, opacity: 0.55 }}>전직 — 준비 중</div>
          )}
        </div>
      )}
      {nav === '모험' && (
        <div style={st.advWrap}>
          <div style={st.advViewport}>
            <div ref={advTrackRef} style={{ ...st.advTrack, transform: `translateX(${advOffset}px)`, transition: advLoaded ? st.advTrack.transition : 'none', opacity: advLoaded ? 1 : 0 }}>
              <img src="/adventure/worldmap.jpg" alt="" style={st.advMap} draggable={false} onLoad={() => { recalcAdv(); requestAnimationFrame(() => setAdvLoaded(true)) }} />
              {CONTINENTS.map((ct, i) => (
                <button key={ct.key} data-edit={`advbtn${i}`} style={{ ...st.advContBtn, left: `${ct.x}%`, top: `${ct.y}%`, transform: `translate(calc(-50% + var(--pd-advbtn${i}-x)), calc(-50% + var(--pd-advbtn${i}-y)))` }} onClick={() => { if (!uiEdit) setAdvSel(ct) }}>
                  <span data-edit={`advtxt${i}`} style={{ ...st.advContName, transform: `translate(var(--pd-advtxt${i}-x), var(--pd-advtxt${i}-y))` }}>{ct.name}</span>
                </button>
              ))}
            </div>
            {mapSeg > 0 && (
              <button style={{ ...st.advArrow, left: 8 }} onClick={() => setMapSeg(s => Math.max(0, s - 1))}>‹</button>
            )}
            {mapSeg < 2 && (
              <button style={{ ...st.advArrow, right: 8 }} onClick={() => setMapSeg(s => Math.min(2, s + 1))}>›</button>
            )}
            <div style={st.advDots}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ ...st.advDot, ...(mapSeg === i ? st.advDotOn : {}) }} onClick={() => setMapSeg(i)} />
              ))}
            </div>
          </div>
        </div>
      )}
      {nav === '모험' && view.h > BASE_H && <div style={{ height: view.h - BASE_H, flexShrink: 0, background: '#1a1109' }} />}
      {nav !== '영웅' && nav !== '스킬' && nav !== '장비' && nav !== '상점' && nav !== '동료' && nav !== '모험' && (
        <div style={st.comingSoon}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{nav}</div>
          <div style={{ fontSize: 13, opacity: 0.6, marginTop: 6 }}>준비 중입니다</div>
        </div>
      )}

      {offData && offOpen && (
        <div style={st.offOverlay}>
          <div style={st.offWin}>
            <button style={st.offClose} onClick={() => setOffOpen(false)}>✕</button>
            <div data-edit="offtitle" style={st.offTitle}>자동 사냥 오프라인 보상</div>
            <div data-edit="offinfo" style={st.offInfo}>{offData.wave}wave · {Math.floor(offData.sec / 3600)}시간 {Math.floor(offData.sec % 3600 / 60)}분 · {fmt(offData.kills)}마리</div>
            <div style={st.offItems}>
              {[['/ui/ic_meat.png', offData.meat, offData.meatRate, '#ff9d6a'],
                ['/ui/ic_exp.png', offData.exp, offData.expRate, '#6ec4ff'],
                ['/ui/gem.png', offData.gem, offData.gemRate, '#cfe8ff']].map(([ic, v, rate, col], i) => (
                <div key={i} data-edit="offitem" style={st.offItem}>
                  <img data-edit="offitemic" src={ic} alt="" style={st.offItemIc} />
                  <span data-edit="offitemval" style={{ ...st.offItemVal, color: col }}>+{fmt(v)}</span>
                  <span data-edit="offitemrate" style={st.offItemRate}>{fmt(rate)}/분</span>
                </div>
              ))}
            </div>
            <div style={st.offBtns}>
              <button data-edit="offclaim" style={st.offBtnClaim} onClick={() => { if (uiEdit) return; if (offReward) { setMeat(m => m + offReward.meat); setHexp(x => x + offReward.exp); if (offReward.gem) setGem(g => g + offReward.gem) } setOffReward(null); setOffOpen(false) }}>
                <span style={st.offBtnClaimText}>받기</span>
              </button>
              <button data-edit="offbtn" style={st.offBtnAd} onClick={() => { if (!uiEdit) { /* TODO: 광고 시청 → 오프라인 보상 +50% */ } }}>
                <span style={st.offBtnAdText}>추가 보상<br />(광고)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div data-edit="nav" style={st.bottomNav}>
        {[['영웅', 'nav_hero'], ['스킬', 'nav_skill'], ['장비', 'nav_equip'], ['동료', 'nav_ally'], ['모험', 'nav_adventure'], ['상점', 'nav_shop']].map(([n, ic]) => (
          <button key={n} style={{ ...st.navBtn, ...(nav === n ? st.navActive : {}) }} onClick={() => setNav(n)}>
            <img src={`/icon/${ic}.png`} alt="" style={st.navIconImg} />
            <div style={{ fontSize: 'var(--pd-navfz)' }}>{n}</div>
          </button>
        ))}
      </div>
    </div>
    </div>
  )
}

const GOLD = '#e8b962'
const GOLD_D = '#a9762f'
const PANEL_BORDER = '1px solid #6b4a24'
// ── UI 크기 조정값 (앱 내 편집기로 조정 → 복사) ──
const UI_DEFAULT = {
  panelbwV: 2, panelbwH: 4, rowbwV: 2, rowbwH: 19, rowmin: 38, rowgap: 7, icon: 27, name: 12,
  lv: 11, val: 12, costw: 35, costh: 28, costfz: 14, inputw: 43, inputfz: 12, spw: 35,
  sph: 4, spfz: 13, tabpt: 7, tabpb: 10, tabfz: 13, navicon: 26, navpt: 10, navpb: 8,
  avatar: 40, slotmax: 50, equipcols: 5, equipgap: 14, slotfz: 23, catfz: 13, spbarfz: 11,
  equipimg: 60, equiptier: 10, equipcell: 54, nickfz: 15, lvbadgefz: 12, exph: 11, pillfz: 72, wavefz: 11,
  evoimg0: 56, evoimg1: 56, evoimg2: 56, evoimg3: 56, evoimg4: 56, evoimg5: 56,
  evoimg0X: 0, evoimg0Y: 1, evoimg1X: 0, evoimg1Y: 1, evoimg2X: 0, evoimg2Y: 1,
  evoimg3X: 0, evoimg3Y: 1, evoimg4X: 0, evoimg4Y: 1, evoimg5X: 0, evoimg5Y: 1,
  gachacell: 62, gachafz: 10, gtierfz: 10, gachaimg: 74, gainfz: 10,
  shoprowmin: 46, shopic: 43, shopic0: 43, shopic1: 57, shopic2: 43, shoptfz: 14, shopsubfz: 11, shopbw: 4, shopbh: 40, shopbbv: 0, shopbbh: 21, shopbfz: 11, shopgem: 12,
  gainic: 14, gainpv: 0, gainph: 6,
  gbtnfz: 13, gbtnpw: 16, gbtnph: 10,
  pbsz: 30, wjfz: 13, caslot: 81, caimg: 50, canamefz: 12, catabfz: 11, cabtnfz: 10, btw: 169, bth: 28, bhpw: 172, bhph: 30, pmw: 70, pmh: 23, pmfz: 11, pgw: 70, pgh: 23, pgfz: 15, hambsz: 26, menufz: 13, hph: 10, hpfz: 10, bossfz: 12, bossh: 39, wavebh: 44, clearfz: 24, navfz: 10, diasz: 10,
  // 위치 이동(px): 요소별 X/Y
  avatarX: 0, avatarY: 0, tabX: -1, tabY: 0, navX: 0, navY: 0, costX: 0, costY: 0, pillX: -1, pillY: 2, iconX: -3, iconY: 1,
  panelX: 0, panelY: 0, rowX: 0, rowY: -7, nameX: -3, nameY: 1, valX: -2, valY: 0, inputX: 0, inputY: 0,
  spX: 0, spY: 0, slotX: 23, slotY: 8, catX: 21, catY: -5, spbarX: 20, spbarY: 1, equipX: -4, equipY: -3, spbarAX: 18, spbarAY: 12,
  spbarBX: 18, spbarBY: 0, spbarCX: 19, spbarCY: -8, nickX: 0, nickY: 0, expX: 0, expY: 0, gainX: 0, gainY: 0,
  hpX: -1, hpY: 1, bossX: 2, bossY: -6, clearX: 0, clearY: 0, waveX: -1, waveY: 0, gachaX: 0, gachaY: 0, eqtierX: -1, eqtierY: 1, eqimgX: 0, eqimgY: 0,
  shoprowX: 0, shoprowY: 0, shopicX: 0, shopicY: 0, shopic0X: 0, shopic0Y: 0, shopic1X: 0, shopic1Y: 0, shopic2X: 0, shopic2Y: 0, shoptX: 0, shoptY: 0, shopsubX: 0, shopsubY: 0,
  shopbX: -2, shopbY: 0, shopbtX: 0, shopbtY: 0, shopgemX: 0, shopgemY: 0, gainicX: 0, gainicY: 0, gaintX: 0, gaintY: 0,
  gbtnX: 0, gbtnY: 0, gbtntX: 0, gbtntY: 0, ggradeX: 0, ggradeY: 0, gtierX: 0, gtierY: 0, gimgX: 0, gimgY: 0, pmX: 0, pmY: 0, pgX: 0, pgY: 0, hambX: 1, hambY: 0, menuX: 0, menuY: 0, btX: 0, btY: 0, bhpX: 0, bhpY: 0, pbX: 0, pbY: 0, wjX: 0, wjY: 0, caslotX: 3, caslotY: 16, caimgX: 0, caimgY: 0, canameX: 0, canameY: 0, catabX: 15, catabY: 14, cabtnX: 0, cabtnY: 0, wtitleX: 0, wtitleY: 1, diaX: 0, diaY: 0, btextX: 0, btextY: 7,
  // 오프라인 보상: 보물상자 + 창(헤더/항목/버튼)
  trsz: 40, offw: 322, offtfz: 14, offnfz: 13, offiw: 56, offih: 50, offgap: 9, offic: 24, offifz: 11, offrfz: 11,
  offbtw: 135, offbth: 51, offbfz: 14, offclw: 100, offclh: 50, offcfz: 15,
  trX: -3, trY: 9, offtX: -1, offtY: 66, offnX: 1, offnY: 76, offitX: -29, offitY: 80, offitiX: 0, offitiY: 6, offvX: 0, offvY: 2, offrX: 0, offrY: -3, offbtX: 0, offbtY: -15, offclX: 2, offclY: -15,
  fuseallw: 94, fuseallh: 26, fuseallfz: 15, fuseallX: -36, fuseallY: -10,
  matchipic: 17, matchipfz: 13, allychipic: 15, allychipfz: 10,
  dtabh: 40, dtabfz: 15, dgradefz: 14, dtitlefz: 17, darrowfz: 26, diconsz: 92, dtierfz: 12, dstatfz: 14, denhh: 48, denhfz: 14, denhic: 22, dequiph: 48, dequipfz: 15, dfuseh: 50, dfusefz: 17, dstepsz: 46, dstepfz: 20,
  skicon: 120, skiconX: 0, skiconY: 0, slicon: 100, sliconX: 0, sliconY: 0,
  advbw: 40, advbh: 20, advbfz: 10,
  advww: 301, advwh: 400,
  advmonkfz: 16, advmonvfz: 15, advregkfz: 16, advregvfz: 15, advrewkfz: 17, advrewvfz: 14, advrewic: 18,
  advibw: 120, advibh: 106, adviw: 100, advih: 88,
  advmbw: 150, advmbh: 54, advrbw: 150, advrbh: 54, advwbw: 250, advwbh: 44,
  advsw: 249, advsh: 71, advsfz: 17, advbarw: 205, advbarh: 19,
  advew: 93, adveh: 34, advefz: 11, advcw: 93, advch: 35, advcfz: 11,
  advwinX: 0, advwinY: 0, adviconX: 0, adviconY: 0, adviconbX: 0, adviconbY: 0,
  advmonbX: 0, advmonbY: 0, advregbX: 0, advregbY: 0, advrewbX: 0, advrewbY: 0,
  advsignX: 0, advsignY: 0, advsigntX: 0, advsigntY: -7, advbarX: 0, advbarY: -9,
  advmonkX: -4, advmonkY: 2, advmonvX: -4, advmonvY: 2, advregkX: -4, advregkY: 4, advregvX: -4, advregvY: 4,
  advrewkX: -28, advrewkY: 28, advrewdX: 0, advrewdY: 28, advrewmX: 0, advrewmY: 28,
  adventerX: 0, adventerY: 4, advcloseX: 0, advcloseY: 4, advtxt0X: 47, advtxt0Y: 1, advtxt1X: 39, advtxt1Y: 1, advtxt2X: 43, advtxt2Y: 2, advtxt3X: 39, advtxt3Y: 1, advtxt4X: 50, advtxt4Y: 1, advtxt5X: 51, advtxt5Y: 2, advtxt6X: 50, advtxt6Y: 2, advtxt7X: 47, advtxt7Y: 2, advbtn0X: 172, advbtn0Y: -13, advbtn1X: 251, advbtn1Y: 0, advbtn2X: 326, advbtn2Y: -5, advbtn3X: 200, advbtn3Y: 27, advbtn4X: 66, advbtn4Y: 11, advbtn5X: 121, advbtn5Y: 4, advbtn6X: 305, advbtn6Y: 36, advbtn7X: 188, advbtn7Y: 0,
  mailsz: 26, questsz: 40, mailboxX: 0, mailboxY: 0, questX: 6, questY: -8,
  matchipX: 23, matchipY: -14, allymatX: -19, allymatY: 14, dtabX: 0, dtabY: 0, dtitleX: 0, dtitleY: 0, darrowX: 0, darrowY: 0, diconX: 0, diconY: 0, dstatX: 0, dstatY: 0, denhX: 0, denhY: 0, dequipX: 0, dequipY: 0, dfusebtnX: 0, dfusebtnY: 0, dstepX: 0, dstepY: 0,
}
const EDIT_GROUPS = {
  avatar: { label: '아바타', size: ['avatar'], pos: 'avatar' },
  pill: { label: '자원 표시', size: ['pillfz', 'wavefz'], pos: 'pill' },
  panel: { label: '패널 틀', size: ['panelbwV', 'panelbwH'], pos: 'panel' },
  tab: { label: '탭', size: ['tabpt', 'tabpb', 'tabfz'], pos: 'tab' },
  row: { label: '항목 틀', size: ['rowbwV', 'rowbwH', 'rowmin', 'rowgap'], pos: 'row' },
  icon: { label: '아이콘', size: ['icon'], pos: 'icon' },
  name: { label: '이름 글자', size: ['name', 'lv'], pos: 'name' },
  val: { label: '수치 글자', size: ['val'], pos: 'val' },
  cost: { label: '+1 버튼', size: ['costw', 'costh', 'costfz'], pos: 'cost' },
  input: { label: '숫자칸', size: ['inputw', 'inputfz'], pos: 'input' },
  sp: { label: '장착 버튼', size: ['spw', 'sph', 'spfz'], pos: 'sp' },
  nav: { label: '하단 네비', size: ['navicon', 'navfz', 'navpt', 'navpb'], pos: 'nav' },
  slot: { label: '스킬 슬롯', size: ['slotmax', 'slotfz'], pos: 'slot' },
  cat: { label: '분류 글자', size: ['catfz'], pos: 'cat' },
  spbarA: { label: '장착슬롯 안내', size: ['spbarfz'], pos: 'spbarA' },
  spbarB: { label: '보유스킬 안내', size: ['spbarfz'], pos: 'spbarB' },
  spbarC: { label: '스킬포인트 안내', size: ['spbarfz'], pos: 'spbarC' },
  equip: { label: '장비칸', size: ['equipcols', 'equipgap', 'equipcell'], pos: 'equip' },
  eqimg: { label: '장비 아이콘', size: ['equipimg'], pos: 'eqimg' },
  eqtier: { label: '장비 등급 글자', size: ['equiptier'], pos: 'eqtier' },
  nick: { label: '닉네임/레벨', size: ['nickfz', 'lvbadgefz'], pos: 'nick' },
  expbar: { label: 'EXP바', size: ['exph'], pos: 'exp' },
  gain: { label: '획득 팝업(판)', size: ['gainpv', 'gainph'], pos: 'gain' },
  gaintext: { label: '획득 글자', size: ['gainfz'], pos: 'gaint' },
  gainicon: { label: '획득 아이콘', size: ['gainic'], pos: 'gainic' },
  hppill: { label: 'HP 알약', size: ['hph', 'hpfz'], pos: 'hp' },
  waveband: { label: '웨이브 현판(판)', size: ['wavebh'], pos: 'wave' },
  wavetitle: { label: '현판 글자', size: ['wavefz'], pos: 'wtitle' },
  diarow: { label: '다이아 줄', size: ['diasz'], pos: 'dia' },
  bossbtn: { label: '보스 버튼(판)', size: ['bossh'], pos: 'boss' },
  gacha: { label: '소환 결과 셀', size: ['gachacell'], pos: 'gacha' },
  ggrade: { label: '결과 등급 글자', size: ['gachafz'], pos: 'ggrade' },
  gtier: { label: '결과 티어 글자', size: ['gtierfz'], pos: 'gtier' },
  gimg: { label: '결과 아이콘', size: ['gachaimg'], pos: 'gimg' },
  gbtn: { label: '결과 버튼(판)', size: ['gbtnpw', 'gbtnph'], pos: 'gbtn' },
  gbtntext: { label: '결과 버튼 글자', size: ['gbtnfz'], pos: 'gbtnt' },
  shoprow: { label: '소환 박스', size: ['shoprowmin'], pos: 'shoprow' },
  shopic0: { label: '무기 소환 아이콘', size: ['shopic0'], pos: 'shopic0' },
  shopic1: { label: '방어구 소환 아이콘', size: ['shopic1'], pos: 'shopic1' },
  shopic2: { label: '유물 소환 아이콘', size: ['shopic2'], pos: 'shopic2' },
  shoptitle: { label: '소환 제목 글자', size: ['shoptfz'], pos: 'shopt' },
  shopsub: { label: '소환 부제 글자', size: ['shopsubfz'], pos: 'shopsub' },
  shopbtn: { label: '소환 버튼(판)', size: ['shopbw', 'shopbh', 'shopbbv', 'shopbbh'], pos: 'shopb' },
  shopbtext: { label: '소환 버튼 글자', size: ['shopbfz'], pos: 'shopbt' },
  shopgem: { label: '다이아 아이콘', size: ['shopgem'], pos: 'shopgem' },
  pillmeat: { label: '고기 알약', size: ['pmw', 'pmh', 'pmfz'], pos: 'pm' },
  pillgem: { label: '다이아 알약', size: ['pgw', 'pgh', 'pgfz'], pos: 'pg' },
  hamb: { label: '메뉴 버튼', size: ['hambsz'], pos: 'hamb' },
  skicon: { label: '스킬 아이콘 그림', size: ['skicon'], pos: 'skicon' },
  advbtn0: { label: '아프리카 버튼', size: ['advbw', 'advbh', 'advbfz'], pos: 'advbtn0' },
  advbtn1: { label: '중동 버튼', size: ['advbw', 'advbh', 'advbfz'], pos: 'advbtn1' },
  advbtn2: { label: '아시아 버튼', size: ['advbw', 'advbh', 'advbfz'], pos: 'advbtn2' },
  advbtn3: { label: '유럽 버튼', size: ['advbw', 'advbh', 'advbfz'], pos: 'advbtn3' },
  advbtn4: { label: '북아메리카 버튼', size: ['advbw', 'advbh', 'advbfz'], pos: 'advbtn4' },
  advbtn5: { label: '남아메리카 버튼', size: ['advbw', 'advbh', 'advbfz'], pos: 'advbtn5' },
  advbtn6: { label: '오세아니아 버튼', size: ['advbw', 'advbh', 'advbfz'], pos: 'advbtn6' },
  advbtn7: { label: '그린란드 버튼', size: ['advbw', 'advbh', 'advbfz'], pos: 'advbtn7' },
  advtxt0: { label: '아프리카 글자', size: ['advbfz'], pos: 'advtxt0' },
  advtxt1: { label: '중동 글자', size: ['advbfz'], pos: 'advtxt1' },
  advtxt2: { label: '아시아 글자', size: ['advbfz'], pos: 'advtxt2' },
  advtxt3: { label: '유럽 글자', size: ['advbfz'], pos: 'advtxt3' },
  advtxt4: { label: '북아메리카 글자', size: ['advbfz'], pos: 'advtxt4' },
  advtxt5: { label: '남아메리카 글자', size: ['advbfz'], pos: 'advtxt5' },
  advtxt6: { label: '오세아니아 글자', size: ['advbfz'], pos: 'advtxt6' },
  advtxt7: { label: '그린란드 글자', size: ['advbfz'], pos: 'advtxt7' },
  advwin: { label: '진입창 틀', size: ['advww', 'advwh'], pos: 'advwin' },
  advmonb: { label: '몬스터정보 틀', size: ['advmbw', 'advmbh'], pos: 'advmonb' },
  advregb: { label: '지역정보 틀', size: ['advrbw', 'advrbh'], pos: 'advregb' },
  advrewb: { label: '탐험보상 틀', size: ['advwbw', 'advwbh'], pos: 'advrewb' },
  adviconb: { label: '보스 아이콘 틀', size: ['advibw', 'advibh'], pos: 'adviconb' },
  advicon: { label: '보스 그림', size: ['adviw', 'advih'], pos: 'advicon' },
  advsign: { label: '단계 표지판', size: ['advsw', 'advsh'], pos: 'advsign' },
  advsignt: { label: '표지판 글자', size: ['advsfz'], pos: 'advsignt' },
  advbar: { label: '단계 진행바', size: ['advbarw', 'advbarh'], pos: 'advbar' },
  advmonk: { label: '몬스터정보 라벨', size: ['advmonkfz'], pos: 'advmonk' },
  advmonv: { label: '몬스터 이름', size: ['advmonvfz'], pos: 'advmonv' },
  advregk: { label: '지역정보 라벨', size: ['advregkfz'], pos: 'advregk' },
  advregv: { label: '지역 이름', size: ['advregvfz'], pos: 'advregv' },
  advrewk: { label: '탐험보상 라벨', size: ['advrewkfz'], pos: 'advrewk' },
  advrewd: { label: '보상 다이아', size: ['advrewvfz', 'advrewic'], pos: 'advrewd' },
  advrewm: { label: '보상 큐브조각', size: ['advrewvfz', 'advrewic'], pos: 'advrewm' },
  adventer: { label: '진입 버튼', size: ['advew', 'adveh', 'advefz'], pos: 'adventer' },
  advclose: { label: '진입창 닫기', size: ['advcw', 'advch', 'advcfz'], pos: 'advclose' },
  slicon: { label: '슬롯 아이콘 그림', size: ['slicon'], pos: 'slicon' },
  mailbox: { label: '우편함', size: ['mailsz'], pos: 'mailbox' },
  quest: { label: '퀘스트 아이콘', size: ['questsz'], pos: 'quest' },
  pausebtn: { label: '일시정지 버튼', size: ['pbsz'], pos: 'pb' },
  allytab: { label: '동료 서브탭', size: ['catabfz'], pos: 'catab' },
  allyslot: { label: '동료 칸', size: ['caslot'], pos: 'caslot' },
  allyimg: { label: '동료 캐릭터', size: ['caimg'], pos: 'caimg' },
  allyname: { label: '동료 이름', size: ['canamefz'], pos: 'caname' },
  allybtn: { label: '장착 버튼', size: ['cabtnfz'], pos: 'cabtn' },
  wjump: { label: '웨이브 이동 창', size: ['wjfz'], pos: 'wj' },
  btimer: { label: '보스 타이머 바', size: ['btw', 'bth'], pos: 'bt' },
  bosshp: { label: '보스 체력 바', size: ['bhpw', 'bhph'], pos: 'bhp' },
  menu: { label: '메뉴 패널', size: ['menufz'], pos: 'menu' },
  bosstext: { label: '보스 버튼 글자', size: ['bossfz'], pos: 'btext' },
  clearmsg: { label: '클리어 문구', size: ['clearfz'], pos: 'clear' },
  treasure: { label: '보물상자', size: ['trsz'], pos: 'tr' },
  offframe: { label: '오프 창틀', size: ['offw'], pos: null },
  offtitle: { label: '오프 제목', size: ['offtfz'], pos: 'offt' },
  offinfo: { label: '오프 정보', size: ['offnfz'], pos: 'offn' },
  offitem: { label: '오프 항목틀', size: ['offiw', 'offih', 'offgap'], pos: 'offit' },
  offitemic: { label: '오프 항목 아이콘', size: ['offic'], pos: 'offiti' },
  offitemval: { label: '오프 획득량', size: ['offifz'], pos: 'offv' },
  offitemrate: { label: '오프 분당량', size: ['offrfz'], pos: 'offr' },
  offbtn: { label: '추가보상 버튼', size: ['offbtw', 'offbth', 'offbfz'], pos: 'offbt' },
  offclaim: { label: '받기 버튼', size: ['offclw', 'offclh', 'offcfz'], pos: 'offcl' },
  fuseall: { label: '일괄융합 버튼', size: ['fuseallw', 'fuseallh', 'fuseallfz'], pos: 'fuseall' },
  matchip: { label: '재화 칩', size: ['matchipic', 'matchipfz'], pos: 'matchip' },
  allymat: { label: '동료 재화칩', size: ['allychipic', 'allychipfz'], pos: 'allymat' },
  dtab: { label: '상세 탭버튼', size: ['dtabh', 'dtabfz'], pos: 'dtab' },
  dtitle: { label: '상세 등급/이름', size: ['dgradefz', 'dtitlefz'], pos: 'dtitle' },
  darrow: { label: '상세 화살표', size: ['darrowfz'], pos: 'darrow' },
  dicon: { label: '상세 아이콘틀', size: ['diconsz', 'dtierfz'], pos: 'dicon' },
  dstat: { label: '상세 능력치', size: ['dstatfz'], pos: 'dstat' },
  denh: { label: '강화 버튼', size: ['denhh', 'denhfz', 'denhic'], pos: 'denh' },
  dequip: { label: '장착 버튼', size: ['dequiph', 'dequipfz'], pos: 'dequip' },
  dfusebtn: { label: '융합 버튼', size: ['dfuseh', 'dfusefz'], pos: 'dfusebtn' },
  dstep: { label: '융합 수량조절', size: ['dstepsz', 'dstepfz'], pos: 'dstep' },
}
for (let i = 0; i < 6; i++) EDIT_GROUPS[`evoimg${i}`] = { label: `진화캐릭 ${i + 1}단계`, size: [`evoimg${i}`], pos: `evoimg${i}` }
const UI_LABELS = {
  panelbwV: '패널 테두리(상하)', panelbwH: '패널 테두리(좌우)', rowbwV: '항목 테두리(상하)', rowbwH: '항목 테두리(좌우)',
  rowmin: '항목 최소높이', rowgap: '항목 간격', icon: '아이콘 크기', name: '이름 글자', lv: 'Lv 글자', val: '수치 글자',
  costw: '+1버튼 너비', costh: '+1버튼 높이', costfz: '+1버튼 글자', inputw: '숫자칸 너비', inputfz: '숫자칸 글자',
  spw: '장착버튼 너비', sph: '장착버튼 높이', spfz: '장착버튼 글자', tabpt: '탭 위높이', tabpb: '탭 아래높이', tabfz: '탭 글자',
  navicon: '네비 아이콘', navpt: '네비 위높이', navpb: '네비 아래높이', avatar: '아바타 크기', slotmax: '스킬슬롯 크기', equipcols: '장비 열수', equipgap: '장비 간격',
  slotfz: '슬롯 + 글자', catfz: '분류 글자', spbarfz: '안내 글자', equipimg: '장비아이콘', equiptier: '티어 숫자',
  equipcell: '장비칸 크기', nickfz: '닉네임 글자', lvbadgefz: 'Lv뱃지 글자', exph: 'EXP바 높이', pillfz: '자원 글자', wavefz: '웨이브 글자',
  gainfz: '팝업 글자', hph: 'HP알약 높이', hpfz: 'HP 글자', bossfz: '버튼 글자', clearfz: '문구 글자', navfz: '네비 글자', diasz: '다이아 크기', bossh: '버튼 판 크기', wavebh: '현판 높이', gachacell: '결과 셀 크기', gachafz: '등급 글자', gtierfz: '티어 글자', gachaimg: '아이콘 %',
  shoprowmin: '박스 높이', shopic0: '무기 아이콘', shopic1: '방어구 아이콘', shopic2: '유물 아이콘', shoptfz: '제목 글자', shopsubfz: '부제 글자',
  shopbw: '버튼 너비', shopbh: '버튼 높이', shopbbv: '프레임 두께↕', shopbbh: '프레임 두께↔', shopbfz: '버튼 글자',
  gainic: '아이콘 크기', gainpv: '판 두께↕', gainph: '판 두께↔', shopgem: '다이아 크기', gbtnfz: '버튼 글자', gbtnpw: '판 가로', gbtnph: '판 세로',
  pmw: '알약 너비', pmh: '알약 높이', pmfz: '알약 글자', pgw: '알약 너비', pgh: '알약 높이', pgfz: '알약 글자', hambsz: '버튼 크기', skicon: '아이콘 크기%', slicon: '아이콘 크기%', advbw: '버튼 너비', advbh: '버튼 높이', advbfz: '버튼 글자', advww: '창 너비', advwh: '창 높이', adviw: '그림 너비', advih: '그림 높이', advibw: '틀 너비', advibh: '틀 높이', advmbw: '틀 너비', advmbh: '틀 높이', advrbw: '틀 너비', advrbh: '틀 높이', advwbw: '틀 너비', advwbh: '틀 높이', advsw: '표지판 너비', advsh: '표지판 높이', advsfz: '글자 크기', advbarw: '바 너비', advbarh: '바 높이', advmonkfz: '글자 크기', advmonvfz: '글자 크기', advregkfz: '글자 크기', advregvfz: '글자 크기', advrewkfz: '글자 크기', advrewvfz: '숫자 크기', advrewic: '아이콘 크기', advmfz: '글자 크기', advrfz: '글자 크기', advwfz: '글자 크기', advew: '버튼 너비', adveh: '버튼 높이', advefz: '버튼 글자', advcw: '버튼 너비', advch: '버튼 높이', advcfz: '버튼 글자', mailsz: '우편함 크기', questsz: '퀘스트 크기', menufz: '메뉴 글자', pbsz: '버튼 크기', wjfz: '창 글자', caslot: '칸 크기', caimg: '캐릭 크기', canamefz: '이름 글자', catabfz: '탭 글자', cabtnfz: '장착 글자', btw: '타이머 너비', bth: '타이머 높이', bhpw: '체력바 너비', bhph: '체력바 높이',
  trsz: '상자 크기', offw: '창 너비', offtfz: '제목 글자', offnfz: '정보 글자', offiw: '항목 너비', offih: '항목 높이', offgap: '항목 간격', offic: '아이콘 크기', offifz: '획득 글자', offrfz: '분당 글자', offbtw: '버튼 너비', offbth: '버튼 높이', offbfz: '버튼 글자', offclw: '버튼 너비', offclh: '버튼 높이', offcfz: '버튼 글자', fuseallw: '융합버튼 너비', fuseallh: '융합버튼 높이', fuseallfz: '융합버튼 글자',
  matchipic: '아이콘 크기', matchipfz: '글자 크기', allychipic: '동료 아이콘', allychipfz: '동료 글자', dtabh: '탭 높이', dtabfz: '탭 글자', dgradefz: '등급 글자', dtitlefz: '이름 글자', darrowfz: '화살표 크기', diconsz: '아이콘틀 크기', dtierfz: '등급표시 글자', dstatfz: '능력치 글자', denhh: '강화버튼 높이', denhfz: '강화버튼 글자', denhic: '강화 재화아이콘', dequiph: '장착버튼 높이', dequipfz: '장착버튼 글자', dfuseh: '융합버튼 높이', dfusefz: '융합버튼 글자', dstepsz: '조절버튼 크기', dstepfz: '수량 글자',
}
for (let i = 0; i < 6; i++) UI_LABELS[`evoimg${i}`] = `${i + 1}단계 크기`
const uiVars = c => `:root{
--pd-panelbw-v:${c.panelbwV}px;--pd-panelbw-h:${c.panelbwH}px;--pd-rowbw-v:${c.rowbwV}px;--pd-rowbw-h:${c.rowbwH}px;
--pd-rowmin:${c.rowmin}px;--pd-rowgap:${c.rowgap}px;--pd-icon:${c.icon}px;--pd-name:${c.name}px;--pd-lv:${c.lv}px;--pd-val:${c.val}px;
--pd-costw:${c.costw}px;--pd-costh:${c.costh}px;--pd-costfz:${c.costfz}px;--pd-inputw:${c.inputw}px;--pd-inputfz:${c.inputfz}px;
--pd-spw:${c.spw}px;--pd-sph:${c.sph}px;--pd-spfz:${c.spfz}px;--pd-tabpt:${c.tabpt}px;--pd-tabpb:${c.tabpb}px;--pd-tabfz:${c.tabfz}px;
--pd-navicon:${c.navicon}px;--pd-navpt:${c.navpt}px;--pd-navpb:${c.navpb}px;--pd-avatar:${c.avatar}px;--pd-slotmax:${c.slotmax}px;
--pd-equipcols:${c.equipcols};--pd-equipgap:${c.equipgap}px;
--pd-avatar-x:${c.avatarX}px;--pd-avatar-y:${c.avatarY}px;--pd-tab-x:${c.tabX}px;--pd-tab-y:${c.tabY}px;
--pd-nav-x:${c.navX}px;--pd-nav-y:${c.navY}px;--pd-cost-x:${c.costX}px;--pd-cost-y:${c.costY}px;
--pd-pill-x:${c.pillX}px;--pd-pill-y:${c.pillY}px;--pd-icon-x:${c.iconX}px;--pd-icon-y:${c.iconY}px;
${[0, 1, 2, 3, 4, 5].map(i => `--pd-evoimg${i}:${c['evoimg' + i]}px;--pd-evoimg${i}-x:${c['evoimg' + i + 'X']}px;--pd-evoimg${i}-y:${c['evoimg' + i + 'Y']}px;`).join('')}--pd-slotfz:${c.slotfz}px;
--pd-catfz:${c.catfz}px;--pd-spbarfz:${c.spbarfz}px;--pd-equipimg:${c.equipimg}%;--pd-equiptier:${c.equiptier}px;
--pd-panel-x:${c.panelX}px;--pd-panel-y:${c.panelY}px;--pd-row-x:${c.rowX}px;--pd-row-y:${c.rowY}px;
--pd-name-x:${c.nameX}px;--pd-name-y:${c.nameY}px;--pd-val-x:${c.valX}px;--pd-val-y:${c.valY}px;
--pd-input-x:${c.inputX}px;--pd-input-y:${c.inputY}px;--pd-sp-x:${c.spX}px;--pd-sp-y:${c.spY}px;
--pd-slot-x:${c.slotX}px;--pd-slot-y:${c.slotY}px;--pd-cat-x:${c.catX}px;--pd-cat-y:${c.catY}px;
--pd-spbar-x:${c.spbarX}px;--pd-spbar-y:${c.spbarY}px;--pd-equip-x:${c.equipX}px;--pd-equip-y:${c.equipY}px;
--pd-spbarA-x:${c.spbarAX}px;--pd-spbarA-y:${c.spbarAY}px;--pd-spbarB-x:${c.spbarBX}px;--pd-spbarB-y:${c.spbarBY}px;--pd-spbarC-x:${c.spbarCX}px;--pd-spbarC-y:${c.spbarCY}px;
--pd-equipcell:${c.equipcell}px;--pd-nickfz:${c.nickfz}px;--pd-lvbadgefz:${c.lvbadgefz}px;--pd-exph:${c.exph}px;
--pd-pillfz:${c.pillfz}px;--pd-wavefz:${c.wavefz}px;--pd-gainfz:${c.gainfz}px;
--pd-hph:${c.hph}px;--pd-hpfz:${c.hpfz}px;--pd-bossfz:${c.bossfz}px;--pd-clearfz:${c.clearfz}px;--pd-navfz:${c.navfz}px;--pd-diasz:${c.diasz}px;--pd-bossh:${c.bossh}px;--pd-wavebh:${c.wavebh}px;--pd-gachacell:${c.gachacell}px;--pd-gachafz:${c.gachafz}px;--pd-gacha-x:${c.gachaX}px;--pd-gacha-y:${c.gachaY}px;
--pd-gtierfz:${c.gtierfz}px;--pd-gachaimg:${c.gachaimg};--pd-shoprowmin:${c.shoprowmin}px;--pd-shopic:${c.shopic}px;--pd-shopic0:${c.shopic0}px;--pd-shopic1:${c.shopic1}px;--pd-shopic2:${c.shopic2}px;
--pd-shoptfz:${c.shoptfz}px;--pd-shopsubfz:${c.shopsubfz}px;--pd-shopbw:${c.shopbw}px;--pd-shopbh:${c.shopbh}px;--pd-shopbbv:${c.shopbbv}px;--pd-shopbbh:${c.shopbbh}px;--pd-shopbfz:${c.shopbfz}px;
--pd-gainic:${c.gainic}px;--pd-gainpv:${c.gainpv}px;--pd-gainph:${c.gainph}px;--pd-gainic-x:${c.gainicX}px;--pd-gainic-y:${c.gainicY}px;--pd-gaint-x:${c.gaintX}px;--pd-gaint-y:${c.gaintY}px;--pd-shopgem:${c.shopgem}px;
--pd-gbtnfz:${c.gbtnfz}px;--pd-gbtnpw:${c.gbtnpw}px;--pd-gbtnph:${c.gbtnph}px;
--pd-pmw:${c.pmw}px;--pd-pmh:${c.pmh}px;--pd-pmfz:${c.pmfz}px;--pd-pgw:${c.pgw}px;--pd-pgh:${c.pgh}px;--pd-pgfz:${c.pgfz}px;--pd-hambsz:${c.hambsz}px;--pd-menufz:${c.menufz}px;--pd-pbsz:${c.pbsz}px;--pd-wjfz:${c.wjfz}px;--pd-caslot:${c.caslot}px;--pd-caimg:${c.caimg}px;--pd-canamefz:${c.canamefz}px;--pd-catabfz:${c.catabfz}px;
--pd-cabtnfz:${c.cabtnfz}px;
${['caslot', 'caimg', 'caname', 'catab', 'cabtn'].map(k => `--pd-${k}-x:${c[k + 'X']}px;--pd-${k}-y:${c[k + 'Y']}px;`).join('')}--pd-pb-x:${c.pbX}px;--pd-pb-y:${c.pbY}px;--pd-wj-x:${c.wjX}px;--pd-wj-y:${c.wjY}px;--pd-btw:${c.btw}px;--pd-bth:${c.bth}px;--pd-bhpw:${c.bhpw}px;--pd-bhph:${c.bhph}px;
${['bt', 'bhp'].map(k => `--pd-${k}-x:${c[k + 'X']}px;--pd-${k}-y:${c[k + 'Y']}px;`).join('')}
${['pm', 'pg', 'hamb', 'menu'].map(k => `--pd-${k}-x:${c[k + 'X']}px;--pd-${k}-y:${c[k + 'Y']}px;`).join('')}
${['eqtier', 'eqimg', 'shoprow', 'shopic', 'shopt', 'shopsub', 'shopb', 'shopbt', 'shopgem', 'gbtn', 'gbtnt', 'ggrade', 'gtier', 'gimg'].map(k => `--pd-${k}-x:${c[k + 'X']}px;--pd-${k}-y:${c[k + 'Y']}px;`).join('')}
--pd-nick-x:${c.nickX}px;--pd-nick-y:${c.nickY}px;--pd-exp-x:${c.expX}px;--pd-exp-y:${c.expY}px;
--pd-gain-x:${c.gainX}px;--pd-gain-y:${c.gainY}px;
--pd-hp-x:${c.hpX}px;--pd-hp-y:${c.hpY}px;--pd-boss-x:${c.bossX}px;--pd-boss-y:${c.bossY}px;--pd-clear-x:${c.clearX}px;--pd-clear-y:${c.clearY}px;--pd-wave-x:${c.waveX}px;--pd-wave-y:${c.waveY}px;--pd-wtitle-x:${c.wtitleX}px;--pd-wtitle-y:${c.wtitleY}px;--pd-dia-x:${c.diaX}px;--pd-dia-y:${c.diaY}px;--pd-btext-x:${c.btextX}px;--pd-btext-y:${c.btextY}px;
--pd-trsz:${c.trsz}px;--pd-offw:${c.offw}px;--pd-offtfz:${c.offtfz}px;--pd-offnfz:${c.offnfz}px;--pd-offiw:${c.offiw}px;--pd-offih:${c.offih}px;--pd-offgap:${c.offgap}px;--pd-offic:${c.offic}px;--pd-offifz:${c.offifz}px;--pd-offrfz:${c.offrfz}px;--pd-offbtw:${c.offbtw}px;--pd-offbth:${c.offbth}px;--pd-offbfz:${c.offbfz}px;--pd-offclw:${c.offclw}px;--pd-offclh:${c.offclh}px;--pd-offcfz:${c.offcfz}px;--pd-fuseallw:${c.fuseallw}px;--pd-fuseallh:${c.fuseallh}px;--pd-fuseallfz:${c.fuseallfz}px;
--pd-skicon:${c.skicon}%;--pd-slicon:${c.slicon}%;--pd-advbw:${c.advbw}px;--pd-advbh:${c.advbh}px;--pd-advbfz:${c.advbfz}px;--pd-advww:${c.advww}px;--pd-advwh:${c.advwh}px;--pd-adviw:${c.adviw}px;--pd-advih:${c.advih}px;--pd-advibw:${c.advibw}px;--pd-advibh:${c.advibh}px;--pd-advmbw:${c.advmbw}px;--pd-advmbh:${c.advmbh}px;--pd-advrbw:${c.advrbw}px;--pd-advrbh:${c.advrbh}px;--pd-advwbw:${c.advwbw}px;--pd-advwbh:${c.advwbh}px;--pd-advsw:${c.advsw}px;--pd-advsh:${c.advsh}px;--pd-advsfz:${c.advsfz}px;--pd-advbarw:${c.advbarw}px;--pd-advbarh:${c.advbarh}px;--pd-advmonkfz:${c.advmonkfz}px;--pd-advmonvfz:${c.advmonvfz}px;--pd-advregkfz:${c.advregkfz}px;--pd-advregvfz:${c.advregvfz}px;--pd-advrewkfz:${c.advrewkfz}px;--pd-advrewvfz:${c.advrewvfz}px;--pd-advrewic:${c.advrewic}px;--pd-advmfz:${c.advmfz}px;--pd-advrfz:${c.advrfz}px;--pd-advwfz:${c.advwfz}px;--pd-advew:${c.advew}px;--pd-adveh:${c.adveh}px;--pd-advefz:${c.advefz}px;--pd-advcw:${c.advcw}px;--pd-advch:${c.advch}px;--pd-advcfz:${c.advcfz}px;--pd-mailsz:${c.mailsz}px;--pd-questsz:${c.questsz}px;--pd-matchipic:${c.matchipic}px;--pd-matchipfz:${c.matchipfz}px;--pd-allychipic:${c.allychipic}px;--pd-allychipfz:${c.allychipfz}px;--pd-dtabh:${c.dtabh}px;--pd-dtabfz:${c.dtabfz}px;--pd-dgradefz:${c.dgradefz}px;--pd-dtitlefz:${c.dtitlefz}px;--pd-darrowfz:${c.darrowfz}px;--pd-diconsz:${c.diconsz}px;--pd-dtierfz:${c.dtierfz}px;--pd-dstatfz:${c.dstatfz}px;--pd-denhh:${c.denhh}px;--pd-denhfz:${c.denhfz}px;--pd-denhic:${c.denhic}px;--pd-dequiph:${c.dequiph}px;--pd-dequipfz:${c.dequipfz}px;--pd-dfuseh:${c.dfuseh}px;--pd-dfusefz:${c.dfusefz}px;--pd-dstepsz:${c.dstepsz}px;--pd-dstepfz:${c.dstepfz}px;
${['tr', 'offt', 'offn', 'offit', 'offiti', 'offv', 'offr', 'offbt', 'offcl', 'fuseall', 'skicon', 'slicon', 'advbtn0', 'advbtn1', 'advbtn2', 'advbtn3', 'advbtn4', 'advbtn5', 'advbtn6', 'advbtn7', 'advtxt0', 'advtxt1', 'advtxt2', 'advtxt3', 'advtxt4', 'advtxt5', 'advtxt6', 'advtxt7', 'advwin', 'advicon', 'adviconb', 'advmonb', 'advregb', 'advrewb', 'advsign', 'advsignt', 'advbar', 'advmonk', 'advmonv', 'advregk', 'advregv', 'advrewk', 'advrewd', 'advrewm', 'adventer', 'advclose', 'mailbox', 'quest', 'shopic0', 'shopic1', 'shopic2', 'matchip', 'allymat', 'dtab', 'dtitle', 'darrow', 'dicon', 'dstat', 'denh', 'dequip', 'dfusebtn', 'dstep'].map(k => `--pd-${k}-x:${c[k + 'X']}px;--pd-${k}-y:${c[k + 'Y']}px;`).join('')}
}`
const st = {
  outer: { position: 'fixed', inset: 0, background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'hidden' },
  root: {
    width: '100%', maxWidth: 420, height: '100%', position: 'relative',
    display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(180deg,#1c130a,#140d06)', color: '#f3e6d0',
    fontFamily: "'Do Hyeon','Jua',-apple-system,'Noto Sans KR',sans-serif",
  },
  topBar: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    paddingTop: 'max(10px, env(safe-area-inset-top))', fontSize: 14,
    background: 'linear-gradient(180deg,#2b1e11,#1f1509)', borderBottom: '2px solid #4a3418',
  },
  avatar: { width: 44, height: 44, borderRadius: 10, border: `2px solid ${GOLD_D}`, background: '#1a120b', imageRendering: 'pixelated', boxShadow: 'inset 0 0 0 1px #201408' },
  avatarWrap: {
    width: 'var(--pd-avatar)', height: 'var(--pd-avatar)', flexShrink: 0, position: 'relative', transform: 'translate(var(--pd-avatar-x), var(--pd-avatar-y))',
    backgroundImage: 'url(/ui/avatar.png)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avatarFace: { width: '66%', height: '66%', objectFit: 'cover', borderRadius: '50%', imageRendering: 'pixelated' },
  nickRow: { display: 'flex', alignItems: 'center', gap: 6, transform: 'translate(var(--pd-nick-x), var(--pd-nick-y))' },
  nick: { fontSize: 'var(--pd-nickfz)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  lvBadge: { fontSize: 'var(--pd-lvbadgefz)', color: GOLD, background: 'linear-gradient(180deg,#3a2a14,#2a1d0d)', border: `1px solid ${GOLD_D}`, padding: '1px 8px', borderRadius: 7, flexShrink: 0 },
  expOuter: { position: 'relative', height: 'var(--pd-exph)', transform: 'translate(var(--pd-exp-x), var(--pd-exp-y))', background: '#0e0a05', borderRadius: 5, overflow: 'hidden', marginTop: 4, border: '1px solid #1e3a5f' },
  expInner: { height: '100%', background: 'linear-gradient(90deg,#1f5fa8,#3f8fd8,#7cc4ff)', transition: 'width 0.2s' },
  expText: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'calc(var(--pd-exph) - 4px)', lineHeight: 1, textShadow: '0 1px 2px #000' },
  currency: { textAlign: 'right', fontSize: 'var(--pd-pillfz)', whiteSpace: 'nowrap', transform: 'translate(var(--pd-pill-x), var(--pd-pill-y))' },
  currencyPill: {
    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13,
    background: 'linear-gradient(180deg,#2b1e11,#1a1208)', border: '1px solid #4a3418',
    borderRadius: 20, padding: '4px 12px', color: '#f3e6d0',
  },
  pillMeat: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end',
    minWidth: 'var(--pd-pmw)', height: 'var(--pd-pmh)', paddingRight: 12, fontSize: 'var(--pd-pmfz)',
    transform: 'translate(var(--pd-pm-x), var(--pd-pm-y))',
    backgroundImage: 'url(/ui/pill_meat.png)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    textShadow: '0 1px 2px #000',
  },
  pillGem: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end',
    minWidth: 'var(--pd-pgw)', height: 'var(--pd-pgh)', paddingRight: 12, fontSize: 'var(--pd-pgfz)',
    transform: 'translate(var(--pd-pg-x), var(--pd-pg-y))',
    backgroundImage: 'url(/ui/pill_gem.png)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    textShadow: '0 1px 2px #000',
  },
  pauseBtn: {
    position: 'absolute', left: 8, top: 6, width: 'var(--pd-pbsz)', height: 'var(--pd-pbsz)', padding: 0,
    border: '1px solid #5a4028', borderRadius: 8, background: 'rgba(24,16,8,0.8)', color: GOLD,
    fontSize: 'calc(var(--pd-pbsz) * 0.45)', lineHeight: 1,
    transform: 'translate(var(--pd-pb-x), var(--pd-pb-y))',
  },
  wjPanel: {
    position: 'fixed', left: '50%', top: 243, transform: 'translate(calc(-50% + var(--pd-wj-x)), var(--pd-wj-y))',
    minWidth: 230, background: 'rgba(16,10,5,0.97)', border: `2px solid ${GOLD_D}`, borderRadius: 10,
    padding: 12, fontSize: 'var(--pd-wjfz)',
  },
  wjInput: { flex: 1, minWidth: 0, background: '#120b05', border: '1px solid #5a4028', borderRadius: 6, color: '#f3e6d0', padding: '6px 8px', fontSize: 'inherit' },
  bossBars: { position: 'absolute', left: 0, right: 0, top: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, pointerEvents: 'none' },
  btOuter: {
    position: 'relative', width: 'var(--pd-btw)', height: 'var(--pd-bth)', pointerEvents: 'auto',
    background: 'url(/ui/bar_timer.png) center / 100% 100% no-repeat',
    transform: 'translate(var(--pd-bt-x), var(--pd-bt-y))',
  },
  btTrack: { position: 'absolute', left: '19%', right: '5.5%', top: '30%', bottom: '30%', borderRadius: 4, overflow: 'hidden' },
  btInner: { height: '100%', background: 'linear-gradient(180deg,#7cc4ff,#1f5fa8)', transition: 'width 0.1s linear' },
  bhOuter: {
    position: 'relative', width: 'var(--pd-bhpw)', height: 'var(--pd-bhph)', pointerEvents: 'auto',
    background: 'url(/ui/bar_bosshp.png) center / 100% 100% no-repeat',
    transform: 'translate(var(--pd-bhp-x), var(--pd-bhp-y))',
  },
  bhTrack: { position: 'absolute', left: '19%', right: '6%', top: '30%', bottom: '30%', borderRadius: 4, overflow: 'hidden' },
  bhInner: { height: '100%', background: 'linear-gradient(180deg,#e05038,#8e1f14)', transition: 'width 0.12s' },
  gainWrap: { position: 'absolute', left: 8, top: 44, transform: 'translate(var(--pd-gain-x), var(--pd-gain-y))', display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none' },
  gainCell: { display: 'flex', alignItems: 'center', gap: 3 },
  gainIcon: { height: 'var(--pd-gainic)', objectFit: 'contain', transform: 'translate(var(--pd-gainic-x), var(--pd-gainic-y))' },
  gainNum: { display: 'inline-block', fontSize: 'var(--pd-gainfz)', transform: 'translate(var(--pd-gaint-x), var(--pd-gaint-y))' },
  gainItem: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(10,6,3,0.6)', padding: 'var(--pd-gainpv) var(--pd-gainph)', borderRadius: 6 },
  spBar: { padding: '3px 5px 5px', fontSize: 'var(--pd-spbarfz)', color: '#c9b596' },
  spBtn: {
    touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
    minWidth: 'var(--pd-spw)', padding: 'var(--pd-sph) 5px', borderRadius: 7, border: '1px solid #2f7fa0',
    background: 'linear-gradient(180deg,#3a9ec0,#256f8c)', color: '#fff', fontSize: 'var(--pd-spfz)', flexShrink: 0,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)', transform: 'translate(var(--pd-sp-x), var(--pd-sp-y))',
  },
  spDot: { marginLeft: 5, fontSize: 11, color: '#fff', background: '#e05a4e', borderRadius: 8, padding: '0 6px' },
  bottomNav: {
    display: 'flex', background: 'linear-gradient(180deg,#241811,#160e07)', borderTop: '2px solid #4a3418', transform: 'translate(var(--pd-nav-x), var(--pd-nav-y))',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  navBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: 'var(--pd-navpt) 2px var(--pd-navpb)', margin: '0 1px', border: 'none', background: 'transparent',
    backgroundImage: 'url(/ui/nav_off.png)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    color: '#9a8768', position: 'relative',
  },
  navActive: { backgroundImage: 'url(/ui/nav_on.png)', color: GOLD },
  hambBtn: {
    width: 'var(--pd-hambsz)', height: 'var(--pd-hambsz)', flexShrink: 0, padding: 0,
    border: '1px solid #5a4028', borderRadius: 6, background: '#2c2013', color: GOLD,
    fontSize: 'calc(var(--pd-hambsz) - 12px)', lineHeight: 1,
    transform: 'translate(var(--pd-hamb-x), var(--pd-hamb-y))',
  },
  menuPanel: {
    position: 'fixed', right: 8, top: 'calc(max(10px, env(safe-area-inset-top)) + 44px)', minWidth: 210,
    background: 'rgba(16,10,5,0.97)', border: `2px solid ${GOLD_D}`, borderRadius: 10,
    padding: 8, fontSize: 'var(--pd-menufz)', textAlign: 'left',
    transform: 'translate(var(--pd-menu-x), var(--pd-menu-y))',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px',
    background: 'transparent', border: 'none', color: '#f3e6d0', fontSize: 'inherit', textAlign: 'left',
  },
  cloudBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12 },
  cloudBtn: { flexShrink: 0, padding: '6px 10px', borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: GOLD, fontSize: 12 },
  shopBtn: {
    flexShrink: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 'calc(var(--pd-shopbw) + var(--pd-shopbbh) * 2)', height: 'calc(var(--pd-shopbh) + var(--pd-shopbbv) * 2)',
    border: '1px solid #5a4630', borderRadius: 9,
    background: 'linear-gradient(180deg,#332415,#211710)', boxShadow: 'inset 0 1px 0 rgba(255,220,150,0.08)',
    color: '#f3e6d0', lineHeight: 1.35,
    touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
    transform: 'translate(var(--pd-shopb-x), var(--pd-shopb-y))',
  },
  shopBtnText: { display: 'inline-block', fontSize: 'var(--pd-shopbfz)', transform: 'translate(var(--pd-shopbt-x), var(--pd-shopbt-y))' },
  shopCost: { display: 'inline-flex', alignItems: 'center', gap: 2, color: '#8fd0ff' },
  shopGemIc: { height: 'var(--pd-shopgem)', objectFit: 'contain', transform: 'translate(var(--pd-shopgem-x), var(--pd-shopgem-y))' },
  gachaOverlay: {
    position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(6,3,1,0.96)',
    display: 'flex', flexDirection: 'column', padding: '18px 10px calc(10px + env(safe-area-inset-bottom))',
  },
  gachaScroll: { flex: 1, minHeight: 0, overflowY: 'auto' },
  gachaGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, var(--pd-gachacell))', gap: 10, justifyContent: 'center', alignContent: 'center', minHeight: '100%' },
  gachaCell: {
    position: 'relative', width: 'var(--pd-gachacell)', aspectRatio: '1', borderRadius: 10,
    border: '2px solid #777', background: 'linear-gradient(180deg,#22180d,#120b05)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transform: 'translate(var(--pd-gacha-x), var(--pd-gacha-y))',
  },
  gachaGrade: { position: 'absolute', top: 2, left: 4, fontSize: 'var(--pd-gachafz)', fontWeight: 700, textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-ggrade-x), var(--pd-ggrade-y))' },
  gachaImg: { width: 'calc(var(--pd-gachaimg) * 1%)', height: 'calc(var(--pd-gachaimg) * 1%)', objectFit: 'contain', imageRendering: 'pixelated', transform: 'translate(var(--pd-gimg-x), var(--pd-gimg-y))' },
  gachaTier: { position: 'absolute', bottom: 2, right: 5, fontSize: 'var(--pd-gtierfz)', color: '#ffd98a', textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-gtier-x), var(--pd-gtier-y))' },
  gachaBtns: { display: 'flex', gap: 8, justifyContent: 'center', paddingTop: 10 },
  gachaBtn: {
    padding: 'calc(var(--pd-gbtnph) + 10px) calc(var(--pd-gbtnpw) + 14px)',
    border: '1px solid #5a4630', borderRadius: 9,
    background: 'linear-gradient(180deg,#332415,#211710)', boxShadow: 'inset 0 1px 0 rgba(255,220,150,0.08)',
    color: '#f3e6d0',
    transform: 'translate(var(--pd-gbtn-x), var(--pd-gbtn-y))',
  },
  gachaBtnText: { display: 'inline-block', fontSize: 'var(--pd-gbtnfz)', transform: 'translate(var(--pd-gbtnt-x), var(--pd-gbtnt-y))' },
  allySubRow: { display: 'flex', gap: 6, padding: '6px 8px 2px' },
  allySubTab: {
    padding: '5px 16px', borderRadius: 7, border: '1px solid #3a2a14', background: 'transparent',
    color: '#b8a888', fontSize: 'var(--pd-catabfz)', transform: 'translate(var(--pd-catab-x), var(--pd-catab-y))',
  },
  allySubOn: { background: '#2c2013', color: GOLD, borderColor: '#5a4028' },
  allyGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, var(--pd-caslot))', gap: 8, justifyContent: 'center', padding: 10 },
  allySlot: {
    width: 'var(--pd-caslot)', aspectRatio: '0.82', borderRadius: 10,
    border: '1px solid #5a4028', background: 'linear-gradient(180deg,#22180d,#120b05)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
    transform: 'translate(var(--pd-caslot-x), var(--pd-caslot-y))',
  },
  allyName: { fontSize: 'var(--pd-canamefz)', color: GOLD, transform: 'translate(var(--pd-caname-x), var(--pd-caname-y))' },
  allyBtn: {
    padding: '3px 12px', borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013',
    color: '#b8a888', fontSize: 'var(--pd-cabtnfz)', transform: 'translate(var(--pd-cabtn-x), var(--pd-cabtn-y))',
  },
  allyBtnOn: { color: GOLD, borderColor: GOLD_D, background: '#3a2a14' },
  allyImg: { height: 'var(--pd-caimg)', objectFit: 'contain', imageRendering: 'pixelated', transform: 'translate(var(--pd-caimg-x), var(--pd-caimg-y))' },
  splashWrap: {
    position: 'absolute', inset: 0, zIndex: 200,
    background: '#0a0603 url(/startbg/startbg.jpg) center / cover no-repeat',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    cursor: 'pointer',
  },
  splashTap: {
    position: 'absolute', left: 0, right: 0, bottom: '18%', textAlign: 'center',
    color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '0.15em',
    textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)',
    animation: 'pdBlink 1.4s ease-in-out infinite', pointerEvents: 'none',
  },
  advWrap: { flex: 1, minHeight: 0, background: '#1a1109', display: 'flex', padding: 8 },
  advViewport: { position: 'relative', flex: 1, minHeight: 0, borderRadius: 10, overflow: 'hidden', border: '2px solid #4a3418', background: '#0d0904' },
  advTrack: { position: 'relative', height: '100%', display: 'flex', transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)' },
  advContBtn: { position: 'absolute', width: 'var(--pd-advbw)', height: 'var(--pd-advbh)', padding: 0, border: 'none', background: 'url(/ui/off_header.png) center / 100% 100% no-repeat', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', boxSizing: 'border-box', paddingRight: '14%', zIndex: 3 },
  advOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.68)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  advWin: {
    position: 'relative', width: 'var(--pd-advww)', height: 'var(--pd-advwh)',
    background: 'url(/ui/adv_frame.png) center / 100% 100% no-repeat',
    padding: '9% 8% 8%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    boxSizing: 'border-box', transform: 'translate(var(--pd-advwin-x), var(--pd-advwin-y))',
  },
  advTop: { flexShrink: 0, width: '100%', display: 'flex', alignItems: 'flex-start', gap: 8 },
  advInfoCol: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' },
  advBoxBase: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, boxSizing: 'border-box', border: '2px solid #d09340', borderRadius: 9, background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.45)' },
  advMonK: { fontSize: 'var(--pd-advmonkfz)', fontWeight: 800, color: '#f0dfae', textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-advmonk-x), var(--pd-advmonk-y))' },
  advMonV: { fontSize: 'var(--pd-advmonvfz)', fontWeight: 700, color: '#cbb489', textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-advmonv-x), var(--pd-advmonv-y))' },
  advRegK: { fontSize: 'var(--pd-advregkfz)', fontWeight: 800, color: '#f0dfae', textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-advregk-x), var(--pd-advregk-y))' },
  advRegV: { fontSize: 'var(--pd-advregvfz)', fontWeight: 700, color: '#cbb489', textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-advregv-x), var(--pd-advregv-y))' },
  advMonBox: { width: 'var(--pd-advmbw)', height: 'var(--pd-advmbh)', flexShrink: 0, transform: 'translate(var(--pd-advmonb-x), var(--pd-advmonb-y))' },
  advRegBox: { width: 'var(--pd-advrbw)', height: 'var(--pd-advrbh)', flexShrink: 0, transform: 'translate(var(--pd-advregb-x), var(--pd-advregb-y))' },
  advIconBox: {
    flexShrink: 0, width: 'var(--pd-advibw)', height: 'var(--pd-advibh)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid #7a5a30', borderRadius: 8, background: 'rgba(0,0,0,0.30)',
    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.55)', boxSizing: 'border-box', transform: 'translate(var(--pd-adviconb-x), var(--pd-adviconb-y))',
  },
  advIcon: { width: 'var(--pd-adviw)', height: 'var(--pd-advih)', objectFit: 'contain', imageRendering: 'pixelated', transform: 'translate(var(--pd-advicon-x), var(--pd-advicon-y))' },
  advRewRow: { flexShrink: 0, width: 'var(--pd-advwbw)', height: 'var(--pd-advwbh)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, whiteSpace: 'nowrap', boxSizing: 'border-box', border: '2px solid #d09340', borderRadius: 9, background: 'rgba(0,0,0,0.22)', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.45)', transform: 'translate(var(--pd-advrewb-x), var(--pd-advrewb-y))' },
  advRewK: { fontSize: 'var(--pd-advrewkfz)', fontWeight: 800, color: '#f0dfae', textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-advrewk-x), var(--pd-advrewk-y))' },
  advRewD: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'var(--pd-advrewvfz)', fontWeight: 800, color: '#cfe8ff', textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-advrewd-x), var(--pd-advrewd-y))' },
  advRewM: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'var(--pd-advrewvfz)', fontWeight: 800, color: '#e6c7ff', textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-advrewm-x), var(--pd-advrewm-y))' },
  advRewIc: { width: 'var(--pd-advrewic)', height: 'var(--pd-advrewic)', objectFit: 'contain' },
  advSign: {
    flexShrink: 0, marginTop: 'auto', width: 'var(--pd-advsw)', height: 'var(--pd-advsh)',
    background: 'url(/ui/adv_sign.png) center / 100% 100% no-repeat',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
    boxSizing: 'border-box', transform: 'translate(var(--pd-advsign-x), var(--pd-advsign-y))',
  },
  advSignTxt: { fontSize: 'var(--pd-advsfz)', fontWeight: 800, color: '#4a3418', transform: 'translate(var(--pd-advsignt-x), var(--pd-advsignt-y))' },
  advBar: {
    width: 'var(--pd-advbarw)', height: 'var(--pd-advbarh)', display: 'flex', gap: 2,
    padding: 2, background: 'rgba(60,42,20,0.45)', border: '1px solid #6b5230', borderRadius: 5,
    boxSizing: 'border-box', transform: 'translate(var(--pd-advbar-x), var(--pd-advbar-y))',
  },
  advBarCell: { flex: 1, borderRadius: 2, background: 'rgba(0,0,0,0.22)' },
  advBarFill: { background: 'linear-gradient(180deg,#5fb8ff,#1f6fd0)', boxShadow: '0 0 4px rgba(80,180,255,0.85)' },
  advWinBtns: { flexShrink: 0, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' },
  advRuby: { width: '1.15em', height: '1.15em', objectFit: 'contain', verticalAlign: '-0.2em', margin: '0 2px' },
  advBtnOff: { filter: 'grayscale(0.85)', opacity: 0.55, cursor: 'default' },
  advEnterBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 'var(--pd-advew)', height: 'var(--pd-adveh)', fontSize: 'var(--pd-advefz)', fontWeight: 800,
    color: '#fff5df', border: '1px solid #6b4a22', borderRadius: 9,
    background: 'linear-gradient(180deg,#d4872e,#a85f1f)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
    transform: 'translate(var(--pd-adventer-x), var(--pd-adventer-y))', cursor: 'pointer',
  },
  advCloseBtn: {
    width: 'var(--pd-advcw)', height: 'var(--pd-advch)', fontSize: 'var(--pd-advcfz)', fontWeight: 700,
    color: '#f3e6d0', border: '1px solid #5a4630', borderRadius: 9,
    background: 'linear-gradient(180deg,#3a2c1b,#241a10)',
    transform: 'translate(var(--pd-advclose-x), var(--pd-advclose-y))', cursor: 'pointer',
  },
  advContName: { fontSize: 'var(--pd-advbfz)', fontWeight: 800, color: '#f3e6d0', textShadow: '0 1px 2px #000', whiteSpace: 'nowrap' },
  advMap: { display: 'block', height: '100%', width: 'auto', maxWidth: 'none', imageRendering: 'auto', userSelect: 'none', WebkitUserSelect: 'none' },
  advArrow: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 5,
    width: 40, height: 60, borderRadius: 10, border: '1px solid #6b4a24',
    background: 'rgba(20,13,7,0.75)', color: GOLD, fontSize: 30, lineHeight: 1, padding: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  advDots: { position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', gap: 8, justifyContent: 'center', zIndex: 5 },
  advDot: { width: 9, height: 9, borderRadius: '50%', background: 'rgba(243,230,208,0.35)', border: '1px solid rgba(0,0,0,0.4)' },
  advDotOn: { background: GOLD },
  comingSoon: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#20160c', color: '#f3e6d0' },
  cdOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,6,3,0.72)', fontSize: 13, color: '#7ce0ff' },
  slotRow: { display: 'flex', gap: 6, padding: '2px 2px 5px' },
  skillFixed: { flexShrink: 0 },
  skillScroll: { flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'var(--pd-rowgap)', padding: '10px 0 10px' },
  slot: { flex: 1, aspectRatio: '1', maxWidth: 'var(--pd-slotmax)', transform: 'translate(var(--pd-slot-x), var(--pd-slot-y))', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#2c2013,#20160c)', border: '2px solid #5a4028', borderRadius: 10 },
  slotEmpty: { fontSize: 'var(--pd-slotfz)', color: '#6a4f30' },
  equipGrid: { display: 'grid', gridTemplateColumns: 'repeat(var(--pd-equipcols), minmax(0, var(--pd-equipcell)))', gap: 'var(--pd-equipgap)', justifyContent: 'center' },
  equipCell: { position: 'relative', aspectRatio: '1', width: '100%', maxWidth: 'var(--pd-equipcell)', justifySelf: 'center', background: 'linear-gradient(180deg,#2c2013,#1e150b)', border: '1px solid #5a4028', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transform: 'translate(var(--pd-equip-x), var(--pd-equip-y))' },
  equipImg: { width: 'var(--pd-equipimg)', height: 'var(--pd-equipimg)', objectFit: 'contain', imageRendering: 'pixelated', transform: 'translate(var(--pd-eqimg-x), var(--pd-eqimg-y))' },
  statIconImg: { width: '100%', height: '100%', objectFit: 'contain' },
  navIconImg: { width: 'var(--pd-navicon)', height: 'var(--pd-navicon)', objectFit: 'contain' },
  equipTier: { position: 'absolute', right: 3, bottom: 1, fontSize: 'var(--pd-equiptier)', color: GOLD, textShadow: '0 0 3px #000', transform: 'translate(var(--pd-eqtier-x), var(--pd-eqtier-y))' },
  eqCount: { position: 'absolute', left: 3, bottom: 1, fontSize: 'var(--pd-equiptier)', fontWeight: 700, textShadow: '0 0 3px #000' },
  fuseBadge: { position: 'absolute', top: 2, left: 2, fontSize: 9, fontWeight: 800, color: '#1a1206', background: '#ffd24a', borderRadius: 4, padding: '0 3px', lineHeight: '13px', pointerEvents: 'none' },
  fuseAllBtn: { flexShrink: 0, width: 'var(--pd-fuseallw)', maxWidth: '92%', height: 'var(--pd-fuseallh)', margin: '2px auto 8px', border: 'none', borderRadius: 10, background: 'linear-gradient(180deg,#f0a740,#d07f1e)', color: '#3a1e02', fontSize: 'var(--pd-fuseallfz)', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 0 #8a5410', transform: 'translate(var(--pd-fuseall-x), var(--pd-fuseall-y))' },
  equipBottomBar: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' },
  matChip: { display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '3px 7px', border: '1px solid #5a4632', flexShrink: 0, fontSize: 'var(--pd-matchipfz)', fontWeight: 700, color: '#f3e6d0', transform: 'translate(var(--pd-matchip-x), var(--pd-matchip-y))' },
  matChipIc: { width: 'var(--pd-matchipic)', height: 'var(--pd-matchipic)', objectFit: 'contain' },
  allyChip: { display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '3px 7px', border: '1px solid #5a4632', flexShrink: 0, fontSize: 'var(--pd-allychipfz)', fontWeight: 700, color: '#f3e6d0' },
  allyChipIc: { width: 'var(--pd-allychipic)', height: 'var(--pd-allychipic)', objectFit: 'contain' },
  allyMats: { display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center', flexShrink: 0, transform: 'translate(var(--pd-allymat-x), var(--pd-allymat-y))' },
  offOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  offBox: { background: 'linear-gradient(180deg,#2c2013,#1e150b)', border: `2px solid ${GOLD_D}`, borderRadius: 16, padding: '20px 24px', textAlign: 'center', minWidth: 240, color: '#f3e6d0', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' },
  skillIconImg: { width: 'var(--pd-skicon)', height: 'var(--pd-skicon)', objectFit: 'contain', imageRendering: 'pixelated', transform: 'translate(var(--pd-skicon-x), var(--pd-skicon-y))' },
  slotIconImg: { width: 'var(--pd-slicon)', height: 'var(--pd-slicon)', objectFit: 'contain', imageRendering: 'pixelated', transform: 'translate(var(--pd-slicon-x), var(--pd-slicon-y))' },
  skillIcon: { width: 'var(--pd-icon)', height: 'var(--pd-icon)', transform: 'translate(var(--pd-icon-x), var(--pd-icon-y))', borderRadius: 8, background: 'linear-gradient(180deg,#2c2013,#1a1208)', border: '1px solid #5a4028', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 },
  progOuter: { height: 8, background: '#2a1d0d', borderRadius: 4, overflow: 'hidden', border: '1px solid #3a2a14' },
  canvasWrap: { height: '42%', position: 'relative', minHeight: 220, overflow: 'hidden' },
  statusBar: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px 2px' },
  hpPill: {
    position: 'relative', flex: 1.1, minWidth: 0, height: 'var(--pd-hph)',
    background: 'url(/ui/hp_capsule.png) center / 100% 100% no-repeat',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transform: 'translate(var(--pd-hp-x), var(--pd-hp-y))',
  },
  hpHeart: { position: 'absolute', left: -7, height: 'calc(var(--pd-hph) + 8px)', zIndex: 1, pointerEvents: 'none' },
  hpTrack: { position: 'absolute', left: '12%', right: '9%', top: '26%', bottom: '28%', overflow: 'hidden', borderRadius: 4 },
  hpFill: { height: '100%', background: 'linear-gradient(180deg,#d94a35,#8e1f14)', transition: 'width 0.15s' },
  hpText: { position: 'relative', paddingLeft: '6%', fontSize: 'var(--pd-hpfz)', textShadow: '0 1px 2px #000', whiteSpace: 'nowrap' },
  waveBanner: {
    flex: 1.5, minWidth: 0, height: 'var(--pd-wavebh)', alignSelf: 'center',
    background: 'url(/ui/wave_banner.png) center / 100% 100% no-repeat',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    transform: 'translate(var(--pd-wave-x), var(--pd-wave-y))',
  },
  waveTitle: { fontSize: 'var(--pd-wavefz)', color: '#e8b962', textShadow: '0 1px 2px #000', lineHeight: 1, transform: 'translate(var(--pd-wtitle-x), var(--pd-wtitle-y))' },
  diaRow: { display: 'flex', gap: 3, transform: 'translate(var(--pd-dia-x), var(--pd-dia-y))' },
  dia: { width: 'var(--pd-diasz)', height: 'var(--pd-diasz)', objectFit: 'contain' },
  bossWrap: { flexShrink: 0, alignSelf: 'stretch', display: 'flex', transform: 'translate(var(--pd-boss-x), var(--pd-boss-y))' },
  overlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,6,3,0.75)' },
  overlayText: { position: 'absolute', top: '40%', left: 0, right: 0, textAlign: 'center', fontSize: 'var(--pd-clearfz)', transform: 'translate(var(--pd-clear-x), var(--pd-clear-y))', color: GOLD, textShadow: '0 2px 8px rgba(0,0,0,0.8)', pointerEvents: 'none' },
  retryBtn: { padding: '12px 32px', fontSize: 17, borderRadius: 12, border: `1px solid ${GOLD_D}`, background: 'linear-gradient(180deg,#d4872e,#a85f1f)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' },
  tabs: { display: 'flex', gap: 5, padding: '8px 6px 2px', background: 'transparent' },
  tabBtn: {
    flex: 1, padding: 'var(--pd-tabpt) 0 var(--pd-tabpb)', border: 'none', background: 'transparent',
    backgroundImage: 'url(/ui/tab_off.png)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    color: '#b6a488', fontSize: 'var(--pd-tabfz)', position: 'relative', filter: 'grayscale(0.2)',
  },
  tabActive: {
    backgroundImage: 'url(/ui/tab_on.png)', backgroundSize: '100% 100%',
    color: '#fff4d8', filter: 'none',
  },
  panel: {
    flex: 1, overflow: 'hidden', minHeight: 0,
    background: 'rgba(20,13,7,0.55)',
    borderStyle: 'solid', borderWidth: 'var(--pd-panelbw-v) var(--pd-panelbw-h)',
    borderImage: 'url(/ui/panel.png) 29 20 26 19 fill / var(--pd-panelbw-v) var(--pd-panelbw-h) stretch',
    margin: '3px 0 0', padding: '4px 4px 2px', transform: 'translate(var(--pd-panel-x), var(--pd-panel-y))',
    display: 'flex', flexDirection: 'column', gap: 'var(--pd-rowgap)',
  },
  frameBox: {
    flex: 1, minHeight: 0,
    background: 'rgba(20,13,7,0.55)',
    borderStyle: 'solid', borderWidth: 'var(--pd-panelbw-v) var(--pd-panelbw-h)',
    borderImage: 'url(/ui/panel.png) 29 20 26 19 fill / var(--pd-panelbw-v) var(--pd-panelbw-h) stretch',
    margin: '3px 0 0', padding: '4px 4px 2px', transform: 'translate(var(--pd-panel-x), var(--pd-panel-y))',
    display: 'flex', flexDirection: 'column',
  },
  tabsInner: { display: 'flex', gap: 5, padding: '0 0 5px', flexShrink: 0, transform: 'translate(var(--pd-tab-x), var(--pd-tab-y))' },
  panelInner: { flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 0 12px' },
  row: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'transparent',
    borderStyle: 'solid', borderWidth: 'var(--pd-rowbw-v) var(--pd-rowbw-h)',
    borderImage: 'url(/ui/row.png) 24 23 24 24 fill / var(--pd-rowbw-v) var(--pd-rowbw-h) stretch',
    padding: '2px 3px', minHeight: 'var(--pd-rowmin)', transform: 'translate(var(--pd-row-x), var(--pd-row-y))',
  },
  rowName: { fontSize: 'var(--pd-name)', transform: 'translate(var(--pd-name-x), var(--pd-name-y))' },
  rowLv: { fontSize: 'var(--pd-lv)', color: GOLD, marginLeft: 4 },
  rowVal: { fontSize: 'var(--pd-val)', opacity: 0.82, marginTop: 1, whiteSpace: 'nowrap', transform: 'translate(var(--pd-val-x), var(--pd-val-y))' },
  dbgBtn: { width: 27, padding: '7px 0', borderRadius: 6, border: '1px solid #5a4028', background: 'linear-gradient(180deg,#2c2013,#1e150b)', color: '#f3e6d0', fontSize: 15, flexShrink: 0 },
  dbgInput: { width: 'var(--pd-inputw)', padding: '6px 2px', borderRadius: 6, border: '1px solid #5a4028', background: '#160e07', color: GOLD, fontSize: 'var(--pd-inputfz)', textAlign: 'center', flexShrink: 0, fontFamily: "'Do Hyeon',sans-serif", transform: 'translate(var(--pd-input-x), var(--pd-input-y))' },
  costBtn: {
    touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
    minWidth: 'var(--pd-costw)', height: 'var(--pd-costh)', padding: '0 8px', border: 'none', background: 'transparent',
    backgroundImage: 'url(/ui/btn.png)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    color: '#fff4d8', fontSize: 'var(--pd-costfz)', flexShrink: 0, textShadow: '0 1px 2px #4a0e0e',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translate(var(--pd-cost-x), var(--pd-cost-y))',
  },
  plusBtn: { border: '1px solid #a85f1f', background: 'linear-gradient(180deg,#d4872e,#a85f1f)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)' },
  minusBtn: { border: '1px solid #5a4028', background: 'linear-gradient(180deg,#2c2013,#1e150b)', color: '#cbb89a' },
  bossBtn: {
    border: 'none', height: 'var(--pd-bossh)', alignSelf: 'center', aspectRatio: '300 / 135', padding: '0 0 2px 12%',
    background: 'transparent url(/ui/boss_btn.png) center / 100% 100% no-repeat',
    color: '#ffe0d0', whiteSpace: 'nowrap', lineHeight: 1,
  },
  bossText: { display: 'inline-block', fontSize: 'var(--pd-bossfz)', textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-btext-x), var(--pd-btext-y))' },
  // ── 오프라인 보상: 보물상자 ──
  treasureBtn: { position: 'absolute', left: 6, bottom: 6, width: 'var(--pd-trsz)', height: 'var(--pd-trsz)', padding: 0, border: 'none', background: 'transparent', zIndex: 40, pointerEvents: 'auto', transform: 'translate(var(--pd-tr-x), var(--pd-tr-y))', cursor: 'pointer' },
  treasureImg: { width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))' },
  treasureDot: { position: 'absolute', top: '2%', right: '2%', width: 12, height: 12, borderRadius: '50%', background: '#e23b3b', border: '2px solid #2a1a0c', boxShadow: '0 0 6px #ff5a5a', pointerEvents: 'none' },
  // ── 오프라인 보상: 창 ──
  offWin: { position: 'relative', width: 'var(--pd-offw)', maxWidth: '94%', aspectRatio: '1024 / 1536', background: 'url(/ui/off_frame.png) center / 100% 100% no-repeat', padding: '9% 9% 8%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '2.5%', boxSizing: 'border-box' },
  offClose: { position: 'absolute', top: '2.5%', right: '4%', width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.35)', color: '#f3e6d0', fontSize: 14, lineHeight: 1, cursor: 'pointer', zIndex: 2, padding: 0 },
  offTitle: { flexShrink: 0, textAlign: 'center', fontSize: 'var(--pd-offtfz)', color: '#f3e6d0', fontWeight: 800, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-offt-x), var(--pd-offt-y))' },
  offInfo: { flexShrink: 0, textAlign: 'center', fontSize: 'var(--pd-offnfz)', color: '#e8d5b0', fontWeight: 700, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-offn-x), var(--pd-offn-y))' },
  offItems: { flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: '100%', gap: 'var(--pd-offgap)', marginTop: '2%', transform: 'translate(var(--pd-offit-x), var(--pd-offit-y))' },
  offItem: { position: 'relative', width: 'var(--pd-offiw)', height: 'var(--pd-offih)', background: 'url(/ui/off_item.png) center / 100% 100% no-repeat', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, flexShrink: 0 },
  offItemIc: { width: 'var(--pd-offic)', height: 'var(--pd-offic)', objectFit: 'contain', transform: 'translate(var(--pd-offiti-x), var(--pd-offiti-y))' },
  offItemVal: { fontSize: 'var(--pd-offifz)', fontWeight: 800, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-offv-x), var(--pd-offv-y))' },
  offItemRate: { fontSize: 'var(--pd-offrfz)', color: '#c9b596', textShadow: '0 1px 1px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-offr-x), var(--pd-offr-y))' },
  offBtns: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4%', marginTop: 'auto' },
  offBtnAd: { width: 'var(--pd-offbtw)', height: 'var(--pd-offbth)', background: 'url(/ui/off_btn.png) center / 100% 100% no-repeat', border: 'none', color: '#4a2e0e', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, transform: 'translate(var(--pd-offbt-x), var(--pd-offbt-y))' },
  offBtnAdText: { fontSize: 'var(--pd-offbfz)', lineHeight: 1.1, textAlign: 'center', textShadow: '0 1px 1px rgba(255,220,150,0.4)' },
  offBtnClaim: { width: 'var(--pd-offclw)', height: 'var(--pd-offclh)', background: 'url(/ui/off_claim.png) center / 100% 100% no-repeat', border: 'none', color: '#f0f0f0', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, transform: 'translate(var(--pd-offcl-x), var(--pd-offcl-y))' },
  offBtnClaimText: { fontSize: 'var(--pd-offcfz)', textShadow: '0 1px 2px #000' },
  mailImg: { width: 'var(--pd-mailsz)', height: 'var(--pd-mailsz)', objectFit: 'contain', flexShrink: 0, transform: 'translate(var(--pd-mailbox-x), var(--pd-mailbox-y))' },
  questBtn: { position: 'absolute', top: 8, right: 8, width: 'var(--pd-questsz)', height: 'var(--pd-questsz)', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', zIndex: 5, transform: 'translate(var(--pd-quest-x), var(--pd-quest-y))' },
  iconImg: { width: '100%', height: '100%', objectFit: 'contain' },
  // ── 장비 상세창 ──
  dOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 'calc(70px + env(safe-area-inset-bottom))', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 14 },
  dBox: { position: 'relative', width: '100%', maxWidth: 360, maxHeight: '100%', overflowY: 'auto', background: 'linear-gradient(180deg,#3a2a1a,#2a1d10)', border: '2px solid #6b4a2a', borderRadius: 14, padding: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.6)' },
  dTabs: { display: 'flex', gap: 6, marginBottom: 10 },
  dTab: { flex: 1, height: 'var(--pd-dtabh)', border: 'none', borderRadius: 8, background: '#4a3826', color: '#c9b596', fontSize: 'var(--pd-dtabfz)', fontWeight: 700, cursor: 'pointer', transform: 'translate(var(--pd-dtab-x), var(--pd-dtab-y))' },
  dTabOn: { background: 'linear-gradient(180deg,#f0a740,#d07f1e)', color: '#3a1e02' },
  dBody: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  dGrade: { fontSize: 'var(--pd-dgradefz)', fontWeight: 800, marginTop: 4, transform: 'translate(var(--pd-dtitle-x), var(--pd-dtitle-y))' },
  dName: { fontSize: 'var(--pd-dtitlefz)', fontWeight: 800, color: '#f3e6d0', margin: '2px 0 8px', transform: 'translate(var(--pd-dtitle-x), var(--pd-dtitle-y))' },
  dIconRow: { display: 'flex', alignItems: 'center', gap: 12 },
  dArrow: { width: 40, height: 60, border: 'none', background: 'transparent', color: '#e0c9a0', fontSize: 'var(--pd-darrowfz)', cursor: 'pointer', padding: 0, transform: 'translate(var(--pd-darrow-x), var(--pd-darrow-y))' },
  dIconWrap: { position: 'relative', width: 'var(--pd-diconsz)', height: 'var(--pd-diconsz)', background: 'linear-gradient(180deg,#1a2540,#0f1730)', border: '3px solid #888', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transform: 'translate(var(--pd-dicon-x), var(--pd-dicon-y))' },
  dIcon: { width: '78%', height: '78%', objectFit: 'contain', imageRendering: 'pixelated' },
  dIconTier: { position: 'absolute', right: 4, bottom: 2, fontSize: 'var(--pd-dtierfz)', fontWeight: 800, textShadow: '0 1px 2px #000' },
  dCnt: { fontSize: 15, fontWeight: 700, color: '#e8d5b0', margin: '4px 0' },
  dSecTitle: { alignSelf: 'flex-start', fontSize: 14, color: '#c9b596', fontWeight: 700, margin: '10px 0 4px' },
  dStatBox: { width: '100%', background: 'rgba(0,0,0,0.28)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, boxSizing: 'border-box' },
  dStatRow: { display: 'flex', justifyContent: 'space-between', fontSize: 'var(--pd-dstatfz)', color: '#e8d5b0', transform: 'translate(var(--pd-dstat-x), var(--pd-dstat-y))' },
  dBtns: { display: 'flex', gap: 8, width: '100%', marginTop: 14 },
  dEnhBtn: { flex: 1, height: 'var(--pd-denhh)', border: 'none', borderRadius: 10, background: '#5a4632', color: '#c9b596', fontSize: 'var(--pd-denhfz)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transform: 'translate(var(--pd-denh-x), var(--pd-denh-y))' },
  dEnhBtnOn: { background: 'linear-gradient(180deg,#e85adf,#b02ea8)', color: '#fff' },
  dEnhIc: { width: 'var(--pd-denhic)', height: 'var(--pd-denhic)', objectFit: 'contain' },
  dEnhLv: { position: 'absolute', top: 3, right: 4, fontSize: 13, fontWeight: 800, color: '#ffd24a', textShadow: '0 1px 2px #000', pointerEvents: 'none' },
  dEquipBtn: { flex: 1, height: 'var(--pd-dequiph)', border: 'none', borderRadius: 10, background: 'linear-gradient(180deg,#c89a5a,#a06f2e)', color: '#3a1e02', fontSize: 'var(--pd-dequipfz)', fontWeight: 800, cursor: 'pointer', transform: 'translate(var(--pd-dequip-x), var(--pd-dequip-y))' },
  dEquipOn: { background: '#4a3826', color: '#c9b596' },
  dFuseNote: { fontSize: 13, color: '#e0c9a0', margin: '2px 0 12px', textAlign: 'center' },
  dArrowDown: { fontSize: 22, color: '#e23b3b', margin: '4px 0' },
  dStepper: { display: 'flex', alignItems: 'center', gap: 14, margin: '12px 0' },
  dStepBtn: { width: 'var(--pd-dstepsz)', height: 'var(--pd-dstepsz)', border: 'none', borderRadius: 8, background: '#c8b090', color: '#2a1d10', fontSize: 22, fontWeight: 800, cursor: 'pointer', transform: 'translate(var(--pd-dstep-x), var(--pd-dstep-y))' },
  dStepVal: { fontSize: 'var(--pd-dstepfz)', fontWeight: 800, color: '#f3e6d0', minWidth: 40, textAlign: 'center' },
  dFuseBtn: { width: '100%', height: 'var(--pd-dfuseh)', border: 'none', borderRadius: 10, background: 'linear-gradient(180deg,#f0a740,#d07f1e)', color: '#3a1e02', fontSize: 'var(--pd-dfusefz)', fontWeight: 800, cursor: 'pointer', marginTop: 6, transform: 'translate(var(--pd-dfusebtn-x), var(--pd-dfusebtn-y))' },
  dMaxNote: { fontSize: 15, color: '#c9b596', padding: '30px 0' },
  dClose: { position: 'absolute', top: 8, right: 10, width: 28, height: 28, border: 'none', borderRadius: '50%', background: 'rgba(0,0,0,0.4)', color: '#f3e6d0', fontSize: 15, cursor: 'pointer', padding: 0 },
}

