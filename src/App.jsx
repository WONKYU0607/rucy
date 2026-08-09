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
// ── 편집기는 PC 전용: 모바일에선 UI 편집(⚙)·모션 편집 메뉴를 아예 노출하지 않는다 ──
const IS_PC = (() => {
  if (typeof navigator === 'undefined') return true
  const ua = navigator.userAgent || ''
  if (/Android|iPhone|iPad|iPod|IEMobile|Mobile/i.test(ua)) return false
  if (/Mac/i.test(ua) && (navigator.maxTouchPoints || 0) > 1) return false   // iPadOS 13+ 는 맥 UA로 위장한다
  return true
})()
// ── 코드에 박아둔 UI·모션 값의 기준 시각 ─────────────────────────────
// 저장된(브라우저/클라우드) 편집 시각이 이 시각보다 **오래됐으면** 코드값으로 덮는다.
// · 모바일처럼 편집 안 하는 기기 → 배포만 하면 PC 값이 자동으로 들어옴
// · PC에서 배포 후 편집한 값 → 편집 시각이 더 최신이라 그대로 유지됨
// 사용자 설정을 코드에 새로 박을 때만 이 줄을 현재 시각으로 갱신할 것.
// 진입창(TAP TO START) 배경: 한국어 사용자는 기존 그림, 그 외에는 영문 그림.
// ?intro=en / ?intro=ko 로 강제 지정(테스트용)
const isKoUser = () => { try { return /^ko/i.test(navigator.language || (navigator.languages || [])[0] || '') } catch { return true } }
const SPLASH_BG = (() => {
  let ko = isKoUser()
  try { const q = new URLSearchParams(location.search); if (q.get('intro') === 'en') ko = false; if (q.get('intro') === 'ko') ko = true } catch {}
  return ko ? '/startbg/startbg.webp' : '/startbg/startbg_en.webp'
})()
const CFG_STAMP = Date.parse('2026-08-09T21:20:00+09:00')

// ── 주인공 애니메이션 (flip 틀리면 해당 값만 수정) ──
const ANIM = {
  quad:  { srcs: ['/hero/quad/quad_1.webp', '/hero/quad/quad_2.webp', '/hero/quad/quad_3.webp', '/hero/quad/quad_4.webp'], h: 75,  flip: false },
  walk:  { srcs: ['/hero/walk/walk_1.webp', '/hero/walk/walk_2.webp', '/hero/walk/walk_3.webp', '/hero/walk/walk_4.webp'], h: 120, flip: false },
  run:   { srcs: ['/hero/run/run_1.webp', '/hero/run/run_2.webp', '/hero/run/run_3.webp', '/hero/run/run_4.webp'], h: 120, flip: false },
  punch: { srcs: ['/hero/punch/punch_1.webp', '/hero/punch/punch_2.webp', '/hero/punch/punch_3.webp'], h: 100, flip: false },
  throw: { srcs: ['/hero/throw/hero_windup.webp', '/hero/throw/hero_release.webp'], h: 120, flip: false },
  idle:  { srcs: ['/hero/idle/idle_1.webp'], h: 120, flip: false },
  ewalk: { srcs: ['/hero/erectus_walk/ewalk_1.webp', '/hero/erectus_walk/ewalk_2.webp', '/hero/erectus_walk/ewalk_3.webp', '/hero/erectus_walk/ewalk_4.webp'], h: 120, flip: false },
  eatk1: { srcs: ['/hero/erectus_atk1/eatk1_1.webp', '/hero/erectus_atk1/eatk1_2.webp', '/hero/erectus_atk1/eatk1_3.webp'], h: 135, flip: false },
  nwalk: { srcs: ['/hero/neander_walk/nwalk_1.webp', '/hero/neander_walk/nwalk_2.webp', '/hero/neander_walk/nwalk_3.webp', '/hero/neander_walk/nwalk_4.webp'], h: 120, flip: false },
  natk1: { srcs: ['/hero/neander_atk1/natk1_1.webp', '/hero/neander_atk1/natk1_2.webp'], h: 130, flip: false },
  pwalk: { srcs: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `/hero/sapiens_walk/pwalk_${i}.webp`), h: 140, flip: false },
  patk1: { srcs: [2, 3, 4, 5].map(i => `/hero/sapiens_atk1/patk1_${i}.webp`), h: 157, flip: false },   // 1번 삭제됨
  hmwalk: { srcs: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `/hero/human_walk/hmwalk_${i}.webp`), h: 140, flip: false },
  hmatk1: { srcs: [1, 2, 3, 4].map(i => `/hero/human_atk1/hmatk1_${i}.webp`), h: 157, flip: false },
}
// 스킬 정의 — charSeq: 히어로가 재생할 프레임(1-based, 없으면 전체), fx: 분리 이펙트
//   fx proj  = 투사체: fly 프레임이 몬스터 쪽으로 날아가 명중 시 데미지(+impact 프레임)
//   fx strike = 낙하/타격: 적 위치에 frames 재생, 중반에 데미지
// stage — 0:4족보행 1:직립보행 2:에렉투스 3:네안데르탈인 4:사피엔스 5:인간
const PASSIVE_KEYS = [
  ['beast', '야수의 본능', '기본공격 피해 증가'],
  ['rage', '광폭화', '공격속도 증가'],
  ['crush', '분쇄', '치명타 피해 증가'],
  ['battlerush', '전투의 열기', '적 처치 시 공격력 증가(중첩)'],
  ['hunter', '사냥꾼의 본능', '고기 획득량 증가'],
  ['expblessing', '경험의 축복', '경험치 획득량 증가'],
  ['battlestart', '전투 시작', '전투 시작 후 일정 시간마다 공격력 증가'],
  ['swift', '신속한 훈련', '일정 시간마다 공격속도 증가'],
]
// 진화 단계별 패시브 (아이콘: 단계별 폴더). 이름/능력치 추후 확정 — 지금은 표시·장착만
const PASSIVE_TIERS = [
  { base: 101, path: k => `/skill/passive/${k}.webp`, stages: [0, 1] },          // 오스트랄로피테쿠스(4족+직립)
  { base: 111, path: k => `/skill/passive/erectus_${k}.webp`, stages: [2] },     // 호모 에렉투스
  { base: 121, path: k => `/skill/passive/neander_${k}.webp`, stages: [3] },     // 호모 네안데르탈인
  { base: 131, path: k => `/skill/passive/sapiens_${k}.webp`, stages: [4] },     // 호모 사피엔스
  { base: 141, path: k => `/skill/passive/human_${k}.webp`, stages: [5] },       // 인간
]
const PASSIVE_SHEET = PASSIVE_TIERS.flatMap(t => PASSIVE_KEYS.map(([k, nm, ds], i) => ({ id: t.base + i, n: 1, h: 0, stage: -1, stages: t.stages, passive: true, ic: t.path(k), title: nm, desc2: ds })))
const SKILL_SHEET = [
  { id: 1, n: 6, h: 280, stage: 1, title: '번개 바위', charSeq: [1, 2, 3, 4], fx: { type: 'strike', frames: [5, 6], fxH: 240 } },
  { id: 2, n: 5, h: 250, stage: 1, title: '전기 작살', charSeq: [1, 2], fx: { type: 'proj', fly: [3, 4], impact: 5, fxH: 200 } },
  { id: 7, n: 6, h: 110, stage: 0, title: '할퀴기' },
  { id: 8, n: 6, h: 140, stage: 0, title: '내려치기' },
  { id: 13, n: 7, h: 120, stage: 0, title: '데굴데굴' },
  { id: 15, n: 5, h: 120, stage: 0, title: '로우킥' },
  { id: 16, n: 6, h: 145, stage: 0, title: '바위치기', charSeq: [1, 2], fx: { type: 'strike', frames: [3, 4, 5, 6] } },
  { id: 17, n: 5, h: 133, stage: 0, title: '포효' },
  { id: 18, n: 5, h: 210, stage: 1, title: '바위치기 (강화)', charSeq: [1, 2], fx: { type: 'strike', frames: [3, 4, 5] } },
  { id: 20, n: 5, h: 195, stage: 1, title: '바위 회오리', charSeq: [1, 2, 3, 5], fx: { type: 'proj', fly: [4], flyScale: 0.9, yOff: 0 } },
  { id: 22, n: 4, h: 180, stage: 1, title: '전광석화', charSeq: [1, 2, 3, 4], cd: 2, dmgMult: 3 },   // 나중에 손볼 예정(킵)
  { id: 23, n: 6, h: 180, stage: 1, title: '사신과 함께', charSeq: [3, 4, 3, 4, 6], cd: 2, dmgMult: 3, aoe: true, rangePx: 200 },   // 원투-원투-어퍼컷 — 3·4·6번 그림만 사용(1·2·5번 삭제됨), 기본사거리 1.5배 내 모두
  // ── 호모 에렉투스(stage 2) ── 효과(대상/데미지/사거리/쿨타임)는 인게임 스킬 상세창에서 조절
  { id: 24, n: 7, h: 200, stage: 2, title: '암흑 강타', charSeq: [2, 4, 6, 7], cd: 2, dmgMult: 3 },
  { id: 25, n: 5, h: 200, stage: 2, title: '뇌전 질주', charSeq: [1, 2, 3, 5], cd: 2, dmgMult: 3 },
  { id: 26, n: 6, h: 200, stage: 2, title: '회전 폭풍', charSeq: [1, 2, 3, 4, 5, 6], cd: 2, dmgMult: 3, aoe: true, rangePx: 150 },
  { id: 27, n: 5, h: 200, stage: 2, title: '화염 참격', charSeq: [1, 2, 4, 5, 3], cd: 2, dmgMult: 3 },
  { id: 28, n: 7, h: 200, stage: 2, title: '피폭', charSeq: [1, 2, 3, 5, 6, 7], cd: 2, dmgMult: 3, aoe: true },
  // 29·30: 히어로 모션(charSeq)과 이펙트(fx)가 각각 다른 시트 → 이펙트가 별도 레이어라 몹에 안 가림
  { id: 29, n: 7, h: 200, stage: 2, title: '사이오닉 스톰', charSeq: [1, 2, 3], fx: { type: 'strike', frames: [4, 5, 6, 7], fxH: 240, hitP: 0.6 }, cd: 2, dmgMult: 3, aoe: true, rangePx: 150 },
  { id: 38, n: 6, h: 200, stage: 4, title: '난도질', charSeq: [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6], cd: 2, dmgMult: 3, aoe: true, rangePx: 150, hitAt: 0.6 },   // 쌍칼 회전 베기 — 이펙트가 그림에 포함
  { id: 37, n: 8, h: 200, stage: 4, title: '순보', charSeq: [1, 2, 3, 4, 5, 6, 7, 8, 2, 3, 4], cd: 2, dmgMult: 3, aoe: true, rangePx: 200, hitAt: 0.55 },   // 대시 — 오른쪽 1~5 + 왼쪽 2~4, 끝에 2·3·4 재생
  { id: 36, n: 9, h: 200, stage: 3, title: '불놀이야', charSeq: [1, 2, 3, 4, 5, 6, 7, 8, 9], cd: 2, dmgMult: 3, aoe: true, rangePx: 150 },   // 9프레임 전부 히어로 모션 — 이펙트가 그림에 포함(별도 fx 없음)
  { id: 35, n: 7, h: 200, stage: 3, title: '토네이도', charSeq: [1, 2, 3], fx: { type: 'strike', frames: [5, 6, 5, 6, 7], fxH: 260, hitP: 0.65, twin: { gap: 30, spd: 1.2 } }, cd: 2, dmgMult: 3, aoe: true, rangePx: 200 },   // 5·6 왕복 2바퀴 → 7 소멸, 같은 프레임 2장 교차
  { id: 34, n: 7, h: 200, stage: 3, title: '엑스밤', charSeq: [1, 2, 3], fx: { type: 'strike', frames: [5, 6, 7], fxH: 260, hitP: 0.8 }, cd: 2, dmgMult: 3, aoe: true, rangePx: 200 },
  { id: 33, n: 10, h: 200, stage: 3, title: '지각변동', charSeq: [1, 2, 3, 4, 5, 6], fx: { type: 'strike', frames: [7, 8, 9, 10], fxH: 200, hitP: 0.7 }, cd: 2, dmgMult: 3, aoe: true, rangePx: 200 },
  { id: 32, n: 5, h: 200, stage: 3, title: '얼음도끼', charSeq: [1, 2, 3, 4, 5], cd: 2, dmgMult: 3, aoe: true, rangePx: 150 },   // 이펙트가 그림에 포함 — 별도 fx 없음
  { id: 31, n: 8, h: 200, stage: 3, title: '회전 도끼', charSeq: [1, 2, 1, 2, 3], fx: { type: 'proj', fly: [5, 6, 7, 8], fxH: 120 }, cd: 2, dmgMult: 3 },   // 관통 투사체
  ...PASSIVE_SHEET,   // 진화 단계별 패시브 (오스트랄로~인간)
]
// 스킬 전체 프레임 이미지 (이펙트 렌더용)
// 스킬 아이콘: 해당 스킬 시트의 지정 프레임 사용 (없으면 번호 텍스트)
const SKILL_ICON_FRAME = { 1: 6, 2: 5, 7: 3, 8: 4, 13: 4, 15: 3, 16: 3, 17: 4, 18: 4, 20: 4, 22: 4, 23: 6, 24: 7, 25: 3, 26: 3, 27: 1, 28: 6, 29: 6, 31: 6, 32: 2, 33: 10, 34: 7, 35: 5, 36: 2, 37: 2, 38: 4 }
// 스킬 효과(대상/데미지/사거리/쿨타임)를 인게임 상세창에서 조절 — 인덱스가 아닌 **id 기준**이라
// 스킬을 넣고 빼도 값이 안 밀린다(예전 cdConf는 인덱스 배열이라 매번 리셋됐음).
const skEff = (sk, cfg) => {
  const c = (cfg || {})[sk.id] || {}
  return {
    cd: c.cd ?? sk.cd,
    dmgMult: c.dmg ?? sk.dmgMult,
    aoe: c.aoe != null ? !!c.aoe : sk.aoe,
    rangePx: c.range != null ? (c.range > 0 ? c.range : null) : (sk.rangePx ?? null),   // px, 0/null = 화면 전체
  }
}
const skillIconSrc = id => SKILL_ICON_FRAME[id] ? `/skill/s${id}/s${id}_${SKILL_ICON_FRAME[id]}.webp` : null
const skIcon = s => (s ? (skillIconSrc(s.id) || s.icon2 || null) : null)
// ── 전리품 조각 (사망 드롭 → 상단 재화칸 흡수 연출) ──
const LOOT_IMG = { meat: '/ui/ic_meat.webp', exp: '/ui/ic_exp.webp', dia: '/ui/gem.webp', mat: '/ui/mat4.webp' }
const LOOT_CIMG = {}
// ── 초기 로딩 진행률 ──
// 프리로드 이미지를 세어 스플래시에서 "게임 로드중"으로 대기시킨다.
// 에러(404)도 완료로 세지 않으면 한 장 때문에 영영 안 끝나므로 load·error 둘 다 완료 처리한다.
// 캐시 히트면 핸들러를 걸기 전에 이미 끝나 있을 수 있어 src 지정 뒤 complete 를 한 번 확인한다.
const PRE = { total: 0, done: 0 }
const track = im => {
  PRE.total++
  let counted = false
  const fin = () => { if (!counted) { counted = true; PRE.done++ } }
  im.addEventListener('load', fin, { once: true })
  im.addEventListener('error', fin, { once: true })
  if (im.complete) fin()
  return im
}
const mkImg = src => { const i = new Image(); i.src = src; return track(i) }

for (const k in LOOT_IMG) { LOOT_CIMG[k] = mkImg(LOOT_IMG[k]) }
const DROP_DIA_P = 0.3, DROP_MAT_P = 0.3   // 임시 확률 — 추후 웨이브 비례 공식으로 교체
function LootPiece({ p, done }) {
  const r = useRef(null)
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = r.current
      if (el) { el.style.transform = `translate(${p.tx - p.x}px, ${p.ty - p.y}px) scale(0.2)`; el.style.opacity = '0' }
    }))
    const t = setTimeout(done, 620)
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
const ADV_TIME = 60            // 모험 제한시간(초)
const ADV_MOBS = 50            // 보스 등장 전 처치해야 할 일반몹 수
const ADV_WARN = 2.0           // 보스 등장 경고 연출 시간(초)
// ── 공격 타이밍 ──────────────────────────────────────────────
// 보스 공룡: 프레임별 재생 시간(초) 4개 [준비, 웅크림, 타격, 마무리] — 합이 그 종의 공격 모션 길이
const DINO_ATK_T = {
  trex:    [0.09, 0.25, 0.13],           // 4번 제외
  spino:   [0.08, 0.12, 0.15],           // 4번 제외
  trike:   [0.09, 0.16, 0.16],           // 1번 제외
  stego:   [0.15, 0.15, 0.08],           // 1번 제외
  raptor:  [0.03, 0.09, 0.10, 0.05],     // 전부 사용
  anky:    [0.15, 0.15, 0.10],           // 1번 제외
  ptera:   [0.30, 0.20],                 // 1·3번만 사용
  brachio: [0.12, 0.23, 0.16],           // 1번 제외
}
const DINO_ATK_DEF = [0.10, 0.13, 0.08, 0.14]
// 종별로 실제 사용할 공격 프레임 번호 (지정 없으면 1~4 전부)
const DINO_ATK_FRAMES = {
  trex: [1, 2, 3], spino: [1, 2, 3],
  trike: [2, 3, 4], stego: [2, 3, 4], anky: [2, 3, 4], brachio: [2, 3, 4],
  ptera: [1, 3],
}
const DINO_NAME = { trex: '티라노', spino: '스피노', trike: '트리케라톱스', stego: '스테고', raptor: '랩터', anky: '안킬로', ptera: '익룡', brachio: '브라키오' }
// 종별 정지 위치 보정(px): +면 더 오른쪽(멀리)에서 멈춤, −면 더 가까이
const DINO_STOP = { trex: 51, spino: 11, trike: 16, stego: 0, raptor: 2, anky: 0, ptera: 23, brachio: -21 }
const DINO_KEYS = ['trex', 'spino', 'trike', 'stego', 'raptor', 'anky', 'ptera', 'brachio']

const HERO_STAGE_ATK = ['punch', 'throw', 'eatk1', 'natk1', 'patk1', 'hmatk1']   // 진화단계(0~5) → 기본공격 스프라이트 키

// ── 모션 설정: 인게임 편집기에서 실시간 조절 (localStorage 'paleoMotion') ──
const MOTION_DEFAULT = {
  atk: DINO_ATK_T,                                            // 보스 종별 프레임 시간(초)
  hit: { trex: 3, spino: 3, trike: 2, stego: 2, raptor: 3, anky: 2, ptera: 2, brachio: 2 },  // 데미지 프레임 번호
  cd: { advBoss: 1000, advMob: 1000, wave: 1000 },             // 공격 간격(ms)
  dur: { advMob: 0.30, wave: 0.30 },                           // 공격 프레임 없는 적의 모션 길이(초)
  lunge: { boss: 23, mob: 30 },                                // 보스 파고듦(웨이브 일반몹은 공격 안 함)
  stop: { ...DINO_STOP },                                      // 종별 정지 위치 보정(px, +면 멀리)
  size: { trex: 1.08, spino: 1.15, trike: 1.04, stego: 1.20, raptor: 0.90, anky: 1, ptera: 1.05, brachio: 1.73 },  // 종별 크기 배율
  hero: {
    sz: 0.85, x: -35, y: 0,
    walkSz: { 0: 0.95, 1: 0.96, 2: 0.94, 3: 0.94, 4: 0.86, 5: 0.9 },
    skillHide: {"35": 1},                  // 1이면 히어로 모션이 끝나는 순간부터 이펙트가 끝날 때까지 히어로를 안 그림 (토네이도처럼 이펙트만 남겨야 하는 스킬)
    skillFront: {"22": 1, "23": 1, "24": 1, "25": 1, "26": 1, "27": 1, "28": 1, "29": 0, "31": 1, "32": 1, "33": 1, "34": 1, "35": 0, "36": 1},   // 1이면 그 스킬 시전 중 히어로를 몬스터 위에 그림
    skillSz: {"1": 0.85, "2": 0.85, "7": 0.9, "8": 0.95, "13": 0.85, "15": 0.83, "17": 0.88, "18": 1.07, "20": 1.06, "22": 1.03, "23": 0.9, "24": 0.9, "25": 0.8, "26": 0.54, "27": 0.8},   // 스킬별 크기
    skillPos: {"23": {"x": -5}},   // 스킬별 위치
    skillFrSz: {"37": {"1": 0.5, "2": 0.5, "3": 0.5, "4": 0.5, "5": 0.5, "6": 0.5, "7": 0.5, "8": 0.5, "9": 0.5, "10": 0.5, "11": 0.5}, "38": {"1": 0.55, "2": 0.55, "3": 0.55, "4": 0.55, "5": 0.55, "6": 0.55, "7": 0.55, "8": 0.55, "9": 0.55, "10": 0.55, "11": 0.55, "12": 0.55}, "2": {"2": 0.98}, "22": {"4": 0.95}, "23": {"1": 0.97, "2": 0.97, "3": 0.97, "4": 0.97, "5": 0.97}, "25": {"1": 0.98, "2": 1.06, "3": 1.18}, "28": {"1": 2.1, "2": 2.1, "3": 2.1, "4": 1.7, "5": 1.6, "6": 1.91}, "29": {"1": 0.88, "2": 0.87, "3": 0.9}, "31": {"1": 0.6, "2": 0.6, "3": 0.6, "4": 0.6, "5": 0.65}, "32": {"1": 0.73, "2": 0.73, "3": 0.75, "4": 0.75, "5": 0.82}, "33": {"1": 0.9, "2": 0.98, "3": 0.95, "5": 0.99, "6": 0.99}, "34": {"1": 0.98, "2": 1.02, "3": 1.08}, "35": {"1": 0.85, "2": 0.88, "3": 0.86}, "36": {"1": 0.78, "2": 0.75, "3": 0.77, "4": 0.81, "5": 0.79, "6": 0.77, "7": 0.81, "8": 0.77, "9": 0.8}},   // 스킬 프레임별 크기
    skillFrPos: {"38": {"2": {"x": 5}, "3": {"x": 10}, "4": {"x": 15}, "5": {"x": 20}, "6": {"x": 25}, "8": {"x": 5}, "9": {"x": 10}, "10": {"x": 15}, "11": {"x": 20}, "12": {"x": 25}}, "22": {"2": {"x": 20}, "3": {"x": 75}, "4": {"x": 155}}, "23": {"1": {"x": 35}, "2": {"x": 70}, "3": {"x": 105}, "4": {"x": 140}, "5": {"x": 175}}, "24": {"3": {"x": 50, "y": 14}, "4": {"y": 15, "x": 50}}, "25": {"1": {"y": 7}, "2": {"x": 45, "y": 3}, "3": {"x": 86, "y": 5}, "4": {"x": 100, "y": 9}}, "26": {"1": {"x": 20}, "2": {"x": 40}, "3": {"x": 60}, "4": {"x": 80}, "5": {"x": 100}, "6": {"x": 120}}, "27": {"1": {"x": 20}, "2": {"x": 20}, "3": {"x": 25}, "4": {"x": 15}, "5": {"x": 20}}, "28": {"1": {"x": 22, "y": 0}, "2": {"y": 3, "x": 30}, "3": {"x": 50, "y": -45}, "4": {"x": 110, "y": 13}, "5": {"x": 128, "y": 12}, "6": {"x": 132, "y": 16}}, "29": {"1": {"x": 10, "y": 3}, "2": {"x": 10, "y": 5}, "3": {"x": 2}}, "31": {"1": {"y": 2, "x": -4}, "2": {"y": 2}, "3": {"x": -4}, "5": {"x": -21, "y": 4}}, "32": {"1": {"y": 3, "x": -28}, "2": {"y": 6, "x": 34}, "3": {"y": 4, "x": 6}, "4": {"x": 37, "y": 3}, "5": {"y": 9, "x": 100}}, "33": {"1": {"y": 3, "x": -4}, "2": {"x": 10, "y": -14}, "3": {"x": 30, "y": -15}, "4": {"x": 105, "y": 10}, "5": {"x": 82, "y": 21}, "6": {"x": 84, "y": 20}}, "34": {"1": {"y": 3, "x": 1}, "2": {"x": 4, "y": 5}, "3": {"x": 10, "y": 4}}, "35": {"1": {"y": 4, "x": 5}, "2": {"y": 2, "x": 20}, "3": {"x": 30, "y": 1}}, "36": {"1": {"y": 4}, "3": {"y": 2}, "4": {"x": 18}, "5": {"x": 32, "y": 1}, "6": {"x": 62}, "7": {"y": 4, "x": 67}, "8": {"y": 3, "x": 73}, "9": {"y": 2, "x": 134}}},   // 스킬 프레임별 위치
    skillFrT: {"37": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], "38": [0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12], "18": [0.2, 0.25], "22": [0.12, 0.15, 0.18, 0.2], "23": [0.15, 0.15, 0.15, 0.15, 0.25], "24": [0.15, 0.15, 0.2, 0.2], "25": [0.12, 0.12, 0.12, 0.15], "26": [0.15, 0.15, 0.15, 0.15, 0.15, 0.15], "27": [0.1, 0.1, 0.1, 0.25, 0.25], "28": [0.15, 0.15, 0.2, 0.15, 0.2, 0.25], "29": [0.1, 0.15, 0.25], "31": [0.15, 0.15, 0.15, 0.15, 0.4], "32": [0.1, 0.17, 0.12, 0.12, 0.33], "33": [0.16, 0.15, 0.13, 0.13, 0.15, 0.35], "34": [0.2, 0.15, 0.25], "35": [0.15, 0.15, 0.15], "36": [0.12, 0.12, 0.05, 0.05, 0.1, 0.07, 0.07, 0.12, 0.2]},   // 스킬 프레임별 재생시간(초)
    evoSz: { 0: 0.95, 1: 0.85, 2: 0.9, 3: 0.88, 4: 0.9, 5: 0.9 },
    outline: {"blur": 10, "alpha": 0.8},   // 히어로 외곽 그림자
    range: {"0": 25, "1": 90, "2": 35, "3": 35, "4": 35, "5": 40},   // 진화단계별 기본공격 사거리(px). 히어로 x=200, 화면 폭 420 → 220이면 화면 끝
    hit: { erectus: 3, neander: 2, sapiens: 4, human: 4 },     // 데미지 프레임(1부터). 사피엔스는 1번 삭제로 4프레임
     // 데미지 프레임(1부터, 기본=마지막). 사피엔스는 1번 삭제로 4장이라 4
    atkFrX: { 'eatk1': { 2: 10, 3: 25 }, 'natk1': { 2: 20 }, 'hmatk1': { 1: 0, 2: 2, 4: 1 } },   // 기본공격 프레임별 좌우 보정(px)
    atkFrSz: { 'punch': { 1: 1.03, 2: 1.03, 3: 1.03 }, 'throw': { 1: 1, 2: 1 }, 'eatk1': { 1: 0.95, 2: 1, 3: 1 }, 'natk1': { 1: 0.95, 2: 1 }, 'patk1': { 1: 1.08, 2: 1.08, 3: 1.08, 4: 1.08 }, 'hmatk1': { 1: 1.09, 2: 1.07, 3: 1.05, 4: 1.05 } },   // 기본공격 프레임별 크기
  },  // walkSz(걷기)·evoSz(전체)는 진화단계별{0~5}, skillSz=스킬별{id:배율}, hit=모드별 타격 프레임, atkFrSz=공격 프레임별 크기
  ally: { hunter: { sz: 0.85, x: -21, y: -36, atkSz: 1, atkSpd: 1, projSz: 1.25, projX: 0, projY: -40 }, shaman: { sz: 0.85, x: 8, y: 0, atkSz: 1.04, atkSpd: 1, projSz: 0.6, projX: 0, projY: 5 }, healer: { sz: 0.85, x: 12, y: 38, atkSz: 1, atkSpd: 1 }, giant: { sz: 0.85, x: 0, y: -3, atkSz: 1, atkSpd: 1 } },  // 동료 크기·위치·공격프레임 크기·속도
  mob: {   // 일반몹 종별 크기·높이·정지·속도
    'd:trex': { sz: 1 }, 'd:spino': { sz: 1 }, 'd:trike': { sz: 1 }, 'd:stego': { sz: 1 },
    'd:raptor': { sz: 1 }, 'd:anky': { sz: 1 }, 'd:ptera': { sz: 1 }, 'd:brachio': { sz: 1 },
    'hyena': { sz: 1.07, stop: 30, spd: 1.5 }, 'bear': { sz: 1.16, y: -7, stop: 46, spd: 1.25 }, 'rhino': { sz: 1.13, stop: 43, spd: 1.2 }, 'mammoth': { sz: 0.92 },
    'rabbit': { sz: 1.6, stop: 15 }, 'antelope': { sz: 1.28, stop: -20 }, 'deer': { sz: 1, stop: 35 }, 'boar': { sz: 1, stop: 45, spd: 1.4 },
    'wolf': { sz: 1.14, stop: 40, spd: 1.5 }, 'tiger': { sz: 1.1, stop: 15, spd: 1.3 }, 'monkey': { sz: 1.07, y: -1, stop: -12, spd: 1.5 }, 'snake': { sz: 1.46, stop: 6, spd: 1.45 },
    'ostrich': { sz: 0.9, stop: 4 }, 'turtle': { sz: 1.11 }, 'croc': { sz: 1.73, stop: 5 }, 'komodo': { sz: 1.42, stop: 4 },
    'eagle': { sz: 0.91, y: -92, spd: 1.7 }, 'giraffe': { sz: 0.84 }, 'lion': { sz: 1.29, stop: 30, spd: 1.5 }, 'elephant': { sz: 1, stop: 40 },
    'pig': { sz: 1.25, stop: 5 }, 'chicken': { sz: 1.43, spd: 1.5 }, 'duck': { sz: 1.21, spd: 1.2 }, 'frog': { sz: 1.38, spd: 1.3 },
    'bat': { sz: 1.1, y: -57, stop: -4 }, 'pelican': { y: -62 }, 'mantis': { sz: 1.05, stop: -5 }, 'polarbear': { sz: 1.23, y: -1, stop: 25 },
    'alpaca': { sz: 1.18, stop: 4 }, 'buffalo': { sz: 1.22, stop: 8, spd: 1.4 }, 'camel': { sz: 1.05, stop: 35 }, 'horse': { sz: 1.35, stop: 53 },
    'panda': { sz: 1.52, y: -1, stop: 55 }, 'scorpion': { sz: 1.82, y: 1, spd: 1.4 }, 'tarantula': { sz: 1.63, stop: 5 }, 'cobra': { sz: 1.34, stop: 20 },
    'zebra': { sz: 1.17, stop: 19 }, 'cheetah': { sz: 1.46, stop: 13 }, 'koala': { sz: 1.17, stop: 3 }, 'kangaroo': { stop: 12, spd: 1.25 },
    'cat': { sz: 1.49, stop: 2, spd: 1.5 }, 'dog': { sz: 1.3, stop: 5 }, 'hippo': { sz: 1.2, stop: 20 }, 'gorilla': { sz: 1.27, stop: 26 },
    'gator': { sz: 2.1, stop: 33 }, 'penguin': { sz: 1.3, stop: 2 }, 'seal': { sz: 1.58, stop: 5 }, 'cow': { sz: 1.27, stop: 15 },
    'tiger2': { sz: 1.41, stop: 5, spd: 1.5 }, 'squirrel': { sz: 1.27 },
  },
  boss: {  // 보스 종별
    'd:trex': { stop: 53 }, 'd:spino': { sz: 1.2, y: -9, stop: 115, spd: 1.7 }, 'd:trike': { sz: 1.08, y: -8, stop: 110, spd: 1.5 }, 'd:stego': { y: -12, stop: -2 },
    'd:raptor': { sz: 1.08, spd: 1.8 }, 'd:anky': { sz: 0.79, y: -3, stop: 90 }, 'd:ptera': { y: -25, stop: 18, spd: 1.95 }, 'd:brachio': { sz: 1.6, y: -12 },
    'c:rabbit': { sz: 1.3, y: -6, stop: 95, spd: 1.4 }, 'c:antelope': { sz: 1.2, y: -6, stop: 120 }, 'c:deer': { sz: 0.85, y: -7, stop: 95, spd: 1.4 }, 'c:boar': { sz: 1.07, y: -7, stop: 90, spd: 1.3 },
    'c:wolf': { sz: 1.2, y: -9, stop: 104, spd: 1.5 }, 'c:hyena': { sz: 0.88, y: -5, stop: 99, spd: 1.3 }, 'c:bear': { sz: 0.76, y: -5, stop: 107, spd: 1.35 }, 'c:rhino': { sz: 0.75, y: -3, stop: 95, spd: 1.35 },
    'c:tiger': { sz: 0.86, y: -6, stop: 108, spd: 1.3 }, 'c:mammoth': { sz: 0.58, y: -5, stop: 106, spd: 1.3 }, 'c:monkey': { sz: 0.85, y: -3, stop: 97, spd: 1.5 }, 'c:snake': { sz: 1.6, stop: 100, spd: 1.6 },
    'c:ostrich': { sz: 0.65, y: -8, stop: 79 }, 'c:turtle': { y: -2, stop: 90 }, 'c:croc': { sz: 0.95, y: -4, stop: 120 }, 'c:komodo': { sz: 0.8, y: -2, stop: 115, spd: 1.45 },
    'c:eagle': { sz: 1, y: -7, stop: 85 }, 'c:giraffe': { sz: 0.64, y: -5, stop: 90 }, 'c:lion': { sz: 0.83, y: -6, stop: 122 }, 'c:elephant': { sz: 0.7, y: -4, stop: 120, spd: 1.1 },
    'c:pig': { sz: 0.94, y: -7, stop: 115, spd: 1.2 }, 'c:chicken': { sz: 1.15, y: -6, stop: 70, spd: 1.65 }, 'c:duck': { sz: 1.15, y: -4, stop: 70, spd: 1.2 }, 'c:frog': { sz: 1.2, y: -6, stop: 56, spd: 1.4 },
    'c:bat': { sz: 1.2, y: 10, stop: 70 }, 'c:pelican': { sz: 0.91, y: -2, stop: 85, spd: 1.2 }, 'c:mantis': { sz: 1.02, y: 0, stop: 90 }, 'c:polarbear': { sz: 0.8, y: -3, stop: 105, spd: 1.3 },
    'c:alpaca': { sz: 0.95, y: -1, stop: 76, spd: 1.45 }, 'c:buffalo': { sz: 0.78, y: -7, stop: 114, spd: 1.5 }, 'c:camel': { sz: 0.79, y: -5, stop: 105 }, 'c:horse': { sz: 0.9, y: -8, stop: 94 },
    'c:panda': { sz: 0.9, y: -6, stop: 116, spd: 1.4 }, 'c:scorpion': { sz: 1.41, y: -3, stop: 90, spd: 1.2 }, 'c:tarantula': { sz: 1.2, y: -7, stop: 98, spd: 1.45 }, 'c:cobra': { sz: 1.26, y: -4, stop: 110, spd: 1.6 },
    'c:zebra': { sz: 0.97, y: -1, stop: 96, spd: 1.4 }, 'c:cheetah': { sz: 0.85, y: -4, stop: 115, spd: 1.8 }, 'c:koala': { y: -3, stop: 85 }, 'c:kangaroo': { sz: 0.65, y: -3, stop: 84 },
    'c:cat': { sz: 1.1, y: -3, stop: 54, spd: 1.3 }, 'c:dog': { y: -3, stop: 71 }, 'c:hippo': { sz: 0.6, y: -2, stop: 80 }, 'c:gorilla': { sz: 0.95, y: -5, stop: 95 },
    'c:gator': { sz: 1, y: -3, stop: 97, spd: 1.3 }, 'c:squirrel': { stop: 41, spd: 1.6 }, 'c:penguin': { sz: 1.38, y: -2, stop: 55, spd: 1.45 }, 'c:seal': { sz: 1.2, y: -2, stop: 100, spd: 1.3 },
    'c:cow': { sz: 0.9, y: -6, stop: 106, spd: 1.45 }, 'e:1': { sz: 1.06, stop: 95 }, 'e:2': { sz: 1.08, stop: 92 }, 'e:3': { y: -3, stop: 73 }, 'e:4': { stop: 74 }, 'e:5': { stop: 83 }, 'e:6': { sz: 0.97, stop: 90 }, 'e:7': { stop: 70 }, 'e:8': { sz: 1.08, stop: 79 }, 'e:9': { sz: 1.09, stop: 77 }, 'e:10': { stop: 70 },
    'e:11': { sz: 1, y: -4, stop: 71 }, 'e:12': { stop: 120 }, 'e:13': { stop: 120 }, 'e:14': { stop: 120 }, 'e:15': { stop: 120 },
    'e:16': { sz: 1, y: -8, stop: 110, spd: 2 }, 'e:17': { sz: 1.12, stop: 120, spd: 1.85 }, 'e:18': { sz: 1.12, stop: 120, spd: 2 }, 'e:19': { sz: 1.12, stop: 120, spd: 1.95 }, 'e:20': { sz: 1.12, y: -4, stop: 120 }, 'c:tiger2': { sz: 0.93, y: -4, stop: 103, spd: 1.6 },
  },
  // 피격 반응(웨이브 일반몹 전체 공통 하나의 값, 종별 아님 / 보스·모험 몹은 미적용): 가로로 눌리고(x) 세로로 늘어나며(y) 발을 축으로 뒤로 젖혀졌다(rot) dur 동안 복귀. 위치는 안 움직임
  hitSq: {"x": 1.1, "y": 1.1, "rot": 10, "dur": 0.15},   // 피격 반응(웨이브 일반몹 전체 공통 하나의 값)
  wave: { gap: 40, dist: 35 },
  adv: { gap: 50, dist: 55, lunge: 25 },    // 모험 일반 몹 1열 대기 간격·히어로와 거리(px) — 웨이브와 분리                                  // 웨이브 몹 일렬 간격(px) / 히어로와의 거리(px) — 종 무관 일괄
  stone: { spd: 0.6, sz: 13, arc: 0.4 },                           // 직립 돌던지기: 비행속도 배율 / 그림 크기(px) / 포물선 높이 배율
  // 이펙트 프레임별 재생시간(초). 합 = 총 재생시간(전체 '프레임 속도'로 나눔).
  // 길이가 실제 프레임 수와 다르면 무시하고 균등 분할 — 프레임을 지우거나 늘려도 굳지 않음
  fxFrT: {"1": [0.275, 0.275], "2": [0.08, 0.08], "16": [0.138, 0.138, 0.138, 0.138], "18": [0.183, 0.183, 0.183], "20": [0.12], "29": [0.12, 0.12, 0.15, 0.15], "31": [0.03, 0.03, 0.03, 0.03], "33": [0.14, 0.17, 0.2, 0.35], "34": [0.23, 0.09, 0.18], "35": [0.28, 0.28, 0.28, 0.28, 0.28]},
  skFx: {"38": {"tick": 0.22}, "1": {"sz": 0.8, "spd": 1.5, "fly": 1.25, "x": 15, "y": 0, "fr": {}}, "2": {"sz": 0.74, "spd": 1, "fly": 1.1, "x": 0, "y": 0, "fr": {"1": {"t": 1, "sz": 0.8}, "2": {"sz": 0.85, "y": 30}}}, "16": {"sz": 1.2, "spd": 1.3, "fly": 1, "x": 50, "y": 0, "fr": {}}, "18": {"sz": 1.04, "spd": 1.5, "fly": 1, "x": 45, "y": 0, "fr": {}}, "20": {"sz": 0.74, "spd": 1.25, "fly": 1, "x": 0, "y": 0, "fr": {}}, "29": {"sz": 1.2, "spd": 1.3, "fly": 1.6, "x": 100, "y": 10, "tick": 0.2, "fr": {"1": {"sz": 0.93, "t": 1.1, "x": -47}, "2": {"sz": 0.9, "x": -13}, "3": {"sz": 0.88, "y": -2}, "4": {"sz": 0.91, "t": 0.6, "x": 2, "y": -2}}}, "26": {"tick": 0.35}, "27": {"tick": 0.35}, "28": {"tick": 0}, "32": {"tick": 0.45}, "36": {"tick": 0.3}, "31": {"sz": 1.15, "spd": 1, "fly": 1, "x": 0, "y": 45, "fr": {"1": {"y": 0}}}, "33": {"startP": 0.55, "anchor": 0, "sz": 1.1, "spd": 2.25, "fly": 1, "x": 0, "y": 0, "tick": 0.3, "fr": {"1": {"x": 39, "y": 23, "sz": 0.72}, "2": {"x": 55, "sz": 0.5, "y": 11}, "3": {"x": 84, "sz": 0.73, "y": 20}, "4": {"x": 94, "sz": 0.69, "y": 19}}}, "34": {"startP": 0.5, "anchor": 0, "sz": 1, "spd": 1, "fly": 1, "x": 0, "y": 0, "fr": {"1": {"sz": 0.87, "y": -85, "x": 20}, "2": {"sz": 0.77, "x": 73, "y": -37}, "3": {"x": 71, "sz": 0.95, "y": 16}}}, "35": {"startP": 1, "anchor": 0, "sz": 1, "spd": 1, "fly": 1, "x": 0, "y": 0, "twGap": 35, "twSpd": 1.7, "tick": 0.25, "fr": {"1": {"x": 53, "sz": 0.47}, "2": {"sz": 0.58, "x": 85, "y": 3}, "3": {"sz": 0.63, "x": 60, "y": 3}, "4": {"sz": 0.69, "x": 102, "y": 5}, "5": {"sz": 0.76, "x": 81, "y": 3}}}},  // 스킬 이펙트 (x/y=위치, startP=시작 시점, anchor=1이면 히어로 기준)
}
const MOT_FX_IDS = [1, 2, 16, 18, 20, 29, 31, 33, 34, 35]                          // 이펙트 있는 스킬 id
// 이펙트 프레임 시간(초) 배열 — 넣은 값을 그대로 씀. 프레임을 늘리거나 줄이면 값도 같이 조정할 것.
// 빈 칸은 0초(그 프레임은 건너뜀)로 두고, 전부 비었을 때만 균등 분할로 떨어져 NaN을 막는다
const fxT = (mot, id, n) => {
  const a = (mot.fxFrT || {})[id]
  if (!Array.isArray(a)) return null
  const r = Array.from({ length: n }, (_, i) => (Number(a[i]) > 0 ? Number(a[i]) : 0))
  return r.some(v => v > 0) ? r : null
}
const fxTotal = (mot, id, n, fallback) => { const a = fxT(mot, id, n); return a ? a.reduce((x, y) => x + y, 0) : fallback }
// 진행도 p(0~1)에 해당하는 프레임 인덱스. 초 배열이 있으면 그 비율로, 없으면 균등
const fxFrameIdx = (p, n, arr) => {
  if (!arr) return Math.min(n - 1, Math.floor(p * n))
  const tot = arr.reduce((x, y) => x + y, 0)
  let acc = 0
  for (let i = 0; i < n; i++) { acc += arr[i] / tot; if (p < acc) return i }
  return n - 1
}
const perStage = (v, def) => typeof v === 'number' ? { 0: v, 1: v, 2: v, 3: v, 4: v, 5: v } : { ...def, ...(v || {}) }   // 옛 전역 숫자값 → 전 단계 동일값으로 마이그레이션
// 옛 저장값의 atkSz(단계별 공격 크기)를 프레임별 값으로 이관 — 프레임 값이 이미 있으면 그대로 둠
function mergeAtkFrSz(h) {
  const out = { ...MOTION_DEFAULT.hero.atkFrSz, ...(h.atkFrSz || {}) }
  const old = h.atkSz
  if (old != null) HERO_STAGE_ATK.forEach((ak, i) => {
    if ((h.atkFrSz || {})[ak]) return                       // 이미 프레임별로 조정한 단계는 건드리지 않음
    const m = typeof old === 'number' ? old : (old || {})[i]
    if (m == null) return
    out[ak] = Object.fromEntries((ANIM[ak].srcs || []).map((_, f) => [f + 1, m]))
  })
  return out
}
function mergeMotion(sv) {   // 저장된 모션값 + 기본값 병합 (초기 로드·클라우드 복원 공용)
  sv = sv || {}
  return {
    atk: { ...MOTION_DEFAULT.atk, ...(sv.atk || {}) }, hit: { ...MOTION_DEFAULT.hit, ...(sv.hit || {}) },
    cd: { ...MOTION_DEFAULT.cd, ...(sv.cd || {}) }, dur: { ...MOTION_DEFAULT.dur, ...(sv.dur || {}) },
    lunge: { ...MOTION_DEFAULT.lunge, ...(sv.lunge || {}) },
    stop: { ...MOTION_DEFAULT.stop, ...(sv.stop || {}) }, size: { ...MOTION_DEFAULT.size, ...(sv.size || {}) },
    hero: { ...MOTION_DEFAULT.hero, ...(sv.hero || {}), evoSz: { ...MOTION_DEFAULT.hero.evoSz, ...((sv.hero || {}).evoSz || {}) }, range: { ...MOTION_DEFAULT.hero.range, ...((sv.hero || {}).range || {}) }, outline: { ...MOTION_DEFAULT.hero.outline, ...((sv.hero || {}).outline || {}) }, walkSz: perStage((sv.hero || {}).walkSz, MOTION_DEFAULT.hero.walkSz), skillSz: { ...MOTION_DEFAULT.hero.skillSz, ...((sv.hero || {}).skillSz || {}) }, skillFront: { ...MOTION_DEFAULT.hero.skillFront, ...((sv.hero || {}).skillFront || {}) }, skillHide: { ...MOTION_DEFAULT.hero.skillHide, ...((sv.hero || {}).skillHide || {}) }, skillPos: { ...MOTION_DEFAULT.hero.skillPos, ...((sv.hero || {}).skillPos || {}) }, skillFrSz: { ...((sv.hero || {}).skillFrSz || {}) }, skillFrPos: { ...((sv.hero || {}).skillFrPos || {}) }, skillFrT: { ...((sv.hero || {}).skillFrT || {}) }, hit: { ...MOTION_DEFAULT.hero.hit, ...((sv.hero || {}).hit || {}) }, atkFrSz: mergeAtkFrSz(sv.hero || {}), atkFrX: { ...MOTION_DEFAULT.hero.atkFrX, ...((sv.hero || {}).atkFrX || {}) } },
    mob: { ...MOTION_DEFAULT.mob, ...(sv.mob || {}) }, boss: { ...MOTION_DEFAULT.boss, ...(sv.boss || {}) },
    wave: { ...MOTION_DEFAULT.wave, ...(sv.wave || {}) }, adv: { ...MOTION_DEFAULT.adv, ...(sv.adv || {}) }, hitSq: { ...MOTION_DEFAULT.hitSq, ...(sv.hitSq || {}) }, stone: { ...MOTION_DEFAULT.stone, ...(sv.stone || {}) },   // 기본값(사용자 확정값) 위에 저장값 덮어쓰기
    ally: { hunter: { ...MOTION_DEFAULT.ally.hunter, ...((sv.ally || {}).hunter || {}) }, shaman: { ...MOTION_DEFAULT.ally.shaman, ...((sv.ally || {}).shaman || {}) }, healer: { ...MOTION_DEFAULT.ally.healer, ...((sv.ally || {}).healer || {}) }, giant: { ...MOTION_DEFAULT.ally.giant, ...((sv.ally || {}).giant || {}) } },
    fxFrT: { ...MOTION_DEFAULT.fxFrT, ...(sv.fxFrT || {}) },
    skFx: Object.fromEntries(MOT_FX_IDS.map(id => [id, { ...MOTION_DEFAULT.skFx[id], ...((sv.skFx || {})[id] || {}) }])),
  }
}
const dinoAtkDur = (k, T) => (T[k] || DINO_ATK_DEF).reduce((a, b) => a + b, 0)
const dinoHitAt = (k, T, H) => {               // 타격 프레임이 시작되는 시각(초)
  const arr = T[k] || DINO_ATK_DEF
  let t = 0
  for (let i = 0; i < (H[k] || 3) - 1; i++) t += arr[i] || 0
  return t
}
const dinoAtkFrame = (k, el, T) => {           // 경과 시간 → 프레임 인덱스
  const arr = T[k] || DINO_ATK_DEF
  let t = 0
  for (let i = 0; i < arr.length; i++) { t += arr[i]; if (el < t) return i }
  return arr.length - 1
}
const DINO_AIR = { ptera: 45 }  // 비행 공룡의 지면 위 고도(px)
const ADV_BOSS_H = 120         // 보스 '걷기 포즈' 기준 화면 높이
const ADV_MOB_H = 62           // 일반몹 '걷기 포즈' 기준 화면 높이
// 캔버스높이 / 걷기포즈높이 — 공격 모션이 위로 뻗는 만큼 캔버스가 커서, 이 비율로 보정해야 종별 몸집이 같아짐
const DINO_RB = { trex: 1.052, spino: 1.346, trike: 1.183, stego: 1.288, raptor: 1.309, anky: 1.77, ptera: 1.402, brachio: 1.151 }
const DINO_RM = { trex: 1.078, spino: 1.076, trike: 1.088, stego: 1.077, raptor: 1.09, anky: 1.094, ptera: 1.071, brachio: 1.049 }
const advMult = st => 1 + 0.3 * (st - 1)   // 단계 배율 (1단계 1.0 → 10단계 3.7)
const DINO_MOB = {}, DINO_BOSS = {}, ADV_BG = {}
for (const c of CONTINENTS) {
  const k = c.boss
  const mk = (pre, n) => [1, 2, 3, 4].map(i => mkImg(`/dino/${pre}/${n}${i}.webp`))
  DINO_MOB[k] = mk(`mob_${k}`, 'w')
  const af = DINO_ATK_FRAMES[k] || [1, 2, 3, 4]
  DINO_BOSS[k] = {
    w: mk(`boss_${k}`, 'w'),
    a: af.map(i => mkImg(`/dino/boss_${k}/a${i}.webp`)),
  }
  ADV_BG[c.key] = mkImg(`/adventure/bg/${c.key}.jpg`)
}
const BASE_W = 420, BASE_H = 695
const SIMG = {}
SKILL_SHEET.forEach(c => {
  const useFr = new Set([...(c.charSeq || Array.from({ length: c.n }, (_, j) => j + 1)),
    ...((c.fx && c.fx.frames) || []), ...((c.fx && c.fx.fly) || []), SKILL_ICON_FRAME[c.id] || 1])
  SIMG[c.id] = Array.from({ length: c.n }, (_, j) => {          // 실제 쓰는 프레임만 로드 (삭제된 번호 404 방지)
    if (!useFr.has(j + 1)) return null                          // 인덱스는 '프레임번호-1' 그대로 — strike/proj 가 그 인덱스로 찾음
    return mkImg(`/skill/s${c.id}/s${c.id}_${j + 1}.webp`)
  })
  const seq = c.charSeq || Array.from({ length: c.n }, (_, j) => j + 1)
  ANIM['s_' + c.id] = { srcs: seq.map(j => `/skill/s${c.id}/s${c.id}_${j}.webp`), h: c.h, flip: false }
})
const AIMG = {}
for (const k in ANIM) AIMG[k] = ANIM[k].srcs.map(s => mkImg(s))
const BG_THEMES = ['wasteland', 'forest', 'volcano', 'snow', 'swamp', 'night']
const BG_NORMAL = BG_THEMES.map(t => mkImg(`/bg/n_${t}.jpg`))
const BG_BOSS = BG_THEMES.map(t => mkImg(`/bg/b_${t}.jpg`))
const bgFor = (wave, boss) => (boss ? BG_BOSS : BG_NORMAL)[Math.floor((wave - 1) / 10) % BG_THEMES.length]
const STONE = mkImg('/misc/stone.webp')
// 타격 이펙트 (effect/eN_1~8.png · 8프레임, 시트 절반축소본)
const FXF = 8, FX_DUR = 0.045
const FX_IMGS = {}
for (let n = 1; n <= 5; n++) FX_IMGS[n] = Array.from({ length: FXF }, (_, f) => mkImg(`/effect/effect_frames/effect${n}/e${n}-${f + 1}.webp`))

// ── 스킬 프레임 시간 설정 (초, 직접 수정) ─────────────────────────
// 각 원소 = 그 순서의 히어로 프레임 표시 시간. 배열 길이 = 히어로 프레임 수.
// 시전 총 시간 = 합계. 없는 스킬은 프레임당 0.15초.
const SKILL_FRAME_T = {
  37: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],   // 순보 (11프레임 × 0.5초)
  38: [0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12],   // 난도질 (6프레임 × 2바퀴)
  36: [0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09],   // 불놀이야 (히어로 9프레임)
  35: [0.12, 0.12, 0.12],                   // 토네이도 (히어로 3프레임 — 4번 제거)
  1:  [0.15, 0.15, 0.15, 0.15],           // 몽둥이번개 (4프레임)
  2:  [0.20, 0.20],                        // 창던지기 (2)
  7:  [0.15, 0.15, 0.15, 0.15, 0.15, 0.15],       // (6)
  8:  [0.15, 0.15, 0.15, 0.15, 0.15, 0.15],       // (6)
  13: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15], // (7)
  15: [0.15, 0.15, 0.15, 0.15, 0.15],      // (5)
  16: [0.25, 0.25],                        // 낙석 시전 (2)
  17: [0.15, 0.15, 0.15, 0.15, 0.15],      // (5)
  18: [0.25, 0.25],                        // 점프낙석 시전 (2)
  20: [0.15, 0.15, 0.15, 0.15],            // 토네이도 (4: 휘두르기3+복귀1)
  22: [0.10, 0.12, 0.12, 0.16],                                // 전광석화 (4)
  23: [0.10, 0.12, 0.10, 0.12, 0.30],                          // 사신과 함께 (5: 원-투-원-투-어퍼컷)
  24: [0.18, 0.18, 0.18, 0.18],                                // 암흑 강타 (4, 균등)
  25: [0.18, 0.18, 0.18, 0.18],                                // 뇌전 질주 (4, 균등)
  26: [0.18, 0.18, 0.18, 0.18, 0.18, 0.18],                    // 회전 폭풍 (6, 균등)
  27: [0.18, 0.18, 0.18, 0.18, 0.18],                          // 화염 참격 (5, 균등)
  28: [0.18, 0.18, 0.18, 0.18, 0.18, 0.18],                    // 대지 분쇄 (6, 균등)
  29: [0.18, 0.18, 0.24],                                      // 사이오닉 스톰 (3: 번개 충전)
  31: [0.15, 0.15, 0.15, 0.15, 0.40],                          // 회전 도끼 (회전 2바퀴 → 던지기)
  32: [0.14, 0.30, 0.14, 0.14, 0.40],                          // 얼음도끼
  33: [0.12, 0.14, 0.12, 0.14, 0.16, 0.32],                    // 지각변동
  34: [0.12, 0.12, 0.12],                                      // 엑스밤 (던지기 → 도끼 이탈)                    // 지각변동 (도약 → 내려찍기 → 융기)                          // 얼음도끼 (베기 → 치켜들기 → 내려찍기)
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
  29: 0.70,   // 사이오닉 스톰 (먹구름+낙뢰 4프레임)
  33: 0.70,   // 지각변동 (바위 융기 4프레임)
  34: 0.60,   // 엑스밤 (비행 → 착지 → 폭발 3프레임)
  35: 0.75,   // 토네이도 (5,6,5,6,7)
}

// 무기/방어구/유물 각 30개 (6등급대 × 5티어, 1→30 강해짐). /equip/A/w01.webp 등
const EQUIP_CATS = ['무기', '방어구', '유물']
const CAT_DIR = { 무기: '/equip/A/w', 방어구: '/equip/B/a', 유물: '/relic/r' }
const pad2 = i => String(i).padStart(2, '0')
const equipImg = (cat, i) => `${CAT_DIR[cat]}${pad2(i)}.webp`
const GACHA_CATS = { 무기: {}, 방어구: {}, 유물: {} }   // 3 카테고리, 각 30개 동일 규격
const GACHA_COST = { 1: 10, 10: 100, 30: 300 }
const CARD_COST = { 1: 300, 10: 3000 }        // 스킬 카드 소환 비용(다이아)

const CARD_ENH_CARDS = 2                      // 스킬 강화에 쓰는 카드 수
const CARD_ENH_PEARL = 10                     // 스킬 강화에 쓰는 강화 진주 (수치는 추후 조정)
const EQUIP_MAX = 30
// 등급: 5개 묶음이 한 등급대(줄), 줄 안에서 5등급(약)→1등급(강)
const GRADE_NAMES = ['일반', '고급', '레어', '영웅', '전설', '신화']
const GRADE_COLOR = { 일반: '#b7bcc2', 고급: '#54c964', 레어: '#4aa3ff', 영웅: '#c05cff', 전설: '#ff9430', 신화: '#ff4038' }
const bandOf = i => Math.floor((i - 1) / 5)          // 0~5 (등급대 = 줄)
const tierOf = i => 5 - ((i - 1) % 5)                // 5→1 (줄 안 등급)
const gradeNameOf = i => GRADE_NAMES[bandOf(i)]
const gradeColorOf = i => GRADE_COLOR[GRADE_NAMES[bandOf(i)]]
// 소환 레벨: 1~8. 레벨업에 필요한 뽑기 횟수(그 레벨 구간에서 채워야 하는 양)
const GACHA_MAXLV = 8
const GACHA_NEED = [500, 2000, 4000, 8000, 12000, 15000, 20000]   // 1→2, 2→3, … 7→8
const gachaNeed = lv => GACHA_NEED[lv - 1] ?? Infinity
// 레벨업 보상: 도달 레벨마다 그 카테고리 장비를 확정 지급 [장비번호, 개수]
const GACHA_LV_REWARD = {
  2: [20, 1],   // 영웅 1등급
  3: [21, 1],   // 전설 5등급
  4: [25, 1],   // 전설 1등급
  5: [26, 1],   // 신화 5등급
  6: [28, 1],   // 신화 3등급
  7: [29, 1],   // 신화 2등급
  8: [29, 3],   // 신화 2등급 ×3
}
// 소환 레벨별 등급대(일반·고급·레어·영웅·전설·신화) 분포(%). 레벨이 오르면 최빈 등급이 위로 밀려 올라간다.
// 상위 등급은 극단적으로 낮게 두고 융합으로 올라가는 설계 — 레벨 1·2에서는 신화가 아예 안 나온다.
// (슬레이어 키우기 표 기준 + 전설 약 1.6배, 신화 약 2.5배로 아주 조금만 후하게)
const GACHA_BAND_P = [
  [66.00, 27.00,  6.00,  0.90, 0.010, 0],        // Lv1
  [51.00, 34.00, 12.50,  2.30, 0.150, 0],        // Lv2
  [30.00, 44.00, 20.00,  5.70, 0.350, 0.005],    // Lv3
  [ 9.00, 55.00, 25.00, 10.50, 0.800, 0.025],    // Lv4
  [ 6.00, 43.00, 30.00, 20.00, 1.100, 0.060],    // Lv5
  [ 4.20, 29.00, 41.00, 24.00, 1.600, 0.080],    // Lv6
  [ 3.50, 19.00, 36.00, 38.50, 2.400, 0.120],    // Lv7
  [ 2.00, 16.00, 28.00, 50.00, 3.200, 0.180],    // Lv8
]
const TIER_W = [5, 4, 3, 2, 1]                       // 줄 안 5등급→1등급 비율
// 최고 장비(신화 1등급 = 30번)는 소환으로 안 나온다 — 융합으로만 획득
const itemWeightLv = (i, lv) => (i === EQUIP_MAX ? 0
  : (GACHA_BAND_P[Math.min(GACHA_MAXLV, Math.max(1, lv)) - 1][bandOf(i)] || 0) * TIER_W[5 - tierOf(i)])
const rollItem = (lv = 1) => {
  const w = Array.from({ length: EQUIP_MAX }, (_, x) => itemWeightLv(x + 1, lv))
  let r = Math.random() * w.reduce((a, b) => a + b, 0)
  for (let i = 1; i <= EQUIP_MAX; i++) { r -= w[i - 1]; if (r <= 0) return i }
  return EQUIP_MAX - 1
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
const MAT_IMG = i => `/ui/mat${i}.webp`
// 프로필/아바타용 진화단계 초상화 (4족·직립은 유인원 공통)
const heroProfileSrc = m => m === 'erectus' ? '/hero/profile/erectus.webp' : m === 'neander' ? '/hero/profile/neander.webp' : m === 'sapiens' ? '/hero/profile/sapiens.webp' : m === 'human' ? '/hero/profile/human.webp' : '/hero/profile/ape.webp'
const gearSrc = (cat, n) => `${CAT_DIR[cat]}${n}.webp`

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
    stages: c.stages || null, passive: !!c.passive, icon2: c.ic || null, desc2: c.desc2 || null,
    h: c.h, fx: c.fx || null, frameEnds: ends, frameT: ft,
    cd: c.cd ?? 2, cast: acc, hitAt: c.hitAt ?? 0.55, dmgMult: c.dmgMult ?? 2, aoe: c.aoe || false, rangePx: c.rangePx || null, maxTargets: c.maxTargets || 1,
    desc: c.n + '프레임 · 임시값',
  }
})
// 스킬 프레임 타이밍은 모션 편집기에서 덮어쓸 수 있음 → 매 프레임 런타임 계산
// 저장된 프레임 시간은 프레임 수가 맞을 때만 사용. 스킬 프레임을 줄이면 옛 배열이 남아
// 마지막 프레임에서 몇 초씩 멈추므로(23번이 9→5로 줄었음) 길이 다르면 코드 기본값으로.
const skFrT = (sk, mot) => {
  const v = ((((mot || {}).hero) || {}).skillFrT || {})[sk.id]
  return (Array.isArray(v) && v.length === sk.frameT.length) ? v : sk.frameT
}
const skEnds = t => { const e = []; let a = 0; for (const v of t) { a += v; e.push(a) } return e }
const skCast = t => t.reduce((a, b) => a + b, 0)
// 대시 프레임 타이밍: 0=기모으기 앞부분 짧게, 주먹뻗기(3,4번) 길게

// ── 동료 정의: 영웅 뒤에서 투사체 공격 (겹침 허용, 소형) ──
// cd는 미사용 — 동료 공격은 히어로 기본공격에 동기화되고, 투사체는 히어로 타격 순간에 맞춰 속도가 역산됨
// 전직 단계별 그림 — 동료 4종 × 5단계 (/ally/evo/hunter_1.webp ...)
const ALLY_EVO_KEYS = ['hunter', 'shaman', 'healer', 'giant']
const ALLY_EVO_IMG = (k, n) => `/ally/evo/${k}_${n}.webp`
const ALLY_EVO_MAX = 5

// ── 동료 성장·전직 (임시 밸런싱 — 나중에 통째로 교체) ──
const ALLY_LV_MAX = 100                    // 이 레벨을 찍으면 다음 단계로 전직
const ALLY_STAGE_MULT = [1, 1.6, 2.5, 3.8, 5.6]   // 전직 단계별 능력치 배수 (1~5단계)
// [표시명, 1레벨 기준값, 레벨당 증가율(%)] — self=동료 본인, give=히어로에게 부여
const ALLY_STAT = {
  hunter: { self: [['공격력', 120, 4], ['공격 주기', 1.15, 0], ['사거리', 450, 0]],
            give: [['히어로 공격력', 3, 2], ['치명타 확률', 1, 1.5]] },
  shaman: { self: [['공격력', 150, 4], ['공격 주기', 1.6, 0], ['사거리', 450, 0]],
            give: [['히어로 공격력', 4, 2], ['스킬 피해', 2, 2]] },
  healer: { self: [['전체 버프', 5, 3]],
            give: [['히어로 체력', 4, 2], ['체력 회복', 3, 2]] },
  giant:  { self: [['공격력', 200, 4], ['공격 주기', 1.8, 0]],
            give: [['히어로 체력', 5, 2], ['받는 피해 감소', 1, 1.5]] },
}
const allyStatVal = (base, per, lv, stage) => base * (1 + per / 100 * (lv - 1)) * (ALLY_STAGE_MULT[stage - 1] || 1)

const ALLY_DEFS = {
  hunter: {
    name: '헌터', h: 68, xOff: -75, yOff: 27, atkMult: 0.45, cd: 1.15, range: 450,
    projSpd: 560, projW: 62, projBob: 0, atkDur: 0.42, throwAt: 0.16, projYr: 0.62,
    walk: [1, 2, 3, 4].map(i => `/ally/hunter/hwalk_${i}.webp`),
    atk: [1, 2].map(i => `/ally/hunter/hatk_${i}.webp`),
    proj: '/ally/hunter/spear.webp',
  },
  shaman: {
    name: '주술사', h: 68, xOff: -75, yOff: -34, atkMult: 0.55, cd: 1.6, range: 450,
    projSpd: 400, projW: 26, projBob: 5, atkDur: 0.5, throwAt: 0.2, projYr: 0.75,
    walk: [1, 2, 3, 4].map(i => `/ally/shaman/swalk_${i}.webp`),
    atk: [1].map(i => `/ally/shaman/satk_${i}.webp`),
    proj: '/ally/shaman/fire.webp',
  },
  healer: {
    // 공격 없음 — 장착 시 히어로+동료 전체에 이동속도·공격속도·공격력 +5% (패시브)
    name: '힐러', kind: 'buff', buff: 0.05, h: 60, xOff: -108, yOff: -5,
    walk: [1, 2, 3, 4, 5, 6, 7, 8].map(i => `/ally/healer/heal_${i}.webp`),
    atk: [],
  },
  giant: {
    // 근접 주먹 — 투사체 없이 히어로 타격 순간에 맨 앞 적을 직접 타격
    name: '거인', kind: 'melee', h: 125, xOff: -155, yOff: 3, atkMult: 0.8, range: 360,
    atkDur: 0.5,
    walk: [1, 2, 3].map(i => `/ally/giant/gwalk_${i}.webp`),
    atk: [1, 2, 3].map(i => `/ally/giant/gatk_${i}.webp`),
  },
}
const ALLY_IMG = {}
for (const k in ALLY_DEFS) {
  const d = ALLY_DEFS[k]
  const mk = s => { const i = new Image(); i.addEventListener('error', () => console.warn('[ally] 로드 실패:', s)); i.src = s; return track(i) }
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
// 웨이브 간격·대기속도는 모션 편집기(일반몹 탭)에서 조절 — MOTION_DEFAULT.wave 참조
const PUNCH = { hitAt: 0.12, total: 0.3, range: 85 } // 4족 주먹질
const THROW = { windupEnd: 0.14, releaseEnd: 0.30, total: 0.42, range: 130 }   // 직립 돌던지기 — 이 거리에서 멈춰 던짐
// 에렉투스 몽둥이: 1타 내려치기(위→아래), 2타 올려치기(아래→위) 번갈아
const ECLUB = { total: 0.65, range: 100, hitAt: 0.72 }  // 몽둥이 내려치기 (erectus 3프레임/neander 2프레임 모두 마지막=내리치는 프레임에 데미지)
const SPIN = { total: 0.6, range: 100, hitAt: 0.7 }    // 사피엔스 회전 베기 (5프레임)
const HSLASH = { total: 0.55, range: 100, hitAt: 0.6 } // 인간 검격 (4프레임)
const MC = m => (m === 'sapiens' ? SPIN : m === 'human' ? HSLASH : ECLUB)   // 근접 모드별 타이밍
// 기본공격 사거리: 모션 편집기의 진화단계별 값이 우선, 없으면 위 상수
const heroRange = (mot, evoIdx, mode) => ((mot.hero || {}).range || {})[evoIdx]
  ?? (mode === 'quad' ? PUNCH.range : MELEE_MODES.includes(mode) ? MC(mode).range : THROW.range)
const MELEE_MODES = ['erectus', 'neander', 'sapiens', 'human']
const HERO_ATK_ANIM = m => m === 'neander' ? 'natk1' : m === 'sapiens' ? 'patk1' : m === 'human' ? 'hmatk1' : 'eatk1'
const HERO_ATK_KEY = m => m === 'quad' ? 'punch' : m === 'biped' ? 'throw' : HERO_ATK_ANIM(m)   // 편집·렌더 공용: 모드별 기본공격 스프라이트 키
const heroAtkKeyFrames = k => ((ANIM[k] || {}).srcs || [0]).length
const heroAtkFrames = m => ((ANIM[HERO_ATK_ANIM(m)] || {}).srcs || [0]).length
// 근접 기본공격 타격 시점(진행률 0~1).
// 화면 프레임은 floor(진행률 × 프레임수)로 정해지는데, 예전에는 데미지를 별개의 시간비율(hitAt)로 줘서
// 프레임 수가 다른 모드(사피엔스 5·인간 4)에서 임팩트 프레임보다 한 프레임 먼저 데미지가 들어갔음.
// → 이제는 타격 프레임 번호(mot.hero.hit)에서 역산해 "그 프레임이 화면에 뜨는 순간"에 정확히 들어감.
const heroHitProg = (m, mot) => {
  const n = heroAtkFrames(m)
  const hf = Math.min(n, Math.max(1, (((mot || {}).hero || {}).hit || {})[m] || n))
  return (hf - 1) / n + 0.001   // 부동소수 오차로 이전 프레임에 걸리는 것 방지
}

// ── 적 정의 ──
const ENEMY_TYPES = {
  // 일반몹 50종 — 전부 1프레임(/monster/{키}/{키}_1.png), 원본이 왼쪽을 향해 flip 불필요
  rabbit:   { name: '토끼', hp: 20, speed: 85, dmg: 5,  reward: 4,  h: 30, color: '#a1887f', flip: false, frames: ['/monster/rabbit/rabbit_1.webp'] },
  antelope: { name: '영양', hp: 45, speed: 65, dmg: 10, reward: 8,  h: 55, color: '#c98a4b', flip: false, frames: ['/monster/antelope/antelope_1.webp'] },
  deer:     { name: '사슴', hp: 90, speed: 50, dmg: 16, reward: 14, h: 75, color: '#b5794a', flip: false, frames: ['/monster/deer/deer_1.webp'] },
  boar:     { name: '멧돼지', hp: 70, speed: 60, dmg: 14, reward: 12, h: 65, color: '#7a6a52', flip: false, frames: ['/monster/boar/boar_1.webp'] },
  wolf:     { name: '늑대', hp: 40, speed: 120, dmg: 12, reward: 10, h: 55, color: '#9a8f7a', flip: false, frames: ['/monster/wolf/wolf_1.webp'] },
  hyena:    { name: '하이에나', hp: 110, speed: 55, dmg: 20, reward: 18, h: 55, color: '#b0a15f', flip: false, frames: ['/monster/hyena/hyena_1.webp'] },
  bear:     { name: '동굴곰', hp: 260, speed: 40, dmg: 32, reward: 35, h: 75, color: '#6b4f35', flip: false, frames: ['/monster/bear/bear_1.webp'] },
  rhino:    { name: '털코뿔소', hp: 450, speed: 45, dmg: 40, reward: 55, h: 70, color: '#9c988f', flip: false, frames: ['/monster/rhino/rhino_1.webp'] },
  mammoth:  { name: '매머드', hp: 900, speed: 32, dmg: 55, reward: 110, h: 120, color: '#5f4a34', flip: false, frames: ['/monster/mammoth/mammoth_1.webp'] },
  tiger:    { name: '검치호', hp: 600, speed: 80, dmg: 60, reward: 130, h: 60, color: '#c68a3c', flip: false, frames: ['/monster/tiger/tiger_1.webp'] },
  // 신규 10종 (스탯 임시값)
  monkey:   { name: '원숭이', hp: 30, speed: 100, dmg: 8,  reward: 6,  h: 55, color: '#8a6a4a', flip: false, frames: ['/monster/monkey/monkey_1.webp'] },
  croc:     { name: '악어', hp: 200, speed: 45, dmg: 30, reward: 30, h: 40, color: '#5f7a3a', flip: false, frames: ['/monster/croc/croc_1.webp'] },
  elephant: { name: '코끼리', hp: 700, speed: 35, dmg: 50, reward: 90, h: 105, color: '#8d8d94', flip: false, frames: ['/monster/elephant/elephant_1.webp'] },
  giraffe:  { name: '기린', hp: 300, speed: 70, dmg: 25, reward: 45, h: 145, color: '#d0a04a', flip: false, frames: ['/monster/giraffe/giraffe_1.webp'] },
  ostrich:  { name: '타조', hp: 80, speed: 130, dmg: 15, reward: 16, h: 95, color: '#3a3a3a', flip: false, frames: ['/monster/ostrich/ostrich_1.webp'] },
  lion:     { name: '사자', hp: 350, speed: 90, dmg: 45, reward: 60, h: 70, color: '#c68a3c', flip: false, frames: ['/monster/lion/lion_1.webp'] },
  snake:    { name: '뱀', hp: 60, speed: 70, dmg: 18, reward: 14, h: 30, color: '#6a7a4a', flip: false, frames: ['/monster/snake/snake_1.webp'] },
  turtle:   { name: '거북이', hp: 400, speed: 30, dmg: 15, reward: 40, h: 45, color: '#5a6a3a', flip: false, frames: ['/monster/turtle/turtle_1.webp'] },
  komodo:   { name: '코모도 드래곤', hp: 250, speed: 55, dmg: 35, reward: 40, h: 40, color: '#6a5a5a', flip: false, frames: ['/monster/komodo/komodo_1.webp'] },
  eagle:    { name: '독수리', hp: 120, speed: 140, dmg: 22, reward: 28, h: 70, color: '#5a4a3a', flip: false, air: 90, frames: ['/monster/eagle/eagle_1.webp'] },
  // 신규 30종 (스탯 임시값 — 웨이브 스케일이 주 난이도)
  pig: { name: '돼지', hp: 60, speed: 60, dmg: 12, reward: 10, h: 50, color: '#e8a8a8', flip: false, frames: ['/monster/pig/pig_1.webp'] },
  chicken: { name: '닭', hp: 25, speed: 75, dmg: 6, reward: 5, h: 45, color: '#e8e0d0', flip: false, frames: ['/monster/chicken/chicken_1.webp'] },
  duck: { name: '오리', hp: 35, speed: 85, dmg: 8, reward: 7, h: 40, color: '#4a6a3a', flip: false, frames: ['/monster/duck/duck_1.webp'] },
  frog: { name: '개구리', hp: 45, speed: 70, dmg: 10, reward: 8, h: 35, color: '#6a9a3a', flip: false, frames: ['/monster/frog/frog_1.webp'] },
  bat: { name: '박쥐', hp: 55, speed: 135, dmg: 14, reward: 12, h: 50, color: '#4a3a4a', flip: false, air: 80, frames: ['/monster/bat/bat_1.webp'] },
  pelican: { name: '펠리컨', hp: 90, speed: 110, dmg: 16, reward: 15, h: 70, color: '#e0d8c8', flip: false, air: 60, frames: ['/monster/pelican/pelican_1.webp'] },
  mantis: { name: '사마귀', hp: 75, speed: 95, dmg: 20, reward: 15, h: 60, color: '#7aa03a', flip: false, frames: ['/monster/mantis/mantis_1.webp'] },
  polarbear: { name: '북극곰', hp: 420, speed: 42, dmg: 38, reward: 52, h: 75, color: '#e8e8e0', flip: false, frames: ['/monster/polarbear/polarbear_1.webp'] },
  alpaca: { name: '알파카', hp: 110, speed: 72, dmg: 15, reward: 18, h: 70, color: '#e8dcc0', flip: false, frames: ['/monster/alpaca/alpaca_1.webp'] },
  buffalo: { name: '버팔로', hp: 520, speed: 45, dmg: 42, reward: 60, h: 80, color: '#5a4028', flip: false, frames: ['/monster/buffalo/buffalo_1.webp'] },
  camel: { name: '낙타', hp: 260, speed: 58, dmg: 24, reward: 34, h: 90, color: '#c89a5a', flip: false, frames: ['/monster/camel/camel_1.webp'] },
  horse: { name: '말', hp: 180, speed: 115, dmg: 22, reward: 28, h: 80, color: '#7a4a2a', flip: false, frames: ['/monster/horse/horse_1.webp'] },
  panda: { name: '판다', hp: 330, speed: 40, dmg: 28, reward: 40, h: 65, color: '#e8e8e8', flip: false, frames: ['/monster/panda/panda_1.webp'] },
  scorpion: { name: '전갈', hp: 150, speed: 60, dmg: 32, reward: 26, h: 40, color: '#5a3a4a', flip: false, frames: ['/monster/scorpion/scorpion_1.webp'] },
  tarantula: { name: '타란툴라', hp: 130, speed: 80, dmg: 28, reward: 22, h: 40, color: '#3a2a2a', flip: false, frames: ['/monster/tarantula/tarantula_1.webp'] },
  cobra: { name: '킹코브라', hp: 100, speed: 65, dmg: 30, reward: 20, h: 50, color: '#8a7a3a', flip: false, frames: ['/monster/cobra/cobra_1.webp'] },
  zebra: { name: '얼룩말', hp: 170, speed: 105, dmg: 20, reward: 26, h: 75, color: '#d8d8d8', flip: false, frames: ['/monster/zebra/zebra_1.webp'] },
  cheetah: { name: '치타', hp: 220, speed: 150, dmg: 35, reward: 38, h: 55, color: '#d0a04a', flip: false, frames: ['/monster/cheetah/cheetah_1.webp'] },
  koala: { name: '코알라', hp: 95, speed: 55, dmg: 12, reward: 14, h: 50, color: '#9a9aa0', flip: false, frames: ['/monster/koala/koala_1.webp'] },
  kangaroo: { name: '캥거루', hp: 240, speed: 100, dmg: 30, reward: 30, h: 90, color: '#b08a5a', flip: false, frames: ['/monster/kangaroo/kangaroo_1.webp'] },
  cat: { name: '고양이', hp: 50, speed: 110, dmg: 10, reward: 9, h: 40, color: '#8a8a8a', flip: false, frames: ['/monster/cat/cat_1.webp'] },
  dog: { name: '개', hp: 85, speed: 95, dmg: 16, reward: 15, h: 50, color: '#c8985a', flip: false, frames: ['/monster/dog/dog_1.webp'] },
  hippo: { name: '하마', hp: 780, speed: 38, dmg: 48, reward: 90, h: 80, color: '#9a7a9a', flip: false, frames: ['/monster/hippo/hippo_1.webp'] },
  gorilla: { name: '고릴라', hp: 560, speed: 55, dmg: 50, reward: 75, h: 75, color: '#3a3a3a', flip: false, frames: ['/monster/gorilla/gorilla_1.webp'] },
  gator: { name: '앨리게이터', hp: 280, speed: 42, dmg: 36, reward: 42, h: 40, color: '#4a6a3a', flip: false, frames: ['/monster/gator/gator_1.webp'] },
  squirrel: { name: '다람쥐', hp: 22, speed: 95, dmg: 5, reward: 4, h: 35, color: '#b06a3a', flip: false, frames: ['/monster/squirrel/squirrel_1.webp'] },
  penguin: { name: '펭귄', hp: 70, speed: 50, dmg: 10, reward: 11, h: 50, color: '#2a2a3a', flip: false, frames: ['/monster/penguin/penguin_1.webp'] },
  seal: { name: '물개', hp: 140, speed: 45, dmg: 18, reward: 20, h: 40, color: '#9a9aa8', flip: false, frames: ['/monster/seal/seal_1.webp'] },
  cow: { name: '소', hp: 300, speed: 50, dmg: 26, reward: 38, h: 70, color: '#e8e8e0', flip: false, frames: ['/monster/cow/cow_1.webp'] },
  tiger2: { name: '호랑이', hp: 380, speed: 125, dmg: 40, reward: 55, h: 55, color: '#d08a3c', flip: false, frames: ['/monster/tiger2/tiger2_1.webp'] },
}
const EIMG = {}
for (const k in ENEMY_TYPES) {
  const e = ENEMY_TYPES[k]
  EIMG[k] = e.frames.map(src => mkImg(src))
  // reward를 고기 획득량으로, 경험치는 reward의 1.5배로 파생
  e.meat = e.reward
  e.exp = Math.round(e.reward * 1.5)
  // 명중/회피: 빠른 동물일수록 회피↑, 큰 동물일수록 명중↑(피하기 어려움 대신 잘 맞음)
  e.eva = Math.min(0.4, e.speed / 400)        // 회피율 (늑대 0.3, 매머드 0.08)
  e.acc = Math.min(0.35, e.dmg / 200)         // 명중률 (강한 적일수록 잘 맞춤)
}
// 보스 20종: 10웨이브마다 순서대로 순환 (웨이브10=boss1, 20=boss2, ... 200=boss20, 210=boss1)
// 저주받은 동물 보스 스프라이트 (일반몹과 같은 종, /mob/{key}/{key}_1~4.png, 4프레임)
const CIMG = {}
for (const k in ENEMY_TYPES) {
  CIMG[k] = [1].map(nn => mkImg(`/mob/${k}/${k}_${nn}.webp`))   // 웨이브 보스는 제자리 + 파고듦만 쓰므로 1프레임만 사용
}
// ── 이벤트 던전: 4개 던전, 각 던전에 웨이브 보스 5명씩 배정 ──
// 배치: 보스1~5=4번던전, 6~10=3번, 11~15=2번, 16~20=1번 (뒤 던전일수록 강한 보스)
const EV_DUNGEONS = [
  { key: 'ev1', name: '수호자의 성소', from: 16, to: 20 },
  { key: 'ev2', name: '무너진 요새', from: 11, to: 15 },
  { key: 'ev3', name: '잊혀진 밀림', from: 6, to: 10 },
  { key: 'ev4', name: '용암의 심장', from: 1, to: 5 },
]
const EV_EXTS = ['jpg', 'png', 'jpeg', 'webp', '']   // 순서대로 실제 로드해 확인. 마지막 ''는 확장자 없이 저장한 경우
const EV_STAGES = 10           // 던전 보스당 단계 수 (도전창 10칸 바)
const EV_REWARD = { dia: 3000, pearl: 100 }   // 클리어 보상: 다이아 / 강화 진주
const evMult = st => 1 + 0.3 * (st - 1)       // 단계 배율 (1단계 1.0 → 10단계 3.7)
const EV_TIME = 60             // 이벤트 던전 제한시간(초)
const EV_WARN = 2.0            // 보스 등장 경고 연출 시간(초)
const EV_BG = {}               // 던전별 배경 — 확장자를 순서대로 실제 로드 시도(추측 금지)
for (const d of EV_DUNGEONS) {
  const im = new Image(); let i = 0
  const tryNext = () => { const e = EV_EXTS[i]; im.src = `/bg/event/${d.key}${e ? '.' + e : ''}` }
  im.onerror = () => { i++; if (i < EV_EXTS.length) tryNext() }
  tryNext(); EV_BG[d.key] = im
}

const BOSS_TYPES = [
  { name: '저주받은 검치호', h: 125 }, { name: '뇌전 매머드', h: 145 }, { name: '암흑 고릴라', h: 135 },
  { name: '용암 곰', h: 130 }, { name: '독왕 코브라', h: 125 },
  { name: '서리 마수', h: 130 }, { name: '뇌전 기린', h: 175 }, { name: '수정 코뿔소', h: 135 },
  { name: '심연 악어', h: 110 }, { name: '맹독 전갈', h: 120 },
  { name: '바위 골렘', h: 150 }, { name: '숲 골렘', h: 150 }, { name: '용암 골렘', h: 150 },
  { name: '얼음 골렘', h: 150 }, { name: '뇌전 거인', h: 150 },
  { name: '원석 골렘', h: 150 }, { name: '고목 정령', h: 155 }, { name: '화염 골렘', h: 155 },
  { name: '빙정 골렘', h: 150 }, { name: '폭풍 정령', h: 150 },
].map((b, i) => ({ ...b, frames: [`/boss/boss${i + 1}/boss${i + 1}_1.webp`] }))   // 1번 프레임만 사용 — 제자리 고정 + 파고듦으로만 공격
const BIMG = BOSS_TYPES.map(b => b.frames.map(src => mkImg(src)))
const WAVE_CYCLE = ['rabbit', 'antelope', 'deer', 'boar', 'wolf', 'hyena', 'bear', 'rhino', 'tiger', 'mammoth', 'monkey', 'snake', 'ostrich', 'turtle', 'croc', 'komodo', 'eagle', 'giraffe', 'lion', 'elephant',
  'pig', 'chicken', 'duck', 'frog', 'bat', 'pelican', 'mantis', 'polarbear', 'alpaca', 'buffalo',
  'camel', 'horse', 'panda', 'scorpion', 'tarantula', 'cobra', 'zebra', 'cheetah', 'koala', 'kangaroo',
  'cat', 'dog', 'hippo', 'gorilla', 'gator', 'squirrel', 'penguin', 'seal', 'cow', 'tiger2']

// ── 퀘스트 (내용은 임시 플레이스홀더 — 목록·보상·진행 연동은 추후 확정) ──
const QUEST_TABS = ['일일 퀘스트', '반복 퀘스트', '업적']
// ev: 이벤트 키(진행 카운트 소스), ric: 보상 재화 아이콘 (gem=다이아, ruby=루비 수정, pearl=진주)
const QUEST_LIST = [
  [ // 일일 퀘스트 (자정 리셋, 1회 수령)
    { ev: 'daily_done', name: '일일 퀘스트 완료', goal: 5, ric: '/ui/gem.webp', rv: 3000 },
    { ev: 'playtime', name: '플레이타임', goal: 1500, ric: '/ui/ruby.webp', rv: 1 },
    { ev: 'ad', name: '광고 보기', goal: 3, ric: '/ui/ruby.webp', rv: 1 },
    { ev: 'summon', name: '장비 소환', goal: 10, ric: '/ui/ruby.webp', rv: 1 },
    { ev: 'fuse', name: '장비 융합', goal: 10, ric: '/ui/ruby.webp', rv: 1 },
  ],
  [ // 반복 퀘스트 (수령 시 레벨↑ + 초과분 이월, 무한 반복)
    { ev: 'stage', name: '스테이지 클리어', goal: 1, ric: '/ui/gem.webp', rv: 100 },
    { ev: 'kill', name: '몬스터 처치', goal: 500, ric: '/ui/gem.webp', rv: 50 },
    { ev: 'skill_get', name: '스킬 획득', goal: 1, ric: '/ui/gem.webp', rv: 100 },
    { ev: 'summon', name: '장비 소환', goal: 30, ric: '/ui/gem.webp', rv: 100 },
    { ev: 'fuse', name: '장비 융합', goal: 30, ric: '/ui/gem.webp', rv: 100 },
    { ev: 'enh_atk', name: '공격력 강화', goal: 100, ric: '/ui/gem.webp', rv: 100 },
    { ev: 'enh_hp', name: '체력 강화', goal: 100, ric: '/ui/gem.webp', rv: 100 },
    { ev: 'enh_crit', name: '치명타 공격력 강화', goal: 100, ric: '/ui/gem.webp', rv: 100 },
  ],
  [ // 업적 (계단식 무한 반복: 수령할 때마다 목표 +1, 매 수령 시 진주 지급. base=표시 시작값)
    { ev: 'levelup', name: '캐릭터 레벨업', base: 1, ric: '/ui/pearl.webp', rv: 10 },
    { ev: 'evolve', name: '캐릭터 진화', base: 1, max: 5, ric: '/ui/pearl.webp', rv: 100 },   // 진화는 5회가 끝
    { ev: 'skill_enh', name: '스킬 강화', base: 0, ric: '/ui/pearl.webp', rv: 10 },
    { ev: 'equip_enh', name: '장비 강화', base: 0, ric: '/ui/pearl.webp', rv: 10 },
    { ev: 'adv_clear', name: '모험 클리어', base: 0, ric: '/ui/pearl.webp', rv: 10 },
  ],
]
const questDayStr = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }
const questInit = () => ({ day: questDayStr(), ev: {}, dEv: {}, dClaim: {}, rLv: {}, rBase: {}, aLv: {} })

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
const SLOT_COUNT = 8
const SET_COUNT = 3
const emptySet = () => Array(SLOT_COUNT).fill(null)
const emptySets = () => Array.from({ length: SET_COUNT }, emptySet)
const normSets = (sets, legacy) => {
  const clamp = arr => { const a = emptySet(); if (Array.isArray(arr)) for (let i = 0; i < SLOT_COUNT; i++) { const v = arr[i]; if (v != null && v < 999) a[i] = v } return a }
  if (Array.isArray(sets) && sets.length) { const out = emptySets(); for (let s = 0; s < SET_COUNT; s++) out[s] = clamp(sets[s]); return out }
  const out = emptySets(); if (Array.isArray(legacy)) out[0] = clamp(legacy); return out   // 구 equipped 4슬롯 → 1세트
}
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY))
    if (s) return {
      meat: s.meat ?? 0, wave: s.wave ?? 1,
      lv: { ...statInit(), ...s.lv }, evo: s.evo ?? 0,
      hlv: s.hlv ?? 1, hexp: s.hexp ?? 0, sp: s.sp ?? 0, ts: s.ts ?? null,
      skill: { ...statInit(), ...s.skill },
      skillSets: normSets(s.skillSets, s.equipped), activeSet: (typeof s.activeSet === 'number' && s.activeSet >= 0 && s.activeSet < SET_COUNT) ? s.activeSet : 0,
      cdConf: Array.isArray(s.cdConf) && s.cdConf.length === SKILLS.length ? s.cdConf : SKILLS.map(k => k.cd),
      skCfg: (() => {                                     // 스킬 효과 설정(id 기준)
        const o = (s.skCfg && typeof s.skCfg === 'object') ? { ...s.skCfg } : {}
        if (!s.skCfg && Array.isArray(s.cdConf)) SKILLS.forEach((k, i) => {   // 옛 인덱스 배열 → id 기준 이관
          if (s.cdConf[i] != null && s.cdConf[i] !== k.cd) o[k.id] = { ...(o[k.id] || {}), cd: s.cdConf[i] }
        })
        if (s.skCfgV !== 2) for (const id in o) { if (o[id] && o[id].range != null) { o[id] = { ...o[id] }; delete o[id].range } }   // 옛 range는 '기본사거리 배수' — px로 바뀌었으니 버림(코드 기본값 사용)
        return o
      })(),
      // 장착·재화·기록: 저장된 값 그대로 복원 (누락 시 기본값)
      alliesOn: s.alliesOn && typeof s.alliesOn === 'object' ? s.alliesOn : {},
      allyEvo: s.allyEvo && typeof s.allyEvo === 'object' ? s.allyEvo : { hunter: 1, shaman: 1, healer: 1, giant: 1 },
      allyLv: s.allyLv && typeof s.allyLv === 'object' ? s.allyLv : { hunter: 1, shaman: 1, healer: 1, giant: 1 },
      gem: s.gem ?? 0, inv: s.inv && typeof s.inv === 'object' ? s.inv : {}, best: s.best ?? s.wave ?? 1,
      evStage: s.evStage && typeof s.evStage === 'object' ? s.evStage : {},
      gachaLv: s.gachaLv && typeof s.gachaLv === 'object' ? s.gachaLv : { 무기: 1, 방어구: 1, 유물: 1 },
      gachaCnt: s.gachaCnt && typeof s.gachaCnt === 'object' ? s.gachaCnt : { 무기: 0, 방어구: 0, 유물: 0 },
      gachaRw: s.gachaRw && typeof s.gachaRw === 'object' ? s.gachaRw : {},
      skCard: s.skCard && typeof s.skCard === 'object' ? s.skCard : {},
      skEnh: s.skEnh && typeof s.skEnh === 'object' ? s.skEnh : {},
      gearEq: s.gearEq && typeof s.gearEq === 'object' ? s.gearEq : { 무기: null, 방어구: null, 유물: null },
      nick: typeof s.nick === 'string' && s.nick ? s.nick : ('Slayer_' + Math.floor(Math.random() * 9000000 + 1000000)),
      mats: Array.isArray(s.mats) && s.mats.some(x => x > 0) ? s.mats : [99999, 99999, 99999, 99999, 99999], enh: s.enh && typeof s.enh === 'object' ? s.enh : {},
      ruby: typeof s.ruby === 'number' ? s.ruby : 50, advStage: s.advStage && typeof s.advStage === 'object' ? s.advStage : {},   // ruby 50 = 임시 지급(퀘스트 연동 전)
      pearl: typeof s.pearl === 'number' ? s.pearl : 0, quest: s.quest && typeof s.quest === 'object' && s.quest.ev ? s.quest : questInit(),
    }
  } catch (e) {}
  return { meat: 0, wave: 1, lv: statInit(), evo: 0, hlv: 1, hexp: 0, sp: 0, skill: statInit(), skillSets: emptySets(), activeSet: 0, skCfg: {}, cdConf: SKILLS.map(k => k.cd), alliesOn: {}, allyEvo: { hunter: 1, shaman: 1, healer: 1, giant: 1 }, allyLv: { hunter: 1, shaman: 1, healer: 1, giant: 1 }, gem: 0, inv: {}, best: 1, ts: null, gearEq: { 무기: null, 방어구: null, 유물: null }, nick: 'Slayer_' + Math.floor(Math.random() * 9000000 + 1000000), mats: [99999, 99999, 99999, 99999, 99999], enh: {}, ruby: 50, advStage: {}, pearl: 0, evStage: {}, gachaLv: { 무기: 1, 방어구: 1, 유물: 1 }, gachaCnt: { 무기: 0, 방어구: 0, 유물: 0 }, gachaRw: {}, skCard: {}, skEnh: {}, quest: questInit() }
}
const fmt = n => n >= 1e8 ? (n/1e8).toFixed(1)+'억' : n >= 1e4 ? (n/1e4).toFixed(1)+'만' : Math.floor(n).toLocaleString()
const fmtPct = v => v >= 10000 ? fmt(Math.round(v)) : (Math.round(v * 10) / 10).toString()

export default function App() {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const skqDrag = useRef({ down: false, x: 0, sl: 0, moved: false })   // 퀵바 마우스 드래그 스크롤
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
  const [skillDetail, setSkillDetail] = useState(null) // 스킬 상세창 index | null (UI 골격)
  const [skillAuto, setSkillAuto] = useState({})       // 스킬별 AUTO 토글 (세션, 표시용)
  const [lootFly, setLootFly] = useState([])          // 재화칸으로 비행 중인 전리품 조각
  // 안전장치: 조각이 어떤 이유로든 안 지워지면 화면 구석에 반투명 점으로 박힌 채 남는다.
  // 도착 시간(0.62s)보다 넉넉히 지난 것은 주기적으로 강제 제거.
  useEffect(() => {
    const iv = setInterval(() => setLootFly(v => (v.length ? v.filter(q => Date.now() - q.ts < 1500) : v)), 1000)
    return () => clearInterval(iv)
  }, [])
  const [detailTab, setDetailTab] = useState('강화')  // 상세창 탭: 강화/융합
  const [fuseQty, setFuseQty] = useState(0)           // 융합 수량
  const [gearEq, setGearEq] = useState(init.gearEq || { 무기: null, 방어구: null, 유물: null })  // 장착 슬롯
  const [nick, setNick] = useState(init.nick || 'Slayer')          // 닉네임
  const [nickEdit, setNickEdit] = useState(false)                  // 닉네임 편집 중
  const [profileOpen, setProfileOpen] = useState(false)            // 프로필 창
  const [profTab, setProfTab] = useState('info')                   // 프로필 탭 info/look
  const [mats, setMats] = useState(init.mats || [0, 0, 0, 0, 0])   // 재화 5종 (0~3 동료용, 4 무기강화용)
  const [ruby, setRuby] = useState(init.ruby ?? 0)                 // 루비 수정 (모험 진입 재화)
  const [pearl, setPearl] = useState(init.pearl ?? 0)              // 진주 (업적 보상 재화)
  const [evStage, setEvStage] = useState(init.evStage || {})       // 이벤트 던전 보스별 클리어 단계 { 보스번호: 단계 }
  const [quest, setQuest] = useState(init.quest || questInit())    // 퀘스트 진행 상태
  const [advStage, setAdvStage] = useState(init.advStage || {})    // 대륙별 클리어 단계 { key: 0~10 }
  const [enh, setEnh] = useState(init.enh || {})                   // 강화레벨 { '무기:1': lv }
  const [tab, setTab] = useState('강화')      // 영웅 서브탭: 강화/성장/진화
  const [phase, setPhase] = useState('fighting')
  const [clearMsg, setClearMsg] = useState(null)   // 웨이브 클리어 배너 (멈춤 없음)
  const [bossReady, setBossReady] = useState(false) // 10웨이브 클리어 후 보스 도전 대기
  const [gem, setGem] = useState(init.gem || 0)      // 다이아 재화 (DEBUG 시 무한)
  const [inv, setInv] = useState(init.inv || {})     // 뽑은 장비 보유 수량 { 'w1_3': n }
  const [gacha, setGacha] = useState(null)
  const [gachaLv, setGachaLv] = useState(init.gachaLv || { 무기: 1, 방어구: 1, 유물: 1 })    // 카테고리별 소환 레벨
  const [gachaCnt, setGachaCnt] = useState(init.gachaCnt || { 무기: 0, 방어구: 0, 유물: 0 })  // 현재 레벨 구간 누적 뽑기
  const [gShown, setGShown] = useState(0)             // 소환 결과 순차 공개 개수
  const [shopTab, setShopTab] = useState('장비')       // 상점 소환 탭: 장비 / 스킬 카드
  const [gachaRw, setGachaRw] = useState(init.gachaRw || {})   // 소환 레벨업 대기 보상 { 카테고리: [장비번호…] }
  const [skCard, setSkCard] = useState(init.skCard || {})   // 스킬별 보유 카드 수 { 스킬id: 개수 }
  const [skEnh, setSkEnh] = useState(init.skEnh || {})      // 스킬별 강화 단계 { 스킬id: 단계 }
  const [cardRes, setCardRes] = useState(null)              // 스킬 카드 소환 결과
  // 카드 결과는 같은 스킬끼리 묶어 한 칸으로 보여준다(x2, x3) — 공개 단위도 이 묶음 기준
  const cardCells = cardRes ? Object.entries(cardRes.ids.reduce((m, id) => ({ ...m, [id]: (m[id] || 0) + 1 }), {})) : []
  const [cShown, setCShown] = useState(0)
  // 장비 소환처럼 한 칸씩 쭈르륵 공개 (90ms 간격)
  useEffect(() => {
    if (!cardRes) { setCShown(0); return }
    setCShown(0)
    const n = new Set(cardRes.ids).size
    const timers = Array.from({ length: n }, (_, i) => setTimeout(() => setCShown(i + 1), (i + 1) * 90))
    return () => timers.forEach(clearTimeout)
  }, [cardRes])
  // 한 장씩 공개하다가 전설·신화가 나오면 번쩍임(2초) 동안 멈췄다가 다음 장으로 넘어간다
  useEffect(() => {
    if (!gacha) { setGShown(0); return }
    setGShown(0)
    const timers = []
    let t = 0
    gacha.items.forEach((it, i) => {
      const hi = gradeNameOf(it.i) === '전설' || gradeNameOf(it.i) === '신화'
      t += 90
      timers.push(setTimeout(() => setGShown(i + 1), t))
      if (hi) t += 2350                                  // 등장(0.35초) + 번쩍임(2초)
    })
    return () => timers.forEach(clearTimeout)
  }, [gacha])
  const [menuOpen, setMenuOpen] = useState(false)
  const [splash, setSplash] = useState(true)
  // 스플래시에서 프리로드가 끝날 때까지 잡아둔다. 12초 안전장치 — 어떤 이유로든 끝나지 않아도 시작은 되게
  const [preP, setPreP] = useState(0)
  useEffect(() => {
    if (!splash) return
    const t0 = Date.now()
    const iv = setInterval(() => {
      const p = PRE.total ? PRE.done / PRE.total : 1
      setPreP(Date.now() - t0 > 12000 ? 1 : p)
    }, 100)
    return () => clearInterval(iv)
  }, [splash])
  const preReady = preP >= 0.98
  const [alliesOn, setAlliesOn] = useState(init.alliesOn || {})  // 장착된 동료 (보유/성장 시스템은 추후)
  const [allySub, setAllySub] = useState('동료')
  const [allyEvo, setAllyEvo] = useState(init.allyEvo || { hunter: 1, shaman: 1, healer: 1, giant: 1 })   // 동료별 전직 단계(1~5)
  const [allyLv, setAllyLv] = useState(init.allyLv || { hunter: 1, shaman: 1, healer: 1, giant: 1 })
  const [allyPick, setAllyPick] = useState(null)          // 전직 칸을 누르면 열리는 동료 상세창
  const [evoBot, setEvoBot] = useState(false)             // 전직 목록을 끝까지 내렸나 — 끝이면 아래 흐림을 끈다
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
  const [questOpen, setQuestOpen] = useState(false)   // 퀘스트창
  const [feverOn, setFeverOn] = useState(false)       // 피버타임 버프 on/off (광고 미구현 — 지금은 DEBUG 클릭으로만 토글)
  const [feverAds] = useState(0)                      // 오늘 광고 시청 횟수 (0/3, 광고 붙이면 연동)
  const [evOpen, setEvOpen] = useState(false)         // 이벤트 던전창
  const [evSel, setEvSel] = useState(0)               // 선택한 던전 인덱스
  const [evUI, setEvUI] = useState(null)              // 이벤트 던전 전투 중 HUD { name, dname }
  const [evPick, setEvPick] = useState(null)          // 던전 도전 확인창 { di, no, name, dname }
  const [advUI, setAdvUI] = useState(false)           // 모험 전투 중 (나가기 버튼 표시)
  const [evExt, setEvExt] = useState({})              // 던전별 배경 확장자 인덱스 (로드 실패 시 다음 후보로)
  const [questTab, setQuestTab] = useState(0)         // 0 일일 / 1 반복 / 2 업적
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
  const [uiCfg, setUiCfg] = useState(() => {
    // 저장값이 코드값보다 오래됐으면 코드값 사용 (모바일 등 편집 안 하는 기기 자동 반영)
    if (Number(localStorage.getItem('paleoUiTs') || 0) < CFG_STAMP) return { ...UI_DEFAULT }
    try { const sv = JSON.parse(localStorage.getItem('paleoUiCfg') || '{}'); return { ...UI_DEFAULT, ...Object.fromEntries(Object.entries(sv).filter(([k]) => k in UI_DEFAULT)) } } catch { return { ...UI_DEFAULT } }
  })
  const [uiEdit, setUiEdit] = useState(false)
  const [motEdit, setMotEdit] = useState(false)     // 모션 편집기
  const [motSel, setMotSel] = useState('trex')
  const [motCat, setMotCat] = useState('dino')     // 편집 카테고리: dino/hero/ally/mob/boss/skfx
  const [motAlly, setMotAlly] = useState('hunter') // 동료 선택
  const [motFx, setMotFx] = useState(1)            // 스킬 이펙트 선택(id)
  const [motHeroSk, setMotHeroSk] = useState(1)    // 히어로 모션 크기 편집용 스킬(id)
  const [motSkFr, setMotSkFr] = useState(1)        // 편집 중인 스킬 프레임 번호
  const [motFxFr, setMotFxFr] = useState(1)        // 편집 중인 이펙트 프레임 번호
  const [motHeroEvo, setMotHeroEvo] = useState(0)  // 히어로 크기 편집용 진화단계(0~5)
  const motHeroEvoRef = useRef(0); motHeroEvoRef.current = motHeroEvo   // 아래 3개: 게임루프가 편집중 선택단계 미리보기
  const motEditRef = useRef(false); motEditRef.current = motEdit
  const motCatRef = useRef('dino'); motCatRef.current = motCat
  const [, setMotTick] = useState(0)               // 편집 중 화면 몹/보스 추적 리프레시
  useEffect(() => { if (!motEdit) return; const iv = setInterval(() => setMotTick(t => t + 1), 500); return () => clearInterval(iv) }, [motEdit])
  const [copiedMot, setCopiedMot] = useState(false)
  const [motCfg, setMotCfg] = useState(() => {
    if (Number(localStorage.getItem('paleoMotionTs') || 0) < CFG_STAMP) return JSON.parse(JSON.stringify(MOTION_DEFAULT))
    try { return mergeMotion(JSON.parse(localStorage.getItem('paleoMotion') || '{}')) }
    catch { return JSON.parse(JSON.stringify(MOTION_DEFAULT)) }
  })
  const motRef = useRef(motCfg)
  motRef.current = motCfg                            // 게임 루프가 매 프레임 최신값을 읽음
  const uiRef = useRef(uiCfg)
  uiRef.current = uiCfg                              // 캔버스에 그리는 요소(경고 문구 등)도 UI 편집값을 씀
  const rootRef = useRef(null)
  const uiScaleRef = useRef(1)
  const lootSeq = useRef(0)   // 조각 고유 id (Date.now 는 같은 ms 에 겹칠 수 있어 순번 사용)
  const [view, setView] = useState({ s: 1, h: BASE_H, sw: 0, sh: 0 })   // 화면 맞춤 배율/판 높이
  const dockSide = view.sw - BASE_W * view.s > 300           // 게임판 옆 여백이 넉넉하면 편집기를 밖으로
  const dockStyle = { right: 0, left: 'auto', top: 0, bottom: 0, width: 330, maxWidth: 'none', margin: 0, maxHeight: 'none', borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: `2px solid ${GOLD_D}` }
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
  const copyText = (txt) => {   // 클립보드 API 실패해도 textarea+execCommand로 폴백
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt); return true } } catch {}
    try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.top = '-9999px'; document.body.appendChild(ta); ta.focus(); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok } catch { return false }
  }
  const [editSel, setEditSel] = useState(null)   // 편집 모드에서 선택된 요소
  useEffect(() => { localStorage.setItem('paleoUiCfg', JSON.stringify(uiCfg)) }, [uiCfg])
  const motTsFirst = useRef(true)
  const motPushT = useRef(null)
  useEffect(() => {
    localStorage.setItem('paleoMotion', JSON.stringify(motCfg))
    if (motTsFirst.current) { motTsFirst.current = false; return }   // 마운트 로드는 편집 아님 → ts 안 찍음(안 찍어야 클라우드 편집이 안 덮임)
    localStorage.setItem('paleoMotionTs', String(Date.now()))
    // 편집할 때마다 모션 전용 클라우드에 독립 백업 (세이브와 무관 — 세이브 저장 실패해도 모션은 보존)
    if (motPushT.current) clearTimeout(motPushT.current)
  }, [motCfg])
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
  const [skillSets, setSkillSets] = useState(init.skillSets)       // 3세트 × 8슬롯
  const [activeSet, setActiveSet] = useState(init.activeSet ?? 0)  // 현재 활성 세트 (0~2)
  const equipped = skillSets[activeSet] || emptySet()              // 파생: 활성 세트 = 전투가 읽는 장착 슬롯
  const [cdConf, setCdConf] = useState(init.cdConf)                // (구) 인덱스 기반 — skCfg 로 이관됨
  const [skCfg, setSkCfg] = useState(init.skCfg || {})             // 스킬 효과 설정 { id: { cd, dmg, range, aoe } }

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
    // TODO(패시브 효과): 장착된 패시브(SKILLS[si].passive)의 수치가 확정되면 여기서 상시형은 위 스탯에 합산,
    // 주기형은 전투 루프에서 슬롯 쿨(w.skillCd) 돌 때마다 버프 적용. 현재는 표시·장착만 되고 효과 0.
    equippedPassives: (equipped || []).filter(si => si != null && SKILLS[si] && SKILLS[si].passive),
    cdConf, skCfg,
  }

  const cloudBusy = useRef(false)   // 어댑트/불러오기 중 로컬 저장 차단
  useEffect(() => {
    if (cloudBusy.current) return
    localStorage.setItem(SAVE_KEY, JSON.stringify({ meat, wave, lv, evo, hlv, hexp, sp, skill, skillSets, activeSet, cdConf, skCfg, skCfgV: 2, gem, inv, best, alliesOn, allyEvo, allyLv, gearEq, nick, mats, enh, ruby, advStage, pearl, evStage, gachaLv, gachaCnt, gachaRw, skCard, skEnh, quest, ts: Date.now() }))
  }, [meat, wave, lv, evo, hlv, hexp, sp, skill, skillSets, activeSet, cdConf, skCfg, gem, inv, best, alliesOn, allyEvo, allyLv, gearEq, nick, mats, enh, ruby, advStage, pearl, evStage, gachaLv, gachaCnt, gachaRw, skCard, skEnh, quest])

  // 진화 시 현재 단계가 아닌 장착 스킬 자동 해제
  useEffect(() => {
    setSkillSets(sets => sets.map(set => set.map(si => (si != null && SKILLS[si].stage === evo ? si : null))))
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
    if (gained > 0) { setHlv(cl); setHexp(ce); setSp(s => s + gained * 3); qEv('levelup', gained) }
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
      w.spawnIdx = 0                 // 일렬 배치 순번 (웨이브마다 리셋)
      w.waveNum = n
      w.clearedFlag = false
    }

    function startAdventure(cfg) {
      w.enemies = []; w.stones = []; w.rocks = []; w.waves = []
      w.bossBattle = false; w.clearedFlag = false; w.bossPending = false
      w.adv = { ...cfg, mult: advMult(cfg.stage), bossOut: false, done: false, win: false }
      w.advTime = ADV_TIME
      w.total = ADV_MOBS + 1; w.killed = 0; w.spawnTimer = 200
      // 일반 몹은 제자리 1열이므로 시간차 스폰 없이 **50마리를 한 번에 줄 세운다** (간격이 균일해짐)
      w.spawnLeft = 0
      for (let i = 0; i < ADV_MOBS; i++) pushAdvEnemy(false)
    }

    function startEvDungeon(cfg) {                    // 이벤트 던전 진입: 경고 → 보스 1마리
      w.enemies = []; w.stones = []; w.rocks = []; w.waves = []
      w.adv = null; w.bossBattle = false; w.clearedFlag = false; w.bossPending = false
      w.ev = { ...cfg, mult: evMult(cfg.stage || 1), bossOut: false, done: false, win: false, warnT: EV_WARN }
      w.evTime = EV_TIME
      w.spawnLeft = 0; w.total = 1; w.killed = 0; w.spawnTimer = 200; w.spawnIdx = 0
      w.shake = 6
    }

    function pushEvBoss() {                          // 능력치는 그 보스가 등장하는 웨이브(번호×10) 난이도 기준
      const c = w.ev
      const key = WAVE_CYCLE[(c.no - 1) % WAVE_CYCLE.length]
      const t = ENEMY_TYPES[key]
      const wv = c.no * 10
      const sc = (1 + 0.4 * (wv - 1)) * 12 * (c.mult || 1)
      w.enemies.push({
        type: key, evBoss: c.no, boss: true, x: w.W + 40, hp: t.hp * sc, maxHp: t.hp * sc,
        speed: t.speed * 0.6, dmg: t.dmg * (1 + 0.1 * (wv - 1)) * 3 * (c.mult || 1),
        meat: Math.floor(t.meat * (1 + 0.2 * (wv - 1))) * 15, exp: Math.floor(t.exp * (1 + 0.2 * (wv - 1))) * 15,
        acc: t.acc, eva: t.eva, air: 0, atkT: 0,
        h: (BOSS_TYPES[c.no - 1] || {}).h || 130, color: t.color, cd: 0, flash: 0, animT: 0,
        scaleV: 1, yOff: 0, spdV: 1,
      })
    }

    function startBossBattle() {
      w.enemies = []; w.stones = []; w.rocks = []; w.waves = []
      w.bossBattle = true
      w.bossTimer = BOSS_TIME
      w.spawnLeft = 1
      w.total = 1
      w.killed = 0
      w.bossPending = true
      w.bossGiveUp = false
      w.spawnTimer = 200
      w.spawnIdx = 0                 // 보스전은 한 마리뿐 — 화면 끝에서 걸어 나오게 0부터
      w.clearedFlag = false
    }

    function spawnAdvEnemy() { /* 모험 일반몹은 진입 시 50마리를 한 번에 배치 — 추가 스폰 없음 */ }

    function pushAdvEnemy(isBoss) {
      const a = w.adv
      const key = WAVE_CYCLE[(a.wave - 1) % WAVE_CYCLE.length]
      const t = ENEMY_TYPES[key]
      const sc = (1 + 0.4 * (a.wave - 1)) * a.mult * (isBoss ? 12 : 1)
      w.enemies.push({
        type: key, dino: a.boss, boss: isBoss, bossIdx: 0,
        x: w.W + 40 + (isBoss ? 0 : w.enemies.filter(e2 => !e2.dead && !e2.boss).length * (motRef.current.adv.gap ?? 40)), hp: t.hp * sc, maxHp: t.hp * sc,
        speed: t.speed * (isBoss ? 0.6 : 0.9 + Math.random() * 0.2),
        dmg: t.dmg * (1 + 0.1 * (a.wave - 1)) * a.mult * (isBoss ? 3 : 1),
        meat: Math.floor(t.meat * (1 + 0.2 * (a.wave - 1))) * (isBoss ? 15 : 1),
        exp: Math.floor(t.exp * (1 + 0.2 * (a.wave - 1))) * (isBoss ? 15 : 1),
        acc: t.acc, eva: t.eva, air: DINO_AIR[a.boss] || 0, atkT: 0,
        h: Math.round(isBoss ? ADV_BOSS_H * (DINO_RB[a.boss] || 1) : ADV_MOB_H * (DINO_RM[a.boss] || 1)), color: t.color, cd: 0, flash: 0, animT: Math.random() * 10,
        scaleV: isBoss ? 1 : 0.95 + Math.random() * 0.1, yOff: 0, spdV: isBoss ? 1 : 0.93 + Math.random() * 0.14,
      })
    }

    function spawnEnemy(seq) {
      if (w.adv) return spawnAdvEnemy()
      const key = WAVE_CYCLE[Math.floor((w.waveNum - 1) / 10) % WAVE_CYCLE.length]   // 10웨이브당 1종 (블록)
      const boss = w.bossPending && w.spawnLeft === 1
      const t = ENEMY_TYPES[key]
      const sc = (1 + 0.4 * (w.waveNum - 1)) * (boss ? 12 : 1)
      w.enemies.push({
        type: key, boss, x: w.W + 40 + (seq ? (seq - 1) * (motRef.current.wave.gap ?? 65) : 0), hp: t.hp * sc, maxHp: t.hp * sc,
        speed: t.speed * (boss ? 0.6 : 0.9 + Math.random() * 0.2),
        dmg: t.dmg * (1 + 0.1 * (w.waveNum - 1)) * (boss ? 3 : 1),
        meat: Math.floor(t.meat * (1 + 0.2 * (w.waveNum - 1))) * (boss ? 15 : 1),
        exp: Math.floor(t.exp * (1 + 0.2 * (w.waveNum - 1))) * (boss ? 15 : 1),
        acc: t.acc, eva: t.eva, air: boss ? 0 : (t.air || 0),
        h: boss ? t.h * 2 : t.h, color: t.color, cd: 0, flash: 0, animT: Math.random() * 10,   // 저주보스: 일반몹 2배(모션편집기 개별조절)
        scaleV: 1, yOff: 0, spdV: boss ? 1 : 0.93 + Math.random() * 0.14,   // 크기·높이 랜덤 제거 — 일렬로 서므로 균일해야 함(크기는 편집기에서 종별로)
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
        items.push({ id: `lf${++lootSeq.current}`, ts: Date.now(), k: L.k, x: cx0 + L.x, y: cy0 + L.y, tx: toLX(tr.left + tr.width / 2), ty: toLY(tr.top + tr.height / 2) })
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
      t.sqD = motRef.current.hitSq.dur; t.sq = t.sqD    // 피격 스쿼시(편집기 값)
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
      w.qKill = (w.qKill || 0) + 1
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
    // noStop: 히트스톱 생략(관통 투사체의 2번째 이후 타격 등)
    function applySkillDmg(t, dmg, noStop) {
      t.hp -= dmg
      t.flash = 1
      t.kb = Math.max(t.kb || 0, t.boss ? 55 : 150)
      t.sqD = motRef.current.hitSq.dur; t.sq = t.sqD
      // 히트스톱은 세계를 정지시키므로(dt=0) 타격마다 걸면 관통·광역에서 뚝뚝 끊긴다 — 쿨(hsCd)로 제한
      if (!noStop && w.hsCd <= 0) { w.hitstop = Math.max(w.hitstop || 0, t.boss ? 0.09 : 0.05); w.hsCd = 0.25 }
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
      const atkRange = heroRange(motRef.current, st.evo, st.mode)

      // 배경 스크롤: 이동 상태 + 앞을 막는 적이 없을 때만 전진
      const heroTargetX = w.bossBattle ? Math.max(HERO_X, Math.round(w.W * 0.34)) : HERO_X
      w.heroX += (heroTargetX - w.heroX) * Math.min(1, dt * 4)
      const atkRange0 = atkRange
      // 교전 판정은 blocked·공격시작·데미지가 **같은 기준**을 써야 한다.
      // 예전엔 공격 시작만 사거리(150px)를 봐서, 몹이 정지위치(95px)에 닿기 전에 히어로가 휘두르고
      // 그 순간 hero.state='attack'이 되며 스크롤이 멈춰 몹이 멀찍이 굳었다.
      const thrower = st.mode === 'biped'                       // 직립: 원거리(돌던지기)
      const engaged = (e, extra = 0) => {
        const reached = e.stopX != null && e.x <= e.stopX + 6
        // 원거리는 사거리에 닿는 순간 멈춰서 던진다 (가까이 갈 이유가 없음)
        // 직립도 '멈춘 적'은 교전으로 인정 — 안 그러면 적 정지 위치가 사거리 밖일 때 영원히 교전이 안 됨
        if (thrower) return e.x - w.heroX < atkRange0 + extra || reached
        if (!w.adv && !e.boss) return reached                  // 근접 + 제자리 몹: 정지위치에 닿아야 교전
        return e.x - w.heroX < atkRange0 + extra || reached    // 근접 + 걸어오는 몹·보스
      }
      w._engaged = engaged
      // 기본공격 대상은 배열 순서가 아니라 **히어로에서 가장 가까운** 교전 대상
      const nearestEngaged = (extra = 0) => {
        let best = null
        for (const e of w.enemies) if (!e.dead && engaged(e, extra) && (!best || e.x < best.x)) best = e
        return best
      }
      w._nearest = nearestEngaged
      const blocked = w.enemies.some(e => !e.dead && engaged(e))
      w._blocked = blocked
      const moving = (st.phase === 'fighting' || st.phase === 'cleared') && hero.state === 'move' && !blocked
      const scroll = moving ? SCROLL * st.mspdMult : 0
      w.scrollX += scroll * dt

      if (st.phase === 'fighting') {
        if (w.advStart) { const c = w.advStart; w.advStart = null; w.needStart = false; startAdventure(c); hero.hp = st.maxHp; hero.state = 'move'; hero.t = 0; setAdvUI(true) }
        if (w.evStart) { const c = w.evStart; w.evStart = null; w.needStart = false; startEvDungeon(c); hero.hp = st.maxHp; hero.state = 'move'; hero.t = 0; setEvUI({ name: c.name, dname: c.dname }) }
        if (w.startBossFlag) { w.startBossFlag = false; w.needStart = false; startBossBattle(); hero.state = 'move'; hero.t = 0 }
        if (w.needStart) { startWave(st.wave); w.needStart = false; hero.hp = st.maxHp; hero.state = 'move'; hero.t = 0 }

        if (w.spawnLeft > 0) {
          if (!w.adv) {                       // 웨이브: 몹이 제자리에 서 있으므로 한 번에 일렬로 깔아둔다
            while (w.spawnLeft > 0) { spawnEnemy(w.spawnIdx = (w.spawnIdx || 0) + 1); w.spawnLeft-- }
          } else {                            // 모험: 기존대로 타이머 스폰(동시 8마리 제한)
            w.spawnTimer -= dt * 1000
            if (w.spawnTimer <= 0) { spawnEnemy(); w.spawnLeft--; w.spawnTimer = 500 }
          }
        }

        // 모험 일반 몹은 한 줄로 선다 — 앞에서부터 순번을 매겨 정지 위치를 gap 만큼씩 뒤로 민다
        let advRank = null
        if (w.adv) {
          advRank = new Map()
          w.enemies.filter(e2 => !e2.dead && !e2.boss).sort((a, b) => a.x - b.x).forEach((e2, i) => advRank.set(e2, i))
        }
        // 적: 접근 (전진 스크롤만큼 상대속도 가산) + 근접 공격
        for (const e of w.enemies) {
          if (e.dead) continue
          e.flash = Math.max(0, e.flash - dt * 5)
          if (e.stun > 0) { e.stun -= dt; if (!(e.atkT > 0)) continue }  // 기절 중 정지 (진행 중인 공격은 계속)
          // 일반 몹(웨이브·모험 공통)은 제자리에 박혀 있다 — 히어로가 전진할 때만(scroll) 왼쪽으로 흐른다.
          // 교전 중엔 scroll=0 이라 완전히 멈춘다. 보스만 예전처럼 걸어온다.
          // 웨이브에서는 보스도 제자리(히어로가 걸어가서 붙는 구조). 모험·이벤트 던전 보스만 걸어온다
          const still = w.adv ? !e.boss : true        // 모험만 보스가 걸어옴 — 웨이브·이벤트 던전은 보스도 제자리
          const waveMob = still && !w.adv && !w.ev && !e.boss   // 웨이브 일반몹만 공격 안 함 (웨이브·이벤트 보스는 공격함)
          // 넉백: ease-out 감쇠하며 뒤로 밀림 / 스쿼시 타이머
          // 제자리 몹은 **위치를 밀지 않는다** — 걸어오지 않으니 밀린 만큼 되돌아올 수단이 없어 맞을 때마다 누적되고 뒷줄과 겹침
          if (e.kb > 0.5) { if (!(e.atkT > 0) && !still) e.x += e.kb * dt; e.kb -= e.kb * Math.min(1, dt * 9) } else e.kb = 0  // 공격 중엔 밀리지 않음
          if (e.sq > 0) e.sq = Math.max(0, e.sq - dt)
          e.vt = Math.min(1, (e.vt ?? 0) + dt * 2.2)   // 스폰 직후 가속 (0→1)
          const embKey = e.dino ? ('d:' + e.dino) : (e.evBoss ? ('e:' + e.evBoss) : (e.boss ? ('c:' + e.type) : e.type))   // 이벤트보스=e:번호, 저주보스=c:종
          const emb = (e.boss ? motRef.current.boss[embKey] : motRef.current.mob[embKey]) || {}
          const szm = e.dino ? (emb.sz ?? (motRef.current.size[e.dino] || 1)) : (emb.sz || 1)
          const estop = e.dino ? (emb.stop ?? (motRef.current.stop[e.dino] || 0)) : (emb.stop || 0)   // 좌우 정지 위치(+면 오른쪽/멀리)
          // 이펙트 위치 자동보정: 보스는 덩치 때문에 estop 만큼 더 멀리 선다.
          // 스킬 이펙트 오프셋은 일반 웨이브(정지거리 = wave.dist)에서 잡은 값이므로,
          // 보스가 추가로 물러난 estop 만큼 되돌려 히어로 기준 같은 자리에 떨어지게 한다.
          e.fxOff = e.boss ? estop : 0
          const espd = emb.spd || 1                                                       // 달려오는 속도 배율(공룡·웨이브 공통)
          // 제자리 몹은 종·크기와 무관하게 **일괄 거리**로 선다 (편집기 '히어로와 거리')
          // 걸어오는 몹·보스만 예전 종별 계산 유지
          const qi = (advRank && !e.boss) ? (advRank.get(e) || 0) : 0        // 모험 1열 순번(0=맨 앞)
          const stopX = still
            ? (w.adv
                ? w.heroX + (motRef.current.adv.dist ?? 60) + qi * (motRef.current.adv.gap ?? 40)   // 모험 1열
                : w.heroX + (motRef.current.wave.dist ?? 95) + (e.boss ? estop : 0))                 // 웨이브: 일반몹 일괄 / 보스는 종별 정지값 가산
            : w.heroX + Math.min(atkRange - 15, 60 + e.h * szm * 0.4) + estop
          e.stopX = stopX   // 정지위치 저장 → 멈춘 몬스터는 사거리 밖이어도 기본공격 판정(그림상 코앞인데 안닿는 문제 해결)
          // 히어로가 때릴 수 있는 거리면 몹도 반격할 수 있어야 한다.
          // (히어로 타격 판정은 사거리+40인데 몹 공격은 정지위치 도달이 조건이라, 그 사이 구간에서 몹이 일방적으로 맞고 죽었음)
          const inHeroReach = w.adv && !e.boss && (e.x - w.heroX) < atkRange + 40   // 모험 몹만 — 웨이브 몹에 걸면 스크롤 흐름에서 빠져 뒤로 밀리고 겹침
          // engaged()는 stopX+6 에서 교전으로 인정하는데 이동 분기는 e.x > stopX 라, 그 6px 구간에서
          // scroll=0(교전) + 자기속도 0(제자리) 이 겹치면 좁힐 수단이 없어 공격 분기에 영영 못 들어갔다.
          // (웨이브 보스가 공격 모션·파고듦을 한 번도 안 하던 원인) → 사거리 안에 들어오면 정지위치로 스냅
          if (still && e.x > stopX && e.x <= stopX + 6) e.x = stopX
          if (e.x > stopX && !inHeroReach && !(e.atkT > 0)) {
            const near = still ? 1 : Math.min(1, Math.max(0.3, (e.x - stopX) / 55))  // 정지 전 감속
            const own = still ? 0 : e.speed * (e.spdV || 1) * espd * SPEED * 1.3 * e.vt * near
            e.x -= (own + scroll) * dt
            if (e.atkT > 0) { e.atkT = 0; e.lunge = 0 }
            if (!waveMob) e.animT += dt * SPEED * (0.4 + 0.6 * e.vt * near) * (1 + scroll / SCROLL * 0.4) * Math.min(1.5, Math.max(0.6, 0.55 + e.speed / 160))   // 웨이브 제자리몹만 완전 정지
          } else if (waveMob) {                            // 웨이브 일반몹만 히어로를 공격하지 않는다 — 맞아주는 역할만
            e.lunge = 0; e.atkT = 0; e.atkHit = false
          } else if (w.adv && !e.boss && qi !== 0) {
            // 모험 일반몹은 1열 맨 앞(qi 0)만 공격한다. 뒤에 선 몹까지 때리면 전부 같이 파고들어
            // 줄 전체가 앞뒤로 출렁인다. 맨 앞이 죽으면 advRank 가 매 프레임 다시 매겨져 다음 몹이 이어받는다.
            e.lunge = 0; e.atkT = 0; e.atkHit = false
            e.animT += dt * SPEED * 0.9                    // 멈춰 있어도 걷기 프레임은 계속 돈다
          } else {
            if (w.adv && !e.boss) e.animT += dt * SPEED * 0.9   // 모험 몹: 멈춰 있어도 걷기 프레임은 계속 돈다
            if (e.atkT > 0) {
              e.atkT -= dt
              const dur = e.atkDur || motRef.current.dur.wave
              const el = dur - Math.max(0, e.atkT)                          // 경과 시간
              const hitAt = e.atkHitAt != null ? e.atkHitAt : dur * 0.5
              // 파고듦: 타격 순간에 가장 깊이 들어가고 이후 복귀
              const lp = el < hitAt ? el / Math.max(0.001, hitAt) : Math.max(0, 1 - (el - hitAt) / Math.max(0.001, dur - hitAt))
              e.lunge = -Math.sin(Math.min(1, lp) * Math.PI / 2) * (e.boss ? motRef.current.lunge.boss : (motRef.current.adv.lunge ?? 30))   // 일반몹 파고듦은 모험 전용
              if (!e.atkHit && el >= hitAt) {                               // 타격 프레임 진입 = 실제 타격 순간
                e.atkHit = true
                // 회피 판정: 적 명중률 − 내 회피 보너스
                const hitChance = Math.max(0.05, e.acc + 0.5 - st.eva)
                if (Math.random() < hitChance) {
                  hero.hp -= e.dmg
                  hero.flash = 0.28
                  w.shake = e.boss ? 9 : 4
                  w.heroKb = Math.max(w.heroKb || 0, e.boss ? 4 : 2)       // 히어로 넉백 (18/8 → 9/4 → 4/2)
                  w.hitstop = Math.max(w.hitstop || 0, e.boss ? 0.06 : 0.025)
                  burst(w.heroX + 15, w.groundY - 70, '#c81818', 8, true)
                } else {
                  addDmg(w.heroX, w.groundY - 130, 'DODGE', false, true)
                }
              }
            } else e.lunge = 0
            e.cd -= dt * 1000
            if (e.cd <= 0) {
              const isDinoBoss = !!e.dino && e.boss
              const M = motRef.current
              e.atkDur = isDinoBoss ? dinoAtkDur(e.dino, M.atk) : e.dino ? M.dur.advMob : M.dur.wave
              e.atkHitAt = isDinoBoss ? dinoHitAt(e.dino, M.atk, M.hit) : e.atkDur * 0.5
              e.cd = isDinoBoss ? M.cd.advBoss : e.dino ? M.cd.advMob : M.cd.wave
              e.atkT = e.atkDur; e.atkHit = false
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
          // 시전 중 아님: **멈춰서 기본공격에 들어간 시점(blocked)에만** 발동.
          // 예전엔 '살아있는 적이 하나라도 있으면'이라 화면 밖 몹만 있어도 걸어가며 스킬을 썼다.
          // 스킬의 rangePx는 데미지 범위일 뿐 발동 조건이 아니다 — 여기서 사거리를 보면 안 됨.
          if (blocked) {
            const slots = st.equipped || []
            let ready = -1
            for (const si of slots) {
              if (si != null && SKILLS[si].stage === st.evo && w.skillCd[si] <= 0) { ready = si; break }
            }
            if (ready >= 0) { w.skill = ready; w.skillT = 0; w.skillDid = false; w.skillFx = false; w.skillNext = 0; w.skillCd[ready] = skEff(SKILLS[ready], st.skCfg).cd }
          }
        } else {
          const sk = SKILLS[w.skill]
          const _skCast = skCast(skFrT(sk, motRef.current))   // 편집기에서 프레임 시간 바꾸면 즉시 반영
          w.skillT += dt * SPEED
          // 낙하 이펙트는 데미지 시점(hitAt)이 아니라 **startP 시점**에 생성 — 히어로 모션에 겹칠 수 있게
          if (sk.fx && sk.fx.type === 'strike' && !w.skillFx) {
            const _fxc = motRef.current.skFx[sk.id] || {}
            if (w.skillT >= _skCast * (_fxc.startP ?? sk.hitAt)) {
              w.skillFx = true
              const __e2 = skEff(sk, st.skCfg)
              const rng2 = __e2.rangePx || Infinity
              const inR2 = w.enemies.filter(e => !e.dead && e.x - w.heroX < rng2).sort((a, b) => a.x - b.x)
              const _t0 = inR2[0]
              const _tw = sk.fx.twin || null                                   // 교차 2장 연출(토네이도)
              const x2 = _fxc.anchor ? w.heroX : (_t0 ? _t0.x - (_t0.fxOff || 0) : w.heroX + 260)   // 보스는 estop 만큼 되돌려 보정
              // 크기 보정 없음 — 일반몹이든 보스든 이펙트 크기·오프셋은 동일, 위치(x2)만 대상을 따라간다
              w.strikes.push({ id: sk.id, frames: sk.fx.frames, x: x2, anchor: _fxc.anchor ? 1 : 0, twin: _tw, t: 0,
                dur: fxTotal(motRef.current, sk.id, sk.fx.frames.length, STRIKE_DUR_BY[sk.id] ?? STRIKE_DUR) / (_fxc.spd || 1),
                dmg: st.atk * __e2.dmgMult, hitDone: false, h: sk.fx.fxH ?? sk.h, hitP: sk.fx.hitP ?? 0.45,
                aoe: __e2.aoe, rng: rng2, hx: w.heroX, stun: sk.stun || 0,
                tick: _fxc.tick ?? sk.fx.tick ?? 0, nextHit: 0 })   // tick>0 이면 hitP 단발 대신 그 간격으로 계속 때린다
            }
          }
          // 한 번 발동할 때 하는 일(투사체 생성 / 광역·단일 데미지). 연타면 이걸 간격마다 반복한다.
          // noStop=true 면 히트스톱·화면흔들림 생략 — 연타 2타째부터는 걸면 화면이 뚝뚝 끊긴다
          const _fire = noStop => {
            const __ef = skEff(sk, st.skCfg)
            const dmg = st.atk * __ef.dmgMult
            if (sk.fx && sk.fx.type === 'proj') {
              // 투사체: 히어로 앞에서 생성, 명중 시 데미지
              const _spd = (motRef.current.skFx[sk.id] || {}).spd || 1
              const _ftA = fxT(motRef.current, sk.id, sk.fx.fly.length)
              const ft = (_ftA || FX_FRAME_T[sk.id] || sk.fx.fly.map(() => 1 / PROJ_FPS)).map(t => t / _spd)
              const fe = []; let fa = 0; for (const t of ft) { fa += t; fe.push(fa) }
              w.projs.push({ id: sk.id, fly: sk.fx.fly, impact: sk.fx.impact || null, x: w.heroX + 70, t: 0, dmg, h: sk.fx.fxH ?? sk.h, scale: sk.fx.flyScale || 1, yOff: sk.fx.yOff ?? 40, fe, feTotal: fa })
            } else if (sk.fx && sk.fx.type === 'strike') {
              // 이펙트는 위 startP 시점에 이미 생성됨(시전당 1개). 데미지도 그 이펙트가 처리(연타 포함)
            } else if (__ef.aoe) {
              const rng = __ef.rangePx || Infinity   // 히어로 기준 px 이내만, 0/null이면 화면 전체(메테오)
              for (const t of w.enemies) if (!t.dead && t.x - w.heroX < rng) { applySkillDmg(t, dmg, noStop); if (sk.stun) t.stun = sk.stun }
            } else {
              const targets = w.enemies.filter(e => !e.dead).sort((a, b) => a.x - b.x).slice(0, sk.maxTargets || 1)
              for (const t of targets) applySkillDmg(t, dmg, noStop)
            }
            if (!noStop) w.shake = 8
          }
          const _tick = (motRef.current.skFx[sk.id] || {}).tick ?? ((sk.fx && sk.fx.tick) || 0)
          if (_tick > 0 && !(sk.fx && sk.fx.type === 'strike')) {
            // 연타: 시전 시작부터 끝까지 간격마다 반복(타격 시점 hitAt 무시). strike 는 이펙트 쪽에서 따로 돈다
            let guard = 0
            while (w.skillT >= (w.skillNext || 0) && (w.skillNext || 0) < _skCast && guard++ < 8) {
              _fire(w.skillDid); w.skillDid = true
              w.skillNext = (w.skillNext || 0) + _tick
            }
            if (guard >= 8) w.skillNext = w.skillT + _tick
          } else if (!w.skillDid && w.skillT >= _skCast * sk.hitAt) {
            w.skillDid = true
            _fire(false)
          }
          // 시전 종료는 **히어로 모션과 낙하 이펙트가 둘 다 끝났을 때**.
          // 예전엔 히어로 모션만 보고 끝내서, 이펙트가 아직 떨어지는 중에 기본공격으로 넘어갔음
          let _castEnd = _skCast
          if (sk.fx && sk.fx.type === 'strike') {
            const _fc = motRef.current.skFx[sk.id] || {}
            const _fxDur = fxTotal(motRef.current, sk.id, sk.fx.frames.length, STRIKE_DUR_BY[sk.id] ?? STRIKE_DUR) / (_fc.spd || 1)
            _castEnd = Math.max(_skCast, _skCast * (_fc.startP ?? sk.hitAt) + _fxDur)
          }
          if (w.skillT >= _castEnd) { w.skill = null; w.skillT = 0 }
        }
        // UI 동기화 (0.2초 간격)
        w.skillUiT = (w.skillUiT || 0) + dt
        if (w.skillUiT > 0.15) { w.skillUiT = 0; setSkillCdUI([...w.skillCd]) }

        // 스킬 투사체: 전진, 지나는 모든 적 관통 타격 (완전관통)
        for (const prj of w.projs) {
          prj.t += dt
          prj.x += 520 * dt * SPEED * ((motRef.current.skFx[prj.id] || {}).fly || 1)   // 스킬별 비행 속도
          prj.hitSet = prj.hitSet || new Set()
          for (const e of w.enemies) {
            if (!e.dead && !prj.hitSet.has(e) && Math.abs(e.x - prj.x) < 45) {
              prj.hitSet.add(e)
              applySkillDmg(e, prj.dmg, prj.stopped)   // 히트스톱은 첫 타에만 — 나머지는 매끄럽게 관통
              prj.stopped = true
              if (prj.impact) w.strikes.push({ id: prj.id, frames: [prj.impact], x: e.x, t: 0, dur: 0.35, dmg: 0, hitDone: true, h: prj.h })
            }
          }
          if (prj.x > w.W + 100) prj.dead = true
        }
        w.projs = w.projs.filter(p => !p.dead)

        // 스킬 타격(낙뢰/낙석): 재생 중반에 해당 위치 적 데미지
        for (const stk of w.strikes) {
          stk.t += dt
          // noStop: 히트스톱은 첫 타에만. 연타마다 걸면 세계가 뚝뚝 끊긴다
          const _hit = noStop => {
            if (!(stk.dmg > 0)) return
            if (stk.aoe) { for (const e of w.enemies) if (!e.dead && e.x - stk.hx < stk.rng) { applySkillDmg(e, stk.dmg, noStop); if (stk.stun) e.stun = stk.stun } }
            else { const e = w.enemies.find(e2 => !e2.dead && Math.abs(e2.x - stk.x) < 70); if (e) applySkillDmg(e, stk.dmg, noStop) }
          }
          if (stk.tick > 0) {
            // 연타: 이펙트 시작(0초)부터 끝날 때까지 tick 간격으로. hitP는 무시된다.
            // while 로 따라잡되 프레임 하나에서 몰아치지 않게 상한을 둔다(탭 복귀 등으로 dt가 크게 튈 때)
            let guard = 0
            while (stk.t >= stk.nextHit && stk.nextHit < stk.dur && guard++ < 8) {
              _hit(stk.hitDone); stk.hitDone = true
              stk.nextHit += stk.tick
            }
            if (guard >= 8) stk.nextHit = stk.t + stk.tick
          } else if (!stk.hitDone && stk.t >= stk.dur * (stk.hitP ?? 0.45)) {
            stk.hitDone = true
            _hit(false)
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
          const target = w._nearest()
          if (hero.cd <= 0 && target) {
            hero.state = 'attack'; hero.t = 0; hero.did = false
            hero.cd = st.cd
            // 동료 동기화: 히어로 타격까지 걸리는 실제 시간(초) → 동료 투사체가 같은 순간 명중하도록 역산에 사용
            const rate = SPEED * st.aspdMult
            if (st.mode === 'quad') w.heroHitIn = PUNCH.hitAt / rate
            else if (MELEE_MODES.includes(st.mode)) w.heroHitIn = (MC(st.mode).total * heroHitProg(st.mode, motRef.current)) / rate
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
              const t = w._nearest(40)
              if (t) dealDamage(t, st)
            }
            if (hero.t >= PUNCH.total) { hero.state = 'move'; hero.t = 0 }
          } else if (MELEE_MODES.includes(st.mode)) {
            const mc = MC(st.mode)
            const prog = hero.t / mc.total
            const inRange = w._nearest(40)
            if (!hero.did && !inRange && prog < 0.35) {
              // 스윙 초반에 대상 소멸 → 취소 + 쿨다운 환불 (헛스윙/헛대기 방지)
              hero.state = 'move'; hero.t = 0; hero.cd = Math.min(hero.cd, 100)
            } else {
              if (!hero.did && prog >= heroHitProg(st.mode, motRef.current)) {
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
                  T: Math.min(0.45, Math.max(0.18, d / 900)) / (motRef.current.stone.spd || 1),   // 비행 시간(속도 배율의 역수)
                  arc: Math.min(40, 15 + d * 0.12) * (motRef.current.stone.arc ?? 1),
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
        if (w.qKill) { const n = w.qKill; w.qKill = 0; qEv('kill', n) }
        if (w.killExp) { const e = w.killExp; w.killExp = 0; setHexp(x => x + e) }
        if (w.gainQueue && w.gainQueue.length) {
          const q = w.gainQueue; w.gainQueue = []
          setGains(g => [...g, ...q.map(x => ({ ...x, id: w.gainId = (w.gainId || 0) + 1, born: now }))].slice(-6))
        }
        const prog = w.total ? w.killed / w.total : 0
        if (prog !== w.shownProg) { w.shownProg = prog; setProgress(prog) }
        if (Math.ceil(hero.hp) !== w.shownHp) { w.shownHp = Math.ceil(hero.hp); setHeroHpUI(Math.max(0, w.shownHp)) }
        if (w.ev) {
          const bEn = w.enemies.find(e => e.boss && !e.dead)
          const tt = Math.ceil(Math.max(0, w.evTime) * 10)
          const hh = bEn ? Math.ceil(bEn.hp) : -1
          if (tt !== w._btShown || hh !== w._bhShown) {
            w._btShown = tt; w._bhShown = hh
            setBossUI({ t: Math.max(0, w.evTime), max: EV_TIME, hp: bEn ? Math.max(0, bEn.hp) : 0, maxHp: bEn ? bEn.maxHp : 1, has: !!bEn })
          }
        } else if (w.adv) {
          const bEn = w.enemies.find(e => e.boss && !e.dead)
          const tt = Math.ceil(Math.max(0, w.advTime) * 10)
          const hh = bEn ? Math.ceil(bEn.hp) : -1
          if (tt !== w._btShown || hh !== w._bhShown) {
            w._btShown = tt; w._bhShown = hh
            setBossUI({ t: Math.max(0, w.advTime), max: ADV_TIME, hp: bEn ? Math.max(0, bEn.hp) : 0, maxHp: bEn ? bEn.maxHp : 1, has: !!bEn })
          }
        } else if (w.bossBattle) {
          const bEn = w.enemies.find(e => e.boss && !e.dead)
          const tt = Math.ceil(Math.max(0, w.bossTimer) * 10)
          const hh = bEn ? Math.ceil(bEn.hp) : -1
          if (tt !== w._btShown || hh !== w._bhShown) {
            w._btShown = tt; w._bhShown = hh
            setBossUI({ t: Math.max(0, w.bossTimer), hp: bEn ? Math.max(0, bEn.hp) : 0, maxHp: bEn ? bEn.maxHp : 1, has: !!bEn, wave: true })   // wave:true → 나가기 버튼 표시
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
                const amb = motRef.current.ally[ak] || {}                    // 투사체 발사 위치 편집값
                const lx = au.x + d.h * 0.4 + (amb.projX || 0)
                const ly = w.groundY - d.h * d.projYr + (d.yOff || 0) + (amb.projY || 0)
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
            const hit = w.enemies.find(e => !e.dead && Math.abs(e.x - sp2.x) < 26 + e.h * (e.dino ? (motRef.current.size[e.dino] || 1) : 1) * 0.2)
            if (hit) { sp2.dead = true; dealDamage(hit, { ...st, atk: st.atk * d.atkMult }) }
            else if (sp2.x > w.W + 80) sp2.dead = true
          }
          w.spears = w.spears.filter(sp2 => !sp2.dead)
        }

        // 보스 제한시간: 초과 시 실패 처리 후 같은 웨이브 재개 (재도전 가능)
        if (w.bossBattle) {
          w.bossTimer -= dt
          if ((w.bossTimer <= 0 || w.bossGiveUp) && !w.clearedFlag) {
            w.clearedFlag = true
            w.enemies = []; w.stones = []; w.rocks = []
            w.bossBattle = false
            setClearMsg(w.bossGiveUp ? '보스전 나가기' : '시간 초과 — 보스 실패')
            setBossReady(true)                                  // 보스 도전 버튼 다시 활성 — 재도전 가능
            w.needStart = true                                  // 같은 웨이브의 일반 웨이브로 복귀
            w.bossGiveUp = false
          }
        }

        // ── 이벤트 던전: 경고 → 보스 → 제한시간 / 승패 ──
        if (w.ev && !w.ev.done) {
          const c = w.ev
          w.evTime -= dt
          if (!c.bossOut) {
            c.warnT -= dt
            if (c.warnT <= 0) { c.bossOut = true; c.warnT = 0; pushEvBoss(); w.shake = 10 }
          } else if (!w.enemies.some(e => e.boss && !e.dead)) { c.done = true; c.win = true }
          if (!c.done && (w.evTime <= 0 || hero.hp <= 0 || w.evGiveUp)) { c.done = true; c.win = false; c.quit = !!w.evGiveUp }
        }
        if (w.ev && w.ev.done) {
          const c = w.ev
          w.ev = null; w.evTime = 0; w.evGiveUp = false
          w.enemies = []; w.stones = []; w.rocks = []; w.waves = []
          w._btShown = -1; w._bhShown = -1; setBossUI(null); setEvUI(null)
          if (c.win) {
            setEvStage(v => ({ ...v, [c.no]: Math.max(v[c.no] || 0, c.stage || 1) }))
            setGem(g => g + EV_REWARD.dia)
            setPearl(v => v + EV_REWARD.pearl)
            setClearMsg(`${c.name} ${c.stage || 1}단계 격파!`)
            // 격파하면 방금 잡은 보스의 도전창으로 돌아간다 — 진행바가 한 칸 더 찬 상태로 보인다
            const di = EV_DUNGEONS.findIndex(d => d.key === c.key)
            if (di >= 0) {
              setEvSel(di)
              setEvOpen(true)
              setEvPick({ di, no: c.no, name: c.name, dname: c.dname || EV_DUNGEONS[di].name })
            }
          } else setClearMsg(c.quit ? '던전 포기' : (hero.hp <= 0 ? '던전 실패 — 쓰러짐' : '던전 실패 — 시간 초과'))
          if (c.quit) setEvOpen(true)                          // 포기하면 던전 목록창을 다시 열어둔다(도전 확인창 아님)
          w.needStart = true                                   // 웨이브로 복귀
          hero.hp = st.maxHp
        }

        // ── 모험: 제한시간 / 승패 ──
        if (w.adv && !w.adv.done) {
          w.advTime -= dt
          const a = w.adv
          if (!a.bossOut && w.killed >= ADV_MOBS && w.enemies.length === 0) {
            if (a.warnT == null) { a.warnT = ADV_WARN; w.shake = 6 }
            a.warnT -= dt
            if (a.warnT <= 0) { a.bossOut = true; a.warnT = 0; pushAdvEnemy(true); w.shake = 10 }
          }
          const bossDown = w.adv.bossOut && !w.enemies.some(e => e.boss && !e.dead)
          if (bossDown) { w.adv.done = true; w.adv.win = true }
          else if (w.advTime <= 0 || hero.hp <= 0 || w.advGiveUp) { w.adv.done = true; w.adv.win = false; w.adv.quit = !!w.advGiveUp }
        }
        if (w.adv && w.adv.done) {
          const a = w.adv
          w.adv = null; w.advTime = 0
          w.enemies = []; w.stones = []; w.rocks = []; w.waves = []
          w._btShown = -1; w._bhShown = -1; setBossUI(null); setAdvUI(false); w.advGiveUp = false
          if (a.win) {
            setAdvStage(v => ({ ...v, [a.key]: Math.max(v[a.key] || 0, a.stage) }))
            qEv('adv_clear')
            const rw = advReward(a.stage)
            setGem(g => g + rw.dia)
            setMats(m => { const n = [...m]; n[4] = (n[4] || 0) + rw.mat; return n })
            setClearMsg(`${a.name} ${a.stage}단계 클리어!`)
          } else {
            setClearMsg(a.quit ? '모험 포기' : (hero.hp <= 0 ? '모험 실패 — 쓰러짐' : '모험 실패 — 시간 초과'))
          }
          setNav('모험')                                              // 포기·실패·클리어 모두 모험 탭으로
          setAdvSel(CONTINENTS.find(c => c.key === a.key) || null)   // 진입창 복귀
          w.needStart = true
          hero.hp = st.maxHp
        }

        if (hero.hp <= 0 && !w.adv && !w.ev) setPhase('gameover')
        else if (!w.adv && !w.ev && w.spawnLeft === 0 && w.enemies.length === 0 && !w.clearedFlag) {
          w.clearedFlag = true
          if (w.bossBattle) {
            // 보스 처치: 보상 크게 + 다음 웨이브 블록으로 진행
            setMeat(m => m + 100 + w.waveNum * 20)
            setClearMsg('보스 격파!')
            w.bossBattle = false
            w.bossPrompted = false
            setBossReady(false)
            setWave(v => v + 1)
            qEv('stage')
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
              qEv('stage')
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
      if (w.heroKb) w.heroKb = Math.max(0, w.heroKb - w.heroKb * Math.min(1, dt * 7) - dt * 6)   // 넉백 복귀

      draw(ctx, now)
      raf = requestAnimationFrame(loop)
    }

    function heroAnim(hero, st) {
      if (w.skill != null) {
        const sk = SKILLS[w.skill]
        const arr = ANIM[sk.anim].srcs
        const ends = skEnds(skFrT(sk, motRef.current))
        let k = ends.findIndex(e => w.skillT <= e)
        if (k < 0 || k >= arr.length) k = arr.length - 1
        return [sk.anim, k]
      }
      if (hero.state === 'attack') {
        if (st.mode === 'quad') {
          const k = hero.t < PUNCH.hitAt ? 0 : hero.t < PUNCH.hitAt + 0.1 ? 1 : 2
          return ['punch', k]
        }
        if (MELEE_MODES.includes(st.mode)) {
          const ak = HERO_ATK_ANIM(st.mode)
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
      const mbKey = e.dino ? ('d:' + e.dino) : (e.evBoss ? ('e:' + e.evBoss) : (e.boss ? ('c:' + e.type) : e.type))   // 공룡=d:종, 이벤트보스=e:번호, 저주보스=c:종
      const mb = (e.boss ? motRef.current.boss[mbKey] : motRef.current.mob[mbKey]) || {}
      const yoff = mb.y || 0                                                    // 높이(공룡도 적용)
      const y = w.groundY - air - yoff
      const t = ENEMY_TYPES[e.type]
      const szm = e.dino ? (mb.sz ?? (motRef.current.size[e.dino] || 1)) : (mb.sz || 1)   // 공룡은 편집값 우선, 없으면 공룡탭 값
      const H = e.h * szm
      const imgs = e.dino ? (e.boss ? (e.atkT > 0 ? DINO_BOSS[e.dino].a : DINO_BOSS[e.dino].w) : DINO_MOB[e.dino]) : (e.evBoss ? BIMG[e.evBoss - 1] : (e.boss ? CIMG[e.type] : EIMG[e.type]))   // 이벤트 던전 보스=BIMG, 저주보스=CIMG
      const stunned = e.stun > 0
      // 갱신 쪽 still 과 같은 기준이어야 함 — 웨이브는 보스도 제자리
      const still = w.adv ? !e.boss : true     // 갱신 쪽과 같은 기준
      const frozen = still && !w.adv           // 웨이브·이벤트 던전은 완전 정지: 들썩임·기울기·프레임순환 없음, 파고듦만
      const gall = e.animT * 9
      const fi = frozen ? 0                                    // 웨이브(제자리)는 공격 중에도 1번 프레임 — 파고듦으로만 때린다
        : e.atkT > 0
        ? (e.dino && e.boss
            ? dinoAtkFrame(e.dino, (e.atkDur || dinoAtkDur(e.dino, motRef.current.atk)) - e.atkT, motRef.current.atk)   // 보스: 종별 프레임 시간표
            : Math.min(imgs.length - 1, Math.floor(((e.atkDur || motRef.current.dur.wave) - e.atkT) / (e.atkDur || motRef.current.dur.wave) * imgs.length)))
        : (stunned || frozen) ? 0 : Math.floor(gall / Math.PI) % imgs.length  // 기절·웨이브 제자리몹은 1번 프레임 고정
      const wf = e.boss ? 0.55 : Math.min(1.15, Math.max(0.45, 62 / H))  // 무게 차등: 클수록 덜 들썩임
      const bounce = (stunned || frozen) ? 0 : e.air
        ? Math.sin(gall * 0.45 + (e.yOff || 0)) * 5                        // 공중: 부드러운 부유
        : Math.abs(Math.sin(gall)) * H * 0.08 * wf
      const rock = (stunned || frozen) ? 0 : Math.sin(gall) * 0.06 * (e.air ? 0.35 : wf)
      const im = imgs[fi]
      ctx.save()
      ctx.translate(e.x + (e.lunge || 0), y - bounce + (e.air ? 0 : (e.yOff || 0)))
      ctx.rotate(rock)
      if (e.sq > 0) {                                    // 피격 반응: 젖힘 → 찌그러짐 (원점이 발밑이라 위치는 그대로)
        if (!still || w.adv) { const q = e.sq / (e.sqD || 0.18); ctx.scale(1 + 0.10 * q, 1 - 0.14 * q) }   // 보스·모험 몹은 종전 그대로
        else {                                           // 웨이브 일반몹 전체 = 편집기 값 하나로 일괄
          const hs = motRef.current.hitSq
          const q = e.sq / (e.sqD || hs.dur || 0.18)     // 1 → 0 으로 감쇠
          if (hs.rot) ctx.rotate((t.flip ? -1 : 1) * hs.rot * Math.PI / 180 * q)
          ctx.scale(1 + (hs.x - 1) * q, 1 + (hs.y - 1) * q)
        }
      }
      if (e.dead) { const p = Math.max(0, e.dieT) / 0.5; ctx.globalAlpha = Math.min(1, p * 2) * 0.9 }
      if (!e.dead && e.flash > 0.5) ctx.filter = 'brightness(3)'
      if (im.complete && im.naturalWidth > 0) {
        const eh = H * (e.scaleV || 1)
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
        ctx.beginPath(); ctx.ellipse(0, -H * 0.5, H * 0.6, H * 0.4, 0, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()
      const bw = Math.min(26, H * 0.45)   // 일반몹 체력바 (기존 52/0.9의 절반)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(e.x - bw / 2, y - H - 12, bw, 4)
      ctx.fillStyle = '#d51616'
      ctx.fillRect(e.x - bw / 2, y - H - 12, bw * Math.max(0, e.hp / e.maxHp), 4)
      // 기절: 머리 위로 노란 별 3개 원 궤도 회전
      if (stunned) {
        const cx = e.x, cy = y - H - 14, rad = 14
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
      if (!w.paused && w.shake > 0.3) ctx.translate((Math.random() - 0.5) * w.shake, (Math.random() - 0.5) * w.shake)   // 일시정지 중엔 흔들지 않음(dt=0이라 shake가 안 줄어 계속 떨렸음)

      // 배경: 가로 무한 타일 스크롤 (10웨이브마다 테마 변경, 보스전투 시 보스 배경)
      const advBG = w.adv ? ADV_BG[w.adv.key] : (w.ev ? EV_BG[w.ev.key] : null)
      const advOK = !!(advBG && advBG.complete && advBG.naturalWidth > 0)
      const BG = advOK ? advBG : bgFor(w.waveNum || 1, w.bossBattle)   // 모험 배경 로드 실패 시 일반 배경으로 대체
      if (BG.complete && BG.naturalWidth > 0) {
        const scale = Math.max(w.W / BG.naturalWidth, w.H / BG.naturalHeight)
        const bw = BG.naturalWidth * scale, bh = BG.naturalHeight * scale
        const i0 = Math.floor(w.scrollX / bw)
        let x = -(w.scrollX - i0 * bw)
        for (let i = 0; x < w.W; x += bw, i++) {
          // 모험 배경은 이음매가 보여서 한 장씩 좌우 반전(거울 타일) → 맞닿는 면이 동일해 경계 사라짐
          if (advOK && ((i0 + i) % 2 + 2) % 2 === 1) {
            ctx.save(); ctx.translate(x + bw, w.H - bh); ctx.scale(-1, 1)
            ctx.drawImage(BG, 0, 0, bw, bh); ctx.restore()
          } else ctx.drawImage(BG, x, w.H - bh, bw, bh)
        }
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

      // 앞으로 파고드는 스킬(hero.skillFront[id]=1)일 때만 히어로를 몬스터 위에 그린다. 동료·투사체는 항상 몹 뒤
      const __heroFront = w.skill != null && !!((motRef.current.hero.skillFront || {})[SKILLS[w.skill].id])

      // 주인공
      const hero = w.hero
      const __heroPv = motEditRef.current && motCatRef.current === 'hero'   // 편집기 히어로탭: 선택단계 미리보기
      const __pvEvo = __heroPv ? motHeroEvoRef.current : S.current.evo
      const __Sp = __heroPv ? { ...S.current, mode: EVOS[__pvEvo].mode, evo: __pvEvo } : S.current
      if (__heroPv) {                                    // 사거리 가이드선 — 편집기 히어로탭에서만 보임
        const __rg = heroRange(motRef.current, __pvEvo, EVOS[__pvEvo].mode)
        const __rx = w.heroX + __rg
        ctx.save()
        ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(240,168,48,0.9)'
        ctx.beginPath(); ctx.moveTo(__rx, w.groundY - 190); ctx.lineTo(__rx, w.groundY + 4); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#f0a830'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(`사거리 ${Math.round(__rg)}`, __rx, w.groundY - 196)
        ctx.restore()
      }
      const [key, fi] = heroAnim(hero, __Sp)
      const a = ANIM[key]
      const im = safeImg(key, fi)
      // 히어로 모션이 끝났는데 이펙트가 아직 남은 구간 — skillHide=1 인 스킬만 히어로를 지운다.
      // (시전 종료는 이펙트 끝까지 기다리므로, 그동안 히어로가 마지막 프레임으로 굳어 이펙트와 겹쳐 있었다)
      // 편집기 히어로탭에서도 그대로 적용한다 — 조절하면서 결과를 봐야 하는 값이라 미리보기에서 빼면 안 된다.
      const __heroHide = w.skill != null
        && !!((motRef.current.hero.skillHide || {})[SKILLS[w.skill].id])
        && w.skillT > skEnds(skFrT(SKILLS[w.skill], motRef.current)).slice(-1)[0]
      if (im.complete && im.naturalWidth > 0) {
        const hcfg = motRef.current.hero
        const __skId = w.skill != null ? SKILLS[w.skill].id : null
        const __skp = __skId != null ? ((motRef.current.hero.skillPos || {})[__skId] || {}) : {}   // 스킬별 그림 위치 오프셋
        const __skfp = __skId != null ? (((motRef.current.hero.skillFrPos || {})[__skId] || {})[fi + 1] || {}) : {}   // 스킬 프레임별 위치
        const __frMul = (((hcfg.atkFrSz || {})[key] || {})[fi + 1] ?? 1)   // 기본공격 크기 = 프레임별 배율
        // 공격 스프라이트를 그리는 동안은(공격 중이든, 적 앞에서 대기 중이든) 항상 공격 프레임 크기를 쓴다.
        // 예전엔 대기 중일 때만 걷기 크기라서, 공격이 끝나고 다음 공격 전에 크기가 줄었다 커지는 게 보였음.
        const __isAtkSprite = !!((hcfg.atkFrSz || {})[key])
        // 공격 스프라이트는 캔버스 가로 중앙 기준으로 그려지는데, 몽둥이 궤적이 한쪽으로 뻗어 있으면
        // 몸이 반대쪽으로 밀려 보인다(=공격할 때 뒤로 빠지는 것처럼 보이는 원인). 프레임별로 보정.
        const __frX = __isAtkSprite ? (((hcfg.atkFrX || {})[key] || {})[fi + 1] || 0) : 0
        const hStMul = w.skill != null ? (((hcfg.skillSz || {})[__skId] || 1) * ((((hcfg.skillFrSz || {})[__skId] || {})[fi + 1]) ?? 1)) : (__isAtkSprite ? __frMul : ((hcfg.walkSz || {})[__pvEvo] ?? 1))
        const hh = a.h * (hcfg.sz || 1) * hStMul * ((hcfg.evoSz || {})[__pvEvo] ?? 1)
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
          const acfg = motRef.current.ally[ak] || {}
          const atkArr = ALLY_IMG[ak].atk
          const atking = au.state === 'atk' && atkArr.length
          const arr = atking ? atkArr : ALLY_IMG[ak].walk
          const fi = atking ? Math.min(arr.length - 1, Math.floor(au.t / d.atkDur * (acfg.atkSpd || 1) * arr.length)) : Math.floor(au.animT) % arr.length
          const im2 = arr[fi]
          const ok = im2 && im2.complete && im2.naturalWidth > 0
          const hh = d.h * (acfg.sz || 1) * (atking ? (acfg.atkSz || 1) : 1)
          const ww2 = ok ? hh * (im2.naturalWidth / im2.naturalHeight) : hh * 0.7
          const bob = au.state === 'walk' ? Math.abs(Math.sin(au.animT * 3.1)) * 3 : 0
          const dx = au.x - ww2 / 2 + (acfg.x || 0), dy = w.groundY - hh - bob + (d.yOff || 0) + (acfg.y || 0)
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
            const pw = d.projW * ((motRef.current.ally[sp2.ally] || {}).projSz || 1)   // 투사체 크기 편집값
            const ph = pw * (si.naturalHeight / si.naturalWidth)
            const by = d.projBob ? Math.sin(sp2.t * 9) * d.projBob : 0
            ctx.drawImage(si, sp2.x - pw / 2, sp2.y - ph / 2 + by, pw, ph)
          }
        }
        // 동료·동료 투사체까지 그린 뒤, 시전 중이면 여기서 몬스터를 먼저 깔고 히어로를 그 위에 올린다
        if (__heroFront) for (const e of w.enemies) drawEnemy(ctx, e, now)
        // 히어로 그림만 건너뛴다. 이 블록에는 동료·동료 투사체·(몹 앞 스킬일 때) 몬스터 그리기가 같이 들어 있어서
        // 블록 전체를 건너뛰면 그것들까지 사라진다.
        if (!__heroHide) {
          const lunge = hero.state === 'attack' ? Math.sin(Math.min(1, hero.t / 0.4) * Math.PI) * 12 : 0
          ctx.translate(w.heroX + lunge - (w.heroKb || 0) + (motRef.current.hero.x || 0) + __frX + (__skp.x || 0) + (__skfp.x || 0), w.groundY + (motRef.current.hero.y || 0) + (__skp.y || 0) + (__skfp.y || 0))
          if (hero.flash > 0) ctx.filter = 'brightness(2.5)'
          if (a.flip) ctx.scale(-1, 1)
          {                                                // 밝은 배경에서 실루엣이 묻히지 않게 외곽 그림자
            const __ol = motRef.current.hero.outline || {}
            const __b = __ol.blur ?? 6
            if (__b > 0) { ctx.shadowColor = `rgba(0,0,0,${__ol.alpha ?? 0.85})`; ctx.shadowBlur = __b }
          }
          ctx.drawImage(im, -hw / 2, -hh, hw, hh)
          ctx.shadowBlur = 0
        }
        ctx.restore()
      }

      if (!__heroFront) for (const e of w.enemies) drawEnemy(ctx, e, now)

      for (const p of w.stones) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        if (STONE.complete && STONE.naturalWidth > 0) {
          const sw = motRef.current.stone.sz || 18, sh = sw * (STONE.naturalHeight / STONE.naturalWidth)
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
        const fxc = motRef.current.skFx[stk.id] || {}
        const fi = fxFrameIdx(stk.t / stk.dur, stk.frames.length, fxT(motRef.current, stk.id, stk.frames.length))   // 프레임별 시간(초) 반영
        const im = SIMG[stk.id][stk.frames[fi] - 1]
        if (im && im.complete && im.naturalWidth > 0) {
          const ffr = (fxc.fr || {})[fi + 1] || {}
          const hh = stk.h * (fxc.sz || 1) * (ffr.sz ?? 1)
          const ww = hh * (im.naturalWidth / im.naturalHeight)
          const bx = stk.anchor ? w.heroX : stk.x   // 히어로 기준이면 히어로를 따라 움직임
          const ox = bx + (fxc.x || 0) + (ffr.x || 0), oy = w.groundY + (fxc.y || 0) + (ffr.y || 0)
          const put = (dx, s2) => { const h2 = hh * s2, w2 = ww * s2; ctx.drawImage(im, ox - w2 / 2 + dx, oy - h2, w2, h2) }
          if (stk.twin) {
            // 같은 그림 2장을 위상 반대(sin)로 좌우 왕복 → 서로 스쳐 지나가며 꼬이는 것처럼 보인다.
            // cos 부호가 앞뒤(그리는 순서), 앞쪽은 살짝 크게 그려 깊이감을 준다.
            const gap = fxc.twGap ?? stk.twin.gap ?? 30
            const spd = fxc.twSpd ?? stk.twin.spd ?? 1.2
            const ph = (stk.t / Math.max(0.001, stk.dur)) * spd * Math.PI * 2
            const pair = [0, Math.PI].map(o => ({ dx: Math.sin(ph + o) * gap, dep: Math.cos(ph + o) }))
            pair.sort((q, r) => q.dep - r.dep)                                // 뒤쪽(dep 작은 것)부터
            for (const q of pair) put(q.dx, 1 + q.dep * 0.08)
          } else put(0, 1)
        }
      }
      // 스킬 투사체 (몬스터 쪽으로 비행)
      for (const prj of w.projs) {
        const tm = prj.t % prj.feTotal
        let pfi = prj.fe.findIndex(e => tm <= e); if (pfi < 0) pfi = prj.fly.length - 1
        const im = SIMG[prj.id][prj.fly[pfi] - 1]
        if (im && im.complete && im.naturalWidth > 0) {
          const fxc = motRef.current.skFx[prj.id] || {}
          const ffr = (fxc.fr || {})[pfi + 1] || {}
          const hh = prj.h * prj.scale * (fxc.sz || 1) * (ffr.sz ?? 1)
          const ww = hh * (im.naturalWidth / im.naturalHeight)
          ctx.drawImage(im, prj.x - ww / 2 + (fxc.x || 0) + (ffr.x || 0), w.groundY - prj.yOff - hh + (fxc.y || 0) + (ffr.y || 0), ww, hh)
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

      const __warnT = (w.adv && w.adv.warnT > 0) ? w.adv.warnT : ((w.ev && !w.ev.bossOut && w.ev.warnT > 0) ? w.ev.warnT : 0)
      if (__warnT > 0) {
        const puls = 0.45 + 0.55 * Math.abs(Math.sin(__warnT * 9))
        const cx = w.W / 2, cy = w.H / 2
        const g = ctx.createRadialGradient(cx, cy, Math.min(w.W, w.H) * 0.18, cx, cy, Math.max(w.W, w.H) * 0.72)
        g.addColorStop(0, 'rgba(255,0,0,0)')
        g.addColorStop(1, `rgba(220,0,0,${(0.62 * puls).toFixed(3)})`)
        ctx.fillStyle = g; ctx.fillRect(0, 0, w.W, w.H)
        ctx.save()
        ctx.textAlign = 'center'
        const __uc = uiRef.current || {}
        const __wx = cx + (__uc.warnX || 0), __wy = w.H * 0.42 - 15 + (__uc.warnY || 0)
        ctx.font = `bold ${__uc.warnfz || 43}px 'Do Hyeon', sans-serif`
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.85)'
        ctx.fillStyle = `rgba(255,${Math.round(70 * puls)},${Math.round(60 * puls)},${(0.65 + 0.35 * puls).toFixed(3)})`
        ctx.strokeText('WARNING', __wx, __wy); ctx.fillText('WARNING', __wx, __wy)
        ctx.restore()
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
  // ── 퀘스트: 이벤트 카운트 / 진행 계산 / 보상 수령 ──
  function qEv(ev, n = 1) {
    setQuest(q => {
      const day = questDayStr()
      const b = q.day === day ? q : { ...q, day, dEv: {}, dClaim: {} }   // 자정 넘으면 일일 리셋
      return { ...b, ev: { ...b.ev, [ev]: (b.ev[ev] || 0) + n }, dEv: { ...b.dEv, [ev]: (b.dEv[ev] || 0) + n } }
    })
  }
  useEffect(() => { const iv = setInterval(() => qEv('playtime', 1), 1000); return () => clearInterval(iv) }, [])
  function qProg(tab, i) {
    const item = QUEST_LIST[tab][i]
    const today = quest.day === questDayStr()
    if (tab === 0) {
      const cur = today ? (quest.dEv[item.ev] || 0) : 0
      const claimed = today ? !!quest.dClaim[i] : false
      return { cur: Math.min(cur, item.goal), goal: item.goal, lv: 0, claimed, canClaim: !claimed && cur >= item.goal }
    }
    if (tab === 1) {
      const cur = (quest.ev[item.ev] || 0) - (quest.rBase[i] || 0)
      return { cur: Math.min(cur, item.goal), goal: item.goal, lv: quest.rLv[i] || 0, claimed: false, canClaim: cur >= item.goal }
    }
    // 업적: 계단식 — cur = 누적치 + base, 목표 = 수령횟수 + 1 + base (수령마다 목표 +1)
    const aLv = (quest.aLv && quest.aLv[i]) || 0
    const cur = (quest.ev[item.ev] || 0) + (item.base || 0)
    const goal = Math.min(aLv + 1 + (item.base || 0), item.max ?? Infinity)   // max가 있으면 그 값에서 멈춘다
    const done = item.max != null && aLv >= item.max                          // 상한까지 다 받으면 완료
    return { cur: Math.min(cur, goal), goal, lv: aLv, claimed: done, canClaim: !done && cur >= goal }
  }
  function qClaim(tab, i) {
    if (uiEdit) return
    const item = QUEST_LIST[tab][i]
    const p = qProg(tab, i)
    if (!p.canClaim) return
    if (item.ric.includes('gem')) setGem(g => g + item.rv)
    else if (item.ric.includes('ruby')) setRuby(r => r + item.rv)
    else if (item.ric.includes('pearl')) setPearl(v => v + item.rv)
    setQuest(q => {
      if (tab === 0) return { ...q, dClaim: { ...q.dClaim, [i]: true } }
      if (tab === 1) return { ...q, rBase: { ...q.rBase, [i]: (q.rBase[i] || 0) + item.goal }, rLv: { ...q.rLv, [i]: (q.rLv[i] || 0) + 1 } }
      return { ...q, aLv: { ...(q.aLv || {}), [i]: ((q.aLv && q.aLv[i]) || 0) + 1 } }
    })
    if (tab === 0 && i !== 0) qEv('daily_done')   // 일일 수령 → '일일 퀘스트 완료' 카운트 (자기 자신 제외)
  }
  function buyStat(k, delta = 1) {
    if (delta < 0) { setLv(v => ({ ...v, [k]: Math.max(0, v[k] + delta) })); return }
    const c = DEBUG ? 0 : buyCost(k, lvLive.current[k])
    if (meatLive.current < c) return
    setMeat(m => m - c)
    setLv(v => ({ ...v, [k]: v[k] + 1 }))
    if (k === 'atk') qEv('enh_atk')
    else if (k === 'hp') qEv('enh_hp')
    else if (k === 'critDmg') qEv('enh_crit')
  }
  // 소환: n회 뽑기 → 인벤토리 반영 + 결과 오버레이
  function pullGacha(cat, n) {
    const cost = GACHA_COST[n]
    if (!DEBUG) {
      if (gem < cost) return
      setGem(g => g - cost)
    }
    const lv = gachaLv[cat] || 1
    const items = Array.from({ length: n }, () => ({ i: rollItem(lv) }))
    // 누적 → 레벨업 (구간 초과분은 다음 레벨로 이월). 오른 레벨마다 장비 1개 확정 지급
    let cur = (gachaCnt[cat] || 0) + n, nl = lv
    const pend = []
    while (nl < GACHA_MAXLV && cur >= gachaNeed(nl)) {
      cur -= gachaNeed(nl); nl++
      const rw = GACHA_LV_REWARD[nl]
      if (rw) for (let k = 0; k < rw[1]; k++) pend.push(rw[0])   // 선물상자로 받는다
    }
    if (nl >= GACHA_MAXLV) cur = 0
    setGachaCnt(c => ({ ...c, [cat]: cur }))
    if (nl !== lv) setGachaLv(v => ({ ...v, [cat]: nl }))
    if (pend.length) setGachaRw(v => ({ ...v, [cat]: [...(v[cat] || []), ...pend] }))
    setInv(v => {
      const nv = { ...v }
      for (const it of items) { const key = invKey(cat, it.i); nv[key] = (nv[key] || 0) + 1 }
      return nv
    })
    setGacha({ cat, items, roll: Date.now() })
    qEv('summon', n)
  }
  // 소환 레벨업 보상 수령 (선물상자)
  function claimGachaRw(cat) {
    const list = gachaRw[cat] || []
    if (!list.length) return
    setInv(v => {
      const nv = { ...v }
      for (const i of list) { const key = invKey(cat, i); nv[key] = (nv[key] || 0) + 1 }
      return nv
    })
    setGachaRw(v => ({ ...v, [cat]: [] }))
    setGacha({ cat, items: list.map(i => ({ i, lvUp: true })), roll: Date.now() })
  }
  // 스킬 카드 소환: 배운 스킬 중에서만 나온다
  function learnedSkills() {
    return SKILLS.filter(k => k.stage === evo || (k.stages || []).includes(evo))
  }
  function pullCard(n) {
    const pool = learnedSkills()
    if (!pool.length) return
    const cost = CARD_COST[n]
    if (!DEBUG) { if (gem < cost) return; setGem(g => g - cost) }
    const got = Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)].id)
    setSkCard(c => { const nv = { ...c }; for (const id of got) nv[id] = (nv[id] || 0) + 1; return nv })
    setCardRes({ ids: got, roll: Date.now() })
  }
  // 스킬 강화: 카드 2장 + 강화 진주
  function enhanceSkill(id) {
    if ((skCard[id] || 0) < CARD_ENH_CARDS) return
    if (!DEBUG && pearl < CARD_ENH_PEARL) return
    setSkCard(c => ({ ...c, [id]: (c[id] || 0) - CARD_ENH_CARDS }))
    if (!DEBUG) setPearl(v => v - CARD_ENH_PEARL)
    setSkEnh(v => ({ ...v, [id]: (v[id] || 0) + 1 }))
  }
  // 융합: 같은 장비 5개 → 다음 장비 1개
  function fuseOne(cat, i) {
    if (i >= EQUIP_MAX) return
    if ((inv[invKey(cat, i)] || 0) < 5) return
    setInv(v => {
      const k = invKey(cat, i), nk = invKey(cat, i + 1)
      if ((v[k] || 0) < 5) return v
      return { ...v, [k]: v[k] - 5, [nk]: (v[nk] || 0) + 1 }
    })
    qEv('fuse')
  }
  // 일괄 융합: 낮은 등급부터 가능한 만큼 연쇄 융합
  function fuseAll(cat) {
    const nv = { ...inv }
    let qc = 0
    for (let i = 1; i < EQUIP_MAX; i++) {
      const k = invKey(cat, i), nk = invKey(cat, i + 1)
      while ((nv[k] || 0) >= 5) { nv[k] -= 5; nv[nk] = (nv[nk] || 0) + 1; qc++ }
    }
    if (!qc) return
    qEv('fuse', qc)
    setInv(v => {
      return nv
    })
  }
  // 길게 누르면 연속 실행 (400ms 후 80ms 간격)
  const holdRef = useRef(null)
  // 꾹 누르면 반복 + 점점 빨라짐(140ms → 25ms). 손 떼면 멈춤
  function holdRepeat(fn) {
    holdEnd()
    fn()
    let delay = 140
    const tick = () => {
      if (!holdRef.current) return
      fn()
      delay = Math.max(25, delay * 0.82)
      holdRef.current.t = setTimeout(tick, delay)
    }
    holdRef.current = { t: setTimeout(tick, 400) }
  }
  function holdStart(fn) { if (uiEdit) return; holdRepeat(fn) }   // 게임 버튼 (UI 편집 중엔 동작 안 함)
  function holdEnd() {
    const h = holdRef.current
    if (h) { clearTimeout(h.t); holdRef.current = null }
  }
  const holdBtn = fn => ({                                        // 편집창 조절 버튼용 (편집 중에도 눌려야 함)
    onPointerDown: () => holdRepeat(fn), onPointerUp: holdEnd, onPointerLeave: holdEnd,
    onPointerCancel: holdEnd, onContextMenu: e => e.preventDefault(),
  })
  useEffect(() => () => holdEnd(), [])
  // ── 클라우드 세이브: 로그인 시 웨이브 높은 쪽 채택, 이후 60초/백그라운드 전환 시 업로드 ──
  const [fbUser, setFbUser] = useState(null)
  const [cloudMsg, setCloudMsg] = useState('')
  async function pushCloud() {
    if (!FB_ON || !fbAuth.currentUser) return
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      const sv = JSON.parse(raw || 'null')
      if (!sv) return
      // 세이브 전체를 문자열 필드로 저장 (skillSets 같은 중첩 배열을 Firestore가 거부 → invalid-argument 방지)
      const payload = {
        data: raw,
        ts: sv.ts || 0,
        wave: sv.wave || 0,
      }
      await setDoc(doc(fbDb, 'paleoSaves', fbAuth.currentUser.uid), payload)
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
        // 신형: cloud.data(세이브 문자열). 구형 호환: cloud 자체가 세이브 객체
        const cloudSaveStr = cloud ? (typeof cloud.data === 'string' ? cloud.data : JSON.stringify(cloud)) : null
        let cloudSave = null; try { cloudSave = cloudSaveStr ? JSON.parse(cloudSaveStr) : null } catch {}
        const cloudTs = cloud ? (cloud.ts || (cloudSave && cloudSave.ts) || 0) : 0
        const cloudWave = cloud ? (cloud.wave || (cloudSave && cloudSave.wave) || 0) : 0
        // UI·모션 편집값은 클라우드에서 다루지 않는다.
        // PC에서 편집 → 코드(UI_DEFAULT/MOTION_DEFAULT + CFG_STAMP)에 박아 배포 → 모든 기기가 그대로 받음.
        // 기기끼리 최신 여부를 비교할 일이 없어 "누가 먼저" 문제 자체가 생기지 않는다.
        // 진행도 동기화: 저장 시각(ts) 최신쪽 채택 (init.ts=로드시점 원래값과 비교). ts 둘 다 없으면 웨이브 폴백
        const bootTs = init.ts || 0
        const cloudNewer = (cloudTs !== 0 || bootTs !== 0) ? cloudTs > bootTs : cloudWave > (local?.wave || 0)
        if (cloudSaveStr && cloudNewer) {
          cloudBusy.current = true                 // 리로드 전 로컬 자동저장 차단(덮어쓰기 방지)
          localStorage.setItem(SAVE_KEY, cloudSaveStr)
          location.reload()  // 클라우드 세이브로 재시작
        } else {
          pushCloud()
        }
      } catch (e) { setCloudMsg('동기화 실패: ' + (e.code || e.message)) }
    })
  }, [])
  useEffect(() => {
    if (!FB_ON) return
    const iv = setInterval(() => { pushCloud() }, 15000)   // 60초→15초: 기기 전환 시 클라우드 최신화
    const onVis = () => { if (document.visibilityState === 'hidden') pushCloud() }
    const onHide = () => { pushCloud() }            // 페이지 이탈/전환 즉시 저장 (모바일 Safari는 pagehide가 신뢰성 높음)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onHide)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', onHide); window.removeEventListener('beforeunload', onHide) }
  }, [])
  async function fbLogin() {
    try { await signInWithPopup(fbAuth, new GoogleAuthProvider()) }
    catch { try { await signInWithRedirect(fbAuth, new GoogleAuthProvider()) } catch (e) { setCloudMsg('로그인 실패: ' + (e.code || e.message)) } }
  }
  async function fbLogout() { await pushCloud(); await signOut(fbAuth) }
  async function pullCloud() {   // 클라우드 세이브를 무조건 로컬로 덮어써서 불러옴 (기기간 확실한 동기화용)
    if (!FB_ON || !fbAuth.currentUser) return
    try {
      const snap = await getDoc(doc(fbDb, 'paleoSaves', fbAuth.currentUser.uid))
      if (!snap.exists()) { setCloudMsg('클라우드에 저장이 없어요'); return }
      const cloud = snap.data()
      cloudBusy.current = true                                                       // 리로드 전 로컬 자동저장 차단
      const saveStr = typeof cloud.data === 'string' ? cloud.data : JSON.stringify(cloud)   // 신형 문자열 or 구형 객체
      localStorage.setItem(SAVE_KEY, saveStr)                                        // 웨이브 등 진행도
      // 불러오기는 진행도만 — UI·모션은 코드값이 출처라 건드리지 않음
      location.reload()
    } catch (e) { setCloudMsg('불러오기 실패: ' + (e.code || e.message)) }
  }

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
    if (spLive.current <= 0) return          // SP는 DEBUG에서도 정상 소모
    setSp(s => s - 1)
    if ((skill[k] || 0) === 0) qEv('skill_get')   // 스킬 획득 (0→1)
    qEv('skill_enh')
    setSkill(s => ({ ...s, [k]: s[k] + 1 }))
  }
  function evolve() {
    if (evo >= EVOS.length - 1) return
    const c = DEBUG ? 0 : EVOS[evo + 1].cost
    if (meat < c) return
    setMeat(m => m - c)
    setEvo(v => v + 1)
    qEv('evolve')
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
    setSkillSets(sets => {
      const cur = sets[activeSet]
      if (cur.includes(i)) return sets
      const slot = cur.indexOf(null)
      if (slot < 0) return sets  // 슬롯 가득
      const next = sets.map(a => a.slice()); next[activeSet][slot] = i; return next
    })
  }
  function switchSet(n) { if (n >= 0 && n < SET_COUNT) setActiveSet(n) }
  function enterAdventure() {
    if (uiEdit || !advSel || (!DEBUG && ruby < ADV_COST_RUBY)) return
    const stage = Math.min(ADV_STAGES, (advStage[advSel.key] || 0) + 1)
    if (!DEBUG) setRuby(r => r - ADV_COST_RUBY)
    world.current.advStart = { key: advSel.key, boss: advSel.boss, name: advSel.name, stage, wave }
    setAdvSel(null); setNav('영웅'); setPaused(false)
  }
  function unequipSkill(slot) {
    setSkillSets(sets => { const next = sets.map(a => a.slice()); next[activeSet][slot] = null; return next })
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
      /* 전설·신화 금빛 번쩍임 — 0.4초 × 5회 = 약 2초, 끝나면 은은한 잔광으로 정착 */
      @keyframes pdGoldFlash {
        0%   { box-shadow: 0 0 6px 1px rgba(255,190,60,0.35); filter: brightness(1); }
        50%  { box-shadow: 0 0 22px 8px rgba(255,215,110,0.95); filter: brightness(1.35) saturate(1.15); }
        100% { box-shadow: 0 0 14px 3px rgba(255,200,80,0.6); filter: brightness(1); }   /* 끝나면 금빛 잔광으로 정착 */
      }
      .pd-gacha-shine { animation: pdGoldFlash 0.4s ease-in-out 5 both; }
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
      if (t) { const de = t.dataset.edit; setEditSel(de); if (de === 'treasure') setOffOpen(true); const mAdv = /^adv(btn|txt)(\d)$/.exec(de); if (mAdv) setAdvSel(CONTINENTS[+mAdv[2]]); if (!['skcell', 'avatar', 'avaface', 'evtab'].includes(de)) { e.stopPropagation(); e.preventDefault() } }   // skimg/skname/skbar 는 선택만(상세창 안 열림)
    }}>
      {splash && (
        <div style={{ ...st.splashWrap, backgroundImage: `url(${SPLASH_BG})`, cursor: preReady ? 'pointer' : 'default' }}
          onClick={() => { if (preReady) setSplash(false) }}>
          {preReady ? <div style={st.splashTap}>TAP TO START</div> : (
            <div style={st.splashLoadWrap}>
              <div style={st.splashLoadText}>게임 로드중… {Math.floor(preP * 100)}%</div>
              <div style={st.splashBarOuter}><div style={{ ...st.splashBarInner, width: (preP * 100) + '%' }} /></div>
            </div>
          )}
        </div>
      )}
      {IS_PC && uiEdit && <style>{`[data-edit]{outline:1px dashed rgba(232,185,98,0.35);outline-offset:-1px;cursor:pointer}${editSel ? `[data-edit="${editSel}"]{outline:2px solid ${GOLD} !important}` : ''}`}</style>}
      {IS_PC && <button onClick={() => { setUiEdit(v => !v); setEditSel(null) }} style={{ position: 'absolute', top: 4, right: 4, zIndex: 60, padding: '3px 8px', borderRadius: 6, border: '1px solid #6b4a24', background: uiEdit ? GOLD_D : 'rgba(20,13,7,0.8)', color: uiEdit ? '#fff' : GOLD, fontSize: 12 }}>{uiEdit ? '편집중' : '⚙'}</button>}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80 }} onClick={() => setMenuOpen(false)}>
          <div data-edit="menu" style={st.menuPanel} onClick={e => e.stopPropagation()}>
            <button style={{ ...st.menuItem, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => {}}><img data-edit="mailbox" src="/ui/mailbox.webp" alt="" style={st.mailImg} />우편함 <span style={{ fontSize: 11, opacity: 0.7 }}>준비 중</span></button>
            {IS_PC && <button style={st.menuItem} onClick={() => { setMotEdit(v => !v); setMenuOpen(false) }}>모션 편집 {motEdit ? '끄기' : '켜기'}</button>}
            <div style={{ borderTop: '1px solid #3a2a14', margin: '4px 0' }} />
            {FB_ON && (fbUser ? (
              <>
                <div style={{ ...st.menuItem, opacity: 0.8 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fbUser.email}</span></div>
                <button style={st.menuItem} onClick={pushCloud}>클라우드에 저장 <span style={{ fontSize: 11, opacity: 0.6 }}>{cloudMsg}</span></button>
                <button style={st.menuItem} onClick={() => { if (confirm('클라우드 세이브를 불러와 현재 기기 데이터를 덮어씁니다. 계속할까요?')) pullCloud() }}>클라우드에서 불러오기</button>
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
            const canEnh = DEBUG || mats[4] >= cost
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
                        <button data-edit="denh" style={{ ...st.dEnhBtn, ...(canEnh ? st.dEnhBtnOn : {}) }} onClick={() => { if (canEnh) { if (!DEBUG) setMats(m => { const n = [...m]; n[4] -= cost; return n }); setEnh(e => ({ ...e, [key]: lv + 1 })); qEv('equip_enh') } }}>
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
                          <button data-edit="dfusebtn" style={st.dFuseBtn} onClick={() => { if (fuseQty > 0) { const use = Math.min(fuseQty, Math.floor((inv[invKey(cat, i)] || 0) / 5)); if (use > 0) qEv('fuse', use); setInv(v => { const k = invKey(cat, i), nk = invKey(cat, i + 1); const u = Math.min(fuseQty, Math.floor((v[k] || 0) / 5)); if (u <= 0) return v; return { ...v, [k]: v[k] - u * 5, [nk]: (v[nk] || 0) + u } }); setFuseQty(0) } }}>융합</button>
                        </>
                      ) : (<div style={st.dMaxNote}>최종 단계 장비입니다</div>)}
                    </div>
                  )}
                  <button style={st.dClose} onClick={() => setDetailItem(null)}>✕</button>
                </div>
              </div>
            )
          })()}
      {nav === '스킬' && skillDetail != null && (() => {
        const s = SKILLS[skillDetail]
        const eqSlot = equipped.indexOf(skillDetail)
        const isEq = eqSlot >= 0
        const auto = !!skillAuto[skillDetail]
        const ef = skEff(s, skCfg)                       // 현재 적용 중인 효과값(설정 > 코드 기본)
        return (
          <div style={st.dOverlay} onClick={e => { if (!uiEdit && e.target === e.currentTarget) setSkillDetail(null) }}>
            <div style={st.skdBox}>
              <div style={st.skdHead}>
                <div data-edit="skdicon" style={st.skdIconWrap}>
                  {skIcon(s) ? <img src={skIcon(s)} alt="" data-edit="skdimg" style={st.skdIconImg} /> : <span style={{ fontSize: 34 }}>{s.icon}</span>}
                  <span style={st.skdLv}>Lv.1</span>
                  <div style={st.skdMiniBar}><div style={{ ...st.skdMiniFill, width: '0%' }} /><div style={st.skdMiniTxt}>0/2</div></div>
                </div>
                <div style={st.skdHeadMid}>
                  <div data-edit="skdtitle" style={st.skdTitle}><span style={{ color: GRADE_COLOR['일반'] }}>[일반]</span> {s.name}</div>
                  <div data-edit="skddesc" style={st.skdDesc}>{s.desc2 || '설명 준비 중'}</div>
                </div>
                <button data-edit="skdauto" style={{ ...st.skdAuto, ...(auto ? st.skdAutoOn : {}) }} onClick={() => { if (!uiEdit) setSkillAuto(a => ({ ...a, [skillDetail]: !a[skillDetail] })) }}>
                  AUTO<span style={{ ...st.skdAutoDot, ...(auto ? st.skdAutoDotOn : {}) }} />
                </button>
              </div>
              <div data-edit="skdeffect" style={st.skdEffect}>{ef.aoe ? (ef.rangePx ? `${ef.rangePx}px 이내` : '화면 전체') + '의 적 모두에게' : '적 1명에게'}<br />공격력의 <b style={{ color: '#f0a830' }}>{s.dmgMult * 100}%</b>로 1회 공격</div>
              <div style={st.skdStatRow}>
                <div data-edit="skdstat" style={st.skdStat}><span style={st.skdStatK}>필요공격수</span><span style={st.skdStatV}>—</span></div>
                <div data-edit="skdstat" style={st.skdStat}><span style={st.skdStatK}>MP 소모</span><span style={st.skdStatV}>—</span></div>
              </div>
              <div style={st.skdCfgBox}>
                {(() => {
                  const put = (k, v) => setSkCfg(c => ({ ...c, [s.id]: { ...(c[s.id] || {}), [k]: v } }))
                  const row = (label, val, onMinus, onPlus, extra) => (
                    <div style={st.skdCfgRow}>
                      <span style={st.skdCfgK}>{label}</span>
                      <button style={st.skdCfgBtn} onClick={() => { if (!uiEdit) onMinus() }}>−</button>
                      <span style={st.skdCfgV}>{val}</span>
                      <button style={st.skdCfgBtn} onClick={() => { if (!uiEdit) onPlus() }}>+</button>
                      {extra}
                    </div>
                  )
                  return (<>
                    <div style={st.skdCfgRow}>
                      <span style={st.skdCfgK}>대상</span>
                      <button style={{ ...st.skdCfgTog, ...(!ef.aoe ? st.skdCfgTogOn : {}) }} onClick={() => { if (!uiEdit) put('aoe', 0) }}>단일</button>
                      <button style={{ ...st.skdCfgTog, ...(ef.aoe ? st.skdCfgTogOn : {}) }} onClick={() => { if (!uiEdit) put('aoe', 1) }}>광역</button>
                    </div>
                    {row('데미지', `x${ef.dmgMult.toFixed(1)}`,
                      () => put('dmg', Math.max(0.1, +(ef.dmgMult - 0.1).toFixed(1))),
                      () => put('dmg', Math.min(99, +(ef.dmgMult + 0.1).toFixed(1))))}
                    {ef.aoe && row('사거리', ef.rangePx ? `${ef.rangePx}px` : '화면 전체',
                      () => put('range', Math.max(0, (ef.rangePx ?? 10) - 10)),
                      () => put('range', Math.min(1000, (ef.rangePx ?? 0) + 10)))}
                    {row('쿨타임', `${ef.cd.toFixed(1)}초`,
                      () => put('cd', Math.max(0.1, +(ef.cd - 0.1).toFixed(1))),
                      () => put('cd', Math.min(60, +(ef.cd + 0.1).toFixed(1))))}
                    <button style={st.skdCfgReset} onClick={() => { if (!uiEdit) setSkCfg(c => { const n = { ...c }; delete n[s.id]; return n }) }}>기본값으로</button>
                  </>)
                })()}
              </div>
              <div style={st.skdBtns}>
                <button data-edit="skdenh" style={{ ...st.skdEnhBtn, ...((skCard[s.id] || 0) >= CARD_ENH_CARDS ? {} : { opacity: 0.5 }) }}
                  onClick={() => { if (!uiEdit) enhanceSkill(s.id) }}>
                  <span>강화 {(skEnh[s.id] || 0) > 0 ? `+${skEnh[s.id]}` : ''}</span>
                  <span style={st.skdEnhCost}>
                    {skCard[s.id] || 0}/{CARD_ENH_CARDS}
                    <img src="/ui/pearl.webp" alt="" style={st.skdEnhIc} />{CARD_ENH_PEARL}
                  </span>
                </button>
                <button data-edit="skdequip" style={{ ...st.skdEquipBtn, ...(isEq ? st.skdEquipOn : {}) }} onClick={() => { if (isEq) unequipSkill(eqSlot); else equipSkill(skillDetail); setSkillDetail(null) }}>{isEq ? '해제' : '장착'}</button>
              </div>
              <button style={st.dClose} onClick={() => setSkillDetail(null)}>✕</button>
            </div>
          </div>
        )
      })()}
      {profileOpen && (() => {
        const sc = S.current
        const statRows = [
          ['공격력', fmt(Math.round(sc.atk))],
          ['체력', fmt(Math.round(maxHp))],
          ['체력 회복', fmt(Math.round(sc.regen)) + '/초'],
          ['치명타 확률', (sc.critRate * 100).toFixed(1) + '%'],
          ['치명타 공격력', Math.round(sc.critMult * 100) + '%'],
          ['고기 획득량', '+' + Math.round(tot('meatUp') * STAT_LIST.meatUp.per) + '%'],
          ['경험치 획득량', '+' + Math.round(tot('expUp') * STAT_LIST.expUp.per) + '%'],
          ['명중률', Math.round(sc.acc * 100) + '%'],
          ['회피율', Math.round(sc.eva * 100) + '%'],
          ['공격 속도', '+' + Math.min(200, Math.round(tot('aspd') * STAT_LIST.aspd.per)) + '%'],
          ['이동 속도', '+' + Math.min(200, Math.round(tot('mspd') * STAT_LIST.mspd.per)) + '%'],
        ]
        const curRows = [
          ['/ui/ic_meat.webp', '고기', fmt(meat)],
          ['/ui/gem.webp', '다이아', DEBUG ? '∞' : fmt(gem)],
          ['/ui/ruby.webp', '루비', DEBUG ? '∞' : fmt(ruby)],
          ['/ui/pearl.webp', '진주', DEBUG ? '∞' : fmt(pearl)],
          ['/ui/mat4.webp', '강화 큐브', DEBUG ? '∞' : fmt(mats[4])],
          [MAT_IMG(0), '동료 재료 1', DEBUG ? '∞' : fmt(mats[0])],
          [MAT_IMG(1), '동료 재료 2', DEBUG ? '∞' : fmt(mats[1])],
          [MAT_IMG(2), '동료 재료 3', DEBUG ? '∞' : fmt(mats[2])],
          [MAT_IMG(3), '동료 재료 4', DEBUG ? '∞' : fmt(mats[3])],
        ]
        return (
          <div style={st.dOverlay} onClick={e => { if (!uiEdit && e.target === e.currentTarget) { setProfileOpen(false); setNickEdit(false) } }}>
            <div style={st.profBox}>
              <div style={st.profTabs}>
                <button style={{ ...st.profTab, ...(profTab === 'info' ? st.profTabOn : {}) }} onClick={() => setProfTab('info')}>기본 정보</button>
                <button style={{ ...st.profTab, ...(profTab === 'look' ? st.profTabOn : {}) }} onClick={() => setProfTab('look')}>외형</button>
              </div>
              {profTab === 'info' ? (
                <div style={st.profScroll}>
                  <div style={st.profLv}>Lv.{hlv}</div>
                  <div style={st.profNickRow}>
                    {nickEdit
                      ? <input autoFocus value={nick} onChange={e => setNick(e.target.value.slice(0, 16))} onBlur={() => setNickEdit(false)} onKeyDown={e => { if (e.key === 'Enter') setNickEdit(false) }} style={st.profNickInput} />
                      : <><span style={st.profNickTxt}>{nick}</span><button style={st.profPencil} onClick={() => setNickEdit(true)}>✎</button></>}
                  </div>
                  <div data-edit="profhero" style={st.profHeroWrap}><img src={heroProfileSrc(EVOS[evo].mode)} alt="" data-edit="profheroimg" style={st.profHeroImg} /></div>
                  <div style={st.profStage}>{EVOS[evo].name}</div>
                  <div data-edit="profgear" style={st.profGearRow}>
                    {EQUIP_CATS.map(cat => {
                      const n = gearEq[cat]
                      return (
                        <div key={cat} style={st.profGearCol}>
                          <div style={st.profGearLbl}>{cat}</div>
                          <div style={{ ...st.profGearCell, borderColor: n ? gradeColorOf(n) : '#4a3a22' }}>
                            {n ? <img src={gearSrc(cat, n)} alt="" style={st.profGearImg} /> : <span style={{ opacity: 0.3, fontSize: 10 }}>미장착</span>}
                          </div>
                          <div style={{ ...st.profGearName, color: n ? gradeColorOf(n) : '#7a6a4c' }}>{n ? `${gradeNameOf(n)} ${n}` : '-'}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div data-edit="profstat" style={st.profSecTitle}>능력치</div>
                  <div data-edit="profstat" style={st.profPanel}>
                    {statRows.map(([k, v]) => <div key={k} style={st.profStatRow}><span style={st.profStatK}>{k}</span><span style={st.profStatV}>{v}</span></div>)}
                  </div>
                  <div data-edit="profcur" style={st.profSecTitle}>보유 재화</div>
                  <div data-edit="profcur" style={st.profPanel}>
                    {curRows.map(([ic, nm, v], i) => <div key={i} style={st.profStatRow}><span style={st.profCurK}><img src={ic} alt="" style={st.profCurIc} />{nm}</span><span style={st.profCurV}>{v}</span></div>)}
                  </div>
                </div>
              ) : (
                <div style={{ ...st.profScroll, textAlign: 'center', color: '#9c8a6c', padding: '50px 20px' }}>외형 변경은 준비 중이에요.</div>
              )}
              <button style={st.dClose} onClick={() => { setProfileOpen(false); setNickEdit(false) }}>✕</button>
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
                <img data-edit={`advico${advSel.boss}`} src={`/dino/boss_${advSel.boss}/w1.webp`} alt="" style={{ ...st.advIcon, width: `var(--pd-advico${advSel.boss}w)`, height: `var(--pd-advico${advSel.boss}h)`, transform: `translate(var(--pd-advico${advSel.boss}-x), var(--pd-advico${advSel.boss}-y))` }} />
              </div>
            </div>

            <div data-edit="advrewb" style={st.advRewRow}>
              <span data-edit="advrewk" style={st.advRewK}>탐험 보상</span>
              <span data-edit="advrewd" style={st.advRewD}><img src="/ui/gem.webp" alt="" style={st.advRewIc} />{fmt(rw.dia)}</span>
              <span data-edit="advrewm" style={st.advRewM}><img src="/ui/mat4.webp" alt="" style={st.advRewIc} />{fmt(rw.mat)}</span>
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
              <button data-edit="adventer" style={{ ...st.advEnterBtn, ...(!DEBUG && ruby < ADV_COST_RUBY ? st.advBtnOff : null) }} onClick={enterAdventure}>
                진입 <img src="/ui/ruby.webp" alt="" style={st.advRuby} />{DEBUG ? '∞' : fmt(ruby) + '/' + ADV_COST_RUBY}
              </button>
              <button data-edit="advclose" style={st.advCloseBtn} onClick={() => { if (!uiEdit) setAdvSel(null) }}>닫기</button>
            </div>
          </div>
        </div>
        )
      })()}

      {allyPick && (() => {
        const d = ALLY_DEFS[allyPick], cfg = ALLY_STAT[allyPick]
        const lv = allyLv[allyPick] || 1, stg = allyEvo[allyPick] || 1
        const canEvo = lv >= ALLY_LV_MAX && stg < ALLY_EVO_MAX
        const fmt = v => v >= 100 ? Math.round(v).toLocaleString() : (Math.round(v * 100) / 100)
        const rows = (list, pct) => list.map(([nm, base, per]) => (
          <div key={nm} data-edit="alstat" style={st.alRow}>
            <span style={st.alRowK}>{nm}</span>
            <span style={st.alRowV}>{fmt(allyStatVal(base, per, lv, stg))}{pct ? '%' : ''}</span>
          </div>
        ))
        return (
        <div style={st.evpOverlay} onClick={() => { if (!uiEdit) setAllyPick(null) }}>
          <div data-edit="alwin" style={st.alWin} onClick={e => e.stopPropagation()}>
            <button data-edit="alclose" style={st.alClose} onClick={() => { if (!uiEdit) setAllyPick(null) }}>✕</button>
            <div data-edit="alname" style={st.alName}>{d.name} <span style={{ color: GOLD_D }}>{stg}단계</span></div>
            <img data-edit="alimg" src={ALLY_EVO_IMG(allyPick, stg)} alt="" style={st.alImg} />
            <div style={st.alLv}>Lv.{lv} / {ALLY_LV_MAX}</div>
            <div style={st.alBarOuter}><div style={{ ...st.alBarInner, width: (lv / ALLY_LV_MAX * 100) + '%' }} /></div>

            <div style={st.alSecT}>동료 능력치</div>
            {rows(cfg.self, false)}
            <div style={st.alSecT}>히어로에게 부여</div>
            {rows(cfg.give, true)}

            <div style={st.alBtns}>
              <button data-edit="albtn" style={st.alBtn}
                onClick={() => { if (!uiEdit) setAllyLv(v => ({ ...v, [allyPick]: Math.min(ALLY_LV_MAX, (v[allyPick] || 1) + 1) })) }}>레벨 +1</button>
              <button data-edit="albtn" style={{ ...st.alBtn, opacity: canEvo ? 1 : 0.4 }}
                onClick={() => { if (!uiEdit && canEvo) { setAllyEvo(v => ({ ...v, [allyPick]: stg + 1 })); setAllyLv(v => ({ ...v, [allyPick]: 1 })) } }}>전직</button>
            </div>
            <div style={st.alHint}>레벨 {ALLY_LV_MAX} 달성 시 다음 단계로 전직합니다 (비용·재화는 추후)</div>
          </div>
        </div>
        )
      })()}
      {evPick && (() => {
        const cleared = evStage[evPick.no] || 0
        const stage = Math.min(EV_STAGES, cleared + 1)
        return (
        <div style={st.evpOverlay} onClick={() => { if (!uiEdit) setEvPick(null) }}>
          <div data-edit="evpwin" style={st.evpWin} onClick={e => e.stopPropagation()}>
            <div data-edit="evptitle" style={st.evpTitle}>{evPick.dname}</div>
            <img data-edit="evpimg" src={`/boss/boss${evPick.no}/boss${evPick.no}_1.webp`} alt="" style={st.evpImg} />
            <div data-edit="evpbn" style={st.evpBname}>{evPick.name}</div>
            <div data-edit="evprew" style={st.evpRew}>
              <span style={st.evpRewK}>던전 보상</span>
              <span style={st.evpRewV}><img src="/ui/gem.webp" alt="" style={st.evpRewIc} />{fmt(EV_REWARD.dia)}</span>
              <span style={st.evpRewV}><img src="/ui/pearl.webp" alt="" style={st.evpRewIc} />{fmt(EV_REWARD.pearl)}</span>
            </div>
            <div data-edit="evpsign" style={st.evpSign}>
              <div data-edit="evpsignt" style={st.evpSignTxt}>({stage}/{EV_STAGES})</div>
              <div data-edit="evpbar" style={st.evpBar}>
                {Array.from({ length: EV_STAGES }, (_, i) => (
                  <div key={i} style={{ ...st.evpBarCell, ...(i < cleared ? st.evpBarFill : null) }} />
                ))}
              </div>
            </div>
            <div style={st.evpBtns}>
              <button data-edit="evpenter" style={st.evpEnter} onClick={() => {
                if (uiEdit) return
                world.current.evStart = { key: EV_DUNGEONS[evPick.di].key, dname: evPick.dname, no: evPick.no, name: evPick.name, stage }
                setEvPick(null); setEvOpen(false); setNav('영웅'); setPaused(false)
              }}>진입</button>
              <button data-edit="evpclose" style={st.evpClose} onClick={() => { if (!uiEdit) setEvPick(null) }}>닫기</button>
            </div>
          </div>
        </div>
        )
      })()}

      {cardRes && (
        <div style={st.evpOverlay} onClick={() => { if (cShown < cardCells.length) setCShown(cardCells.length); else setCardRes(null) }}>
          <div data-edit="cardwin" style={st.cardResWin} onClick={e => { e.stopPropagation(); if (cShown < cardCells.length) setCShown(cardCells.length) }}>
            <div data-edit="cardtitle" style={st.cardResTitle}>스킬 카드 {cardRes.ids.length}장</div>
            <div style={st.cardResGrid}>
              {cardCells.slice(0, cShown).map(([id, cnt]) => {
                const sk = SKILLS.find(k => k.id === Number(id))
                return (
                  <div key={`${cardRes.roll}_${id}`} className="pd-gacha-pop" style={st.cardResCell}>
                    <div data-edit="cardcell" style={st.cardResFrame}>
                      <img src="/ui/nav_on.webp" alt="" style={st.cardResImg} />
                      {sk && skIcon(sk) && (
                        <img data-edit={`cardic${sk.id}`} src={skIcon(sk)} alt="" style={{
                          ...st.cardResIcon,
                          width: `var(--pd-cardic${sk.id}w)`, height: `var(--pd-cardic${sk.id}h)`,
                          transform: `translate(-50%, -50%) translate(var(--pd-cardic${sk.id}-x), var(--pd-cardic${sk.id}-y))`,
                        }} />
                      )}
                    </div>
                    <div data-edit="cardname" style={st.cardResName}>{sk ? sk.name : id}</div>
                    <div data-edit="cardcnt" style={st.cardResCnt}>x{cnt}</div>
                  </div>
                )
              })}
            </div>
            <button data-edit="cardclose" style={st.cardResClose} onClick={() => setCardRes(null)}>확인</button>
          </div>
        </div>
      )}

      {questOpen && (
        <div style={st.advOverlay} onClick={() => { if (!uiEdit) setQuestOpen(false) }}>
          <div data-edit="qwin" style={st.qWin} onClick={e => e.stopPropagation()}>
            <div style={st.qTitleRow}>
              <div data-edit="qtitle" style={st.qTitle}>퀘스트</div>
              <button data-edit="qclose" style={st.qCloseBtn} onClick={() => { if (!uiEdit) setQuestOpen(false) }}>✕</button>
            </div>
            <div style={st.qTabs}>
              {QUEST_TABS.map((t, i) => (
                <button key={t} data-edit="qtab" style={{ ...st.qTabBtn, ...(questTab === i ? st.qTabOn : null) }} onClick={() => setQuestTab(i)}>{t}</button>
              ))}
            </div>
            <div style={st.qList}>
              {QUEST_LIST[questTab].map((q, i) => {
                const p = qProg(questTab, i)
                return (
                <div key={i} data-edit="qrow" style={{ ...st.qRow, ...(p.claimed ? st.qRowDone : null) }}>
                  <div style={st.qIconWrap}>
                    <img data-edit="qicon" src="/ui/quest.webp" alt="" style={st.qIcon} />
                    {questTab === 1 && <div data-edit="qlv" style={st.qLv}>Lv.{p.lv}</div>}
                  </div>
                  <div style={st.qMid}>
                    <div data-edit="qname" style={st.qName}>{q.name}</div>
                    <div data-edit="qbar" style={st.qBarOuter}>
                      <div style={{ ...st.qBarFill, width: `${Math.min(100, p.cur / p.goal * 100)}%` }} />
                      <div data-edit="qbart" style={st.qBarTxt}>{p.claimed ? '수령 완료' : `${fmt(p.cur)}/${fmt(p.goal)}`}</div>
                    </div>
                  </div>
                  <button data-edit="qrew" style={{ ...st.qRew, ...(p.canClaim ? st.qRewOn : st.qRewOff) }} onClick={() => qClaim(questTab, i)}>
                    <img data-edit="qrewi" src={q.ric} alt="" style={st.qRewIc} />
                    <span data-edit="qrewv" style={st.qRewV}>{fmt(q.rv)}</span>
                  </button>
                </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {gacha && (
        <div style={st.gachaOverlay}>
          <div className="pd-fade" ref={updFade} onScroll={e => updFade(e.currentTarget)} style={st.gachaScroll}
            onClick={() => { if (!uiEdit) setGShown(gacha.items.length) }}>
            <div style={st.gachaGrid}>
              {gacha.items.slice(0, gShown).map((it, i) => {
                const cellKey = `${gacha.roll}_${i}`
                const gr = gradeNameOf(it.i)
                const col = GRADE_COLOR[gr]
                const hi = gr === '전설' || gr === '신화'
                return (
                  <div key={cellKey} data-edit="gacha" className={hi ? 'pd-gacha-pop pd-gacha-shine' : 'pd-gacha-pop'} style={{
                    ...st.gachaCell, borderColor: col,
                    // 등장(팝) 후에 번쩍임이 이어지도록 두 애니메이션 지연을 따로 준다
                    animationDelay: hi ? '0ms, 350ms' : '0ms',   // 등장 직후 번쩍임 시작 (순서는 위 타이머가 제어)
                    boxShadow: hi ? '0 0 14px 3px rgba(255,200,80,0.6)' : 'none',
                  }}>
                    <span data-edit="ggrade" style={{ ...st.gachaGrade, color: col }}>{gr}</span>
                    <img src={equipImg(gacha.cat, it.i)} alt="" data-edit="gimg" style={st.gachaImg} />
                    <span data-edit="gtier" style={st.gachaTier}>{it.lvUp ? '레벨 보상' : `${tierOf(it.i)}등급`}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={st.gachaBtns}>
            <button data-edit="gbtn" style={st.gachaBtn} onClick={() => setGacha(null)}><span data-edit="gbtntext" style={st.gachaBtnText}>확인</span></button>
            <button data-edit="gbtn" style={st.gachaBtn} onClick={() => { if (!uiEdit) pullGacha(gacha.cat, 10) }}><span data-edit="gbtntext" style={st.gachaBtnText}>10회 소환 <span style={st.shopCost}><img src="/ui/gem.webp" alt="" data-edit="shopgem" style={st.shopGemIc} />100</span></span></button>
            <button data-edit="gbtn" style={st.gachaBtn} onClick={() => { if (!uiEdit) pullGacha(gacha.cat, 30) }}><span data-edit="gbtntext" style={st.gachaBtnText}>30회 소환 <span style={st.shopCost}><img src="/ui/gem.webp" alt="" data-edit="shopgem" style={st.shopGemIc} />300</span></span></button>
          </div>
        </div>
      )}

      <div style={st.topBar}>
        <div data-edit="avatar" style={st.avatarWrap} onClick={() => setProfileOpen(true)}><img src={heroProfileSrc(EVOS[evo].mode)} alt="" data-edit="avaface" style={st.avatarFace} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div data-edit="nick" style={st.nickRow}>
            <span style={st.nick}>{nick}</span>
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
          <img src="/ui/hp_heart.webp" alt="" style={st.hpHeart} />
          <div style={st.hpTrack}><div style={{ ...st.hpFill, width: Math.min(100, heroHpUI / maxHp * 100) + '%' }} /></div>
          <span className="pd-num" style={st.hpText}>{fmt(heroHpUI)} / {fmt(maxHp)}</span>
        </div>
        <div data-edit="waveband" style={st.waveBanner} onClick={() => { if (!uiEdit) setWaveJump(String(wave)) }}>
          <div data-edit="wavetitle" style={st.waveTitle}>웨이브 {wave}</div>
          <div data-edit="diarow" style={st.diaRow}>
            {Array.from({ length: 10 }, (_, i) => (
              <img key={i} src={i < (wave - 1) % 10 + 1 ? '/ui/dia_on.webp' : '/ui/dia_off.webp'} alt="" style={st.dia} />
            ))}
          </div>
        </div>
        <div data-edit="bossbtn" style={st.bossWrap}>
          <button style={{ ...st.bossBtn, opacity: bossReady && phase === 'fighting' ? 1 : 0.45, animation: bossReady && phase === 'fighting' ? 'pdPulse 1.2s ease-in-out infinite' : 'none' }} disabled={!uiEdit && !(bossReady && phase === 'fighting')} onClick={() => { if (!uiEdit) challengeBoss() }}>
            <span data-edit="bosstext" style={st.bossText}>보스 도전</span>
          </button>
        </div>
      </div>

      {evOpen && (
        <div style={st.advOverlay} onClick={() => { if (!uiEdit) setEvOpen(false) }}>
          <div data-edit="evwin" style={st.evWin} onClick={e => e.stopPropagation()}>
            <div style={st.qTitleRow}>
              <div data-edit="evtitle" style={st.evTitle}>이벤트 던전</div>
              <button data-edit="evclose" style={st.evCloseBtn} onClick={() => { if (!uiEdit) setEvOpen(false) }}>✕</button>
            </div>
            <div style={st.evTabs}>
              {EV_DUNGEONS.map((d, i) => (
                <button key={d.key} data-edit="evtab" style={{ ...st.evTabBtn, ...(evSel === i ? st.evTabOn : null) }} onClick={() => setEvSel(i)}>{i + 1}</button>
              ))}
            </div>
            <div data-edit="evprev" style={st.evPreview}>
              {(() => {
                const k = EV_DUNGEONS[evSel].key
                const ei = evExt[k] ?? 0
                if (ei >= EV_EXTS.length) return <div data-edit="evprevimg" style={{ ...st.evPrevImg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9c8a6c', textAlign: 'center', padding: 8 }}>배경 파일 없음<br />/bg/event/{k} · .jpg · .png · .jpeg · .webp<br />전부 404</div>
                return <img key={`${k}-${ei}`} src={EV_EXTS[ei] ? `/bg/event/${k}.${EV_EXTS[ei]}` : `/bg/event/${k}`} alt="" data-edit="evprevimg" style={st.evPrevImg}
                  onError={() => setEvExt(m => (m[k] ?? 0) >= EV_EXTS.length ? m : { ...m, [k]: (m[k] ?? 0) + 1 })} />
              })()}
              <div data-edit="evname" style={st.evName}>{EV_DUNGEONS[evSel].name}</div>
            </div>
            <div style={st.evList}>
              {BOSS_TYPES.slice(EV_DUNGEONS[evSel].from - 1, EV_DUNGEONS[evSel].to).map((b, i) => (
                <div key={i} data-edit="evrow" style={st.evRow}>
                  <div data-edit="evno" style={st.evNo}>
                    <img src={`/boss/boss${EV_DUNGEONS[evSel].from + i}/boss${EV_DUNGEONS[evSel].from + i}_1.webp`} alt="" data-edit="evnoimg" style={st.evNoImg} />
                  </div>
                  <div data-edit="evbname" style={st.evBossName}>{b.name}</div>
                  <button data-edit="evgo" style={st.evGo} onClick={() => {
                    if (uiEdit) return
                    setEvPick({ di: evSel, no: EV_DUNGEONS[evSel].from + i, name: b.name, dname: EV_DUNGEONS[evSel].name })
                  }}>도전</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div ref={wrapRef} style={{ ...st.canvasWrap, height: Math.round(BASE_H * 0.42) + (view.h - BASE_H), ...(nav === '모험' ? { display: 'none' } : {}) }}>
        <canvas ref={canvasRef} />
        <button data-edit="pausebtn" style={{ ...st.pauseBtn, opacity: paused ? 1 : 0.65 }} onClick={() => { if (!uiEdit) setPaused(p => !p) }}>{paused ? '▶' : 'II'}</button>
        <button data-edit="quest" style={st.questBtn} onClick={() => { if (!uiEdit) setQuestOpen(true) }}><img src="/ui/quest.webp" alt="" style={st.iconImg} /></button>
        <button data-edit="evbtn" style={st.evBtn} onClick={() => { if (!uiEdit) setEvOpen(true) }}>
          <img src="/ui/evdungeon.webp" alt="" style={st.evBtnImg} />
          <span data-edit="evbtnt" style={st.evBtnText}>이벤트 던전</span>
        </button>
        <button data-edit="fevbtn" style={st.fevBtn} onClick={() => { if (!uiEdit && DEBUG) setFeverOn(v => !v) }}>
          <img src="/ui/fever_off.webp" alt="" style={{ ...st.fevBtnImg, ...(feverOn ? { visibility: 'hidden' } : null) }} />
          {feverOn && <img data-edit="fevon" src="/ui/fever_on.webp" alt="" style={st.fevBtnOn} />}
          <span data-edit="fevbtnt" style={st.fevBtnText}>(광고 시청 {feverAds}/3)</span>
        </button>
        {bossUI && (
          <div style={st.bossBars}>
            <div data-edit="btimer" style={st.btOuter}>
              <div style={st.btTrack}><div style={{ ...st.btInner, width: Math.min(100, bossUI.t / (bossUI.max || BOSS_TIME) * 100) + '%' }} /></div>
            </div>
            {bossUI.has && (
              <div data-edit="bosshp" style={st.bhOuter}>
                <div style={st.bhTrack}><div style={{ ...st.bhInner, width: Math.min(100, bossUI.hp / bossUI.maxHp * 100) + '%' }} /></div>
              </div>
            )}
          </div>
        )}
        {uiEdit && <div data-edit="warn" style={st.warnPrev}>WARNING</div>}
        {(evUI || uiEdit) && (
          <button data-edit="evexit" style={st.evExitBtn} onClick={() => { if (!uiEdit) world.current.evGiveUp = true }}>던전 포기</button>
        )}
        {(advUI || uiEdit) && (
          <button data-edit="advexit" style={st.advExitBtn} onClick={() => { if (!uiEdit) world.current.advGiveUp = true }}>나가기</button>
        )}
        {((bossUI && bossUI.wave) || uiEdit) && (
          <button data-edit="wbexit" style={st.wbExitBtn} onClick={() => { if (!uiEdit) world.current.bossGiveUp = true }}>나가기</button>
        )}
        <div data-edit="gain" style={{ ...st.gainWrap, ...(uiEdit ? { pointerEvents: 'auto' } : {}) }}>
          {(gains.length ? gains : (uiEdit ? [{ id: '__s', exp: 1234, meat: 567 }] : [])).map(g => (
            <div key={g.id} style={st.gainItem}>
              <span style={st.gainCell}><img data-edit="gainicon" src="/ui/ic_exp.webp" alt="" style={st.gainIcon} /><span data-edit="gaintext" style={{ ...st.gainNum, color: '#6ec4ff' }}>+{g.exp}</span></span>
              <span style={st.gainCell}><img data-edit="gainicon" src="/ui/ic_meat.webp" alt="" style={st.gainIcon} /><span data-edit="gaintext" style={{ ...st.gainNum, color: '#ff9d6a' }}>+{g.meat}</span></span>
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

      {DEBUG && nav !== '모험' && canvasBox.h > 0 && (
        <button
          style={{ position: 'absolute', right: 6, top: canvasBox.top + 52, zIndex: 41, padding: '4px 8px', fontSize: 11, fontWeight: 800,
            color: '#ffd9d9', background: 'rgba(120,20,20,0.85)', border: '1px solid #ff6a6a', borderRadius: 6, cursor: 'pointer' }}
          onClick={() => { const w = world.current; if (!w.adv || w.adv.done) return; w.killed = ADV_MOBS; w.enemies = [] }}
        >보스 소환</button>
      )}

      {offData && !offOpen && nav !== '모험' && canvasBox.h > 0 && (
        <button data-edit="treasure" style={{ ...st.treasureBtn, top: canvasBox.top + canvasBox.h - 47, bottom: 'auto' }} onClick={() => { if (!uiEdit) setOffOpen(true) }}>
          <img src="/ui/treasure.webp" alt="" style={st.treasureImg} />
          <span style={st.treasureDot} />
        </button>
      )}

      {nav !== '모험' && canvasBox.h > 0 && (
        <div style={{ ...st.skqWrap, top: canvasBox.top + canvasBox.h - 74 }}>
          <div
            data-edit="skqbar" className="pd-hscroll" style={st.skqSlots}
            onPointerDown={e => { if (uiEdit) return; const el = e.currentTarget; skqDrag.current = { down: true, x: e.clientX, sl: el.scrollLeft, moved: false }; el.setPointerCapture?.(e.pointerId) }}
            onPointerMove={e => { const d = skqDrag.current; if (!d.down) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 4) d.moved = true; e.currentTarget.scrollLeft = d.sl - dx }}
            onPointerUp={() => { skqDrag.current.down = false }}
            onPointerCancel={() => { skqDrag.current.down = false }}
          >
            {equipped.map((si, slot) => {
              const valid = si != null && SKILLS[si] && (SKILLS[si].stage === evo || (SKILLS[si].stages || []).includes(evo))
              return (
                <div key={slot} data-edit="skqslot" style={st.skqSlot} onClick={() => { if (!uiEdit && !skqDrag.current.moved && si != null) unequipSkill(slot) }}>
                  {valid
                    ? (skIcon(SKILLS[si]) ? <img src={skIcon(SKILLS[si])} alt="" style={st.skqSlotImg} /> : <span style={{ fontSize: 16 }}>{SKILLS[si].icon}</span>)
                    : <span style={st.skqSlotEmpty}>{slot + 1}</span>}
                </div>
              )
            })}
          </div>
          <div data-edit="skqset" style={st.skqSets}>
            {Array.from({ length: SET_COUNT }, (_, n) => (
              <button key={n} style={{ ...st.skqSetBtn, ...(activeSet === n ? st.skqSetOn : {}) }} onClick={() => { if (!uiEdit) switchSet(n) }}>{n + 1}</button>
            ))}
          </div>
        </div>
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
              <div data-edit="icon" style={st.skillIcon}><img src={`/icon/${k}.webp`} alt="" style={st.statIconImg} /></div>
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
              src={EVOS[evo].mode === 'quad' ? '/hero/quad/quad_1.webp' : EVOS[evo].mode === 'erectus' ? '/hero/erectus_walk/ewalk_1.webp' : EVOS[evo].mode === 'neander' ? '/hero/neander_walk/nwalk_1.webp' : EVOS[evo].mode === 'sapiens' ? '/hero/sapiens_walk/pwalk_1.webp' : EVOS[evo].mode === 'human' ? '/hero/human_walk/hmwalk_1.webp' : '/hero/misc/hero_idle.webp'}
              alt=""
              data-edit={`evoimg${evo}`}
              style={{ height: `var(--pd-evoimg${evo})`, transform: `translate(var(--pd-evoimg${evo}-x), var(--pd-evoimg${evo}-y))` }}
            />
            <div style={{ flex: 1, marginLeft: 12 }}>
              <div data-edit="name" style={st.rowName}>{EVOS[evo].name}</div>
              <div data-edit="val" style={st.rowVal}>
                공격력 ×{EVOS[evo].mult}
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
            <div data-edit="spbarC" style={{ ...st.spBar, transform: 'translate(var(--pd-spbarC-x), var(--pd-spbarC-y))' }}>스킬포인트 <b style={{ color: '#7ce0ff', fontSize: 'calc(var(--pd-spbarfz) + 2px)' }}>{sp}</b></div>
            {STAT_KEYS.map(k => {
              const d = STAT_LIST[k]
              const ok = DEBUG || sp > 0
              return (
                <div key={k} data-edit="row" style={st.row}>
                  <div data-edit="icon" style={st.skillIcon}><img src={`/icon/${k}.webp`} alt="" style={st.statIconImg} /></div>
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
          <div style={st.skHeadRow}>
            <div data-edit="skhtitle" style={st.skHeadTitle}>스킬</div>
            <button data-edit="skfuse" style={st.skHeadBtn} onClick={() => { /* TODO: 스킬 합성 */ }}>합성</button>
            <button data-edit="sklearn" style={{ ...st.skHeadBtn, ...st.skLearnBtn }} onClick={() => { /* TODO: 스킬 배우기 */ }}>스킬 배우기</button>
          </div>
          </div>
          <div className="pd-fade" ref={updFade} onScroll={e => updFade(e.currentTarget)} style={st.skillScroll}>
          <div style={st.skGrid}>
          {SKILLS.map((s, i) => {
            if (!(s.stage === evo || (s.stages || []).includes(evo))) return null
            const cd = skillCdUI[i] || 0
            const ready = cd <= 0
            const isEq = equipped.indexOf(i) >= 0
            return (
              <div key={s.key} style={st.skCell} onClick={() => setSkillDetail(i)}>
                <div data-edit="skcell" style={st.skCellIconWrap}>
                  {skIcon(s) ? <img src={skIcon(s)} alt="" data-edit="skimg" style={st.skCellIconImg} /> : <span style={{ fontSize: 22 }}>{s.icon}</span>}
                  {isEq && <div style={st.skCellEq}>장착{!ready && ` ${cd.toFixed(1)}`}</div>}
                </div>
                <div data-edit="skbar" style={st.skCellBarOuter}>
                  <div style={{ ...st.skCellBarFill, width: `${Math.min(100, (skCard[s.id] || 0) / CARD_ENH_CARDS * 100)}%` }} />
                  <div style={st.skCellBarTxt}>{skCard[s.id] || 0}/{CARD_ENH_CARDS}</div>
                </div>
                <div data-edit="skname" style={st.skCellName}>{s.name}</div>
              </div>
            )
          })}
          </div>
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
              <div data-edit="matchip" style={st.matChip}><img src={MAT_IMG(4)} alt="" style={st.matChipIc} /><span style={{ fontFamily: "'Do Hyeon',sans-serif" }}>{DEBUG ? '∞' : fmt(mats[4])}</span></div>
              <button data-edit="fuseall" style={st.fuseAllBtn} onClick={() => { if (!uiEdit) fuseAll(equipTab) }}>일괄 융합</button>
            </div>
          )}
        </div>
      )}

      {nav === '상점' && (
        <div data-edit="panel" style={st.frameBox}>
          <div className="pd-fade" ref={updFade} onScroll={e => updFade(e.currentTarget)} style={st.panelInner}>
            <div style={st.shopTabRow}>
              {['장비', '스킬 카드'].map(t => (
                <button key={t} data-edit="shoptab" style={{ ...st.shopTab, ...(shopTab === t ? st.shopTabOn : {}) }}
                  onClick={() => { if (!uiEdit) setShopTab(t) }}><span data-edit="shoptabt" style={st.shopTabText}>{t}</span></button>
              ))}
            </div>
            {shopTab === '스킬 카드' && (
              <div data-edit="shoprow" style={{ ...st.row, minHeight: 'var(--pd-shoprowmin)', transform: 'translate(var(--pd-shoprow-x), var(--pd-shoprow-y))' }}>
                <img src="/ui/skillcard.webp" alt="" data-edit="shopic3" style={{ width: 'var(--pd-shopic3w)', height: 'var(--pd-shopic3h)', objectFit: 'fill', transform: 'translate(var(--pd-shopic3-x), var(--pd-shopic3-y))' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div data-edit="shopt3" style={{ fontWeight: 700, fontSize: 'var(--pd-shopt3fz)', transform: 'translate(var(--pd-shopt3-x), var(--pd-shopt3-y))' }}>스킬 카드 소환</div>
                </div>
                <button data-edit="shopbtn" style={st.shopBtn} onClick={() => { if (!uiEdit) pullCard(1) }}><span data-edit="shopbtext" style={st.shopBtnText}>1회<br /><span style={st.shopCost}><img src="/ui/gem.webp" alt="" data-edit="shopgem" style={st.shopGemIc} />{CARD_COST[1]}</span></span></button>
                <button data-edit="shopbtn" style={st.shopBtn} onClick={() => { if (!uiEdit) pullCard(10) }}><span data-edit="shopbtext" style={st.shopBtnText}>10회<br /><span style={st.shopCost}><img src="/ui/gem.webp" alt="" data-edit="shopgem" style={st.shopGemIc} />{CARD_COST[10]}</span></span></button>
              </div>
            )}
            {shopTab === '장비' && Object.keys(GACHA_CATS).map((cat, ci) => (
              <div key={cat} data-edit="shoprow" style={{ ...st.row, minHeight: 'var(--pd-shoprowmin)', transform: 'translate(var(--pd-shoprow-x), var(--pd-shoprow-y))' }}>
                <img src={equipImg(cat, EQUIP_MAX)} alt="" data-edit={`shopic${ci}`} style={{ height: `var(--pd-shopic${ci})`, objectFit: 'contain', transform: `translate(var(--pd-shopic${ci}-x), var(--pd-shopic${ci}-y))` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div data-edit={`shopt${ci}`} style={{ fontWeight: 700, fontSize: `var(--pd-shopt${ci}fz)`, transform: `translate(var(--pd-shopt${ci}-x), var(--pd-shopt${ci}-y))` }}>{cat} 소환</div>
                  {(() => {
                    const lv = gachaLv[cat] || 1
                    const cur = gachaCnt[cat] || 0
                    const need = gachaNeed(lv)
                    const max = lv >= GACHA_MAXLV
                    return (<>
                      <div data-edit={`glv${ci}`} style={{ ...st.gLvTxt, fontSize: `var(--pd-glv${ci}fz)`, transform: `translate(var(--pd-glv${ci}-x), var(--pd-glv${ci}-y))` }}>소환 레벨 {lv}{max ? ' (MAX)' : ''}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div data-edit={`glvbar${ci}`} style={{ ...st.gLvBar, width: `var(--pd-glvbar${ci}w)`, height: `var(--pd-glvbar${ci}h)`, transform: `translate(var(--pd-glvbar${ci}-x), var(--pd-glvbar${ci}-y))` }}>
                          <div style={{ ...st.gLvFill, width: max ? '100%' : `${Math.min(100, cur / need * 100)}%` }} />
                          <span data-edit="glvbart" style={st.gLvBarTxt}>{max ? 'MAX' : `${fmt(cur)}/${fmt(need)}`}</span>
                        </div>
                        {((gachaRw[cat] || []).length > 0 || uiEdit) && (
                          <img data-edit={`gift${ci}`} src="/ui/giftbox.webp" alt="" style={{
                            ...st.shopGift,
                            width: `var(--pd-gift${ci}w)`, height: `var(--pd-gift${ci}h)`,
                            transform: `translate(var(--pd-gift${ci}-x), var(--pd-gift${ci}-y))`,
                          }} onClick={() => { if (!uiEdit) claimGachaRw(cat) }} />
                        )}
                      </div>
                    </>)
                  })()}
                </div>
                <button data-edit="shopbtn" style={st.shopBtn} onClick={() => { if (!uiEdit) pullGacha(cat, 1) }}><span data-edit="shopbtext" style={st.shopBtnText}>1회<br /><span style={st.shopCost}><img src="/ui/gem.webp" alt="" data-edit="shopgem" style={st.shopGemIc} />10</span></span></button>
                <button data-edit="shopbtn" style={st.shopBtn} onClick={() => { if (!uiEdit) pullGacha(cat, 10) }}><span data-edit="shopbtext" style={st.shopBtnText}>10회<br /><span style={st.shopCost}><img src="/ui/gem.webp" alt="" data-edit="shopgem" style={st.shopGemIc} />100</span></span></button>
                <button data-edit="shopad" style={st.shopAdBtn}><span data-edit="shopadt" style={st.shopAdText}>광고 (10회)</span></button>
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
                <div key={mi} data-edit="allymat" style={st.allyChip}><img src={MAT_IMG(mi)} alt="" style={st.allyChipIc} /><span style={{ fontFamily: "'Do Hyeon',sans-serif" }}>{DEBUG ? '∞' : fmt(mats[mi])}</span></div>
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
            <div
              ref={el => { if (el) { const b = el.scrollTop + el.clientHeight >= el.scrollHeight - 2; if (b !== evoBot) setEvoBot(b) } }}
              onScroll={e => { const el = e.currentTarget; setEvoBot(el.scrollTop + el.clientHeight >= el.scrollHeight - 2) }}
              style={{ ...st.evoGrid, ...(evoBot ? { maskImage: 'none', WebkitMaskImage: 'none' } : null) }}>
              {Array.from({ length: ALLY_EVO_MAX }, (_, r) => ALLY_EVO_KEYS.map(ak => {
                const st2 = r + 1
                const cur = (allyEvo[ak] || 1) >= st2                  // 도달한 단계는 밝게, 나머지는 어둡게
                return (
                  <div key={ak + st2} data-edit="evocell" onClick={() => { if (!uiEdit) setAllyPick(ak) }} style={{ ...st.evoCell, cursor: 'pointer', opacity: cur ? 1 : 0.78, borderColor: cur ? GOLD : '#5a4028' }}>
                    <div data-edit="evoname" style={st.evoName}>{ALLY_DEFS[ak].name} {st2}단계</div>
                    <img data-edit={`evochr${ak}${st2}`} src={ALLY_EVO_IMG(ak, st2)} alt=""
                      style={{ ...st.evoImg, height: `var(--pd-evochr${ak}${st2})`, transform: `translate(var(--pd-evochr${ak}${st2}-x), var(--pd-evochr${ak}${st2}-y))`,
                        filter: cur ? 'none' : 'brightness(0.82)' }} />
                  </div>
                )
              }))}
            </div>
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
              {[['/ui/ic_meat.webp', offData.meat, offData.meatRate, '#ff9d6a'],
                ['/ui/ic_exp.webp', offData.exp, offData.expRate, '#6ec4ff'],
                ['/ui/gem.webp', offData.gem, offData.gemRate, '#cfe8ff']].map(([ic, v, rate, col], i) => (
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
            <img src={`/icon/${ic}.webp`} alt="" style={st.navIconImg} />
            <div style={{ fontSize: 'var(--pd-navfz)' }}>{n}</div>
          </button>
        ))}
      </div>
    </div>

      {IS_PC && motEdit && (() => {
        const M = motCfg
        const frames = DINO_ATK_FRAMES[motSel] || [1, 2, 3, 4]
        const arr = M.atk[motSel] || DINO_ATK_DEF
        const setArr = (i, v) => setMotCfg({ ...M, atk: { ...M.atk, [motSel]: arr.map((x, j) => (j === i ? v : x)) } })
        const mbtn = { width: 24, height: 24, flexShrink: 0, borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: GOLD, fontSize: 14, lineHeight: 1, padding: 0 }
        const row = (label, val, min, max, step, on) => {
          const bump = dir => { let cur = val; return () => { cur = +(Math.min(max, Math.max(min, cur + dir * step))).toFixed(4); on(cur) } }
          return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 96, fontSize: 12, flexShrink: 0, color: '#f0dfae', fontWeight: 700 }}>{label}</span>
            <button style={mbtn} {...holdBtn(bump(-1))}>−</button>
            <input type="range" min={min} max={max} step={step} value={val} onChange={e => on(parseFloat(e.target.value))} style={{ flex: 1, minWidth: 0 }} />
            <button style={mbtn} {...holdBtn(bump(1))}>+</button>
            <span style={{ width: 42, textAlign: 'right', fontSize: 12, color: GOLD }}>{val}</span>
          </div>
          )
        }
        return (
        <div style={{ ...st.motPanel, ...(dockSide ? dockStyle : null) }}>
          <div style={{ fontSize: 13, color: GOLD, fontWeight: 800, marginBottom: 6 }}>모션 편집 — 전투 보면서 바로 조절</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {[['dino', '공룡'], ['hero', '히어로'], ['ally', '동료'], ['mob', '일반몹'], ['boss', '보스'], ['skfx', '스킬이펙트']].map(([c, lbl]) => (
              <button key={c} onClick={() => setMotCat(c)}
                style={{ padding: '4px 8px', fontSize: 11, borderRadius: 5, border: `1px solid ${c === motCat ? GOLD : '#4a3a22'}`, fontWeight: 700,
                  background: c === motCat ? 'linear-gradient(180deg,#3a8fd0,#1f5f9f)' : '#2c2013', color: c === motCat ? '#fff' : '#cbb89a' }}
              >{lbl}</button>
            ))}
          </div>

          {motCat === 'dino' && (<>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {DINO_KEYS.map(k => (
                <button key={k} onClick={() => setMotSel(k)}
                  style={{ padding: '4px 7px', fontSize: 11, borderRadius: 5, border: `1px solid ${k === motSel ? GOLD : '#4a3a22'}`,
                    background: k === motSel ? 'linear-gradient(180deg,#d4872e,#a85f1f)' : '#2c2013', color: k === motSel ? '#fff' : '#cbb89a' }}
                >{DINO_NAME[k]}</button>
              ))}
            </div>
            {row('모험 히어로와 거리(px)', M.adv.dist ?? 60, 0, 300, 1, v => setMotCfg({ ...M, adv: { ...M.adv, dist: v } }))}
            {row('모험 1열 간격(px)', M.adv.gap ?? 40, 0, 200, 1, v => setMotCfg({ ...M, adv: { ...M.adv, gap: v } }))}
            {row('모험 파고듦(px)', M.adv.lunge ?? 30, 0, 80, 1, v => setMotCfg({ ...M, adv: { ...M.adv, lunge: v } }))}
            <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>모험 일반 몹은 제자리에 박혀 한 줄로 선다 (웨이브 값과 별개, 공격은 함)</div>
            <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>{DINO_NAME[motSel]} 공격 프레임 {frames.join('·')}번 · 총 {arr.reduce((a, b) => a + b, 0).toFixed(2)}초</div>
            {arr.map((v, i) => row(`${i + 1}번(원본${frames[i]}) 시간`, v, 0.02, 0.6, 0.01, nv => setArr(i, nv)))}
            {row('데미지 프레임', M.hit[motSel] || 3, 1, arr.length, 1, v => setMotCfg({ ...M, hit: { ...M.hit, [motSel]: v } }))}
            <div style={{ fontSize: 10, color: '#8a7758', margin: '4px 0 2px', lineHeight: 1.4 }}>크기·정지·높이·속도는 [일반몹]/[보스] 탭에서 몹·보스 따로 조절</div>
            <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
            {row('보스 간격(ms)', M.cd.advBoss, 300, 3000, 50, v => setMotCfg({ ...M, cd: { ...M.cd, advBoss: v } }))}
            {row('모험몹 간격', M.cd.advMob, 300, 3000, 50, v => setMotCfg({ ...M, cd: { ...M.cd, advMob: v } }))}
            {row('모험몹 모션', M.dur.advMob, 0.1, 1, 0.01, v => setMotCfg({ ...M, dur: { ...M.dur, advMob: v } }))}
            <div style={{ fontSize: 10, color: '#8a7758', marginBottom: 6 }}>웨이브 보스의 파고듦·공격 간격·모션 시간은 [보스] 탭으로 옮겼습니다</div>
          </>)}

          {motCat === 'hero' && (<>
            <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>히어로 크기·위치 (전체)</div>
            <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>진화단계별 크기 (전체 크기에 곱해짐 — 단계마다 다르게)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {EVOS.map((ev, i) => (
                <button key={i} onClick={() => setMotHeroEvo(i)}
                  style={{ padding: '3px 7px', fontSize: 10, borderRadius: 5, border: `1px solid ${i === motHeroEvo ? GOLD : '#4a3a22'}`,
                    background: i === motHeroEvo ? 'linear-gradient(180deg,#d4872e,#a85f1f)' : '#2c2013', color: i === motHeroEvo ? '#fff' : '#cbb89a' }}
                >{i}단계{i === evo ? '●' : ''}</button>
              ))}
            </div>
            {row(`${motHeroEvo}단계 크기`, (M.hero.evoSz || {})[motHeroEvo] ?? 1, 0.4, 2.5, 0.01, v => setMotCfg({ ...M, hero: { ...M.hero, evoSz: { ...(M.hero.evoSz || {}), [motHeroEvo]: v } } }))}
            <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
            {row('전체 크기', M.hero.sz, 0.4, 2.5, 0.01, v => setMotCfg({ ...M, hero: { ...M.hero, sz: v } }))}
            {row('좌우 위치', M.hero.x, -150, 150, 1, v => setMotCfg({ ...M, hero: { ...M.hero, x: v } }))}
            {row('상하 위치', M.hero.y, -150, 150, 1, v => setMotCfg({ ...M, hero: { ...M.hero, y: v } }))}
            <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
            <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>모션별 크기 (전체 크기에 곱해짐)</div>
            <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
            <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>기본공격 사거리 (화면에 노란 점선으로 표시)</div>
            {row('외곽선 두께', M.hero.outline?.blur ?? 6, 0, 20, 1, v => setMotCfg({ ...M, hero: { ...M.hero, outline: { ...(M.hero.outline || {}), blur: v } } }))}
            {row('외곽선 진하기', M.hero.outline?.alpha ?? 0.85, 0, 1, 0.05, v => setMotCfg({ ...M, hero: { ...M.hero, outline: { ...(M.hero.outline || {}), alpha: v } } }))}
            <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>밝은 배경(눈·정글)에서 히어로가 묻히는 것 방지 — 0이면 끔</div>
            {row(`${motHeroEvo}단계 사거리(px)`, (M.hero.range || {})[motHeroEvo] ?? heroRange(M, motHeroEvo, EVOS[motHeroEvo].mode), 20, 240, 1,
              v => setMotCfg({ ...M, hero: { ...M.hero, range: { ...(M.hero.range || {}), [motHeroEvo]: v } } }))}
            <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>히어로는 x=200, 화면 폭 420 — 220이면 화면 오른쪽 끝. 웨이브 몹은 '일반몹 탭 &gt; 히어로와 거리'에 서므로 그 값보다 커야 공격이 나갑니다</div>
            <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
            {row(`${motHeroEvo}단계 걷기 크기`, (M.hero.walkSz || {})[motHeroEvo] ?? 1, 0.4, 2.5, 0.01, v => setMotCfg({ ...M, hero: { ...M.hero, walkSz: { ...(M.hero.walkSz || {}), [motHeroEvo]: v } } }))}
            {EVOS[motHeroEvo].mode === 'biped' && (<>
              <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
              <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>돌 던지기 (직립보행 기본공격)</div>
              {row('돌 비행 속도', M.stone.spd ?? 1, 0.2, 4, 0.05, v => setMotCfg({ ...M, stone: { ...M.stone, spd: v } }))}
              {row('돌 크기(px)', M.stone.sz ?? 18, 4, 80, 1, v => setMotCfg({ ...M, stone: { ...M.stone, sz: v } }))}
              {row('포물선 높이', M.stone.arc ?? 1, 0, 3, 0.05, v => setMotCfg({ ...M, stone: { ...M.stone, arc: v } }))}
            </>)}
            {MELEE_MODES.includes(EVOS[motHeroEvo].mode) && (<>
              <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
              <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>데미지가 들어가는 프레임 (총 {heroAtkFrames(EVOS[motHeroEvo].mode)}장, 마지막=임팩트)</div>
              {row(`${motHeroEvo}단계 타격 프레임`, (M.hero.hit || {})[EVOS[motHeroEvo].mode] ?? heroAtkFrames(EVOS[motHeroEvo].mode), 1, heroAtkFrames(EVOS[motHeroEvo].mode), 1,
                v => setMotCfg({ ...M, hero: { ...M.hero, hit: { ...(M.hero.hit || {}), [EVOS[motHeroEvo].mode]: v } } }))}
            </>)}
            {(() => {
              const ak = HERO_ATK_KEY(EVOS[motHeroEvo].mode)
              const n = heroAtkKeyFrames(ak)
              return (<>
                <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
                <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>{motHeroEvo}단계 기본공격 크기 (프레임별)</div>
                {Array.from({ length: n }, (_, i) => i + 1).map(f => (<React.Fragment key={f}>
                  {row(`${f}번 프레임 크기`, ((M.hero.atkFrSz || {})[ak] || {})[f] ?? 1, 0.4, 2.5, 0.01,
                    v => setMotCfg({ ...M, hero: { ...M.hero, atkFrSz: { ...(M.hero.atkFrSz || {}), [ak]: { ...((M.hero.atkFrSz || {})[ak] || {}), [f]: v } } } }))}
                  {row(`${f}번 좌우`, ((M.hero.atkFrX || {})[ak] || {})[f] ?? 0, -120, 120, 1,
                    v => setMotCfg({ ...M, hero: { ...M.hero, atkFrX: { ...(M.hero.atkFrX || {}), [ak]: { ...((M.hero.atkFrX || {})[ak] || {}), [f]: v } } } }))}
                </React.Fragment>))}
              </>)
            })()}
            <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
            <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>스킬별 히어로 모션 크기</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {SKILLS.filter(s => !s.passive).map(s => (
                <button key={s.id} onClick={() => setMotHeroSk(s.id)}
                  style={{ padding: '3px 6px', fontSize: 10, borderRadius: 5, border: `1px solid ${s.id === motHeroSk ? GOLD : '#4a3a22'}`,
                    background: s.id === motHeroSk ? 'linear-gradient(180deg,#d4872e,#a85f1f)' : '#2c2013', color: s.id === motHeroSk ? '#fff' : '#cbb89a' }}
                >{s.name}</button>
              ))}
            </div>
            {row('선택 스킬 몹 앞 (0/1)', (M.hero.skillFront || {})[motHeroSk] ?? 0, 0, 1, 1, v => setMotCfg({ ...M, hero: { ...M.hero, skillFront: { ...(M.hero.skillFront || {}), [motHeroSk]: v } } }))}
            {row('모션 후 히어로 숨김 (0/1)', (M.hero.skillHide || {})[motHeroSk] ?? 0, 0, 1, 1, v => setMotCfg({ ...M, hero: { ...M.hero, skillHide: { ...(M.hero.skillHide || {}), [motHeroSk]: v } } }))}
            {row('연타 간격(초) 0=단발', (M.skFx[motHeroSk] || {}).tick ?? 0, 0, 1, 0.01, v => setMotCfg({ ...M, skFx: { ...M.skFx, [motHeroSk]: { ...(M.skFx[motHeroSk] || {}), tick: v } } }))}
            <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>0보다 크면 그 간격마다 데미지를 반복합니다(타격 시점 무시). 낙하 이펙트가 있는 스킬은 이펙트가 사는 동안, 없는 스킬은 시전 동안 반복합니다. 한 번에 스킬 데미지 전액이 들어가므로 총합이 횟수만큼 세집니다</div>
            <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>1이면 히어로 모션이 끝나는 순간 히어로가 사라지고 이펙트만 남습니다. 이펙트가 끝나면 다시 나타나 기본공격으로 돌아갑니다 (이펙트 없는 스킬엔 효과 없음)</div>
            <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>1이면 이 스킬 시전 중 히어로가 몬스터에 안 가려집니다 (앞으로 파고드는 스킬만)</div>
            {row('선택 스킬 크기', (M.hero.skillSz || {})[motHeroSk] ?? 1, 0.4, 2.5, 0.01, v => setMotCfg({ ...M, hero: { ...M.hero, skillSz: { ...(M.hero.skillSz || {}), [motHeroSk]: v } } }))}
            {row('선택 스킬 좌우', ((M.hero.skillPos || {})[motHeroSk] || {}).x ?? 0, -250, 250, 1, v => setMotCfg({ ...M, hero: { ...M.hero, skillPos: { ...(M.hero.skillPos || {}), [motHeroSk]: { ...((M.hero.skillPos || {})[motHeroSk] || {}), x: v } } } }))}
            {row('선택 스킬 상하', ((M.hero.skillPos || {})[motHeroSk] || {}).y ?? 0, -250, 250, 1, v => setMotCfg({ ...M, hero: { ...M.hero, skillPos: { ...(M.hero.skillPos || {}), [motHeroSk]: { ...((M.hero.skillPos || {})[motHeroSk] || {}), y: v } } } }))}
            {(() => {
              const sk = SKILLS.find(x => x.id === motHeroSk)
              if (!sk) return null
              const n = sk.frameEnds.length
              const f = Math.min(motSkFr, n)
              const put = (grp, key, v) => setMotCfg({ ...M, hero: { ...M.hero, [grp]: { ...(M.hero[grp] || {}), [motHeroSk]: { ...((M.hero[grp] || {})[motHeroSk] || {}), [f]: key ? { ...(((M.hero[grp] || {})[motHeroSk] || {})[f] || {}), [key]: v } : v } } } })
              const saved = (M.hero.skillFrT || {})[motHeroSk]
              const ft = ((Array.isArray(saved) && saved.length === n) ? saved : sk.frameT).slice()
              return (<>
                <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
                <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>스킬 프레임별 (총 {n}장) — 시전 시간 합계 {ft.reduce((a, b) => a + b, 0).toFixed(2)}초</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {Array.from({ length: n }, (_, i) => i + 1).map(i => (
                    <button key={i} onClick={() => setMotSkFr(i)}
                      style={{ width: 26, height: 24, fontSize: 11, borderRadius: 5, border: `1px solid ${i === f ? GOLD : '#4a3a22'}`,
                        background: i === f ? 'linear-gradient(180deg,#d4872e,#a85f1f)' : '#2c2013', color: i === f ? '#fff' : '#cbb89a', padding: 0 }}
                    >{i}</button>
                  ))}
                </div>
                {row(`${f}번 크기`, (((M.hero.skillFrSz || {})[motHeroSk] || {})[f]) ?? 1, 0.2, 4, 0.01, v => put('skillFrSz', null, v))}
                {row(`${f}번 좌우`, ((((M.hero.skillFrPos || {})[motHeroSk] || {})[f]) || {}).x ?? 0, -400, 400, 1, v => put('skillFrPos', 'x', v))}
                {row(`${f}번 상하`, ((((M.hero.skillFrPos || {})[motHeroSk] || {})[f]) || {}).y ?? 0, -400, 400, 1, v => put('skillFrPos', 'y', v))}
                {row(`${f}번 시간(초)`, ft[f - 1] ?? 0.15, 0.02, 3, 0.01, v => { ft[f - 1] = v; setMotCfg({ ...M, hero: { ...M.hero, skillFrT: { ...(M.hero.skillFrT || {}), [motHeroSk]: ft } } }) })}
              </>)
            })()}
          </>)}

          {motCat === 'ally' && (<>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {[['hunter', '헌터'], ['shaman', '주술사'], ['healer', '힐러'], ['giant', '거인']].map(([k, lbl]) => (
                <button key={k} onClick={() => setMotAlly(k)}
                  style={{ padding: '4px 9px', fontSize: 11, borderRadius: 5, border: `1px solid ${k === motAlly ? GOLD : '#4a3a22'}`,
                    background: k === motAlly ? 'linear-gradient(180deg,#d4872e,#a85f1f)' : '#2c2013', color: k === motAlly ? '#fff' : '#cbb89a' }}
                >{lbl}</button>
              ))}
            </div>
            {row('크기 배율', M.ally[motAlly].sz, 0.4, 2.5, 0.01, v => setMotCfg({ ...M, ally: { ...M.ally, [motAlly]: { ...M.ally[motAlly], sz: v } } }))}
            {row('좌우 위치', M.ally[motAlly].x, -150, 150, 1, v => setMotCfg({ ...M, ally: { ...M.ally, [motAlly]: { ...M.ally[motAlly], x: v } } }))}
            {row('상하 위치', M.ally[motAlly].y, -150, 150, 1, v => setMotCfg({ ...M, ally: { ...M.ally, [motAlly]: { ...M.ally[motAlly], y: v } } }))}
            <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
            <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>기본공격 모션</div>
            {row('공격프레임 크기', M.ally[motAlly].atkSz, 0.4, 2.5, 0.01, v => setMotCfg({ ...M, ally: { ...M.ally, [motAlly]: { ...M.ally[motAlly], atkSz: v } } }))}
            {row('공격 속도', M.ally[motAlly].atkSpd, 0.3, 3, 0.05, v => setMotCfg({ ...M, ally: { ...M.ally, [motAlly]: { ...M.ally[motAlly], atkSpd: v } } }))}
            {ALLY_DEFS[motAlly] && ALLY_IMG[motAlly] && ALLY_IMG[motAlly].proj && (<>
              <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
              <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>기본공격 투사체 (발사 위치·크기)</div>
              {row('투사체 크기', M.ally[motAlly].projSz ?? 1, 0.3, 3, 0.01, v => setMotCfg({ ...M, ally: { ...M.ally, [motAlly]: { ...M.ally[motAlly], projSz: v } } }))}
              {row('투사체 좌우', M.ally[motAlly].projX ?? 0, -150, 150, 1, v => setMotCfg({ ...M, ally: { ...M.ally, [motAlly]: { ...M.ally[motAlly], projX: v } } }))}
              {row('투사체 상하', M.ally[motAlly].projY ?? 0, -150, 150, 1, v => setMotCfg({ ...M, ally: { ...M.ally, [motAlly]: { ...M.ally[motAlly], projY: v } } }))}
              <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>발사 지점만 옮깁니다 — 명중 시점은 히어로 타격에 맞춰 속도가 자동 보정됩니다</div>
            </>)}
          </>)}

          {motCat === 'mob' && (() => {
            const ens = (world.current && world.current.enemies) || []
            const on = ens.filter(e => !e.dead && !e.boss)
            const seen = new Set(); const entries = []
            for (const e of on) {
              const key = e.dino ? ('d:' + e.dino) : e.type
              if (seen.has(key)) continue; seen.add(key)
              entries.push({ key, label: e.dino ? (DINO_NAME[e.dino] || e.dino) : ((ENEMY_TYPES[e.type] || {}).name || e.type), szDef: e.dino ? (M.size[e.dino] ?? 1) : 1, dino: !!e.dino })
            }
            if (!entries.length) return <div style={{ fontSize: 12, color: '#c9a06a', padding: '8px 0' }}>화면에 일반몹이 없어요. 웨이브/모험이 시작되면 자동으로 잡혀요.</div>
            return (<>
              <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>웨이브 공통</div>
              {row('일렬 간격(px)', M.wave.gap ?? 65, 20, 300, 5, v => setMotCfg({ ...M, wave: { ...M.wave, gap: v } }))}
              {row('히어로와 거리(px)', M.wave.dist ?? 95, 30, 300, 1, v => setMotCfg({ ...M, wave: { ...M.wave, dist: v } }))}
              <div style={{ fontSize: 11, color: '#9c8a6c', margin: '6px 0 2px' }}>피격 반응 — 웨이브 일반몹 전체 일괄 (종별 아님 / 보스·모험 제외)</div>
              {row('피격 가로 배율', M.hitSq.x, 0.6, 1.4, 0.01, v => setMotCfg({ ...M, hitSq: { ...M.hitSq, x: v } }))}
              {row('피격 세로 배율', M.hitSq.y, 0.6, 1.4, 0.01, v => setMotCfg({ ...M, hitSq: { ...M.hitSq, y: v } }))}
              {row('피격 젖힘(도)', M.hitSq.rot, 0, 20, 0.5, v => setMotCfg({ ...M, hitSq: { ...M.hitSq, rot: v } }))}
              {row('피격 지속(초)', M.hitSq.dur, 0.05, 0.6, 0.01, v => setMotCfg({ ...M, hitSq: { ...M.hitSq, dur: v } }))}
              <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>둘 다 종 무관 일괄 적용. 간격은 다음 웨이브부터 (이미 깔린 몹은 그대로)</div>
              <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>화면의 일반몹 (종별)</div>
              {entries.map(({ key, label, szDef, dino }) => { const c = M.mob[key] || {}; return (
                <div key={key} style={{ borderTop: '1px solid #2a1e10', paddingTop: 5, marginTop: 5 }}>
                  <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 3 }}>{label}{dino ? ' (공룡)' : ''}</div>
                  {row('크기 배율', c.sz ?? szDef, 0.4, 2.5, 0.01, v => setMotCfg({ ...M, mob: { ...M.mob, [key]: { ...(M.mob[key] || {}), sz: v } } }))}
                  {row('높이(+위)', c.y ?? 0, -100, 100, 1, v => setMotCfg({ ...M, mob: { ...M.mob, [key]: { ...(M.mob[key] || {}), y: v } } }))}
                  {row('좌우 정지(걸어오는 몹만)', c.stop ?? 0, -120, 250, 1, v => setMotCfg({ ...M, mob: { ...M.mob, [key]: { ...(M.mob[key] || {}), stop: v } } }))}
                  {row('달려오는 속도', c.spd ?? 1, 0.2, 3, 0.05, v => setMotCfg({ ...M, mob: { ...M.mob, [key]: { ...(M.mob[key] || {}), spd: v } } }))}
                </div>
              ) })}
            </>)
          })()}

          {motCat === 'boss' && (() => {
            const ens = (world.current && world.current.enemies) || []
            const on = ens.filter(e => !e.dead && e.boss)
            const seen = new Set(); const entries = []
            for (const e of on) {
              const key = e.dino ? ('d:' + e.dino) : (e.evBoss ? ('e:' + e.evBoss) : ('c:' + e.type))
              if (seen.has(key)) continue; seen.add(key)
              const lbl = e.dino ? (DINO_NAME[e.dino] || e.dino)
                : e.evBoss ? ((BOSS_TYPES[e.evBoss - 1] || {}).name || ('보스' + e.evBoss)) + ' (던전)'
                : ('저주받은 ' + ((ENEMY_TYPES[e.type] || {}).name || e.type))
              entries.push({ key, label: lbl, szDef: e.dino ? (M.size[e.dino] ?? 1) : 1, dino: !!e.dino })
            }
            const common = (<>
              <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>웨이브 보스 공격 (종 공통)</div>
              {row('파고듦(px)', M.lunge.boss, 0, 60, 1, v => setMotCfg({ ...M, lunge: { ...M.lunge, boss: v } }))}
              {row('공격 간격(ms)', M.cd.wave, 300, 3000, 50, v => setMotCfg({ ...M, cd: { ...M.cd, wave: v } }))}
              {row('공격 모션(초)', M.dur.wave, 0.1, 1, 0.01, v => setMotCfg({ ...M, dur: { ...M.dur, wave: v } }))}
              <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>타격은 모션 시간의 절반 지점. 웨이브 일반몹은 공격하지 않으므로 이 값은 웨이브 보스에만 적용됩니다</div>
              <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
            </>)
            if (!entries.length) return (<>{common}<div style={{ fontSize: 12, color: '#c9a06a', padding: '8px 0' }}>화면에 보스가 없어요. 보스전/모험 보스에 들어가면 자동으로 잡혀요.</div></>)
            return (<>
              {common}
              <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>화면의 보스 (종별)</div>
              {entries.map(({ key, label, szDef, dino }) => { const c = M.boss[key] || {}; return (
                <div key={key} style={{ borderTop: '1px solid #2a1e10', paddingTop: 5, marginTop: 5 }}>
                  <div style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 3 }}>{label}{dino ? ' (공룡)' : ''}</div>
                  {row('크기 배율', c.sz ?? szDef, 0.4, 3, 0.01, v => setMotCfg({ ...M, boss: { ...M.boss, [key]: { ...(M.boss[key] || {}), sz: v } } }))}
                  {row('높이(+위)', c.y ?? 0, -100, 100, 1, v => setMotCfg({ ...M, boss: { ...M.boss, [key]: { ...(M.boss[key] || {}), y: v } } }))}
                  {row('좌우 정지(+멀리)', c.stop ?? 0, -120, 250, 1, v => setMotCfg({ ...M, boss: { ...M.boss, [key]: { ...(M.boss[key] || {}), stop: v } } }))}
                  {row('달려오는 속도', c.spd ?? 1, 0.2, 3, 0.05, v => setMotCfg({ ...M, boss: { ...M.boss, [key]: { ...(M.boss[key] || {}), spd: v } } }))}
                </div>
              ) })}
            </>)
          })()}

          {motCat === 'skfx' && (<>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {MOT_FX_IDS.map(id => { const sk = SKILLS.find(s => s.id === id); return (
                <button key={id} onClick={() => setMotFx(id)}
                  style={{ padding: '4px 7px', fontSize: 11, borderRadius: 5, border: `1px solid ${id === motFx ? GOLD : '#4a3a22'}`,
                    background: id === motFx ? 'linear-gradient(180deg,#d4872e,#a85f1f)' : '#2c2013', color: id === motFx ? '#fff' : '#cbb89a' }}
                >{sk ? sk.name : id}</button>
              ) })}
            </div>
            <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>이펙트 크기·속도 (스킬 발동 시 반영)</div>
            {row('이펙트 크기', M.skFx[motFx].sz, 0.3, 3, 0.01, v => setMotCfg({ ...M, skFx: { ...M.skFx, [motFx]: { ...M.skFx[motFx], sz: v } } }))}
            {row('프레임 속도', M.skFx[motFx].spd, 0.3, 3, 0.05, v => setMotCfg({ ...M, skFx: { ...M.skFx, [motFx]: { ...M.skFx[motFx], spd: v } } }))}
            {row('비행 속도(투사체)', M.skFx[motFx].fly ?? 1, 0.2, 3, 0.05, v => setMotCfg({ ...M, skFx: { ...M.skFx, [motFx]: { ...M.skFx[motFx], fly: v } } }))}
            {(() => {                                    // 낙하 이펙트 전용: 시작 시점 · 위치 기준
              const sk2 = SKILLS.find(k => k.id === motFx)
              if (!sk2 || !sk2.fx || sk2.fx.type !== 'strike') return null
              const put2 = (k, v) => setMotCfg({ ...M, skFx: { ...M.skFx, [motFx]: { ...M.skFx[motFx], [k]: v } } })
              return (<>
                {row('이펙트 시작(시전 진행도)', M.skFx[motFx].startP ?? (sk2.hitAt ?? 1), 0, 1, 0.01, v => put2('startP', v))}
                {row('위치 기준 (0=적 1=히어로)', M.skFx[motFx].anchor ?? 0, 0, 1, 1, v => put2('anchor', v))}
                <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>시작 0.5 = 히어로 모션 절반에서 이펙트 등장(겹침). 히어로 기준이면 이펙트가 히어로를 따라 움직입니다</div>
                {sk2.fx.twin && (<>
                  {row('교차 간격(px)', M.skFx[motFx].twGap ?? sk2.fx.twin.gap, 0, 120, 1, v => put2('twGap', v))}
                  {row('교차 속도(바퀴)', M.skFx[motFx].twSpd ?? sk2.fx.twin.spd, 0.2, 4, 0.1, v => put2('twSpd', v))}
                  <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>이펙트 2장을 반대 위상으로 좌우 왕복시켜 교차시킵니다. 간격 0이면 겹쳐서 1장처럼 보입니다</div>
                </>)}
              </>)
            })()}
            {row('이펙트 좌우', M.skFx[motFx].x ?? 0, -250, 250, 1, v => setMotCfg({ ...M, skFx: { ...M.skFx, [motFx]: { ...M.skFx[motFx], x: v } } }))}
            {row('이펙트 상하', M.skFx[motFx].y ?? 0, -250, 250, 1, v => setMotCfg({ ...M, skFx: { ...M.skFx, [motFx]: { ...M.skFx[motFx], y: v } } }))}
            {(() => {
              const sk = SKILLS.find(x => x.id === motFx)
              const fx = sk && sk.fx
              if (!fx) return null
              const n = (fx.type === 'proj' ? (fx.fly || []) : (fx.frames || [])).length
              if (!n) return null
              const f = Math.min(motFxFr, n)
              const cur = ((M.skFx[motFx].fr || {})[f]) || {}
              const put = (key, v) => setMotCfg({ ...M, skFx: { ...M.skFx, [motFx]: { ...M.skFx[motFx], fr: { ...(M.skFx[motFx].fr || {}), [f]: { ...cur, [key]: v } } } } })
              return (<>
                <div style={{ borderTop: '1px solid #3a2a14', margin: '6px 0' }} />
                <div style={{ fontSize: 11, color: '#9c8a6c', marginBottom: 4 }}>이펙트 프레임별 (총 {n}장)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {Array.from({ length: n }, (_, i) => i + 1).map(i => (
                    <button key={i} onClick={() => setMotFxFr(i)}
                      style={{ width: 26, height: 24, fontSize: 11, borderRadius: 5, border: `1px solid ${i === f ? GOLD : '#4a3a22'}`,
                        background: i === f ? 'linear-gradient(180deg,#d4872e,#a85f1f)' : '#2c2013', color: i === f ? '#fff' : '#cbb89a', padding: 0 }}
                    >{i}</button>
                  ))}
                </div>
                {(() => {                                     // 프레임별 시간(초). 길이가 프레임 수와 다르면 균등값으로 초기화
                  const base = (STRIKE_DUR_BY[motFx] ?? STRIKE_DUR)
                  const cur2 = (M.fxFrT || {})[motFx]
                  const arr = Array.isArray(cur2)
                    ? Array.from({ length: n }, (_, i) => (Number(cur2[i]) > 0 ? Number(cur2[i]) : 0))
                    : Array.from({ length: n }, () => +(base / n).toFixed(3))
                  const tot = arr.reduce((x, y) => x + y, 0)
                  return (<>
                    {row(`${f}번 시간(초)`, arr[f - 1] ?? 0, 0, 2, 0.01, v => {
                      const nx = [...arr]; nx[f - 1] = v
                      setMotCfg({ ...M, fxFrT: { ...(M.fxFrT || {}), [motFx]: nx } })
                    })}
                    <div style={{ fontSize: 10, color: '#7b6a50', marginBottom: 6 }}>총 재생 {tot.toFixed(2)}초 (프레임 속도로 나눠 적용)</div>
                  </>)
                })()}
                {row(`${f}번 크기`, cur.sz ?? 1, 0.2, 4, 0.01, v => put('sz', v))}
                {row(`${f}번 좌우`, cur.x ?? 0, -400, 400, 1, v => put('x', v))}
                {row(`${f}번 상하`, cur.y ?? 0, -400, 400, 1, v => put('y', v))}
              </>)
            })()}
          </>)}

          <div style={{ display: 'flex', gap: 6, marginTop: 8, borderTop: '1px solid #3a2a14', paddingTop: 8 }}>
            <button onClick={() => { setCopiedMot(copyText(JSON.stringify({ motion: motCfg, ui: uiCfg }))); setTimeout(() => setCopiedMot(false), 1500) }}
              style={{ flex: 1, padding: '9px', borderRadius: 6, border: `1px solid ${GOLD_D}`, background: 'linear-gradient(180deg,#d4872e,#a85f1f)', color: '#fff', fontSize: 13 }}>{copiedMot ? '복사됨! (UI+모션)' : 'UI+모션 값 복사'}</button>
            <button onClick={() => setMotCfg(JSON.parse(JSON.stringify(MOTION_DEFAULT)))} style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: '#cbb89a', fontSize: 13 }}>초기화</button>
          </div>
          <div style={{ fontSize: 10, color: '#8a7758', marginTop: 6 }}>버튼이 안 되면 아래 칸 눌러 전체선택→복사:</div>
          <textarea readOnly onClick={e => e.target.select()} value={JSON.stringify({ motion: motCfg, ui: uiCfg })} style={{ width: '100%', height: 44, marginTop: 3, fontSize: 9, background: '#1a1206', color: '#c9b596', border: '1px solid #4a3822', borderRadius: 5, resize: 'none', boxSizing: 'border-box' }} />
          <div style={{ marginTop: 6 }}>
            <button onClick={() => setMotEdit(false)} style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: '#cbb89a', fontSize: 13 }}>닫기</button>
          </div>
        </div>
        )
      })()}

      {IS_PC && uiEdit && (
        <div style={{ position: 'fixed', left: 0, right: 0, ...(editSel ? { bottom: 0, borderBottom: 'none', borderRadius: '10px 10px 0 0' } : { top: 0, borderTop: 'none', borderRadius: '0 0 10px 10px' }), margin: '0 auto', maxWidth: 420, zIndex: 61, background: 'rgba(16,10,5,0.94)', border: `2px solid ${GOLD_D}`, textShadow: '0 1px 3px rgba(0,0,0,0.9)', padding: '8px 12px calc(8px + env(safe-area-inset-bottom))', maxHeight: '46%', overflowY: 'auto', ...(dockSide ? dockStyle : null) }}>
          {!editSel && <div style={{ fontSize: 13, color: '#c9b596', textAlign: 'center', padding: '4px 0 8px' }}>조정할 요소를 화면에서 탭하세요 (틀·아이콘·글자·숫자·버튼)</div>}
          <div style={{ fontSize: 13, color: '#ffd98a', textAlign: 'center', padding: '0 0 6px', fontWeight: 800 }}>기준 {BASE_W}×{BASE_H} · 화면 {view.sw}×{view.sh} · 배율 {view.s.toFixed(3)}</div>
          {editSel && (() => {
            const g = EDIT_GROUPS[editSel]; if (!g) return null
            const nudge = (k, d, lo, hi) => { setUiCfg(c => ({ ...c, [k]: Math.min(hi, Math.max(lo, Math.round((c[k] + d) * 2) / 2)) })); localStorage.setItem('paleoUiTs', String(Date.now())) }
            const nbtn = { width: 26, height: 26, flexShrink: 0, borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: GOLD, fontSize: 14, lineHeight: 1, padding: 0 }
            const rng = k => k.startsWith('alwin') ? 420 : k.startsWith('al') ? (k.endsWith('fz') ? 40 : 220) : k.startsWith('evo') ? (k === 'evonamefz' ? 40 : 120) : k.startsWith('wbexit') ? (k.endsWith('fz') ? 60 : 300) : (k.startsWith('shop') || k.startsWith('card')) ? (k.endsWith('fz') ? 60 : (k.endsWith('gap') ? 40 : 400)) : k.startsWith('fev') ? (k.endsWith('fz') ? 40 : k === 'fevonzoom' ? 300 : 300) : k.startsWith('ev') ? (k.endsWith('fz') ? 60 : (k === 'evww' || k === 'evwh' || k === 'evpww' || k === 'evpwh') ? 600 : 300) : k.startsWith('profhero') ? 300 : k.startsWith('prof') ? (k.endsWith('fz') ? 40 : 160) : k.startsWith('q') && k !== 'questsz' ? (k.endsWith('fz') ? 60 : (k === 'qww' || k === 'qwh') ? 600 : 300) : k.startsWith('adv') ? (k.endsWith('fz') ? 60 : k === 'advbw' || k === 'advbh' ? 200 : 600) : k === 'offw' ? 400 : k === 'fuseallw' ? 400 : k === 'offbtw' ? 260 : k === 'equipcols' ? 8 : k === 'equipimg' ? 100 : k === 'hph' ? 60 : k === 'btw' || k === 'bhpw' ? 320 : k === 'bth' || k === 'bhph' ? 70 : k === 'equipcell' ? 160 : (k.startsWith('sk') && k !== 'skicon' ? (k === 'skqbarw' ? 420 : k.endsWith('fz') ? 60 : k.endsWith('gap') ? 40 : (k.endsWith('w') || k.endsWith('h') || k.endsWith('sz')) ? 200 : 120) : k === 'exph' || k.includes('bw') || k.includes('gap') || k === 'sph' || k.startsWith('nav') || k.startsWith('tab') ? 40 : (k === 'rowmin' ? 80 : 120))
            const rmin = k => k === 'equipcols' ? 3 : 0
            return <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <b style={{ color: GOLD, fontSize: 14 }}>{g.label}</b>
                <button onClick={() => setEditSel(null)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: '#cbb89a', fontSize: 12 }}>닫기</button>
              </div>
              {g.size.map(k => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 92, fontSize: 12, flexShrink: 0, color: '#f0dfae', fontWeight: 700 }}>{UI_LABELS[k]}</span>
                  <button style={nbtn} {...holdBtn(() => nudge(k, k === 'val' ? -0.5 : -1, rmin(k), rng(k)))}>−</button>
                  <input type="range" min={rmin(k)} max={rng(k)} step={k === 'val' ? 0.5 : 1} value={uiCfg[k]} onChange={e => { setUiCfg({ ...uiCfg, [k]: parseFloat(e.target.value) }); localStorage.setItem('paleoUiTs', String(Date.now())) }} style={{ flex: 1, minWidth: 0 }} />
                  <button style={nbtn} {...holdBtn(() => nudge(k, k === 'val' ? 0.5 : 1, rmin(k), rng(k)))}>+</button>
                  <span style={{ width: 34, textAlign: 'right', fontSize: 12, color: GOLD }}>{uiCfg[k]}</span>
                </div>
              ))}
              {g.pos && ['X', 'Y'].map(ax => {
                const k = g.pos + ax
                const pmax = g.pos.startsWith('profhero') ? 200 : g.pos.startsWith('advbtn') ? 400 : (g.pos.startsWith('skq') || g.pos.startsWith('skd')) ? 240 : g.pos.startsWith('sk') ? 160 : 80
                return <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 92, fontSize: 12, flexShrink: 0, color: '#f0dfae', fontWeight: 700 }}>{ax === 'X' ? '← 좌우 →' : '↑ 상하 ↓'}</span>
                  <button style={nbtn} {...holdBtn(() => nudge(k, -1, -pmax, pmax))}>−</button>
                  <input type="range" min={-pmax} max={pmax} step={1} value={uiCfg[k]} onChange={e => { setUiCfg({ ...uiCfg, [k]: parseFloat(e.target.value) }); localStorage.setItem('paleoUiTs', String(Date.now())) }} style={{ flex: 1, minWidth: 0 }} />
                  <button style={nbtn} {...holdBtn(() => nudge(k, 1, -pmax, pmax))}>+</button>
                  <span style={{ width: 34, textAlign: 'right', fontSize: 12, color: GOLD }}>{uiCfg[k]}</span>
                </div>
              })}
            </div>
          })()}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, borderTop: '1px solid #3a2a14', paddingTop: 8 }}>
            <button onClick={() => { setCopiedUi(copyText(JSON.stringify({ motion: motCfg, ui: uiCfg }))); setTimeout(() => setCopiedUi(false), 1500) }} style={{ flex: 1, padding: '9px', borderRadius: 6, border: `1px solid ${GOLD_D}`, background: 'linear-gradient(180deg,#d4872e,#a85f1f)', color: '#fff', fontSize: 13 }}>{copiedUi ? '복사됨! (UI+모션)' : 'UI+모션 값 복사'}</button>
            <button onClick={() => { setUiCfg({ ...UI_DEFAULT }); localStorage.setItem('paleoUiTs', String(Date.now())) }} style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: '#cbb89a', fontSize: 13 }}>초기화</button>
          </div>
          <div style={{ fontSize: 10, color: '#8a7758', marginTop: 6 }}>버튼이 안 되면 아래 칸 눌러 전체선택→복사:</div>
          <textarea readOnly onClick={e => e.target.select()} value={JSON.stringify({ motion: motCfg, ui: uiCfg })} style={{ width: '100%', height: 44, marginTop: 3, fontSize: 9, background: '#1a1206', color: '#c9b596', border: '1px solid #4a3822', borderRadius: 5, resize: 'none', boxSizing: 'border-box' }} />
          <div style={{ marginTop: 6 }}>
          </div>
        </div>
      )}
    </div>
  )
}

const GOLD = '#e8b962'
const GOLD_D = '#a9762f'
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
  shoprowmin: 46, shopic: 43, shopic0: 44, shopic1: 57, shopic2: 43, shoptfz: 13, shopsubfz: 11, shopbw: 1, shopbh: 36, shopbbv: 0, shopbbh: 21, shopbfz: 10, shopgem: 12,
  gainic: 14, gainpv: 0, gainph: 6,
  gbtnfz: 13, gbtnpw: 16, gbtnph: 10,
  alwinw: 300, alnamefz: 16, alimg: 120, alstatfz: 12, albtnw: 92, albtnh: 30, albtnfz: 13, alclosesz: 26, alclosefz: 14,
  alwinX: 0, alwinY: 0, alnameX: 0, alnameY: 0, alimgX: 0, alimgY: 0, alstatX: 0, alstatY: 0, albtnX: 0, albtnY: 0, alcloseX: 0, alcloseY: 0,
  evochrhunter1: 89, evochrhunter1X: 8, evochrhunter1Y: -8,
  evochrhunter2: 89, evochrhunter2X: 8, evochrhunter2Y: -8,
  evochrhunter3: 89, evochrhunter3X: 8, evochrhunter3Y: -8,
  evochrhunter4: 89, evochrhunter4X: 6, evochrhunter4Y: -8,
  evochrhunter5: 87, evochrhunter5X: 2, evochrhunter5Y: -8,
  evochrshaman1: 87, evochrshaman1X: 8, evochrshaman1Y: -2,
  evochrshaman2: 87, evochrshaman2X: 10, evochrshaman2Y: -2,
  evochrshaman3: 89, evochrshaman3X: 10, evochrshaman3Y: -4,
  evochrshaman4: 89, evochrshaman4X: -2, evochrshaman4Y: -4,
  evochrshaman5: 86, evochrshaman5X: -2, evochrshaman5Y: -4,
  evochrhealer1: 89, evochrhealer1X: -6, evochrhealer1Y: -5,
  evochrhealer2: 89, evochrhealer2X: -6, evochrhealer2Y: -3,
  evochrhealer3: 89, evochrhealer3X: -6, evochrhealer3Y: -3,
  evochrhealer4: 89, evochrhealer4X: -7, evochrhealer4Y: -3,
  evochrhealer5: 84, evochrhealer5X: -4, evochrhealer5Y: -3,
  evochrgiant1: 89, evochrgiant1X: 6, evochrgiant1Y: -7,
  evochrgiant2: 92, evochrgiant2X: 6, evochrgiant2Y: -5,
  evochrgiant3: 92, evochrgiant3X: 6, evochrgiant3Y: -5,
  evochrgiant4: 92, evochrgiant4X: 4, evochrgiant4Y: -5,
  evochrgiant5: 84, evochrgiant5X: 1, evochrgiant5Y: -3,
  evocell: 78, evonamefz: 11, evofade: 56, evopadb: 0,   // 0이면 마지막 줄이 틀 안쪽 끝에 딱 붙는다 (flex:1+minHeight:0 로 이미 영역이 맞음)               // 동료 탭(caslot/canamefz)과 같은 시작값
  evocellX: -5, evocellY: 17, evonameX: 0, evonameY: 6,
  pbsz: 30, wjfz: 13, caslot: 81, caimg: 50, canamefz: 12, catabfz: 11, cabtnfz: 10, btw: 160, bth: 26, bhpw: 159, bhph: 30, pmw: 70, pmh: 23, pmfz: 11, pgw: 70, pgh: 23, pgfz: 15, hambsz: 26, menufz: 13, hph: 10, hpfz: 10, bossfz: 12, bossh: 39, wavebh: 44, clearfz: 24, navfz: 10, diasz: 10,
  // 위치 이동(px): 요소별 X/Y
  avatarX: 0, avatarY: 0, tabX: -1, tabY: 0, navX: 0, navY: 0, costX: 0, costY: 0, pillX: -1, pillY: 2, iconX: -3, iconY: 1,
  panelX: 0, panelY: 0, rowX: 0, rowY: -7, nameX: -3, nameY: 1, valX: -2, valY: 0, inputX: 0, inputY: 0,
  spX: 0, spY: 0, slotX: 23, slotY: 8, catX: 21, catY: -5, spbarX: 20, spbarY: 1, equipX: -4, equipY: -3, spbarAX: 18, spbarAY: 12,
  spbarBX: 18, spbarBY: 0, spbarCX: 19, spbarCY: -8, nickX: 0, nickY: 0, expX: 0, expY: 0, gainX: 0, gainY: 0,
  hpX: -1, hpY: 1, bossX: 2, bossY: -6, clearX: 0, clearY: 0, waveX: -1, waveY: 0, gachaX: 0, gachaY: 0, eqtierX: -1, eqtierY: 1, eqimgX: 0, eqimgY: 0,
  shoprowX: 0, shoprowY: -11, shopicX: 0, shopicY: 0, shopic0X: -7, shopic0Y: 0, shopic1X: -2, shopic1Y: 0, shopic2X: -2, shopic2Y: 0, shoptX: -5, shoptY: 2, shopsubX: 0, shopsubY: 0,
  shopbX: 1, shopbY: 1, shopbtX: 0, shopbtY: 1, shopgemX: 0, shopgemY: 0, gainicX: 0, gainicY: 0, gaintX: 0, gaintY: 0,
  gbtnX: 0, gbtnY: 0, gbtntX: 0, gbtntY: 0, ggradeX: 0, ggradeY: 0, gtierX: 0, gtierY: 0, gimgX: 0, gimgY: 0, pmX: 0, pmY: 0, pgX: 0, pgY: 0, hambX: 1, hambY: 0, menuX: 0, menuY: 0, btX: 0, btY: -3, bhpX: -1, bhpY: -7, pbX: 0, pbY: 0, wjX: 0, wjY: 0, caslotX: 3, caslotY: 16, caimgX: 0, caimgY: 0, canameX: 0, canameY: 0, catabX: 15, catabY: 14, cabtnX: 0, cabtnY: 0, wtitleX: 0, wtitleY: 1, diaX: 0, diaY: 0, btextX: 0, btextY: 7,
  // 오프라인 보상: 보물상자 + 창(헤더/항목/버튼)
  trsz: 34, offw: 322, offtfz: 14, offnfz: 13, offiw: 56, offih: 50, offgap: 9, offic: 24, offifz: 11, offrfz: 11,
  offbtw: 135, offbth: 51, offbfz: 14, offclw: 100, offclh: 50, offcfz: 15,
  trX: -2, trY: 14, offtX: -1, offtY: 66, offnX: 1, offnY: 76, offitX: -29, offitY: 80, offitiX: 0, offitiY: 6, offvX: 0, offvY: 2, offrX: 0, offrY: -3, offbtX: 0, offbtY: -15, offclX: 2, offclY: -15,
  fuseallw: 94, fuseallh: 26, fuseallfz: 15, fuseallX: -36, fuseallY: -10,
  matchipic: 17, matchipfz: 13, allychipic: 15, allychipfz: 10,
  dtabh: 40, dtabfz: 15, dgradefz: 14, dtitlefz: 17, darrowfz: 26, diconsz: 92, dtierfz: 12, dstatfz: 14, denhh: 48, denhfz: 14, denhic: 22, dequiph: 48, dequipfz: 15, dfuseh: 50, dfusefz: 17, dstepsz: 46, dstepfz: 20,
  skicon: 120, skiconX: 0, skiconY: 0, slicon: 100, sliconX: 0, sliconY: 0,
  advbw: 40, advbh: 20, advbfz: 10,
  advww: 301, advwh: 400,
  advmonkfz: 15, advmonvfz: 13, advregkfz: 15, advregvfz: 13, advrewkfz: 15, advrewvfz: 14, advrewic: 17,
  advibw: 120, advibh: 106, adviw: 100, advih: 88,
  advmbw: 116, advmbh: 48, advrbw: 115, advrbh: 51, advwbw: 247, advwbh: 38,
  advsw: 249, advsh: 71, advsfz: 17, advbarw: 205, advbarh: 19,
  advew: 93, adveh: 34, advefz: 11, advcw: 93, advch: 35, advcfz: 11,
  advwinX: 0, advwinY: 0, adviconX: 0, adviconY: 0, adviconbX: 12, adviconbY: 0,
  advmonbX: 0, advmonbY: 0, advregbX: 0, advregbY: 0, advrewbX: 1, advrewbY: 29,
  advsignX: 0, advsignY: 0, advsigntX: 0, advsigntY: -6, advbarX: 0, advbarY: -7,
  advmonkX: -1, advmonkY: 2, advmonvX: -1, advmonvY: 2, advregkX: -3, advregkY: 2, advregvX: -4, advregvY: 2,
  advrewkX: -28, advrewkY: 0, advrewdX: 0, advrewdY: -1, advrewmX: 0, advrewmY: -1,
  adventerX: 0, adventerY: 4, advcloseX: 0, advcloseY: 4, advtxt0X: 47, advtxt0Y: 1, advtxt1X: 39, advtxt1Y: 1, advtxt2X: 43, advtxt2Y: 2, advtxt3X: 39, advtxt3Y: 1, advtxt4X: 50, advtxt4Y: 1, advtxt5X: 51, advtxt5Y: 2, advtxt6X: 50, advtxt6Y: 2, advtxt7X: 47, advtxt7Y: 2, advbtn0X: 172, advbtn0Y: -13, advbtn1X: 251, advbtn1Y: 0, advbtn2X: 326, advbtn2Y: -5, advbtn3X: 200, advbtn3Y: 27, advbtn4X: 66, advbtn4Y: 11, advbtn5X: 121, advbtn5Y: 4, advbtn6X: 305, advbtn6Y: 36, advbtn7X: 188, advbtn7Y: 0,
  mailsz: 26, questsz: 39, mailboxX: 0, mailboxY: 0, questX: 10, questY: -7,
  matchipX: 23, matchipY: -14, allymatX: -19, allymatY: 14, dtabX: 0, dtabY: 0, dtitleX: 0, dtitleY: 0, darrowX: 0, darrowY: 0, diconX: 0, diconY: 0, dstatX: 0, dstatY: 0, denhX: 0, denhY: 0, dequipX: 0, dequipY: 0, dfusebtnX: 0, dfusebtnY: 0, dstepX: 0, dstepY: 0,
}
// 진입창 보스 그림: 종별 개별 크기·위치 (사용자 확정값 2026-07-25)
Object.assign(UI_DEFAULT, {
  // 스킬 탭 재편
  skqbarw: 194, skqbarX: 153, skqbarY: 39, skqslotsz: 29, skqsetw: 16, skqseth: 19, skqsetfz: 8, skqsetX: 149, skqsetY: 46,
  skhtfz: 14, skhtitleX: 25, skhtitleY: 9,
  skfusew: 54, skfuseh: 20, skfusefz: 12, skfuseX: -24, skfuseY: 11, sklearnw: 59, sklearnh: 19, sklearnfz: 10, sklearnX: -24, sklearnY: 12,
  skcellsz: 57, skcellgap: 31, skcellrgap: 13, skcellX: -1, skcellY: -4,
  skimgsz: 44, skimgX: 0, skimgY: 0,
  sknamefz: 12, sknameX: 0, sknameY: 0,
  skbarX: 1, skbarY: 0,
  skdiconsz: 88, skdiconX: 0, skdiconY: 0,
  profherow: 116, profheroh: 150, profherozoom: 100, profheroX: 0, profheroY: 0,
  profstatfz: 12, profcurfz: 12, profcuric: 17, profgearsz: 56, profsecfz: 13,
  skdtitlefz: 18, skdtitleX: 0, skdtitleY: 0,
  skddescfz: 13, skddescX: 0, skddescY: 0,
  skdefffz: 15, skdeffectX: 0, skdeffectY: 0,
  skdstatfz: 14, skdstatX: 0, skdstatY: 0,
  skdautofz: 12, skdautoX: 0, skdautoY: 0,
  skdbtnh: 48, skdbtnfz: 15, skdenhX: 0, skdenhY: 0, skdequipX: 0, skdequipY: 0,
  // 퀘스트창
  qww: 340, qwh: 540, qwinX: 0, qwinY: 0,
  qtitlefz: 20, qtitleX: 0, qtitleY: 0, qclsz: 30, qcloseX: 0, qcloseY: 0,
  qtabw: 92, qtabh: 30, qtabfz: 12, qtabX: 0, qtabY: 0,
  qrowh: 64, qrowX: 0, qrowY: 0, qiconsz: 40, qiconX: 0, qiconY: 0,
  qnamefz: 14, qnameX: 0, qnameY: 0,
  qbarw: 150, qbarh: 14, qbarX: 0, qbarY: 0, qbarfz: 10, qbartX: 0, qbartY: 0,
  qreww: 46, qrewh: 37, qrewX: 3, qrewY: 0,
  qrewisz: 18, qrewiX: 0, qrewiY: 2, qrewvfz: 12, qrewvX: 1, qrewvY: 1, qlvfz: 7, qlvX: -3, qlvY: -6,
  advicotrexw: 141, advicotrexh: 254, advicotrexX: -3, advicotrexY: 0,
  advicospinow: 131, advicospinoh: 97, advicospinoX: 5, advicospinoY: -7,
  advicotrikew: 133, advicotrikeh: 93, advicotrikeX: 6, advicotrikeY: 0,
  advicostegow: 131, advicostegoh: 105, advicostegoX: 0, advicostegoY: -9,
  advicoraptorw: 302, advicoraptorh: 92, advicoraptorX: -11, advicoraptorY: -5,
  advicoankyw: 142, advicoankyh: 103, advicoankyX: 6, advicoankyY: -18,
  advicopteraw: 195, advicopterah: 201, advicopteraX: 21, advicopteraY: -16,
  advicobrachiow: 135, advicobrachioh: 115, advicobrachioX: 0, advicobrachioY: -5,
})
// 사용자 확정 UI 값 (2026-08-01 최신) — 맨 뒤에서 덮어써 우선 적용

// 이벤트 던전 (버튼 + 창)
Object.assign(UI_DEFAULT, {
  evbtnw: 45, evbtnh: 48, evbtnX: 0, evbtnY: 0,          // 던전 버튼 틀
  evbtntfz: 9, evbtntX: 1, evbtntY: 0,                  // 팻말 글씨 '이벤트 던전'
  evww: 340, evwh: 540, evwinX: 0, evwinY: 0,            // 던전 창
  evtitlefz: 20, evtitleX: 0, evtitleY: 0,
  evclsz: 30, evcloseX: 0, evcloseY: 0,
  evtabw: 60, evtabh: 30, evtabfz: 13, evtabX: 0, evtabY: 0,
  evprevh: 120, evprevX: 0, evprevY: 0,
  evnamefz: 15, evnameX: 0, evnameY: 0,
  evrowh: 46, evrowX: 0, evrowY: 0,
  evnosz: 30, evnoX: 0, evnoY: 0,
  evbnamefz: 13, evbnameX: 0, evbnameY: 0,
  evgow: 54, evgoh: 26, evgofz: 12, evgoX: 0, evgoY: 0,
  evprevzoom: 100, evprevimgX: 0, evprevimgY: 0,        // 배경 틀 안쪽 그림 (크기%·위치)
  evnoimgsz: 28, evnoimgX: 0, evnoimgY: 0,              // 번호 칸 안 보스 그림
})

// 틀 안쪽 그림 전용 크기·위치 키 (틀 크기와 독립)
Object.assign(UI_DEFAULT, {
  skdimgsz: 88, skdimgX: 0, skdimgY: 0,          // 스킬 상세창 아이콘 틀 안쪽 그림
  avafacesz: 26, avafaceX: 0, avafaceY: 0,       // 상단 아바타 버튼 안쪽 히어로 그림
  profheroimgX: 0, profheroimgY: 0,              // 프로필 상세창 사진 (크기는 profherozoom)
})
// 사용자 확정 UI 값 (2026-07-31 최신) — 맨 뒤에서 덮어써 우선 적용
Object.assign(UI_DEFAULT, {
  panelbwV: 2, panelbwH: 4, rowbwV: 2, rowbwH: 19, rowmin: 38, rowgap: 7, icon: 27, name: 12, lv: 11, val: 12, costw: 35, costh: 28,
  costfz: 14, inputw: 43, inputfz: 12, spw: 35, sph: 4, spfz: 13, tabpt: 7, tabpb: 10, tabfz: 13, navicon: 26, navpt: 10, navpb: 8,
  avatar: 40, slotmax: 50, equipcols: 5, equipgap: 14, slotfz: 23, catfz: 13, spbarfz: 11, equipimg: 60, equiptier: 10, equipcell: 54, nickfz: 15, lvbadgefz: 12,
  exph: 11, pillfz: 72, wavefz: 11, evoimg0: 56, evoimg1: 56, evoimg2: 56, evoimg3: 56, evoimg4: 56, evoimg5: 56, evoimg0X: 0, evoimg0Y: 1, evoimg1X: 0,
  evoimg1Y: 1, evoimg2X: 0, evoimg2Y: 1, evoimg3X: 0, evoimg3Y: 1, evoimg4X: 0, evoimg4Y: 1, evoimg5X: 0, evoimg5Y: 1, gachacell: 62, gachafz: 10, gtierfz: 10,
  gachaimg: 74, gainfz: 10, shoprowmin: 46, shopic: 43, shopic0: 44, shopic1: 57, shopic2: 43, shoptfz: 13, shopsubfz: 11, shopbw: 1, shopbh: 36, shopbbv: 0,
  shopbbh: 21, shopbfz: 10, shopgem: 12, gainic: 14, gainpv: 0, gainph: 6, gbtnfz: 13, gbtnpw: 16, gbtnph: 10, pbsz: 30, wjfz: 13, caslot: 81,
  caimg: 50, canamefz: 12, catabfz: 11, cabtnfz: 10, btw: 160, bth: 26, bhpw: 159, bhph: 27, pmw: 70, pmh: 23, pmfz: 11, pgw: 70,
  pgh: 23, pgfz: 15, hambsz: 26, menufz: 13, hph: 10, hpfz: 10, bossfz: 12, bossh: 39, wavebh: 44, clearfz: 24, navfz: 10, diasz: 10,
  avatarX: 0, avatarY: 0, tabX: -1, tabY: 0, navX: 0, navY: 0, costX: 0, costY: 0, pillX: -1, pillY: 2, iconX: -3, iconY: 1,
  panelX: 0, panelY: 0, rowX: 0, rowY: -7, nameX: -3, nameY: 1, valX: -2, valY: 0, inputX: 0, inputY: 0, spX: 0, spY: 0,
  slotX: 23, slotY: 8, catX: 21, catY: -5, spbarX: 20, spbarY: 1, equipX: -4, equipY: -3, spbarAX: 18, spbarAY: 12, spbarBX: 18, spbarBY: 0,
  spbarCX: 19, spbarCY: -8, nickX: 0, nickY: 0, expX: 0, expY: 0, gainX: 0, gainY: 0, hpX: -1, hpY: 1, bossX: 2, bossY: -6,
  clearX: 0, clearY: 0, waveX: -1, waveY: 0, gachaX: 0, gachaY: 0, eqtierX: -1, eqtierY: 1, eqimgX: 0, eqimgY: 0, shoprowX: 0, shoprowY: -11,
  shopicX: 0, shopicY: 0, shopic0X: -7, shopic0Y: 0, shopic1X: -2, shopic1Y: 0, shopic2X: -2, shopic2Y: 0, shoptX: -5, shoptY: 2, shopsubX: 0, shopsubY: 0,
  shopbX: 1, shopbY: 1, shopbtX: 0, shopbtY: 1, shopgemX: 0, shopgemY: 0, gainicX: 0, gainicY: 0, gaintX: 0, gaintY: 0, gbtnX: 0, gbtnY: 0,
  gbtntX: 0, gbtntY: 0, ggradeX: 0, ggradeY: 0, gtierX: 0, gtierY: 0, gimgX: 0, gimgY: 0, pmX: 0, pmY: 0, pgX: 0, pgY: 0,
  hambX: 1, hambY: 0, menuX: 0, menuY: 0, btX: 0, btY: -3, bhpX: -1, bhpY: -7, pbX: 0, pbY: 0, wjX: 0, wjY: 0,
  caslotX: 3, caslotY: 16, caimgX: 0, caimgY: 0, canameX: 0, canameY: 0, catabX: 15, catabY: 14, cabtnX: 0, cabtnY: 0, wtitleX: 0, wtitleY: 1,
  diaX: 0, diaY: 0, btextX: 0, btextY: 7, trsz: 35, offw: 322, offtfz: 14, offnfz: 13, offiw: 56, offih: 50, offgap: 9, offic: 24,
  offifz: 11, offrfz: 11, offbtw: 135, offbth: 51, offbfz: 14, offclw: 100, offclh: 50, offcfz: 15, trX: -3, trY: 14, offtX: -1, offtY: 66,
  offnX: 1, offnY: 76, offitX: -29, offitY: 80, offitiX: 0, offitiY: 6, offvX: 0, offvY: 2, offrX: 0, offrY: -3, offbtX: 0, offbtY: -15,
  offclX: 2, offclY: -15, fuseallw: 94, fuseallh: 26, fuseallfz: 15, fuseallX: -36, fuseallY: -10, matchipic: 17, matchipfz: 13, allychipic: 15, allychipfz: 10, dtabh: 40,
  dtabfz: 15, dgradefz: 14, dtitlefz: 17, darrowfz: 26, diconsz: 92, dtierfz: 12, dstatfz: 14, denhh: 48, denhfz: 14, denhic: 22, dequiph: 48, dequipfz: 15,
  dfuseh: 50, dfusefz: 17, dstepsz: 46, dstepfz: 20, skicon: 120, skiconX: 0, skiconY: 0, slicon: 100, sliconX: 0, sliconY: 0, advbw: 40, advbh: 20,
  advbfz: 10, advww: 301, advwh: 400, advmonkfz: 15, advmonvfz: 13, advregkfz: 15, advregvfz: 13, advrewkfz: 15, advrewvfz: 14, advrewic: 17, advibw: 120, advibh: 106,
  adviw: 100, advih: 88, advmbw: 116, advmbh: 48, advrbw: 115, advrbh: 51, advwbw: 247, advwbh: 38, advsw: 249, advsh: 71, advsfz: 17, advbarw: 205,
  advbarh: 19, advew: 93, adveh: 34, advefz: 11, advcw: 93, advch: 35, advcfz: 11, advwinX: 0, advwinY: 0, adviconX: 0, adviconY: 0, adviconbX: 12,
  adviconbY: 0, advmonbX: 0, advmonbY: 0, advregbX: 0, advregbY: 0, advrewbX: 1, advrewbY: 29, advsignX: 0, advsignY: 0, advsigntX: 0, advsigntY: -6, advbarX: 0,
  advbarY: -7, advmonkX: -1, advmonkY: 2, advmonvX: -1, advmonvY: 2, advregkX: -3, advregkY: 2, advregvX: -4, advregvY: 2, advrewkX: -28, advrewkY: 0, advrewdX: 0,
  advrewdY: -1, advrewmX: 0, advrewmY: -1, adventerX: 0, adventerY: 4, advcloseX: 0, advcloseY: 4, advtxt0X: 47, advtxt0Y: 1, advtxt1X: 39, advtxt1Y: 1, advtxt2X: 43,
  advtxt2Y: 2, advtxt3X: 39, advtxt3Y: 1, advtxt4X: 50, advtxt4Y: 1, advtxt5X: 51, advtxt5Y: 2, advtxt6X: 50, advtxt6Y: 2, advtxt7X: 47, advtxt7Y: 2, advbtn0X: 172,
  advbtn0Y: -13, advbtn1X: 251, advbtn1Y: 0, advbtn2X: 326, advbtn2Y: -5, advbtn3X: 200, advbtn3Y: 27, advbtn4X: 66, advbtn4Y: 11, advbtn5X: 121, advbtn5Y: 4, advbtn6X: 305,
  advbtn6Y: 36, advbtn7X: 188, advbtn7Y: 0, mailsz: 26, questsz: 39, mailboxX: 0, mailboxY: 0, questX: 9, questY: -7, matchipX: 23, matchipY: -14, allymatX: -19,
  allymatY: 14, dtabX: 0, dtabY: 0, dtitleX: 0, dtitleY: 0, darrowX: 0, darrowY: 0, diconX: 0, diconY: 0, dstatX: 0, dstatY: 0, denhX: 0,
  denhY: 0, dequipX: 0, dequipY: 0, dfusebtnX: 0, dfusebtnY: 0, dstepX: 0, dstepY: 0, skqbarw: 194, skqbarX: 153, skqbarY: 39, skqslotsz: 29, skqsetw: 16,
  skqseth: 19, skqsetfz: 8, skqsetX: 149, skqsetY: 46, skhtfz: 14, skhtitleX: 25, skhtitleY: 9, skfusew: 54, skfuseh: 20, skfusefz: 12, skfuseX: -24, skfuseY: 11,
  sklearnw: 60, sklearnh: 20, sklearnfz: 11, sklearnX: -24, sklearnY: 11, skcellsz: 49, skcellgap: 38, skcellrgap: 0, skcellX: -1, skcellY: -5, skimgsz: 48, skimgX: 1,
  skimgY: 1, sknamefz: 12, sknameX: 0, sknameY: 0, skbarX: 1, skbarY: 0, skdiconsz: 87, skdiconX: 0, skdiconY: 0, profherow: 116, profheroh: 150, profherozoom: 115,
  profheroX: 0, profheroY: 0, profstatfz: 12, profcurfz: 12, profcuric: 17, profgearsz: 56, profsecfz: 13, skdtitlefz: 18, skdtitleX: 0, skdtitleY: 0, skddescfz: 13, skddescX: 0,
  skddescY: 0, skdefffz: 15, skdeffectX: 0, skdeffectY: 0, skdstatfz: 14, skdstatX: 0, skdstatY: 0, skdautofz: 12, skdautoX: 0, skdautoY: 0, skdbtnh: 48, skdbtnfz: 15,
  skdenhX: 0, skdenhY: 0, skdequipX: 0, skdequipY: 0, qww: 340, qwh: 540, qwinX: 0, qwinY: 0, qtitlefz: 20, qtitleX: 0, qtitleY: 0, qclsz: 30,
  qcloseX: 0, qcloseY: 0, qtabw: 92, qtabh: 30, qtabfz: 12, qtabX: 0, qtabY: 0, qrowh: 64, qrowX: 0, qrowY: 0, qiconsz: 40, qiconX: 0,
  qiconY: 0, qnamefz: 14, qnameX: 0, qnameY: 0, qbarw: 150, qbarh: 14, qbarX: 0, qbarY: 0, qbarfz: 10, qbartX: 0, qbartY: 0, qreww: 46,
  qrewh: 37, qrewX: 3, qrewY: 0, qrewisz: 18, qrewiX: 0, qrewiY: 2, qrewvfz: 12, qrewvX: 1, qrewvY: 1, qlvfz: 7, qlvX: -3, qlvY: -6,
  advicotrexw: 141, advicotrexh: 254, advicotrexX: -3, advicotrexY: 0, advicospinow: 131, advicospinoh: 97, advicospinoX: 5, advicospinoY: -7, advicotrikew: 133, advicotrikeh: 93, advicotrikeX: 6, advicotrikeY: 0,
  advicostegow: 131, advicostegoh: 105, advicostegoX: 0, advicostegoY: -9, advicoraptorw: 302, advicoraptorh: 92, advicoraptorX: -11, advicoraptorY: -5, advicoankyw: 142, advicoankyh: 103, advicoankyX: 6, advicoankyY: -18,
  advicopteraw: 195, advicopterah: 201, advicopteraX: 21, advicopteraY: -16, advicobrachiow: 135, advicobrachioh: 115, advicobrachioX: 0, advicobrachioY: -5, evbtnw: 45, evbtnh: 48, evbtnX: 6, evbtnY: 32,
  evbtntfz: 9, evbtntX: 1, evbtntY: 2, evww: 340, evwh: 540, evwinX: 0, evwinY: 0, evtitlefz: 20, evtitleX: 0, evtitleY: 0, evclsz: 30, evcloseX: 0,
  evcloseY: 0, evtabw: 60, evtabh: 30, evtabfz: 13, evtabX: 0, evtabY: 0, evprevh: 120, evprevX: 0, evprevY: 0, evnamefz: 15, evnameX: 0, evnameY: 0,
  evrowh: 46, evrowX: 0, evrowY: 0, evnosz: 26, evnoX: 0, evnoY: 0, evbnamefz: 15, evbnameX: 32, evbnameY: 0, evgow: 54, evgoh: 26, evgofz: 12,
  evgoX: 0, evgoY: 0, evprevzoom: 100, evprevimgX: 0, evprevimgY: 0, evnoimgsz: 57, evnoimgX: 14, evnoimgY: -1, skdimgsz: 88, skdimgX: 0, skdimgY: 0, avafacesz: 31,
  avafaceX: 0, avafaceY: -1, profheroimgX: 3, profheroimgY: -22,
})
const EDIT_GROUPS = {
  avatar: { label: '아바타 틀', size: ['avatar'], pos: 'avatar' },
  avaface: { label: '아바타 안 그림', size: ['avafacesz'], pos: 'avaface' },
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
  alwin: { label: '동료 상세창', size: ['alwinw'], pos: 'alwin' },
  alname: { label: '동료 상세 이름', size: ['alnamefz'], pos: 'alname' },
  alimg: { label: '동료 상세 그림', size: ['alimg'], pos: 'alimg' },
  alstat: { label: '동료 능력치 줄', size: ['alstatfz'], pos: 'alstat' },
  albtn: { label: '동료 상세 버튼', size: ['albtnw', 'albtnh', 'albtnfz'], pos: 'albtn' },
  alclose: { label: '동료 상세 닫기', size: ['alclosesz', 'alclosefz'], pos: 'alclose' },
  evocell: { label: '전직 칸', size: ['evocell'], pos: 'evocell' },
  evofade: { label: '전직 아래 흐림', size: ['evofade'] },
  evopadb: { label: '전직 아래 여백', size: ['evopadb'] },
  evoname: { label: '전직 이름', size: ['evonamefz'], pos: 'evoname' },
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
for (const k of DINO_KEYS) EDIT_GROUPS[`advico${k}`] = { label: `보스 그림(${DINO_NAME[k]})`, size: [`advico${k}w`, `advico${k}h`], pos: `advico${k}` }
Object.assign(EDIT_GROUPS, {
  skqbar: { label: '스킬 퀵바(위치)', size: [], pos: 'skqbar' },
  skqslot: { label: '퀵바 슬롯', size: ['skqslotsz'] },
  skqset: { label: '퀵바 세트버튼', size: ['skqsetw', 'skqseth', 'skqsetfz'], pos: 'skqset' },
  skhtitle: { label: '스킬 제목', size: ['skhtfz'], pos: 'skhtitle' },
  skfuse: { label: '합성 버튼', size: ['skfusew', 'skfuseh', 'skfusefz'], pos: 'skfuse' },
  sklearn: { label: '스킬배우기 버튼', size: ['sklearnw', 'sklearnh', 'sklearnfz'], pos: 'sklearn' },
  skcell: { label: '스킬 칸(틀)', size: ['skcellsz', 'skcellgap', 'skcellrgap'], pos: 'skcell' },
  skimg: { label: '스킬 그림', size: ['skimgsz', 'skcellgap', 'skcellrgap'], pos: 'skimg' },
  skname: { label: '스킬 이름', size: ['sknamefz'], pos: 'skname' },
  skbar: { label: '스킬 강화바', size: [], pos: 'skbar' },
  skdicon: { label: '상세 아이콘 틀', size: ['skdiconsz'], pos: 'skdicon' },
  skdimg: { label: '상세 아이콘 그림', size: ['skdimgsz'], pos: 'skdimg' },
  profhero: { label: '프로필 사진 틀', size: ['profherow', 'profheroh'], pos: 'profhero' },
  profheroimg: { label: '프로필 사진 그림', size: ['profherozoom'], pos: 'profheroimg' },
  profstat: { label: '상세-능력치 글자', size: ['profstatfz', 'profsecfz'] },
  profcur: { label: '상세-재화', size: ['profcurfz', 'profcuric'] },
  profgear: { label: '상세-장비칸', size: ['profgearsz'] },
  skdtitle: { label: '상세 제목', size: ['skdtitlefz'], pos: 'skdtitle' },
  skddesc: { label: '상세 설명', size: ['skddescfz'], pos: 'skddesc' },
  skdeffect: { label: '상세 효과칸', size: ['skdefffz'], pos: 'skdeffect' },
  skdstat: { label: '상세 스탯칸', size: ['skdstatfz'], pos: 'skdstat' },
  skdauto: { label: '상세 AUTO', size: ['skdautofz'], pos: 'skdauto' },
  skdenh: { label: '상세 강화버튼', size: ['skdbtnh', 'skdbtnfz'], pos: 'skdenh' },
  skdequip: { label: '상세 장착버튼', size: ['skdbtnh', 'skdbtnfz'], pos: 'skdequip' },
  evbtn: { label: '던전 버튼 틀', size: ['evbtnw', 'evbtnh'], pos: 'evbtn' },
  fevbtn: { label: '피버 버튼 틀', size: ['fevbtnw', 'fevbtnh'], pos: 'fevbtn' },
  fevon: { label: '피버 활성 그림', size: ['fevonzoom'], pos: 'fevon' },
  fevbtnt: { label: '피버 아래 글씨', size: ['fevbtntfz'], pos: 'fevbtnt' },
  evbtnt: { label: '팻말 글씨', size: ['evbtntfz'], pos: 'evbtnt' },
  evwin: { label: '던전 창', size: ['evww', 'evwh'], pos: 'evwin' },
  evtitle: { label: '던전 창 제목', size: ['evtitlefz'], pos: 'evtitle' },
  evclose: { label: '던전 창 닫기', size: ['evclsz'], pos: 'evclose' },
  evtab: { label: '던전 탭', size: ['evtabw', 'evtabh', 'evtabfz'], pos: 'evtab' },
  evprev: { label: '던전 배경 틀', size: ['evprevh'], pos: 'evprev' },
  evprevimg: { label: '던전 배경 그림', size: ['evprevzoom'], pos: 'evprevimg' },
  evnoimg: { label: '보스 그림', size: ['evnoimgsz'], pos: 'evnoimg' },
  evname: { label: '던전 이름', size: ['evnamefz'], pos: 'evname' },
  evrow: { label: '보스 줄', size: ['evrowh'], pos: 'evrow' },
  evno: { label: '보스 그림 자리', size: ['evnosz'], pos: 'evno' },
  evbname: { label: '보스 이름', size: ['evbnamefz'], pos: 'evbname' },
  evgo: { label: '도전 버튼', size: ['evgow', 'evgoh', 'evgofz'], pos: 'evgo' },
  warn: { label: '경고 문구(WARNING)', size: ['warnfz'], pos: 'warn' },
  evpwin: { label: '도전창 틀', size: ['evpww', 'evpwh'], pos: 'evpwin' },
  evptitle: { label: '도전창 던전이름', size: ['evptitlefz'], pos: 'evptitle' },
  evpimg: { label: '도전창 보스그림', size: ['evpimgw', 'evpimgh'], pos: 'evpimg' },
  evpbn: { label: '도전창 보스이름', size: ['evpbnfz'], pos: 'evpbn' },
  evprew: { label: '도전창 보상', size: ['evprewfz', 'evprewic'], pos: 'evprew' },
  evpsign: { label: '도전창 표지판', size: ['evpsw', 'evpsh'], pos: 'evpsign' },
  evpsignt: { label: '도전창 단계 글자', size: ['evpsfz'], pos: 'evpsignt' },
  evpbar: { label: '도전창 10칸 바', size: ['evpbarw', 'evpbarh'], pos: 'evpbar' },
  evpenter: { label: '도전창 진입 버튼', size: ['evpew', 'evpeh', 'evpefz'], pos: 'evpenter' },
  evpclose: { label: '도전창 닫기 버튼', size: ['evpcw', 'evpch', 'evpcfz'], pos: 'evpclose' },
  evexit: { label: '던전 나가기 버튼', size: ['evexitw', 'evexith', 'evexitfz'], pos: 'evexit' },
  advexit: { label: '모험 나가기 버튼', size: ['advexitw', 'advexith', 'advexitfz'], pos: 'advexit' },
  wbexit: { label: '보스전 나가기 버튼', size: ['wbexitw', 'wbexith', 'wbexitfz'], pos: 'wbexit' },
  shoptab: { label: '상점 탭', size: ['shoptabw', 'shoptabh', 'shoptabfz'], pos: 'shoptab' },
  shopad: { label: '광고 뽑기 버튼', size: ['shopadw', 'shopadh'], pos: 'shopad' },
  shopadt: { label: '광고 버튼 글씨', size: ['shopadfz'], pos: 'shopadt' },
  shoptabt: { label: '상점 탭 글씨', size: ['shoptabfz'], pos: 'shoptabt' },
  cardwin: { label: '카드결과 창', size: ['cardww', 'cardwh', 'cardgap'], pos: 'cardwin' },
  cardtitle: { label: '카드결과 제목', size: ['cardtfz'], pos: 'cardtitle' },
  cardcell: { label: '카드 그림 틀', size: ['cardcw', 'cardch'], pos: 'cardcell' },
  cardname: { label: '카드 스킬이름', size: ['cardnfz'], pos: 'cardname' },
  cardcnt: { label: '카드 개수 글자', size: ['cardcfz'], pos: 'cardcnt' },
  cardclose: { label: '카드결과 확인버튼', size: ['cardclw', 'cardclh', 'cardclfz'], pos: 'cardclose' },
  glvbart: { label: '소환 레벨 바 글자', size: ['glvbtfz'], pos: 'glvbart' },
  qwin: { label: '퀘스트 창', size: ['qww', 'qwh'], pos: 'qwin' },
  qtitle: { label: '퀘스트 제목', size: ['qtitlefz'], pos: 'qtitle' },
  qclose: { label: '퀘스트 닫기', size: ['qclsz'], pos: 'qclose' },
  qtab: { label: '퀘스트 탭', size: ['qtabw', 'qtabh', 'qtabfz'], pos: 'qtab' },
  qrow: { label: '퀘스트 행', size: ['qrowh'], pos: 'qrow' },
  qicon: { label: '퀘스트 행 아이콘', size: ['qiconsz'], pos: 'qicon' },
  qname: { label: '퀘스트 이름', size: ['qnamefz'], pos: 'qname' },
  qbar: { label: '퀘스트 진행바', size: ['qbarw', 'qbarh'], pos: 'qbar' },
  qbart: { label: '진행바 글자', size: ['qbarfz'], pos: 'qbart' },
  qrew: { label: '보상 버튼', size: ['qreww', 'qrewh'], pos: 'qrew' },
  qrewi: { label: '보상 아이콘', size: ['qrewisz'], pos: 'qrewi' },
  qrewv: { label: '보상 숫자', size: ['qrewvfz'], pos: 'qrewv' },
  qlv: { label: '퀘스트 레벨', size: ['qlvfz'], pos: 'qlv' },
})
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
  pmw: '알약 너비', pmh: '알약 높이', pmfz: '알약 글자', pgw: '알약 너비', pgh: '알약 높이', pgfz: '알약 글자', hambsz: '버튼 크기', skicon: '아이콘 크기%', slicon: '아이콘 크기%', advbw: '버튼 너비', advbh: '버튼 높이', advbfz: '버튼 글자', advww: '창 너비', advwh: '창 높이', adviw: '그림 너비', advih: '그림 높이', advibw: '틀 너비', advibh: '틀 높이', advmbw: '틀 너비', advmbh: '틀 높이', advrbw: '틀 너비', advrbh: '틀 높이', advwbw: '틀 너비', advwbh: '틀 높이', advsw: '표지판 너비', advsh: '표지판 높이', advsfz: '글자 크기', advbarw: '바 너비', advbarh: '바 높이', advmonkfz: '글자 크기', advmonvfz: '글자 크기', advregkfz: '글자 크기', advregvfz: '글자 크기', advrewkfz: '글자 크기', advrewvfz: '숫자 크기', advrewic: '아이콘 크기', advmfz: '글자 크기', advrfz: '글자 크기', advwfz: '글자 크기', advew: '버튼 너비', adveh: '버튼 높이', advefz: '버튼 글자', advcw: '버튼 너비', advch: '버튼 높이', advcfz: '버튼 글자', mailsz: '우편함 크기', questsz: '퀘스트 크기', menufz: '메뉴 글자', pbsz: '버튼 크기', wjfz: '창 글자', caslot: '칸 크기', caimg: '캐릭 크기', canamefz: '이름 글자', evocell: '칸 크기', evonamefz: '이름 글자', evofade: '흐려지는 높이', evopadb: '아래 여백',
  alwinw: '창 너비', alnamefz: '이름 글자', alimg: '그림 크기', alstatfz: '글자 크기', albtnw: '버튼 너비', albtnh: '버튼 높이', albtnfz: '버튼 글자', alclosesz: '버튼 크기', alclosefz: '글자 크기', catabfz: '탭 글자', cabtnfz: '장착 글자', btw: '타이머 너비', bth: '타이머 높이', bhpw: '체력바 너비', bhph: '체력바 높이',
  trsz: '상자 크기', offw: '창 너비', offtfz: '제목 글자', offnfz: '정보 글자', offiw: '항목 너비', offih: '항목 높이', offgap: '항목 간격', offic: '아이콘 크기', offifz: '획득 글자', offrfz: '분당 글자', offbtw: '버튼 너비', offbth: '버튼 높이', offbfz: '버튼 글자', offclw: '버튼 너비', offclh: '버튼 높이', offcfz: '버튼 글자', fuseallw: '융합버튼 너비', fuseallh: '융합버튼 높이', fuseallfz: '융합버튼 글자',
  matchipic: '아이콘 크기', matchipfz: '글자 크기', allychipic: '동료 아이콘', allychipfz: '동료 글자', dtabh: '탭 높이', dtabfz: '탭 글자', dgradefz: '등급 글자', dtitlefz: '이름 글자', darrowfz: '화살표 크기', diconsz: '아이콘틀 크기', dtierfz: '등급표시 글자', dstatfz: '능력치 글자', denhh: '강화버튼 높이', denhfz: '강화버튼 글자', denhic: '강화 재화아이콘', dequiph: '장착버튼 높이', dequipfz: '장착버튼 글자', dfuseh: '융합버튼 높이', dfusefz: '융합버튼 글자', dstepsz: '조절버튼 크기', dstepfz: '수량 글자',
}

for (let __i = 0; __i < 4; __i++) {                          // 상점 줄마다 제목·소환레벨 글씨 따로
  const __n = ['무기', '방어구', '유물', '스킬카드'][__i]
  EDIT_GROUPS[`shopt${__i}`] = { label: `${__n} 소환 제목`, size: [`shopt${__i}fz`], pos: `shopt${__i}` }
  if (__i === 3) {                                          // 스킬 카드 줄 아이콘은 무기 아이콘과 별개
    EDIT_GROUPS.shopic3 = { label: '스킬카드 아이콘', size: ['shopic3w', 'shopic3h'], pos: 'shopic3' }
    UI_LABELS.shopic3w = '아이콘 가로'; UI_LABELS.shopic3h = '아이콘 세로'
    UI_DEFAULT.shopic3w = 43; UI_DEFAULT.shopic3h = 44; UI_DEFAULT.shopic3X = -7; UI_DEFAULT.shopic3Y = 0
  }
  EDIT_GROUPS[`glv${__i}`] = { label: `${__n} 소환레벨 글씨`, size: [`glv${__i}fz`], pos: `glv${__i}` }
  UI_LABELS[`shopt${__i}fz`] = '글자 크기'; UI_LABELS[`glv${__i}fz`] = '글자 크기'
  UI_DEFAULT[`shopt${__i}fz`] = 13; UI_DEFAULT[`shopt${__i}X`] = -5; UI_DEFAULT[`shopt${__i}Y`] = 2
  UI_DEFAULT[`glv${__i}fz`] = 11; UI_DEFAULT[`glv${__i}X`] = -4; UI_DEFAULT[`glv${__i}Y`] = 1
  if (__i < 3) {                                            // 선물상자는 장비 3줄만
    EDIT_GROUPS[`gift${__i}`] = { label: `${__n} 선물상자`, size: [`gift${__i}w`, `gift${__i}h`], pos: `gift${__i}` }
    EDIT_GROUPS[`glvbar${__i}`] = { label: `${__n} 진행바`, size: [`glvbar${__i}w`, `glvbar${__i}h`], pos: `glvbar${__i}` }
    UI_LABELS[`glvbar${__i}w`] = '바 너비'; UI_LABELS[`glvbar${__i}h`] = '바 높이'
    UI_DEFAULT[`glvbar${__i}w`] = 120; UI_DEFAULT[`glvbar${__i}h`] = 11
    UI_DEFAULT[`glvbar${__i}X`] = -5; UI_DEFAULT[`glvbar${__i}Y`] = 0
    UI_LABELS[`gift${__i}w`] = '상자 가로'; UI_LABELS[`gift${__i}h`] = '상자 세로'
    UI_DEFAULT[`gift${__i}w`] = 26; UI_DEFAULT[`gift${__i}h`] = 26
    UI_DEFAULT[`gift${__i}X`] = 0; UI_DEFAULT[`gift${__i}Y`] = 0
  }
}
for (const __ak of ALLY_EVO_KEYS) for (let __s = 1; __s <= ALLY_EVO_MAX; __s++) {   // 전직 캐릭터: 동료×단계 20칸 각각 따로
  const __k2 = `evochr${__ak}${__s}`
  EDIT_GROUPS[__k2] = { label: `전직 ${ALLY_DEFS[__ak].name} ${__s}단계`, size: [__k2], pos: __k2 }
  UI_LABELS[__k2] = '캐릭 크기'
  // 이 루프는 UI_DEFAULT 선언(4103)보다 뒤에서 돌기 때문에 `=`로 쓰면 위에 박아둔 확정값을 덮어쓴다.
  // 위에 값이 있으면 그대로 두고, 없는 키만 기본값을 채운다.
  UI_DEFAULT[__k2] ??= 50; UI_DEFAULT[`${__k2}X`] ??= 0; UI_DEFAULT[`${__k2}Y`] ??= 0
}
for (const __k of SKILLS) {                                  // 카드 안 스킬 아이콘: 스킬마다 가로·세로·위치 따로
  EDIT_GROUPS[`cardic${__k.id}`] = { label: `카드아이콘 ${__k.name}`, size: [`cardic${__k.id}w`, `cardic${__k.id}h`], pos: `cardic${__k.id}` }
  UI_LABELS[`cardic${__k.id}w`] = '아이콘 가로'; UI_LABELS[`cardic${__k.id}h`] = '아이콘 세로'
  UI_DEFAULT[`cardic${__k.id}w`] = 46; UI_DEFAULT[`cardic${__k.id}h`] = 46
  UI_DEFAULT[`cardic${__k.id}X`] = 0; UI_DEFAULT[`cardic${__k.id}Y`] = 0
}
for (let i = 0; i < 6; i++) UI_LABELS[`evoimg${i}`] = `${i + 1}단계 크기`
for (const k of DINO_KEYS) { UI_LABELS[`advico${k}w`] = '그림 너비'; UI_LABELS[`advico${k}h`] = '그림 높이' }
Object.assign(UI_LABELS, {
  skqbarw: '바 너비', skqslotsz: '슬롯 크기', skqsetw: '버튼 너비', skqseth: '버튼 높이', skqsetfz: '버튼 글자',
  skhtfz: '제목 글자', skfusew: '버튼 너비', skfuseh: '버튼 높이', skfusefz: '버튼 글자', sklearnw: '버튼 너비', sklearnh: '버튼 높이', sklearnfz: '버튼 글자',
  skcellsz: '틀 크기', skcellgap: '가로 간격', skcellrgap: '세로 간격', skimgsz: '그림 크기',
  sknamefz: '이름 글자', skplusfz: '뱃지 글자',
  skdiconsz: '아이콘 크기', skdtitlefz: '제목 글자', skddescfz: '설명 글자',
  profherow: '틀 너비', profheroh: '틀 높이', profherozoom: '그림 크기%', skdimgsz: '그림 크기', avafacesz: '그림 크기', profstatfz: '능력치 글자', profcurfz: '재화 글자', profcuric: '재화 아이콘', profgearsz: '장비칸 크기', profsecfz: '제목 글자',
  skdefffz: '효과 글자', skdstatfz: '스탯 글자', skdautofz: 'AUTO 글자', skdbtnh: '버튼 높이', skdbtnfz: '버튼 글자',
  evexitw: '버튼 너비', evexith: '버튼 높이', evexitfz: '글씨 크기',
  advexitw: '버튼 너비', advexith: '버튼 높이', advexitfz: '글씨 크기',
  wbexitw: '버튼 너비', wbexith: '버튼 높이', wbexitfz: '글씨 크기',
  shoptabw: '탭 너비', shoptabh: '탭 높이', shoptabfz: '글씨 크기',
  shopadt: '글씨 크기', shopic0w: '아이콘 가로',
  shopadw: '버튼 너비', shopadh: '버튼 높이', shopadfz: '글씨 크기',
  cardww: '창 너비', cardwh: '창 높이', cardgap: '카드 간격', cardtfz: '글자 크기',
  cardcw: '카드 너비', cardch: '카드 높이', cardnfz: '글자 크기', cardcfz: '글자 크기',
  cardclw: '버튼 너비', cardclh: '버튼 높이', cardclfz: '글씨 크기',
  glvfz: '글자 크기', glvbarw: '바 너비', glvbarh: '바 높이', glvbtfz: '글자 크기',
  warnfz: '글자 크기', evpww: '창 너비', evpwh: '창 높이', evptitlefz: '글자 크기', evpimgw: '그림 너비', evpimgh: '그림 높이',
  evpbnfz: '글자 크기', evprewfz: '글자 크기', evprewic: '아이콘 크기', evpsw: '표지판 너비', evpsh: '표지판 높이', evpsfz: '글자 크기', evpbarw: '바 너비', evpbarh: '바 높이',
  evpew: '버튼 너비', evpeh: '버튼 높이', evpefz: '글씨 크기', evpcw: '버튼 너비', evpch: '버튼 높이', evpcfz: '글씨 크기',
  fevbtnw: '버튼 너비', fevbtnh: '버튼 높이', fevonzoom: '그림 크기%', fevbtntfz: '글씨 크기',
  evbtnw: '버튼 너비', evbtnh: '버튼 높이', evbtntfz: '글씨 크기', evww: '창 너비', evwh: '창 높이', evtitlefz: '제목 글자', evclsz: '버튼 크기',
  evtabw: '탭 너비', evtabh: '탭 높이', evtabfz: '탭 글자', evprevh: '틀 높이', evprevzoom: '그림 크기%', evnoimgsz: '그림 크기', evnamefz: '이름 글자', evrowh: '줄 높이',
  evnosz: '자리 크기', evbnamefz: '이름 글자', evgow: '버튼 너비', evgoh: '버튼 높이', evgofz: '버튼 글자',
  qww: '창 너비', qwh: '창 높이', qtitlefz: '제목 글자', qclsz: '버튼 크기',
  qtabw: '탭 너비', qtabh: '탭 높이', qtabfz: '탭 글자', qrowh: '행 높이',
  qiconsz: '아이콘 크기', qnamefz: '이름 글자', qbarw: '바 너비', qbarh: '바 높이', qbarfz: '바 글자',
  qreww: '버튼 너비', qrewh: '버튼 높이', qrewisz: '아이콘 크기', qrewvfz: '숫자 크기', qlvfz: '레벨 글자',
})
const uiVars = c => `:root{
${[0, 1, 2, 3].map(i => `--pd-shopt${i}fz:${c[`shopt${i}fz`] ?? 13}px;--pd-shopt${i}-x:${c[`shopt${i}X`] ?? -5}px;--pd-shopt${i}-y:${c[`shopt${i}Y`] ?? 2}px;--pd-glv${i}fz:${c[`glv${i}fz`] ?? 11}px;--pd-glv${i}-x:${c[`glv${i}X`] ?? -4}px;--pd-glv${i}-y:${c[`glv${i}Y`] ?? 1}px;` + (i < 3 ? `--pd-gift${i}w:${c[`gift${i}w`] ?? 26}px;--pd-gift${i}h:${c[`gift${i}h`] ?? 26}px;--pd-gift${i}-x:${c[`gift${i}X`] ?? 0}px;--pd-gift${i}-y:${c[`gift${i}Y`] ?? 0}px;--pd-glvbar${i}w:${c[`glvbar${i}w`] ?? 120}px;--pd-glvbar${i}h:${c[`glvbar${i}h`] ?? 11}px;--pd-glvbar${i}-x:${c[`glvbar${i}X`] ?? -5}px;--pd-glvbar${i}-y:${c[`glvbar${i}Y`] ?? 0}px;` : '')).join('')}
${SKILLS.map(k => `--pd-cardic${k.id}w:${c[`cardic${k.id}w`] ?? 46}px;--pd-cardic${k.id}h:${c[`cardic${k.id}h`] ?? 46}px;--pd-cardic${k.id}-x:${c[`cardic${k.id}X`] ?? 0}px;--pd-cardic${k.id}-y:${c[`cardic${k.id}Y`] ?? 0}px;`).join('')}
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
--pd-skqbarw:${c.skqbarw}px;--pd-skqslotsz:${c.skqslotsz}px;--pd-skqsetw:${c.skqsetw}px;--pd-skqseth:${c.skqseth}px;--pd-skqsetfz:${c.skqsetfz}px;--pd-skhtfz:${c.skhtfz}px;--pd-skfusew:${c.skfusew}px;--pd-skfuseh:${c.skfuseh}px;--pd-skfusefz:${c.skfusefz}px;--pd-sklearnw:${c.sklearnw}px;--pd-sklearnh:${c.sklearnh}px;--pd-sklearnfz:${c.sklearnfz}px;--pd-skmasth:${c.skmasth}px;--pd-skmastfz:${c.skmastfz}px;--pd-skcellsz:${c.skcellsz}px;--pd-skcellgap:${c.skcellgap}px;--pd-skcellrgap:${c.skcellrgap}px;--pd-skimgsz:${c.skimgsz}px;--pd-sknamefz:${c.sknamefz}px;--pd-skplusfz:${c.skplusfz}px;--pd-skdiconsz:${c.skdiconsz}px;--pd-skdimgsz:${c.skdimgsz}px;--pd-avafacesz:${c.avafacesz}px;--pd-profherow:${c.profherow}px;--pd-profheroh:${c.profheroh}px;--pd-profherozoom:${c.profherozoom};--pd-profstatfz:${c.profstatfz}px;--pd-profcurfz:${c.profcurfz}px;--pd-profcuric:${c.profcuric}px;--pd-profgearsz:${c.profgearsz}px;--pd-profsecfz:${c.profsecfz}px;--pd-skdtitlefz:${c.skdtitlefz}px;--pd-skddescfz:${c.skddescfz}px;--pd-skdefffz:${c.skdefffz}px;--pd-skdstatfz:${c.skdstatfz}px;--pd-skdautofz:${c.skdautofz}px;--pd-skdbtnh:${c.skdbtnh}px;--pd-skdbtnfz:${c.skdbtnfz}px;--pd-qww:${c.qww}px;--pd-qwh:${c.qwh}px;--pd-qtitlefz:${c.qtitlefz}px;--pd-qclsz:${c.qclsz}px;--pd-qtabw:${c.qtabw}px;--pd-qtabh:${c.qtabh}px;--pd-qtabfz:${c.qtabfz}px;--pd-qrowh:${c.qrowh}px;--pd-qiconsz:${c.qiconsz}px;--pd-qnamefz:${c.qnamefz}px;--pd-qbarw:${c.qbarw}px;--pd-qbarh:${c.qbarh}px;--pd-qbarfz:${c.qbarfz}px;--pd-qreww:${c.qreww}px;--pd-qrewh:${c.qrewh}px;--pd-qrewisz:${c.qrewisz}px;--pd-qrewvfz:${c.qrewvfz}px;--pd-qlvfz:${c.qlvfz}px;--pd-warnfz:${c.warnfz}px;--pd-evpww:${c.evpww}px;--pd-evpwh:${c.evpwh}px;--pd-evptitlefz:${c.evptitlefz}px;--pd-evpimgw:${c.evpimgw}px;--pd-evpimgh:${c.evpimgh}px;--pd-evpbnfz:${c.evpbnfz}px;--pd-evprewfz:${c.evprewfz}px;--pd-evprewic:${c.evprewic}px;--pd-evpsw:${c.evpsw}px;--pd-evpsh:${c.evpsh}px;--pd-evpsfz:${c.evpsfz}px;--pd-evpbarw:${c.evpbarw}px;--pd-evpbarh:${c.evpbarh}px;--pd-evpew:${c.evpew}px;--pd-evpeh:${c.evpeh}px;--pd-evpefz:${c.evpefz}px;--pd-evpcw:${c.evpcw}px;--pd-evpch:${c.evpch}px;--pd-evpcfz:${c.evpcfz}px;--pd-shoptabw:${c.shoptabw}px;--pd-shoptabh:${c.shoptabh}px;--pd-shoptabfz:${c.shoptabfz}px;--pd-cardww:${c.cardww}px;--pd-cardwh:${c.cardwh}px;--pd-cardgap:${c.cardgap}px;--pd-cardtfz:${c.cardtfz}px;--pd-cardcw:${c.cardcw}px;--pd-cardch:${c.cardch}px;--pd-cardnfz:${c.cardnfz}px;--pd-cardcfz:${c.cardcfz}px;--pd-cardclw:${c.cardclw}px;--pd-cardclh:${c.cardclh}px;--pd-cardclfz:${c.cardclfz}px;--pd-shopadw:${c.shopadw}px;--pd-shopadh:${c.shopadh}px;--pd-shopadfz:${c.shopadfz}px;--pd-glvfz:${c.glvfz}px;--pd-glvbarw:${c.glvbarw}px;--pd-glvbarh:${c.glvbarh}px;--pd-glvbtfz:${c.glvbtfz}px;--pd-advexitw:${c.advexitw}px;--pd-advexith:${c.advexith}px;--pd-advexitfz:${c.advexitfz}px;--pd-wbexitw:${c.wbexitw}px;--pd-wbexith:${c.wbexith}px;--pd-wbexitfz:${c.wbexitfz}px;--pd-evexitw:${c.evexitw}px;--pd-evexith:${c.evexith}px;--pd-evexitfz:${c.evexitfz}px;--pd-fevbtnw:${c.fevbtnw}px;--pd-fevbtnh:${c.fevbtnh}px;--pd-fevonzoom:${c.fevonzoom};--pd-fevbtntfz:${c.fevbtntfz}px;--pd-evbtnw:${c.evbtnw}px;--pd-evbtnh:${c.evbtnh}px;--pd-evbtntfz:${c.evbtntfz}px;--pd-evww:${c.evww}px;--pd-evwh:${c.evwh}px;--pd-evtitlefz:${c.evtitlefz}px;--pd-evclsz:${c.evclsz}px;--pd-evtabw:${c.evtabw}px;--pd-evtabh:${c.evtabh}px;--pd-evtabfz:${c.evtabfz}px;--pd-evprevh:${c.evprevh}px;--pd-evnamefz:${c.evnamefz}px;--pd-evrowh:${c.evrowh}px;--pd-evnosz:${c.evnosz}px;--pd-evbnamefz:${c.evbnamefz}px;--pd-evgow:${c.evgow}px;--pd-evgoh:${c.evgoh}px;--pd-evgofz:${c.evgofz}px;--pd-evprevzoom:${c.evprevzoom};--pd-evnoimgsz:${c.evnoimgsz}px;
${DINO_KEYS.map(k => `--pd-advico${k}w:${c['advico' + k + 'w']}px;--pd-advico${k}h:${c['advico' + k + 'h']}px;--pd-advico${k}-x:${c['advico' + k + 'X']}px;--pd-advico${k}-y:${c['advico' + k + 'Y']}px;`).join('')}
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
--pd-gtierfz:${c.gtierfz}px;--pd-gachaimg:${c.gachaimg};--pd-shoprowmin:${c.shoprowmin}px;--pd-shopic:${c.shopic}px;--pd-shopic0:${c.shopic0}px;--pd-shopic0w:${c.shopic0w}px;--pd-shopic3w:${c.shopic3w ?? 43}px;--pd-shopic3h:${c.shopic3h ?? 44}px;--pd-shopic3-x:${c.shopic3X ?? -7}px;--pd-shopic3-y:${c.shopic3Y ?? 0}px;--pd-shopgiftw:${c.shopgiftw}px;--pd-shopgifth:${c.shopgifth}px;--pd-shopic1:${c.shopic1}px;--pd-shopic2:${c.shopic2}px;
--pd-shoptfz:${c.shoptfz}px;--pd-shopsubfz:${c.shopsubfz}px;--pd-shopbw:${c.shopbw}px;--pd-shopbh:${c.shopbh}px;--pd-shopbbv:${c.shopbbv}px;--pd-shopbbh:${c.shopbbh}px;--pd-shopbfz:${c.shopbfz}px;
--pd-gainic:${c.gainic}px;--pd-gainpv:${c.gainpv}px;--pd-gainph:${c.gainph}px;--pd-gainic-x:${c.gainicX}px;--pd-gainic-y:${c.gainicY}px;--pd-gaint-x:${c.gaintX}px;--pd-gaint-y:${c.gaintY}px;--pd-shopgem:${c.shopgem}px;
--pd-gbtnfz:${c.gbtnfz}px;--pd-gbtnpw:${c.gbtnpw}px;--pd-gbtnph:${c.gbtnph}px;
--pd-pmw:${c.pmw}px;--pd-pmh:${c.pmh}px;--pd-pmfz:${c.pmfz}px;--pd-pgw:${c.pgw}px;--pd-pgh:${c.pgh}px;--pd-pgfz:${c.pgfz}px;--pd-hambsz:${c.hambsz}px;--pd-menufz:${c.menufz}px;--pd-pbsz:${c.pbsz}px;--pd-wjfz:${c.wjfz}px;--pd-caslot:${c.caslot}px;--pd-caimg:${c.caimg}px;--pd-canamefz:${c.canamefz}px;--pd-evocell:${c.evocell}px;--pd-evonamefz:${c.evonamefz}px;--pd-evofade:${c.evofade}px;--pd-evopadb:${c.evopadb}px;--pd-alwinw:${c.alwinw}px;--pd-alnamefz:${c.alnamefz}px;--pd-alimg:${c.alimg}px;--pd-alstatfz:${c.alstatfz}px;--pd-albtnw:${c.albtnw}px;--pd-albtnh:${c.albtnh}px;--pd-albtnfz:${c.albtnfz}px;--pd-alclosesz:${c.alclosesz}px;--pd-alclosefz:${c.alclosefz}px;${ALLY_EVO_KEYS.flatMap(k => [1, 2, 3, 4, 5].map(n => `--pd-evochr${k}${n}:${c[`evochr${k}${n}`]}px;--pd-evochr${k}${n}-x:${c[`evochr${k}${n}X`]}px;--pd-evochr${k}${n}-y:${c[`evochr${k}${n}Y`]}px;`)).join('')}--pd-catabfz:${c.catabfz}px;
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
${['tr', 'offt', 'offn', 'offit', 'offiti', 'offv', 'offr', 'offbt', 'offcl', 'fuseall', 'skicon', 'slicon', 'advbtn0', 'advbtn1', 'advbtn2', 'advbtn3', 'advbtn4', 'advbtn5', 'advbtn6', 'advbtn7', 'advtxt0', 'advtxt1', 'advtxt2', 'advtxt3', 'advtxt4', 'advtxt5', 'advtxt6', 'advtxt7', 'advwin', 'advicon', 'adviconb', 'advmonb', 'advregb', 'advrewb', 'advsign', 'advsignt', 'advbar', 'advmonk', 'advmonv', 'advregk', 'advregv', 'advrewk', 'advrewd', 'advrewm', 'adventer', 'advclose', 'mailbox', 'quest', 'shopic0', 'shopic1', 'shopic2', 'matchip', 'allymat', 'dtab', 'dtitle', 'darrow', 'dicon', 'dstat', 'denh', 'dequip', 'dfusebtn', 'dstep', 'qwin', 'qtitle', 'qclose', 'qtab', 'qrow', 'qicon', 'qname', 'qbar', 'qbart', 'qrew', 'qrewi', 'qrewv', 'qlv', 'skhtitle', 'skfuse', 'sklearn', 'skqbar', 'skqset', 'skcell', 'skimg', 'skname', 'skbar', 'skdicon', 'skdimg', 'avaface', 'profheroimg', 'evbtn', 'evbtnt', 'evexit', 'advexit', 'wbexit', 'evocell', 'evoname', 'alwin', 'alname', 'alimg', 'alstat', 'albtn', 'alclose', 'shoptab', 'shoptabt', 'shopad', 'shopadt', 'shopgift', 'cardwin', 'cardtitle', 'cardcell', 'cardname', 'cardcnt', 'cardclose', 'glv', 'glvbar', 'glvbart', 'warn', 'evpwin', 'evptitle', 'evpimg', 'evpbn', 'evprew', 'evpsign', 'evpsignt', 'evpbar', 'evpenter', 'evpclose', 'fevbtn', 'fevon', 'fevbtnt', 'evwin', 'evtitle', 'evclose', 'evtab', 'evprev', 'evprevimg', 'evname', 'evrow', 'evno', 'evbname', 'evgo', 'evnoimg', 'skdtitle', 'skddesc', 'skdeffect', 'skdstat', 'skdauto', 'skdenh', 'skdequip', 'profhero'].map(k => `--pd-${k}-x:${c[k + 'X']}px;--pd-${k}-y:${c[k + 'Y']}px;`).join('')}
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
  // ── 프로필 팝업 ──
  profBox: { position: 'relative', width: 'min(94vw, 400px)', maxHeight: '92%', display: 'flex', flexDirection: 'column', borderRadius: 12, background: 'linear-gradient(180deg,#4a3826,#2e2114)', border: '3px solid #7a5a30', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', overflow: 'hidden', boxSizing: 'border-box' },
  profTabs: { display: 'flex', gap: 4, padding: 8, flexShrink: 0 },
  profTab: { flex: 1, height: 34, fontSize: 14, fontWeight: 800, color: '#a8946e', border: '1px solid #4a3a22', borderRadius: 7, background: 'rgba(0,0,0,0.28)', cursor: 'pointer' },
  profTabOn: { color: '#2a1c0a', border: '1px solid #f0b040', background: 'linear-gradient(180deg,#ffcf5a,#e8992a)' },
  profScroll: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 14px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  profLv: { flexShrink: 0, fontSize: 20, fontWeight: 800, color: '#f0dfae', textShadow: '0 1px 2px #000', marginTop: 4 },
  profNickRow: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, minHeight: 30 },
  profNickTxt: { fontSize: 15, fontWeight: 700, color: '#fff5df' },
  profPencil: { padding: '2px 6px', fontSize: 13, color: '#c9b596', border: '1px solid #5a4630', borderRadius: 6, background: 'rgba(0,0,0,0.3)', cursor: 'pointer' },
  profNickInput: { width: 200, height: 28, fontSize: 15, fontWeight: 700, textAlign: 'center', color: '#fff', background: 'rgba(0,0,0,0.5)', border: '1px solid #d09340', borderRadius: 6, outline: 'none' },
  profHeroWrap: { flexShrink: 0, width: 'var(--pd-profherow)', height: 'var(--pd-profheroh)', margin: '10px auto 0', borderRadius: 10, overflow: 'hidden', transform: 'translate(var(--pd-profhero-x), var(--pd-profhero-y))', border: 'none', boxShadow: '0 3px 10px rgba(0,0,0,0.5)', background: '#1a0f06', position: 'relative' },
  profHeroImg: { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', transform: 'translate(var(--pd-profheroimg-x), var(--pd-profheroimg-y)) scale(calc(var(--pd-profherozoom) / 100))', transformOrigin: 'top center', imageRendering: 'pixelated' },
  profStage: { flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#c9b596', marginTop: 4 },
  profGearRow: { flexShrink: 0, display: 'flex', gap: 8, marginTop: 12, width: '100%', justifyContent: 'center' },
  profGearCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1, maxWidth: 96 },
  profGearLbl: { fontSize: 11, fontWeight: 700, color: '#a8946e' },
  profGearCell: { flexShrink: 0, width: 'var(--pd-profgearsz)', height: 'var(--pd-profgearsz)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #4a3a22', borderRadius: 9, background: 'rgba(0,0,0,0.4)', overflow: 'hidden', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5)' },
  profGearImg: { width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' },
  profGearName: { fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' },
  profSecTitle: { flexShrink: 0, alignSelf: 'stretch', fontSize: 'var(--pd-profsecfz)', fontWeight: 800, color: '#f0dfae', margin: '9px 0 5px', paddingBottom: 4, borderBottom: '1px solid #5a4630' },
  profPanel: { flexShrink: 0, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', borderRadius: 8, background: 'rgba(0,0,0,0.28)', border: '1px solid #4a3822', overflow: 'hidden' },
  profStatRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(90,70,48,0.35)' },
  profStatK: { fontSize: 'var(--pd-profstatfz)', color: '#c9b596' },
  profStatV: { fontSize: 'var(--pd-profstatfz)', fontWeight: 800, color: '#fff5df' },
  profCurV: { fontSize: 'var(--pd-profcurfz)', fontWeight: 800, color: '#fff5df' },
  profCurK: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--pd-profcurfz)', color: '#c9b596' },
  profCurIc: { width: 'var(--pd-profcuric)', height: 'var(--pd-profcuric)', objectFit: 'contain', imageRendering: 'pixelated' },
  avatarWrap: {
    width: 'var(--pd-avatar)', height: 'var(--pd-avatar)', flexShrink: 0, position: 'relative', transform: 'translate(var(--pd-avatar-x), var(--pd-avatar-y))',
    backgroundImage: 'url(/ui/avatar.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avatarFace: { width: 'var(--pd-avafacesz)', height: 'var(--pd-avafacesz)', objectFit: 'cover', objectPosition: 'top', borderRadius: '50%', imageRendering: 'pixelated', transform: 'translate(var(--pd-avaface-x), var(--pd-avaface-y))' },
  nickRow: { display: 'flex', alignItems: 'center', gap: 6, transform: 'translate(var(--pd-nick-x), var(--pd-nick-y))' },
  nick: { fontSize: 'var(--pd-nickfz)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  lvBadge: { fontSize: 'var(--pd-lvbadgefz)', color: GOLD, background: 'linear-gradient(180deg,#3a2a14,#2a1d0d)', border: `1px solid ${GOLD_D}`, padding: '1px 8px', borderRadius: 7, flexShrink: 0 },
  expOuter: { position: 'relative', height: 'var(--pd-exph)', transform: 'translate(var(--pd-exp-x), var(--pd-exp-y))', background: '#0e0a05', borderRadius: 5, overflow: 'hidden', marginTop: 4, border: '1px solid #1e3a5f' },
  expInner: { height: '100%', background: 'linear-gradient(90deg,#1f5fa8,#3f8fd8,#7cc4ff)', transition: 'width 0.2s' },
  expText: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'calc(var(--pd-exph) - 4px)', lineHeight: 1, textShadow: '0 1px 2px #000' },
  currency: { textAlign: 'right', fontSize: 'var(--pd-pillfz)', whiteSpace: 'nowrap', transform: 'translate(var(--pd-pill-x), var(--pd-pill-y))' },
  pillMeat: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end',
    minWidth: 'var(--pd-pmw)', height: 'var(--pd-pmh)', paddingRight: 12, fontSize: 'var(--pd-pmfz)',
    transform: 'translate(var(--pd-pm-x), var(--pd-pm-y))',
    backgroundImage: 'url(/ui/pill_meat.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    textShadow: '0 1px 2px #000',
  },
  pillGem: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end',
    minWidth: 'var(--pd-pgw)', height: 'var(--pd-pgh)', paddingRight: 12, fontSize: 'var(--pd-pgfz)',
    transform: 'translate(var(--pd-pg-x), var(--pd-pg-y))',
    backgroundImage: 'url(/ui/pill_gem.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
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
    background: 'url(/ui/bar_timer.webp) center / 100% 100% no-repeat',
    transform: 'translate(var(--pd-bt-x), var(--pd-bt-y))',
  },
  btTrack: { position: 'absolute', left: '19%', right: '5.5%', top: '30%', bottom: '30%', borderRadius: 4, overflow: 'hidden' },
  btInner: { height: '100%', background: 'linear-gradient(180deg,#7cc4ff,#1f5fa8)', transition: 'width 0.1s linear' },
  bhOuter: {
    position: 'relative', width: 'var(--pd-bhpw)', height: 'var(--pd-bhph)', pointerEvents: 'auto',
    background: 'url(/ui/bar_bosshp.webp) center / 100% 100% no-repeat',
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
    backgroundImage: 'url(/ui/nav_off.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    color: '#9a8768', position: 'relative',
  },
  navActive: { backgroundImage: 'url(/ui/nav_on.webp)', color: GOLD },
  hambBtn: {
    width: 'var(--pd-hambsz)', height: 'var(--pd-hambsz)', flexShrink: 0, padding: 0,
    border: '1px solid #5a4028', borderRadius: 6, background: '#2c2013', color: GOLD,
    fontSize: 'calc(var(--pd-hambsz) - 12px)', lineHeight: 1,
    transform: 'translate(var(--pd-hamb-x), var(--pd-hamb-y))',
  },
  motPanel: {
    position: 'fixed', left: 0, right: 0, bottom: 0, maxWidth: 420, margin: '0 auto', zIndex: 62,
    maxHeight: '52%', overflowY: 'auto', background: 'rgba(14,9,4,0.97)', borderTop: '2px solid #6b4a22',
    padding: '10px 12px 14px', color: '#e8d5b0',
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
  cloudBtn: { flexShrink: 0, padding: '6px 10px', borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: GOLD, fontSize: 12 },
  shopBtn: {
    flexShrink: 0, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 'calc(var(--pd-shopbw) + var(--pd-shopbbh) * 2)', height: 'calc(var(--pd-shopbh) + var(--pd-shopbbv) * 2)',
    border: 'none', borderRadius: 0,
    background: 'url(/ui/nav_off.webp) center / 100% 100% no-repeat',
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
  gachaBtn: {                                               // 소환 결과창 버튼 — 뽑기 버튼과 같은 틀
    padding: 'calc(var(--pd-gbtnph) + 10px) calc(var(--pd-gbtnpw) + 14px)',
    border: 'none', borderRadius: 0,
    background: 'url(/ui/nav_off.webp) center / 100% 100% no-repeat',
    color: '#f3e6d0',
    transform: 'translate(var(--pd-gbtn-x), var(--pd-gbtn-y))',
  },
  gachaBtnText: { display: 'inline-block', fontSize: 'var(--pd-gbtnfz)', transform: 'translate(var(--pd-gbtnt-x), var(--pd-gbtnt-y))' },
  allySubRow: { display: 'flex', gap: 6, padding: '6px 8px 2px', flexShrink: 0, position: 'relative', zIndex: 2 },   // 목록이 길어져도 안 눌리고 위에 고정
  allySubTab: {
    padding: '5px 16px', borderRadius: 7, border: '1px solid #3a2a14', background: 'transparent',
    color: '#b8a888', fontSize: 'var(--pd-catabfz)', transform: 'translate(var(--pd-catab-x), var(--pd-catab-y))',
  },
  allySubOn: { background: '#2c2013', color: GOLD, borderColor: '#5a4028' },
  alWin: {
    position: 'relative', width: 'var(--pd-alwinw)', maxHeight: '86%', overflowY: 'auto',
    transform: 'translate(var(--pd-alwin-x), var(--pd-alwin-y))',
    borderRadius: 14, border: `2px solid ${GOLD_D}`, background: 'linear-gradient(180deg,#2a1d10,#160e06)',
    padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
  },
  alClose: {
    position: 'absolute', top: 6, right: 8,
    width: 'var(--pd-alclosesz)', height: 'var(--pd-alclosesz)', fontSize: 'var(--pd-alclosefz)',
    transform: 'translate(var(--pd-alclose-x), var(--pd-alclose-y))',
    borderRadius: 7, border: '1px solid #6b4a24', background: 'rgba(20,13,7,0.85)',
    color: GOLD, fontWeight: 700, padding: 0, lineHeight: 1, zIndex: 2,
  },
  alName: { fontSize: 'var(--pd-alnamefz)', fontWeight: 800, color: GOLD, transform: 'translate(var(--pd-alname-x), var(--pd-alname-y))' },
  alImg: { height: 'var(--pd-alimg)', objectFit: 'contain', imageRendering: 'pixelated', transform: 'translate(var(--pd-alimg-x), var(--pd-alimg-y))' },
  alLv: { fontSize: 12, color: '#e8d7a8' },
  alBarOuter: { width: '82%', height: 7, borderRadius: 4, border: '1px solid #6b4a24', background: 'rgba(12,8,4,0.8)', overflow: 'hidden' },
  alBarInner: { height: '100%', background: 'linear-gradient(180deg,#e8b962,#a85f1f)' },
  alSecT: { alignSelf: 'flex-start', marginTop: 8, fontSize: 12, fontWeight: 700, color: GOLD_D },
  alRow: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '3px 6px', borderBottom: '1px solid #3a2a14',
    fontSize: 'var(--pd-alstatfz)', transform: 'translate(var(--pd-alstat-x), var(--pd-alstat-y))',
  },
  alRowK: { color: '#cbb89a' },
  alRowV: { color: '#fff', fontWeight: 700 },
  alBtns: { display: 'flex', gap: 8, marginTop: 12 },
  alBtn: {
    width: 'var(--pd-albtnw)', height: 'var(--pd-albtnh)', fontSize: 'var(--pd-albtnfz)',
    transform: 'translate(var(--pd-albtn-x), var(--pd-albtn-y))',
    borderRadius: 8, border: '1px solid #7a5a2a', background: 'linear-gradient(180deg,#4a3520,#2c2013)',
    color: '#f0dfae', fontWeight: 700, padding: 0,
  },
  alHint: { fontSize: 10, color: '#8a7758', marginTop: 6, textAlign: 'center' },
  evoGrid: {
    flex: 1, minHeight: 0,                                   // 남은 높이만 차지 → 목록만 스크롤되고 탭 줄은 그대로
    display: 'grid', gridTemplateColumns: 'repeat(4, var(--pd-evocell))', gap: 8,
    alignContent: 'start',
    justifyContent: 'center', padding: '10px 10px var(--pd-evopadb)', overflowY: 'auto',   // 끝까지 내렸을 때 마지막 줄이 틀에 안 닿게 아래 여백
    // 아래쪽이 잘려 보이지 않게 끝을 흐리게 — 스크롤 컨테이너라 마스크는 화면 가장자리 기준으로 걸린다
    maskImage: `linear-gradient(180deg, #000 calc(100% - var(--pd-evofade)), transparent 100%)`,
    WebkitMaskImage: `linear-gradient(180deg, #000 calc(100% - var(--pd-evofade)), transparent 100%)`,
  },
  evoCell: {
    width: 'var(--pd-evocell)', aspectRatio: '0.82', borderRadius: 10,
    border: '1px solid #5a4028', background: 'linear-gradient(180deg,#22180d,#120b05)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
    transform: 'translate(var(--pd-evocell-x), var(--pd-evocell-y))',
  },
  evoName: { fontSize: 'var(--pd-evonamefz)', color: GOLD, transform: 'translate(var(--pd-evoname-x), var(--pd-evoname-y))' },
  evoImg: { objectFit: 'contain', imageRendering: 'pixelated' },   // 크기·위치는 동료별 변수(--pd-evochr*)로 인라인 지정
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
  splashLoadWrap: {
    position: 'absolute', left: 0, right: 0, bottom: '18%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 10, pointerEvents: 'none',
  },
  splashLoadText: {
    color: '#f0dfae', fontSize: 16, fontWeight: 700, letterSpacing: '0.05em',
    textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)',
  },
  splashBarOuter: {
    width: 200, height: 8, borderRadius: 5, border: '1px solid #6b4a24',
    background: 'rgba(12,8,4,0.75)', overflow: 'hidden',
  },
  splashBarInner: {
    height: '100%', background: 'linear-gradient(180deg,#e8b962,#a85f1f)', transition: 'width 0.2s linear',
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
  advContBtn: { position: 'absolute', width: 'var(--pd-advbw)', height: 'var(--pd-advbh)', padding: 0, border: 'none', background: 'url(/ui/off_header.webp) center / 100% 100% no-repeat', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', boxSizing: 'border-box', paddingRight: '14%', zIndex: 3 },
  advOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.68)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  advWin: {
    position: 'relative', width: 'var(--pd-advww)', height: 'var(--pd-advwh)',
    background: 'url(/ui/adv_frame.webp) center / 100% 100% no-repeat',
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
    background: 'url(/ui/adv_sign.webp) center / 100% 100% no-repeat',
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
  // ── 스킬 퀵바 (히어로 발밑, 8슬롯 가로 드래그 + 3세트, 세트는 슬롯 위) ──
  skqWrap: { position: 'absolute', left: 4, zIndex: 30, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, pointerEvents: 'auto' },
  skqSets: { display: 'flex', gap: 4, flexShrink: 0, transform: 'translate(var(--pd-skqset-x), var(--pd-skqset-y))' },
  skqSlots: { display: 'flex', gap: 4, overflowX: 'auto', overflowY: 'hidden', padding: '3px 4px', width: 'calc(var(--pd-skqslotsz) * 6 + 28px)', flexShrink: 0, borderRadius: 8, background: 'rgba(16,10,5,0.72)', border: '1px solid #5a4630', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.6)', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', cursor: 'grab', touchAction: 'pan-x', transform: 'translate(var(--pd-skqbar-x), var(--pd-skqbar-y))' },
  skqSlot: { flexShrink: 0, width: 'var(--pd-skqslotsz)', height: 'var(--pd-skqslotsz)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: '1.5px solid #6a533a', background: 'rgba(0,0,0,0.4)', overflow: 'hidden', cursor: 'pointer' },
  skqSlotImg: { width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' },
  skqSlotEmpty: { fontSize: 11, fontWeight: 800, color: 'rgba(200,180,140,0.4)' },
  skqSetBtn: { width: 'var(--pd-skqsetw)', height: 'var(--pd-skqseth)', fontSize: 'var(--pd-skqsetfz)', fontWeight: 800, color: '#b7a480', border: '1px solid #4a3a22', borderRadius: 6, background: 'rgba(20,13,7,0.8)', cursor: 'pointer', boxSizing: 'border-box', padding: 0, lineHeight: 1 },
  skqSetOn: { color: '#fff5df', border: '1px solid #d09340', background: 'linear-gradient(180deg,#4a3418,#2c1f0e)', boxShadow: 'inset 0 0 5px rgba(208,147,64,0.4)' },
  // ── 스킬 탭 재편 ──
  skHeadRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 },
  skHeadTitle: { fontSize: 'var(--pd-skhtfz)', fontWeight: 800, color: '#f0dfae', textShadow: '0 1px 2px #000', marginRight: 'auto', transform: 'translate(var(--pd-skhtitle-x), var(--pd-skhtitle-y))' },
  skHeadBtn: { width: 'var(--pd-skfusew)', height: 'var(--pd-skfuseh)', fontSize: 'var(--pd-skfusefz)', fontWeight: 800, color: '#e8dcc0', border: '1px solid #5a4630', borderRadius: 7, background: 'linear-gradient(180deg,#4a3820,#2c1f10)', cursor: 'pointer', boxSizing: 'border-box', lineHeight: 1.1, transform: 'translate(var(--pd-skfuse-x), var(--pd-skfuse-y))' },
  skLearnBtn: { width: 'var(--pd-sklearnw)', height: 'var(--pd-sklearnh)', fontSize: 'var(--pd-sklearnfz)', color: '#2a1c0a', border: '1px solid #f0b040', background: 'linear-gradient(180deg,#ffcf5a,#e8992a)', transform: 'translate(var(--pd-sklearn-x), var(--pd-sklearn-y))' },
  skGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, var(--pd-skcellsz))', justifyContent: 'center', columnGap: 'var(--pd-skcellgap)', rowGap: 'var(--pd-skcellrgap)', width: '100%', boxSizing: 'border-box', padding: '2px 0' },
  skCell: { width: 'var(--pd-skcellsz)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0', boxSizing: 'border-box', cursor: 'pointer', transform: 'translate(var(--pd-skcell-x), var(--pd-skcell-y))' },
  skCellIconWrap: { position: 'relative', width: 'var(--pd-skcellsz)', height: 'var(--pd-skcellsz)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #6a533a', borderRadius: 10, background: 'rgba(0,0,0,0.35)', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.55)', overflow: 'hidden' },
  skCellIconImg: { width: 'var(--pd-skimgsz)', height: 'var(--pd-skimgsz)', objectFit: 'contain', imageRendering: 'pixelated', transform: 'translate(var(--pd-skimg-x), var(--pd-skimg-y))' },
  skCellEq: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1px 0', fontSize: 9, fontWeight: 800, textAlign: 'center', color: '#7ce0ff', background: 'rgba(10,20,30,0.85)', whiteSpace: 'nowrap' },
  skCellBarOuter: { position: 'relative', width: 'var(--pd-skcellsz)', height: 12, borderRadius: 3, overflow: 'hidden', background: 'rgba(0,0,0,0.6)', border: '1px solid #3a2c18', boxSizing: 'border-box', transform: 'translate(var(--pd-skbar-x), var(--pd-skbar-y))' },
  skCellBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, background: 'linear-gradient(180deg,#5ac0ff,#2a80c0)' },
  skCellBarTxt: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', textShadow: '0 1px 1px #000' },
  skCellName: { width: '100%', fontSize: 'var(--pd-sknamefz)', fontWeight: 700, color: '#e6d8bc', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'visible', transform: 'translate(var(--pd-skname-x), var(--pd-skname-y))' },
  // 스킬 상세창
  skdBox: { position: 'relative', width: 'min(92vw, 440px)', padding: '18px 16px 16px', borderRadius: 14, background: 'linear-gradient(180deg,#5a4126,#3a2915)', border: '3px solid #7a5a30', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', boxSizing: 'border-box' },
  skdHead: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  skdIconWrap: { position: 'relative', flexShrink: 0, width: 'var(--pd-skdiconsz)', height: 'var(--pd-skdiconsz)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #d0902a', borderRadius: 12, background: 'rgba(0,0,0,0.4)', overflow: 'hidden', transform: 'translate(var(--pd-skdicon-x), var(--pd-skdicon-y))' },
  skdIconImg: { width: 'var(--pd-skdimgsz)', height: 'var(--pd-skdimgsz)', objectFit: 'contain', imageRendering: 'pixelated', transform: 'translate(var(--pd-skdimg-x), var(--pd-skdimg-y))' },
  skdLv: { position: 'absolute', bottom: 14, left: 2, padding: '1px 5px', fontSize: 11, fontWeight: 800, color: '#ffe08a', background: 'rgba(20,12,4,0.9)', border: '1px solid #7a5a30', borderRadius: 5 },
  skdMiniBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 13, background: 'rgba(0,0,0,0.7)', overflow: 'hidden' },
  skdMiniFill: { position: 'absolute', left: 0, top: 0, bottom: 0, background: 'linear-gradient(180deg,#5ac0ff,#2a80c0)' },
  skdMiniTxt: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' },
  skdHeadMid: { flex: 1, minWidth: 0, paddingTop: 2 },
  skdTitle: { fontSize: 'var(--pd-skdtitlefz)', fontWeight: 800, color: '#fff5df', textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-skdtitle-x), var(--pd-skdtitle-y))' },
  skdDesc: { marginTop: 4, fontSize: 'var(--pd-skddescfz)', color: '#cbb894', lineHeight: 1.4, transform: 'translate(var(--pd-skddesc-x), var(--pd-skddesc-y))' },
  skdAuto: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', fontSize: 'var(--pd-skdautofz)', fontWeight: 800, color: '#9fb0c0', border: 'none', background: 'transparent', cursor: 'pointer', transform: 'translate(var(--pd-skdauto-x), var(--pd-skdauto-y))' },
  skdAutoOn: { color: '#4aa8ff' },
  skdAutoDot: { width: 30, height: 16, borderRadius: 9, background: '#4a4a4a', position: 'relative', transition: 'background 0.15s' },
  skdAutoDotOn: { background: '#2a80f0' },
  skdEffect: { marginTop: 14, padding: '14px 14px', fontSize: 'var(--pd-skdefffz)', color: '#e8dcc4', lineHeight: 1.5, textAlign: 'center', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid #4a3822', transform: 'translate(var(--pd-skdeffect-x), var(--pd-skdeffect-y))' },
  skdStatRow: { display: 'flex', gap: 10, marginTop: 12 },
  skdStat: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.28)', border: '1px solid #4a3822', transform: 'translate(var(--pd-skdstat-x), var(--pd-skdstat-y))' },
  skdStatK: { fontSize: 'var(--pd-skdstatfz)', color: '#b8a684', fontWeight: 700 },
  skdStatV: { fontSize: 'var(--pd-skdstatfz)', color: '#fff', fontWeight: 800 },
  // ── 스킬 효과 설정 (상세창) ──
  skdCfgBox: { margin: '4px 0 8px', padding: '6px 8px', borderRadius: 8, background: 'rgba(0,0,0,0.25)', border: '1px solid #4a3822', display: 'flex', flexDirection: 'column', gap: 4 },
  skdCfgRow: { display: 'flex', alignItems: 'center', gap: 6 },
  skdCfgK: { width: 52, flexShrink: 0, fontSize: 12, color: '#c9b596' },
  skdCfgV: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#fff5df' },
  skdCfgBtn: { width: 28, height: 26, flexShrink: 0, borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: GOLD, fontSize: 15, lineHeight: 1, padding: 0, cursor: 'pointer' },
  skdCfgTog: { flex: 1, height: 26, borderRadius: 6, border: '1px solid #4a3a22', background: '#2c2013', color: '#cbb89a', fontSize: 12, fontWeight: 700, padding: 0, cursor: 'pointer' },
  skdCfgTogOn: { border: `1px solid ${GOLD}`, background: 'linear-gradient(180deg,#d4872e,#a85f1f)', color: '#fff' },
  skdCfgReset: { height: 22, marginTop: 2, borderRadius: 6, border: '1px solid #4a3a22', background: 'transparent', color: '#9c8a6c', fontSize: 11, cursor: 'pointer' },
  skdBtns: { display: 'flex', gap: 10, marginTop: 14 },
  skdEnhBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: 'var(--pd-skdbtnh)', justifyContent: 'center', fontSize: 'var(--pd-skdbtnfz)', fontWeight: 800, color: '#2a1c0a', border: '1px solid #f0b040', borderRadius: 9, background: 'linear-gradient(180deg,#ffcf5a,#e8992a)', cursor: 'pointer', transform: 'translate(var(--pd-skdenh-x), var(--pd-skdenh-y))' },
  skdEnhCost: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 'calc(var(--pd-skdbtnfz) - 1px)' },
  skdEnhIc: { width: 14, height: 14, objectFit: 'contain' },
  // 장착(미장착 상태) = 파랑 / 해제(장착 중) = 갈색 — 서로 맞바꿈
  skdEquipBtn: { flex: 1, height: 'var(--pd-skdbtnh)', fontSize: 'var(--pd-skdbtnfz)', fontWeight: 800, color: '#7ce0ff', border: '1px solid #2f8fb0', borderRadius: 9, background: 'linear-gradient(180deg,#2a5568,#1a3542)', cursor: 'pointer', transform: 'translate(var(--pd-skdequip-x), var(--pd-skdequip-y))' },
  skdEquipOn: { color: '#e8dcc0', border: '1px solid #5a4630', background: 'linear-gradient(180deg,#4a3820,#2c1f10)' },
  // ── 퀘스트창 ──
  // ── 이벤트 던전 ──
  evBtn: {                                                  // 팻말 버튼 (퀘스트 아이콘 아래)
    position: 'absolute', top: 8, right: 8, marginTop: 'var(--pd-questsz)',
    width: 'var(--pd-evbtnw)', height: 'var(--pd-evbtnh)', padding: 0, border: 'none',
    background: 'transparent', cursor: 'pointer', zIndex: 5,
    transform: 'translate(var(--pd-evbtn-x), var(--pd-evbtn-y))',
  },
  evBtnImg: { width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', display: 'block' },
  evBtnText: {                                              // 팻말 빈 판 위 글씨 (판 중앙 = 세로 79%)
    position: 'absolute', left: '49.3%', top: '79.1%', width: '78%',
    transform: 'translate(-50%, -50%) translate(var(--pd-evbtnt-x), var(--pd-evbtnt-y))',
    fontSize: 'var(--pd-evbtntfz)', fontWeight: 800, color: '#f0dfae',
    textShadow: '0 1px 2px #000, 0 0 3px #000', whiteSpace: 'nowrap',
  },
  // ── 피버타임 버튼 (던전 팻말 아래) ──
  fevBtn: {
    position: 'absolute', top: 8, right: 8, marginTop: 'calc(var(--pd-questsz) + var(--pd-evbtnh))',
    width: 'var(--pd-fevbtnw)', height: 'var(--pd-fevbtnh)', padding: 0, border: 'none',
    background: 'transparent', cursor: 'pointer', zIndex: 5,
    transform: 'translate(var(--pd-fevbtn-x), var(--pd-fevbtn-y))',
  },
  fevBtnImg: { width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', display: 'block' },
  fevBtnOn: {                                               // 활성(불꽃) 그림 — 불꽃이 틀 밖으로 삐져나오므로 별도 배율
    position: 'absolute', left: '50%', top: 0,
    width: 'calc(var(--pd-fevbtnw) * var(--pd-fevonzoom) / 100)', height: 'auto',
    transform: 'translateX(-50%) translate(var(--pd-fevon-x), var(--pd-fevon-y))',
    imageRendering: 'pixelated',
  },
  fevBtnText: {                                             // 팻말 아래 작은 글씨
    position: 'absolute', left: '50%', top: '100%', whiteSpace: 'nowrap',
    transform: 'translate(-50%, 0) translate(var(--pd-fevbtnt-x), var(--pd-fevbtnt-y))',
    fontSize: 'var(--pd-fevbtntfz)', fontWeight: 700, color: '#cbb89a',
    textShadow: '0 1px 2px #000, 0 0 3px #000',
  },
  // ── 경고 문구(WARNING) 편집용 미리보기 — 실제 그림은 캔버스 ──
  warnPrev: {
    position: 'absolute', left: '50%', top: '42%', whiteSpace: 'nowrap', pointerEvents: 'auto',
    transform: 'translate(-50%, -50%) translate(var(--pd-warn-x), var(--pd-warn-y))',
    fontSize: 'var(--pd-warnfz)', fontWeight: 800, color: 'rgba(255,70,60,0.9)',
    fontFamily: "'Do Hyeon', sans-serif", textShadow: '0 2px 4px #000', zIndex: 7,
  },
  // ── 이벤트 던전 도전 확인창 ── (던전 목록창보다 위에 떠야 함 → zIndex 55 → 58)
  evpOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.68)', zIndex: 58, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  evpWin: {
    position: 'relative', width: 'var(--pd-evpww)', height: 'var(--pd-evpwh)',
    transform: 'translate(var(--pd-evpwin-x), var(--pd-evpwin-y))',
    background: 'linear-gradient(180deg,#2a1d10,#160f07)', border: `2px solid ${GOLD_D}`, borderRadius: 12,
    padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, overflow: 'hidden',
  },
  evpTitle: {
    flexShrink: 0, fontSize: 'var(--pd-evptitlefz)', fontWeight: 800, color: GOLD,
    transform: 'translate(var(--pd-evptitle-x), var(--pd-evptitle-y))',
  },
  evpImg: {
    flexShrink: 0, width: 'var(--pd-evpimgw)', height: 'var(--pd-evpimgh)', objectFit: 'contain',
    imageRendering: 'pixelated', transform: 'translate(var(--pd-evpimg-x), var(--pd-evpimg-y))',
  },
  evpBname: {
    flexShrink: 0, fontSize: 'var(--pd-evpbnfz)', fontWeight: 700, color: '#f0dfae',
    transform: 'translate(var(--pd-evpbn-x), var(--pd-evpbn-y))',
  },
  evpRew: {
    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 'var(--pd-evprewfz)', color: '#e8d5a8',
    transform: 'translate(var(--pd-evprew-x), var(--pd-evprew-y))',
  },
  evpRewK: { color: '#9c8a6c' },
  evpRewV: { display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 },
  evpRewIc: { width: 'var(--pd-evprewic)', height: 'var(--pd-evprewic)', objectFit: 'contain' },
  evpSign: {                                                // 모험 진입창과 같은 표지판 배경
    flexShrink: 0, marginTop: 'auto', width: 'var(--pd-evpsw)', height: 'var(--pd-evpsh)',
    background: 'url(/ui/adv_sign.webp) center / 100% 100% no-repeat',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
    boxSizing: 'border-box', transform: 'translate(var(--pd-evpsign-x), var(--pd-evpsign-y))',
  },
  evpSignTxt: {
    flexShrink: 0, fontSize: 'var(--pd-evpsfz)', color: '#4a3418', fontWeight: 800,
    transform: 'translate(var(--pd-evpsignt-x), var(--pd-evpsignt-y))',
  },
  evpBar: {
    flexShrink: 0, width: 'var(--pd-evpbarw)', height: 'var(--pd-evpbarh)', display: 'flex', gap: 2,
    transform: 'translate(var(--pd-evpbar-x), var(--pd-evpbar-y))',
  },
  evpBarCell: { flex: 1, background: '#3a2a14', border: '1px solid #5a4028', borderRadius: 2 },
  evpBarFill: { background: 'linear-gradient(180deg,#f0a830,#a85f1f)' },
  evpBtns: { flexShrink: 0, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  evpEnter: {
    width: 'var(--pd-evpew)', height: 'var(--pd-evpeh)', fontSize: 'var(--pd-evpefz)',
    transform: 'translate(var(--pd-evpenter-x), var(--pd-evpenter-y))',
    borderRadius: 8, border: `1px solid ${GOLD_D}`, background: 'linear-gradient(180deg,#d4872e,#a85f1f)',
    color: '#fff', fontWeight: 800, padding: 0,
  },
  evpClose: {
    width: 'var(--pd-evpcw)', height: 'var(--pd-evpch)', fontSize: 'var(--pd-evpcfz)',
    transform: 'translate(var(--pd-evpclose-x), var(--pd-evpclose-y))',
    borderRadius: 8, border: '1px solid #5a4028', background: '#2c2013', color: '#cbb89a', fontWeight: 700, padding: 0,
  },
  // ── 이벤트 던전 전투 HUD ──
  evExitBtn: {
    position: 'absolute', left: 0, top: 0,
    transform: 'translate(var(--pd-evexit-x), var(--pd-evexit-y))',
    width: 'var(--pd-evexitw)', height: 'var(--pd-evexith)', fontSize: 'var(--pd-evexitfz)',
    borderRadius: 6, border: '1px solid #7a5a2a', background: 'linear-gradient(180deg,#4a3520,#2c2013)',
    color: '#f0dfae', fontWeight: 700, zIndex: 6, padding: 0,
  },
  shopTabRow: { display: 'flex', gap: 5, marginBottom: 6, flexShrink: 0 },
  shopTab: {                                                // 영웅 탭(강화/성장/진화)과 같은 이미지 탭
    width: 'var(--pd-shoptabw)', height: 'var(--pd-shoptabh)', fontSize: 'var(--pd-shoptabfz)',
    transform: 'translate(var(--pd-shoptab-x), var(--pd-shoptab-y))',
    border: 'none', background: 'transparent',
    backgroundImage: 'url(/ui/tab_off.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    color: '#b6a488', fontWeight: 700, filter: 'grayscale(0.2)', padding: 0, cursor: 'pointer',
    fontFamily: "'Do Hyeon', sans-serif",
  },
  shopTabOn: { backgroundImage: 'url(/ui/tab_on.webp)', color: '#fff4d8', filter: 'none' },
  shopTabText: { display: 'inline-block', whiteSpace: 'nowrap', transform: 'translate(var(--pd-shoptabt-x), var(--pd-shoptabt-y))' },
  shopAdBtn: {                                              // 광고 무료 뽑기 (광고 미구현) — 뽑기 버튼과 같은 틀
    width: 'var(--pd-shopadw)', height: 'var(--pd-shopadh)',
    transform: 'translate(var(--pd-shopad-x), var(--pd-shopad-y))',
    background: 'url(/ui/nav_off.webp) center / 100% 100% no-repeat', border: 'none',
    padding: 0, flexShrink: 0, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  shopAdText: {
    fontSize: 'var(--pd-shopadfz)', color: '#f3e6d0', fontWeight: 800, lineHeight: 1.25,
    textShadow: '0 1px 2px #000', whiteSpace: 'nowrap',
    transform: 'translate(var(--pd-shopadt-x), var(--pd-shopadt-y))',
  },
  cardResWin: {
    position: 'relative', width: 'var(--pd-cardww)', maxHeight: 'var(--pd-cardwh)',
    transform: 'translate(var(--pd-cardwin-x), var(--pd-cardwin-y))',
    background: 'linear-gradient(180deg,#2a1d10,#160f07)',
    border: `2px solid ${GOLD_D}`, borderRadius: 12, padding: 12,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, overflow: 'hidden',
  },
  cardResTitle: {
    fontSize: 'var(--pd-cardtfz)', fontWeight: 800, color: GOLD, flexShrink: 0,
    transform: 'translate(var(--pd-cardtitle-x), var(--pd-cardtitle-y))',
  },
  cardResGrid: { display: 'flex', flexWrap: 'wrap', gap: 'var(--pd-cardgap)', justifyContent: 'center', overflowY: 'auto' },
  cardResCell: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  cardResFrame: {
    position: 'relative', width: 'var(--pd-cardcw)', height: 'var(--pd-cardch)',
    transform: 'translate(var(--pd-cardcell-x), var(--pd-cardcell-y))',
  },
  cardResImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' },
  cardResIcon: {                                            // 카드 틀 안의 스킬 아이콘 (크기는 스킬별 키)
    // cover: 아이콘마다 제각각인 여백·자체 테두리를 잘라내 틀 안을 균일하게 채운다
    // imageRendering 기본값(부드럽게): 저해상도 아이콘이 픽셀화로 뭉개지는 것 완화
    position: 'absolute', left: '50%', top: '50%',
    objectFit: 'cover', objectPosition: 'center', borderRadius: 6,
  },
  cardResName: {
    fontSize: 'var(--pd-cardnfz)', color: '#e8d5a8', textAlign: 'center', lineHeight: 1.2,
    transform: 'translate(var(--pd-cardname-x), var(--pd-cardname-y))',
  },
  cardResCnt: {
    fontSize: 'var(--pd-cardcfz)', color: GOLD, fontWeight: 700,
    transform: 'translate(var(--pd-cardcnt-x), var(--pd-cardcnt-y))',
  },
  cardResClose: {
    width: 'var(--pd-cardclw)', height: 'var(--pd-cardclh)', fontSize: 'var(--pd-cardclfz)',
    transform: 'translate(var(--pd-cardclose-x), var(--pd-cardclose-y))',
    borderRadius: 8, border: `1px solid ${GOLD_D}`, background: 'linear-gradient(180deg,#d4872e,#a85f1f)',
    color: '#fff', fontWeight: 800, padding: 0, flexShrink: 0,
  },
  shopGift: {                                               // 소환 레벨업 보상 선물상자
    objectFit: 'contain',
    imageRendering: 'pixelated', cursor: 'pointer', flexShrink: 0,
    filter: 'drop-shadow(0 0 6px rgba(255,210,90,0.8))',
  },
  gLvTxt: {                                                 // 상점 소환 레벨
    fontSize: 'var(--pd-glvfz)', color: GOLD, fontWeight: 700, whiteSpace: 'nowrap',
    transform: 'translate(var(--pd-glv-x), var(--pd-glv-y))',
  },
  gLvBar: {
    position: 'relative', width: 'var(--pd-glvbarw)', height: 'var(--pd-glvbarh)',
    transform: 'translate(var(--pd-glvbar-x), var(--pd-glvbar-y))',
    background: '#2a1d10', border: '1px solid #5a4028', borderRadius: 4, overflow: 'hidden',
  },
  gLvFill: { position: 'absolute', left: 0, top: 0, bottom: 0, background: 'linear-gradient(180deg,#f0a830,#a85f1f)' },
  gLvBarTxt: {
    position: 'absolute', left: '50%', top: '50%', whiteSpace: 'nowrap',
    transform: 'translate(-50%, -50%) translate(var(--pd-glvbart-x), var(--pd-glvbart-y))',
    fontSize: 'var(--pd-glvbtfz)', color: '#fff', fontWeight: 700, textShadow: '0 1px 2px #000',
  },
  advExitBtn: {                                             // 모험 나가기 (누르면 일반 웨이브 복귀)
    position: 'absolute', left: 0, top: 0,
    transform: 'translate(var(--pd-advexit-x), var(--pd-advexit-y))',
    width: 'var(--pd-advexitw)', height: 'var(--pd-advexith)', fontSize: 'var(--pd-advexitfz)',
    borderRadius: 6, border: '1px solid #7a5a2a', background: 'linear-gradient(180deg,#4a3520,#2c2013)',
    color: '#f0dfae', fontWeight: 700, zIndex: 6, padding: 0,
  },
  wbExitBtn: {                                              // 웨이브 보스전 나가기 (누르면 같은 웨이브의 일반 웨이브로 복귀)
    position: 'absolute', left: 0, top: 0,
    transform: 'translate(var(--pd-wbexit-x), var(--pd-wbexit-y))',
    width: 'var(--pd-wbexitw)', height: 'var(--pd-wbexith)', fontSize: 'var(--pd-wbexitfz)',
    borderRadius: 6, border: '1px solid #7a5a2a', background: 'linear-gradient(180deg,#4a3520,#2c2013)',
    color: '#f0dfae', fontWeight: 700, zIndex: 6, padding: 0,
  },
  evWin: {
    position: 'relative', width: 'var(--pd-evww)', height: 'var(--pd-evwh)',
    background: 'url(/ui/adv_frame.webp) center / 100% 100% no-repeat',
    padding: '8% 8% 9%', display: 'flex', flexDirection: 'column', gap: 8,
    boxSizing: 'border-box', transform: 'translate(var(--pd-evwin-x), var(--pd-evwin-y))',
  },
  evTitle: { fontSize: 'var(--pd-evtitlefz)', fontWeight: 800, color: '#f0dfae', textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-evtitle-x), var(--pd-evtitle-y))' },
  evCloseBtn: {
    flexShrink: 0, width: 'var(--pd-evclsz)', height: 'var(--pd-evclsz)', borderRadius: 8,
    border: '1px solid #5a4028', background: '#2c2013', color: '#cbb89a', fontSize: 14, lineHeight: 1, padding: 0, cursor: 'pointer',
    transform: 'translate(var(--pd-evclose-x), var(--pd-evclose-y))',
  },
  evTabs: { flexShrink: 0, display: 'flex', gap: 6, justifyContent: 'center' },
  evTabBtn: {
    width: 'var(--pd-evtabw)', height: 'var(--pd-evtabh)', fontSize: 'var(--pd-evtabfz)', fontWeight: 700,
    borderRadius: 7, border: '1px solid #4a3a22', background: '#2c2013', color: '#cbb89a', padding: 0, cursor: 'pointer',
    transform: 'translate(var(--pd-evtab-x), var(--pd-evtab-y))',
  },
  evTabOn: { border: `1px solid ${GOLD}`, background: 'linear-gradient(180deg,#d4872e,#a85f1f)', color: '#fff' },
  evPreview: {                                              // 배경 틀 (크기·위치만)
    flexShrink: 0, position: 'relative', width: '100%', height: 'var(--pd-evprevh)',
    borderRadius: 8, overflow: 'hidden', border: `2px solid ${GOLD}`, background: '#1a0f06',
    transform: 'translate(var(--pd-evprev-x), var(--pd-evprev-y))',
  },
  evPrevImg: {                                              // 틀 안쪽 배경 그림 (독립 크기·위치)
    position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block',
    transform: 'translate(var(--pd-evprevimg-x), var(--pd-evprevimg-y)) scale(calc(var(--pd-evprevzoom) / 100))',
  },
  evName: {
    position: 'absolute', left: 8, bottom: 6, fontSize: 'var(--pd-evnamefz)', fontWeight: 800,
    color: '#f0dfae', textShadow: '0 1px 3px #000, 0 0 4px #000',
    transform: 'translate(var(--pd-evname-x), var(--pd-evname-y))',
  },
  evList: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 },
  evRow: {
    flexShrink: 0, height: 'var(--pd-evrowh)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px',
    borderRadius: 8, background: 'rgba(0,0,0,0.28)', border: '1px solid #4a3822',
    transform: 'translate(var(--pd-evrow-x), var(--pd-evrow-y))',
  },
  evNo: {                                                   // 보스 그림 자리 (원형 테두리·배경 없음 — 누끼 그림만)
    flexShrink: 0, width: 'var(--pd-evnosz)', height: 'var(--pd-evnosz)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transform: 'translate(var(--pd-evno-x), var(--pd-evno-y))',
  },
  evNoImg: {                                                // 번호 칸 안 보스 그림 (독립 크기·위치)
    width: 'var(--pd-evnoimgsz)', height: 'var(--pd-evnoimgsz)', objectFit: 'contain',
    imageRendering: 'pixelated', display: 'block',
    transform: 'translate(var(--pd-evnoimg-x), var(--pd-evnoimg-y))',
  },
  evBossName: { flex: 1, minWidth: 0, fontSize: 'var(--pd-evbnamefz)', fontWeight: 700, color: '#e6d7b0', transform: 'translate(var(--pd-evbname-x), var(--pd-evbname-y))' },
  evGo: {
    flexShrink: 0, width: 'var(--pd-evgow)', height: 'var(--pd-evgoh)', fontSize: 'var(--pd-evgofz)', fontWeight: 700,
    borderRadius: 6, border: `1px solid ${GOLD}`, background: 'linear-gradient(180deg,#d4872e,#a85f1f)', color: '#fff',
    padding: 0, cursor: 'pointer', transform: 'translate(var(--pd-evgo-x), var(--pd-evgo-y))',
  },
  qWin: {
    position: 'relative', width: 'var(--pd-qww)', height: 'var(--pd-qwh)',
    background: 'url(/ui/adv_frame.webp) center / 100% 100% no-repeat',
    padding: '8% 8% 9%', display: 'flex', flexDirection: 'column', gap: 8,
    boxSizing: 'border-box', transform: 'translate(var(--pd-qwin-x), var(--pd-qwin-y))',
  },
  qTitleRow: { flexShrink: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  qTitle: { fontSize: 'var(--pd-qtitlefz)', fontWeight: 800, color: '#f0dfae', textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-qtitle-x), var(--pd-qtitle-y))' },
  qCloseBtn: {
    width: 'var(--pd-qclsz)', height: 'var(--pd-qclsz)', padding: 0, border: 'none', background: 'transparent',
    color: '#e8d8b8', fontSize: 'calc(var(--pd-qclsz) * 0.7)', fontWeight: 800, lineHeight: 1, cursor: 'pointer',
    textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-qclose-x), var(--pd-qclose-y))',
  },
  qTabs: { flexShrink: 0, display: 'flex', gap: 5, justifyContent: 'center' },
  qTabBtn: {
    width: 'var(--pd-qtabw)', height: 'var(--pd-qtabh)', fontSize: 'var(--pd-qtabfz)', fontWeight: 700,
    color: '#a8946e', border: '1px solid #4a3a22', borderRadius: 7,
    background: 'rgba(0,0,0,0.28)', cursor: 'pointer', boxSizing: 'border-box',
    transform: 'translate(var(--pd-qtab-x), var(--pd-qtab-y))',
  },
  qTabOn: { color: '#fff5df', border: '1px solid #d09340', background: 'linear-gradient(180deg,#4a3418,#2c1f0e)', boxShadow: 'inset 0 0 6px rgba(208,147,64,0.35)' },
  qList: { flex: 1, minHeight: 0, width: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, boxSizing: 'border-box', paddingRight: 2 },
  qRow: {
    flexShrink: 0, width: '100%', height: 'var(--pd-qrowh)', display: 'flex', alignItems: 'center', gap: 8,
    padding: '0 8px', boxSizing: 'border-box', border: '2px solid #7a5a30', borderRadius: 9,
    background: 'rgba(0,0,0,0.26)', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5)',
    transform: 'translate(var(--pd-qrow-x), var(--pd-qrow-y))',
  },
  qIconWrap: { flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qIcon: { flexShrink: 0, width: 'var(--pd-qiconsz)', height: 'var(--pd-qiconsz)', objectFit: 'contain', imageRendering: 'pixelated', transform: 'translate(var(--pd-qicon-x), var(--pd-qicon-y))' },
  qLv: { position: 'absolute', top: -4, left: -4, padding: '1px 4px', fontSize: 'var(--pd-qlvfz)', fontWeight: 800, color: '#ffd98a', background: 'rgba(20,12,4,0.9)', border: '1px solid #7a5a30', borderRadius: 5, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-qlv-x), var(--pd-qlv-y))' },
  qRowDone: { opacity: 0.55 },
  qRewOn: { boxShadow: '0 0 8px rgba(240,168,48,0.65), inset 0 1px 0 rgba(255,255,255,0.18)', border: '1px solid #f0a830' },
  qRewOff: { filter: 'grayscale(0.8)', opacity: 0.6, cursor: 'default' },
  qMid: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  qName: { fontSize: 'var(--pd-qnamefz)', fontWeight: 800, color: '#f0dfae', textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-qname-x), var(--pd-qname-y))' },
  qBarOuter: {
    position: 'relative', width: 'var(--pd-qbarw)', height: 'var(--pd-qbarh)', borderRadius: 4, overflow: 'hidden',
    background: 'rgba(0,0,0,0.55)', border: '1px solid #3a2c18', boxSizing: 'border-box',
    transform: 'translate(var(--pd-qbar-x), var(--pd-qbar-y))',
  },
  qBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, background: 'linear-gradient(180deg,#f0a830,#c07818)' },
  qBarTxt: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--pd-qbarfz)', fontWeight: 800, color: '#fff', textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-qbart-x), var(--pd-qbart-y))' },
  qRew: {
    flexShrink: 0, width: 'var(--pd-qreww)', height: 'var(--pd-qrewh)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 2, border: '1px solid #6b4a22', borderRadius: 8,
    background: 'linear-gradient(180deg,#7a5426,#4a3014)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
    cursor: 'pointer', boxSizing: 'border-box', transform: 'translate(var(--pd-qrew-x), var(--pd-qrew-y))',
  },
  qRewIc: { width: 'var(--pd-qrewisz)', height: 'var(--pd-qrewisz)', objectFit: 'contain', transform: 'translate(var(--pd-qrewi-x), var(--pd-qrewi-y))' },
  qRewV: { fontSize: 'var(--pd-qrewvfz)', fontWeight: 800, color: '#fff5df', textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-qrewv-x), var(--pd-qrewv-y))' },
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
  skillFixed: { flexShrink: 0 },
  skillScroll: { flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'var(--pd-rowgap)', padding: '10px 0 10px' },
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
  skillIcon: { width: 'var(--pd-icon)', height: 'var(--pd-icon)', transform: 'translate(var(--pd-icon-x), var(--pd-icon-y))', borderRadius: 8, background: 'linear-gradient(180deg,#2c2013,#1a1208)', border: '1px solid #5a4028', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 },
  canvasWrap: { height: '42%', position: 'relative', minHeight: 220, overflow: 'hidden' },
  statusBar: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px 2px' },
  hpPill: {
    position: 'relative', flex: 1.1, minWidth: 0, height: 'var(--pd-hph)',
    background: 'url(/ui/hp_capsule.webp) center / 100% 100% no-repeat',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transform: 'translate(var(--pd-hp-x), var(--pd-hp-y))',
  },
  hpHeart: { position: 'absolute', left: -7, height: 'calc(var(--pd-hph) + 8px)', zIndex: 1, pointerEvents: 'none' },
  hpTrack: { position: 'absolute', left: '12%', right: '9%', top: '26%', bottom: '28%', overflow: 'hidden', borderRadius: 4 },
  hpFill: { height: '100%', background: 'linear-gradient(180deg,#d94a35,#8e1f14)', transition: 'width 0.15s' },
  hpText: { position: 'relative', paddingLeft: '6%', fontSize: 'var(--pd-hpfz)', textShadow: '0 1px 2px #000', whiteSpace: 'nowrap' },
  waveBanner: {
    flex: 1.5, minWidth: 0, height: 'var(--pd-wavebh)', alignSelf: 'center',
    background: 'url(/ui/wave_banner.webp) center / 100% 100% no-repeat',
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
  tabBtn: {
    flex: 1, padding: 'var(--pd-tabpt) 0 var(--pd-tabpb)', border: 'none', background: 'transparent',
    backgroundImage: 'url(/ui/tab_off.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    color: '#b6a488', fontSize: 'var(--pd-tabfz)', position: 'relative', filter: 'grayscale(0.2)',
  },
  tabActive: {
    backgroundImage: 'url(/ui/tab_on.webp)', backgroundSize: '100% 100%',
    color: '#fff4d8', filter: 'none',
  },
  panel: {
    flex: 1, overflow: 'hidden', minHeight: 0,
    background: 'rgba(20,13,7,0.55)',
    borderStyle: 'solid', borderWidth: 'var(--pd-panelbw-v) var(--pd-panelbw-h)',
    borderImage: 'url(/ui/panel.webp) 29 20 26 19 fill / var(--pd-panelbw-v) var(--pd-panelbw-h) stretch',
    margin: '3px 0 0', padding: '4px 4px 2px', transform: 'translate(var(--pd-panel-x), var(--pd-panel-y))',
    display: 'flex', flexDirection: 'column', gap: 'var(--pd-rowgap)',
  },
  frameBox: {
    flex: 1, minHeight: 0,
    background: 'rgba(20,13,7,0.55)',
    borderStyle: 'solid', borderWidth: 'var(--pd-panelbw-v) var(--pd-panelbw-h)',
    borderImage: 'url(/ui/panel.webp) 29 20 26 19 fill / var(--pd-panelbw-v) var(--pd-panelbw-h) stretch',
    margin: '3px 0 0', padding: '4px 4px 2px', transform: 'translate(var(--pd-panel-x), var(--pd-panel-y))',
    display: 'flex', flexDirection: 'column',
  },
  tabsInner: { display: 'flex', gap: 5, padding: '0 0 5px', flexShrink: 0, transform: 'translate(var(--pd-tab-x), var(--pd-tab-y))' },
  panelInner: { flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 0 12px' },
  row: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'transparent',
    borderStyle: 'solid', borderWidth: 'var(--pd-rowbw-v) var(--pd-rowbw-h)',
    borderImage: 'url(/ui/row.webp) 24 23 24 24 fill / var(--pd-rowbw-v) var(--pd-rowbw-h) stretch',
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
    backgroundImage: 'url(/ui/btn.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
    color: '#fff4d8', fontSize: 'var(--pd-costfz)', flexShrink: 0, textShadow: '0 1px 2px #4a0e0e',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translate(var(--pd-cost-x), var(--pd-cost-y))',
  },
  bossBtn: {
    border: 'none', height: 'var(--pd-bossh)', alignSelf: 'center', aspectRatio: '300 / 135', padding: '0 0 2px 12%',
    background: 'transparent url(/ui/boss_btn.webp) center / 100% 100% no-repeat',
    color: '#ffe0d0', whiteSpace: 'nowrap', lineHeight: 1,
  },
  bossText: { display: 'inline-block', fontSize: 'var(--pd-bossfz)', textShadow: '0 1px 2px #000', transform: 'translate(var(--pd-btext-x), var(--pd-btext-y))' },
  // ── 오프라인 보상: 보물상자 ──
  treasureBtn: { position: 'absolute', left: 6, bottom: 6, width: 'var(--pd-trsz)', height: 'var(--pd-trsz)', padding: 0, border: 'none', background: 'transparent', zIndex: 40, pointerEvents: 'auto', transform: 'translate(var(--pd-tr-x), var(--pd-tr-y))', cursor: 'pointer' },
  treasureImg: { width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))' },
  treasureDot: { position: 'absolute', top: '2%', right: '2%', width: 12, height: 12, borderRadius: '50%', background: '#e23b3b', border: '2px solid #2a1a0c', boxShadow: '0 0 6px #ff5a5a', pointerEvents: 'none' },
  // ── 오프라인 보상: 창 ──
  offWin: { position: 'relative', width: 'var(--pd-offw)', maxWidth: '94%', aspectRatio: '1024 / 1536', background: 'url(/ui/off_frame.webp) center / 100% 100% no-repeat', padding: '9% 9% 8%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '2.5%', boxSizing: 'border-box' },
  offClose: { position: 'absolute', top: '2.5%', right: '4%', width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.35)', color: '#f3e6d0', fontSize: 14, lineHeight: 1, cursor: 'pointer', zIndex: 2, padding: 0 },
  offTitle: { flexShrink: 0, textAlign: 'center', fontSize: 'var(--pd-offtfz)', color: '#f3e6d0', fontWeight: 800, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-offt-x), var(--pd-offt-y))' },
  offInfo: { flexShrink: 0, textAlign: 'center', fontSize: 'var(--pd-offnfz)', color: '#e8d5b0', fontWeight: 700, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-offn-x), var(--pd-offn-y))' },
  offItems: { flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', width: '100%', gap: 'var(--pd-offgap)', marginTop: '2%', transform: 'translate(var(--pd-offit-x), var(--pd-offit-y))' },
  offItem: { position: 'relative', width: 'var(--pd-offiw)', height: 'var(--pd-offih)', background: 'url(/ui/off_item.webp) center / 100% 100% no-repeat', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, flexShrink: 0 },
  offItemIc: { width: 'var(--pd-offic)', height: 'var(--pd-offic)', objectFit: 'contain', transform: 'translate(var(--pd-offiti-x), var(--pd-offiti-y))' },
  offItemVal: { fontSize: 'var(--pd-offifz)', fontWeight: 800, textShadow: '0 1px 2px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-offv-x), var(--pd-offv-y))' },
  offItemRate: { fontSize: 'var(--pd-offrfz)', color: '#c9b596', textShadow: '0 1px 1px #000', whiteSpace: 'nowrap', transform: 'translate(var(--pd-offr-x), var(--pd-offr-y))' },
  offBtns: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4%', marginTop: 'auto' },
  offBtnAd: { width: 'var(--pd-offbtw)', height: 'var(--pd-offbth)', background: 'url(/ui/off_btn.webp) center / 100% 100% no-repeat', border: 'none', color: '#4a2e0e', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, transform: 'translate(var(--pd-offbt-x), var(--pd-offbt-y))' },
  offBtnAdText: { fontSize: 'var(--pd-offbfz)', lineHeight: 1.1, textAlign: 'center', textShadow: '0 1px 1px rgba(255,220,150,0.4)' },
  offBtnClaim: { width: 'var(--pd-offclw)', height: 'var(--pd-offclh)', background: 'url(/ui/off_claim.webp) center / 100% 100% no-repeat', border: 'none', color: '#f0f0f0', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, transform: 'translate(var(--pd-offcl-x), var(--pd-offcl-y))' },
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

// 피버타임 버튼 (2026-08-01 신규) — 사용자 확정값 블록보다 뒤에 둬야 함
Object.assign(UI_DEFAULT, {
  fevbtnw: 54, fevbtnh: 34, fevbtnX: -42, fevbtnY: -19,       // 비활성 팻말 틀 (원본 956x466 비율)
  fevonzoom: 123, fevonX: 0, fevonY: 1,                    // 활성 그림은 불꽃만큼 더 큼
  fevbtntfz: 8, fevbtntX: 0, fevbtntY: -5,                 // '(광고 시청 0/3)'
})

// 이벤트 던전 전투 HUD (2026-08-02 신규)
Object.assign(UI_DEFAULT, {
  warnfz: 40, warnX: 0, warnY: -2,                 // 캔버스 WARNING 문구
  evpww: 300, evpwh: 380, evpwinX: 0, evpwinY: 0,
  evptitlefz: 18, evptitleX: 0, evptitleY: 0,
  evpimgw: 153, evpimgh: 133, evpimgX: 0, evpimgY: 0,
  evpbnfz: 15, evpbnX: 0, evpbnY: 2,
  evprewfz: 15, evprewic: 13, evprewX: 0, evprewY: 4,
  evpsw: 249, evpsh: 71, evpsignX: 0, evpsignY: 0,
  evpsfz: 13, evpsigntX: 0, evpsigntY: -7,
  evpbarw: 238, evpbarh: 15, evpbarX: 0, evpbarY: -5,
  evpew: 83, evpeh: 28, evpefz: 13, evpenterX: 0, evpenterY: 0,
  evpcw: 80, evpch: 29, evpcfz: 13, evpcloseX: 0, evpcloseY: 0,
  evexitw: 48, evexith: 22, evexitfz: 11, evexitX: 7, evexitY: 70,   // 던전 나가기 버튼
  advexitw: 48, advexith: 22, advexitfz: 11, advexitX: 7, advexitY: 70,  // 모험 나가기 버튼
  wbexitw: 48, wbexith: 22, wbexitfz: 11, wbexitX: 7, wbexitY: 96,   // 웨이브 보스전 나가기 버튼 (편집 중 모험 나가기와 겹치지 않게 아래로)
  shoptabw: 191, shoptabh: 28, shoptabfz: 13, shoptabX: 8, shoptabY: 2,
  shopadw: 36, shopadh: 34, shopadfz: 8, shopadX: 0, shopadY: 0, shopadtX: 0, shopadtY: 0,
  shoptabtX: 0, shoptabtY: 0, shopic0w: 43, shopgiftw: 26, shopgifth: 26, shopgiftX: 0, shopgiftY: 0,
  cardww: 300, cardwh: 420, cardgap: 8, cardwinX: 0, cardwinY: 0,       // 스킬 카드 결과창
  cardtfz: 16, cardtitleX: 0, cardtitleY: 0,
  cardcw: 52, cardch: 84, cardcellX: 0, cardcellY: 0,
  cardnfz: 11, cardnameX: 0, cardnameY: 0,
  cardcfz: 11, cardcntX: 0, cardcntY: 0,
  cardclw: 90, cardclh: 34, cardclfz: 14, cardcloseX: 0, cardcloseY: 0,
  glvfz: 11, glvX: -4, glvY: 1, glvbarw: 120, glvbarh: 11, glvbarX: -5, glvbarY: 0, glvbtfz: 9, glvbartX: 0, glvbartY: 0,   // 상점 소환 레벨·진행바
})

// 사용자 확정 UI 값 (asd.txt, 2026-08-03)
Object.assign(UI_DEFAULT, { shopic0: 40, shopic1: 48, shopic2: 42, shoptfz: 12, shopbbv: 1, shopbbh: 22, shopic1X: -5, shopic1Y: 1, shopic2X: -5, shoptY: 8, shopt0fz: 12, shopt0X: -6, shopt0Y: 7, glv0fz: 10, glv0X: -6, glv0Y: 6, gift0w: 30, gift0h: 30, gift0X: 7, gift0Y: -10, shopt1fz: 12, shopt1X: -2, shopt1Y: 8, glv1fz: 10, glv1X: -2, glv1Y: 6, gift1w: 30, gift1h: 30, gift1X: 14, gift1Y: -10, shopt2fz: 12, shopt2X: -7, shopt2Y: 8, glv2fz: 10, glv2X: -6, glv2Y: 6, gift2w: 30, gift2h: 30, gift2X: 9, gift2Y: -10, shopt3fz: 14, shopt3X: -5, shopt3Y: 2, glv3fz: 11, glv3X: -4, glv3Y: 1, cardic1w: 45, cardic1h: 45, cardic1X: 0, cardic1Y: 0, cardic2w: 45, cardic2h: 45, cardic2X: 0, cardic2Y: 0, cardic7w: 45, cardic7h: 45, cardic7X: 0, cardic7Y: 0, cardic8w: 45, cardic8h: 45, cardic8X: 0, cardic8Y: 0, cardic13w: 45, cardic13h: 45, cardic13X: 0, cardic13Y: 0, cardic15w: 45, cardic15h: 45, cardic15X: 0, cardic15Y: 0, cardic16w: 45, cardic16h: 45, cardic16X: 0, cardic16Y: 0, cardic17w: 45, cardic17h: 45, cardic17X: 0, cardic17Y: 0, cardic18w: 45, cardic18h: 45, cardic18X: 0, cardic18Y: 0, cardic20w: 45, cardic20h: 45, cardic20X: 0, cardic20Y: 0, cardic22w: 45, cardic22h: 45, cardic22X: 0, cardic22Y: 0, cardic23w: 45, cardic23h: 45, cardic23X: 0, cardic23Y: 0, cardic24w: 45, cardic24h: 45, cardic24X: 0, cardic24Y: 0, cardic25w: 45, cardic25h: 45, cardic25X: 0, cardic25Y: 0, cardic26w: 45, cardic26h: 45, cardic26X: 0, cardic26Y: 0, cardic27w: 45, cardic27h: 45, cardic27X: 0, cardic27Y: 0, cardic28w: 45, cardic28h: 45, cardic28X: 0, cardic28Y: 0, cardic29w: 45, cardic29h: 45, cardic29X: 0, cardic29Y: 0, cardic32w: 45, cardic32h: 45, cardic32X: 0, cardic32Y: 0, cardic31w: 45, cardic31h: 46, cardic31X: 0, cardic31Y: 0, cardic30w: 45, cardic30h: 45, cardic30X: 0, cardic30Y: 0, cardic101w: 45, cardic101h: 45, cardic101X: 0, cardic101Y: 0, cardic102w: 45, cardic102h: 45, cardic102X: 0, cardic102Y: 0, cardic103w: 45, cardic103h: 45, cardic103X: 0, cardic103Y: 0, cardic104w: 45, cardic104h: 45, cardic104X: 0, cardic104Y: 0, cardic105w: 45, cardic105h: 45, cardic105X: 0, cardic105Y: 0, cardic106w: 45, cardic106h: 45, cardic106X: 0, cardic106Y: 0, cardic107w: 45, cardic107h: 45, cardic107X: 0, cardic107Y: 0, cardic108w: 45, cardic108h: 45, cardic108X: 0, cardic108Y: 0, cardic111w: 45, cardic111h: 45, cardic111X: 0, cardic111Y: 0, cardic112w: 45, cardic112h: 45, cardic112X: 0, cardic112Y: 0, cardic113w: 45, cardic113h: 45, cardic113X: 0, cardic113Y: 0, cardic114w: 45, cardic114h: 45, cardic114X: 0, cardic114Y: 0, cardic115w: 45, cardic115h: 45, cardic115X: 0, cardic115Y: 0, cardic116w: 45, cardic116h: 45, cardic116X: 0, cardic116Y: 0, cardic117w: 45, cardic117h: 45, cardic117X: 0, cardic117Y: 0, cardic118w: 45, cardic118h: 45, cardic118X: 0, cardic118Y: 0, cardic121w: 44, cardic121h: 40, cardic121X: 0, cardic121Y: -1, cardic122w: 44, cardic122h: 42, cardic122X: -1, cardic122Y: 0, cardic123w: 45, cardic123h: 45, cardic123X: 0, cardic123Y: 0, cardic124w: 45, cardic124h: 45, cardic124X: 0, cardic124Y: 0, cardic125w: 45, cardic125h: 45, cardic125X: 0, cardic125Y: 0, cardic126w: 45, cardic126h: 45, cardic126X: 0, cardic126Y: 0, cardic127w: 45, cardic127h: 45, cardic127X: 0, cardic127Y: 0, cardic128w: 45, cardic128h: 45, cardic128X: 0, cardic128Y: 0, cardic131w: 45, cardic131h: 45, cardic131X: 0, cardic131Y: 0, cardic132w: 45, cardic132h: 45, cardic132X: 0, cardic132Y: 0, cardic133w: 45, cardic133h: 45, cardic133X: 0, cardic133Y: 0, cardic134w: 45, cardic134h: 45, cardic134X: 0, cardic134Y: 0, cardic135w: 45, cardic135h: 45, cardic135X: 0, cardic135Y: 0, cardic136w: 45, cardic136h: 45, cardic136X: 0, cardic136Y: 0, cardic137w: 45, cardic137h: 45, cardic137X: 0, cardic137Y: 0, cardic138w: 45, cardic138h: 45, cardic138X: 0, cardic138Y: 0, cardic141w: 45, cardic141h: 45, cardic141X: 0, cardic141Y: 0, cardic142w: 45, cardic142h: 45, cardic142X: 0, cardic142Y: 0, cardic143w: 45, cardic143h: 45, cardic143X: 0, cardic143Y: 0, cardic144w: 45, cardic144h: 45, cardic144X: 0, cardic144Y: 0, cardic145w: 45, cardic145h: 45, cardic145X: 0, cardic145Y: 0, cardic146w: 45, cardic146h: 45, cardic146X: 0, cardic146Y: 0, cardic147w: 45, cardic147h: 45, cardic147X: 0, cardic147Y: 0, cardic148w: 45, cardic148h: 45, cardic148X: 0, cardic148Y: 0, warnfz: 34, warnY: -26, shopadw: 38, shopgiftw: 29, shopgifth: 29, shopgiftX: 6, shopgiftY: -13, cardcw: 54, cardch: 56, glvX: -6, glvY: 5 })

// 사용자 확정 UI 값 (adas.txt, 2026-08-03)
Object.assign(UI_DEFAULT, { skhtitleX: 27, skhtitleY: 11, shopt0Y: 1, glv0Y: 0, glvbar0w: 120, glvbar0h: 9, glvbar0X: -8, glvbar0Y: 0, gift0Y: -15, shopt1Y: 1, glv1Y: 0, glvbar1w: 120, glvbar1h: 9, glvbar1X: -5, glvbar1Y: 0, gift1Y: -15, shopt2X: -6, shopt2Y: 1, glv2Y: 0, glvbar2w: 120, glvbar2h: 9, glvbar2X: -8, glvbar2Y: 0, gift2Y: -15, shopic3w: 50, shopic3h: 62, shopic3X: -7, shopic3Y: 0 })

// 사용자 확정 UI 값 (zxz.txt)
Object.assign(UI_DEFAULT, { shopbX: -2, shopt3fz: 15, shopt3Y: 0, shoptabtY: -1 })

// 사용자 확정 UI 값 (adad.txt)
Object.assign(UI_DEFAULT, { cardic33w: 46, cardic33h: 46, cardic33X: 0, cardic33Y: 0 })
