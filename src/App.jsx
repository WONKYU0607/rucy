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
  quad:  { srcs: ['/hero/quad/quad_1.png', '/hero/quad/quad_2.png', '/hero/quad/quad_3.png', '/hero/quad/quad_4.png'], h: 76,  flip: false },
  walk:  { srcs: ['/hero/walk/walk_1.png', '/hero/walk/walk_2.png', '/hero/walk/walk_3.png', '/hero/walk/walk_4.png'], h: 130, flip: false },
  run:   { srcs: ['/hero/run/run_1.png', '/hero/run/run_2.png', '/hero/run/run_3.png', '/hero/run/run_4.png'], h: 119, flip: false },
  punch: { srcs: ['/hero/punch/punch_1.png', '/hero/punch/punch_2.png', '/hero/punch/punch_3.png'], h: 102, flip: false },
  throw: { srcs: ['/hero/throw/hero_windup.png', '/hero/throw/hero_release.png'], h: 130, flip: false },
  idle:  { srcs: ['/hero/idle/idle_1.png'], h: 130, flip: false },
  ewalk: { srcs: ['/hero/erectus_walk/ewalk_1.png', '/hero/erectus_walk/ewalk_2.png', '/hero/erectus_walk/ewalk_3.png', '/hero/erectus_walk/ewalk_4.png'], h: 130, flip: false },
  eatk1: { srcs: ['/hero/erectus_atk1/eatk1_1.png', '/hero/erectus_atk1/eatk1_2.png', '/hero/erectus_atk1/eatk1_3.png'], h: 165, flip: false },
  nwalk: { srcs: ['/hero/neander_walk/nwalk_1.png', '/hero/neander_walk/nwalk_2.png', '/hero/neander_walk/nwalk_3.png', '/hero/neander_walk/nwalk_4.png'], h: 135, flip: false },
  natk1: { srcs: ['/hero/neander_atk1/natk1_1.png', '/hero/neander_atk1/natk1_2.png'], h: 165, flip: false },
}
// 스킬 정의 — charSeq: 히어로가 재생할 프레임(1-based, 없으면 전체), fx: 분리 이펙트
//   fx proj  = 투사체: fly 프레임이 몬스터 쪽으로 날아가 명중 시 데미지(+impact 프레임)
//   fx strike = 낙하/타격: 적 위치에 frames 재생, 중반에 데미지
// stage — 0:4족보행 1:직립보행 2:에렉투스 3:네안데르탈인 4:사피엔스 5:인간
const SKILL_SHEET = [
  { id: 1, n: 6, h: 280, stage: 3, title: '번개 바위', charSeq: [1, 2, 3, 4], fx: { type: 'strike', frames: [5, 6], fxH: 240 } },
  { id: 2, n: 5, h: 250, stage: 3, title: '전기 작살', charSeq: [1, 2], fx: { type: 'proj', fly: [3, 4], impact: 5, fxH: 200 } },
  { id: 3, n: 4, h: 235, stage: 3, title: '불바위', charSeq: [1, 2, 3], fx: { type: 'proj', fly: [4], impact: 4, flyScale: 0.3, fxH: 200 } },
  { id: 7, n: 6, h: 110, stage: 0, title: '할퀴기' },
  { id: 8, n: 6, h: 140, stage: 0, title: '내려치기' },
  { id: 12, n: 7, h: 110, stage: 0, title: '빙글빙글' },
  { id: 13, n: 7, h: 120, stage: 0, title: '데굴데굴' },
  { id: 15, n: 5, h: 120, stage: 1, title: '로우킥' },
  { id: 16, n: 6, h: 145, stage: 1, title: '바위치기', charSeq: [1, 2], fx: { type: 'strike', frames: [3, 4, 5, 6] } },
  { id: 17, n: 5, h: 133, stage: 1, title: '포효' },
  { id: 18, n: 5, h: 210, stage: 2, title: '바위치기 (강화)', charSeq: [1, 2], fx: { type: 'strike', frames: [3, 4, 5] } },
  { id: 19, n: 4, h: 220, stage: 2, title: '불곰', charSeq: [1], fx: { type: 'proj', fly: [2, 3, 4, 4, 4], flyScale: 0.6, yOff: 0 } },
  { id: 20, n: 5, h: 195, stage: 2, title: '바위 회오리', charSeq: [1, 2, 3, 5], fx: { type: 'proj', fly: [4], flyScale: 0.9, yOff: 0 } },
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
const BG_THEMES = ['wasteland', 'forest', 'volcano', 'snow', 'swamp', 'night']
const BG_NORMAL = BG_THEMES.map(t => { const i = new Image(); i.src = `/bg/n_${t}.jpg`; return i })
const BG_BOSS = BG_THEMES.map(t => { const i = new Image(); i.src = `/bg/b_${t}.jpg`; return i })
const bgFor = (wave, boss) => (boss ? BG_BOSS : BG_NORMAL)[Math.floor((wave - 1) / 10) % BG_THEMES.length]
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
  2:  [0.08, 0.08],                       // 창 (fly 2프레임)
  3:  [0.09],                             // 불덩이 (1)
  19: [0.06, 0.10, 0.20, 0.20, 0.25],     // 화염 (빔,빔,곰,곰,곰)
  20: [0.12],                             // 회오리 (1)
}
// 낙하/타격 이펙트 재생 시간 (초, 스킬별) — 없으면 STRIKE_DUR
const STRIKE_DUR_BY = {
  1: 0.55,    // 번개
  16: 0.55,   // 낙석
  18: 0.55,   // 점프낙석
}

// 무기 7종 (각 10티어, /equip/w{종류}_{티어}.png)
const WEAPON_TYPES = ['몽둥이', '창', '도끼', '망치', '활', '지팡이', '클로']
// 방어구 5종 (각 7티어, /equip/a{종류}_{티어}.png)
const ARMOR_TYPES = ['방어구 1', '방어구 2', '방어구 3', '방어구 4', '방어구 5']
// 유물 6종 (각 10개, /relic/r{행}_{n}.png)
const RELIC_ROWS = ['반지', '목걸이', '왕관', '펜던트', '룬 반지', '부적']
// ── 가챠(소환) 정의: 티어가 높을수록 희박 ──
const GACHA_CATS = {
  무기: { kinds: 7, tiers: 10, img: (k, t) => `/equip/A/w${k}_${t}.png`, weights: [23, 18, 15, 12, 9, 7, 5.5, 4.5, 3.5, 2.5] },
  방어구: { kinds: 5, tiers: 7, img: (k, t) => `/equip/B/a${k}_${t}.png`, weights: [30, 22, 16, 12, 9, 6.5, 4.5] },
  유물: { kinds: 6, tiers: 10, img: (k, t) => `/relic/r${k}_${t}.png`, weights: [23, 18, 15, 12, 9, 7, 5.5, 4.5, 3.5, 2.5] },
}
const GACHA_COST = { 1: 10, 10: 100, 30: 300 }
const GRADE_BANDS = { 10: ['일반', '일반', '고급', '고급', '레어', '레어', '영웅', '영웅', '전설', '전설'], 7: ['일반', '일반', '고급', '고급', '레어', '영웅', '전설'] }
const GRADE_COLOR = { 일반: '#b7bcc2', 고급: '#54c964', 레어: '#ff9430', 영웅: '#c05cff', 전설: '#ff4038' }
const gradeOf = (cat, tier) => GRADE_BANDS[GACHA_CATS[cat].tiers][tier - 1]
const rollTier = cat => {
  const w = GACHA_CATS[cat].weights
  let r = Math.random() * w.reduce((a, b) => a + b, 0)
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i + 1 }
  return w.length
}

// ── 오프라인 보상 설정 (직접 수정 가능) ─────────────────────────
const OFFLINE_MIN_SEC = 60          // 이 시간 이상 부재 시에만 보상
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

const BOSS_TIME = 20  // 보스 제한시간(초)
const HERO_X = 90  // 평상시 영웅 x (보스전에선 화면 중앙 쪽으로 이동)
const SPEED = 1                                      // 전역 속도 배율
const SCROLL = 140 * SPEED                            // 전진 속도 (px/s)
const PUNCH = { hitAt: 0.12, total: 0.3, range: 95 } // 4족 주먹질
const THROW = { windupEnd: 0.14, releaseEnd: 0.30, total: 0.42, range: 340 }
// 에렉투스 몽둥이: 1타 내려치기(위→아래), 2타 올려치기(아래→위) 번갈아
const ECLUB = { total: 0.65, range: 150, hitAt: 0.55 }  // 몽둥이 내려치기 (단일 모션)

// ── 적 정의 ──
const ENEMY_TYPES = {
  // 기존 10종 (신규 도트 시트, 7프레임, 원본이 왼쪽을 향해 flip 불필요)
  rabbit:   { name: '토끼', hp: 20, speed: 85, dmg: 5,  reward: 4,  h: 34, color: '#a1887f', flip: false, frames: ['/monster/rabbit/rabbit_1.png', '/monster/rabbit/rabbit_2.png', '/monster/rabbit/rabbit_3.png', '/monster/rabbit/rabbit_4.png', '/monster/rabbit/rabbit_5.png', '/monster/rabbit/rabbit_6.png', '/monster/rabbit/rabbit_7.png'] },
  antelope: { name: '영양', hp: 45, speed: 65, dmg: 10, reward: 8,  h: 60, color: '#c98a4b', flip: false, frames: ['/monster/antelope/antelope_1.png', '/monster/antelope/antelope_2.png', '/monster/antelope/antelope_3.png', '/monster/antelope/antelope_4.png', '/monster/antelope/antelope_5.png', '/monster/antelope/antelope_6.png', '/monster/antelope/antelope_7.png'] },
  deer:     { name: '사슴', hp: 90, speed: 50, dmg: 16, reward: 14, h: 80, color: '#b5794a', flip: false, frames: ['/monster/deer/deer_1.png', '/monster/deer/deer_2.png', '/monster/deer/deer_3.png', '/monster/deer/deer_4.png', '/monster/deer/deer_5.png', '/monster/deer/deer_6.png', '/monster/deer/deer_7.png'] },
  boar:     { name: '멧돼지', hp: 70, speed: 60, dmg: 14, reward: 12, h: 70, color: '#7a6a52', flip: false, frames: ['/monster/boar/boar_1.png', '/monster/boar/boar_2.png', '/monster/boar/boar_3.png', '/monster/boar/boar_4.png', '/monster/boar/boar_5.png', '/monster/boar/boar_6.png', '/monster/boar/boar_7.png'] },
  wolf:     { name: '늑대', hp: 40, speed: 120, dmg: 12, reward: 10, h: 60, color: '#9a8f7a', flip: false, frames: ['/monster/wolf/wolf_1.png', '/monster/wolf/wolf_2.png', '/monster/wolf/wolf_3.png', '/monster/wolf/wolf_4.png', '/monster/wolf/wolf_5.png', '/monster/wolf/wolf_6.png', '/monster/wolf/wolf_7.png'] },
  hyena:    { name: '하이에나', hp: 110, speed: 55, dmg: 20, reward: 18, h: 66, color: '#b0a15f', flip: false, frames: ['/monster/hyena/hyena_1.png', '/monster/hyena/hyena_2.png', '/monster/hyena/hyena_3.png', '/monster/hyena/hyena_4.png', '/monster/hyena/hyena_5.png', '/monster/hyena/hyena_6.png', '/monster/hyena/hyena_7.png'] },
  bear:     { name: '동굴곰', hp: 260, speed: 40, dmg: 32, reward: 35, h: 80, color: '#6b4f35', flip: false, frames: ['/monster/bear/bear_1.png', '/monster/bear/bear_2.png', '/monster/bear/bear_3.png', '/monster/bear/bear_4.png', '/monster/bear/bear_5.png', '/monster/bear/bear_6.png', '/monster/bear/bear_7.png'] },
  rhino:    { name: '털코뿔소', hp: 450, speed: 45, dmg: 40, reward: 55, h: 76, color: '#9c988f', flip: false, frames: ['/monster/rhino/rhino_1.png', '/monster/rhino/rhino_2.png', '/monster/rhino/rhino_3.png', '/monster/rhino/rhino_4.png', '/monster/rhino/rhino_5.png', '/monster/rhino/rhino_6.png', '/monster/rhino/rhino_7.png'] },
  mammoth:  { name: '매머드', hp: 900, speed: 32, dmg: 55, reward: 110, h: 125, color: '#5f4a34', flip: false, frames: ['/monster/mammoth/mammoth_1.png', '/monster/mammoth/mammoth_2.png', '/monster/mammoth/mammoth_3.png', '/monster/mammoth/mammoth_4.png', '/monster/mammoth/mammoth_5.png', '/monster/mammoth/mammoth_6.png', '/monster/mammoth/mammoth_7.png'] },
  tiger:    { name: '검치호', hp: 600, speed: 80, dmg: 60, reward: 130, h: 65, color: '#c68a3c', flip: false, frames: ['/monster/tiger/tiger_1.png', '/monster/tiger/tiger_2.png', '/monster/tiger/tiger_3.png', '/monster/tiger/tiger_4.png', '/monster/tiger/tiger_5.png', '/monster/tiger/tiger_6.png', '/monster/tiger/tiger_7.png'] },
  // 신규 10종 (5프레임, 스탯 임시값)
  monkey:   { name: '원숭이', hp: 30, speed: 100, dmg: 8,  reward: 6,  h: 60, color: '#8a6a4a', flip: false, frames: ['/monster/monkey/monkey_1.png', '/monster/monkey/monkey_2.png', '/monster/monkey/monkey_3.png', '/monster/monkey/monkey_4.png', '/monster/monkey/monkey_5.png'] },
  croc:     { name: '악어', hp: 200, speed: 45, dmg: 30, reward: 30, h: 45, color: '#5f7a3a', flip: false, frames: ['/monster/croc/croc_1.png', '/monster/croc/croc_2.png', '/monster/croc/croc_3.png', '/monster/croc/croc_4.png', '/monster/croc/croc_5.png'] },
  elephant: { name: '코끼리', hp: 700, speed: 35, dmg: 50, reward: 90, h: 110, color: '#8d8d94', flip: false, frames: ['/monster/elephant/elephant_1.png', '/monster/elephant/elephant_2.png', '/monster/elephant/elephant_3.png', '/monster/elephant/elephant_4.png', '/monster/elephant/elephant_5.png'] },
  giraffe:  { name: '기린', hp: 300, speed: 70, dmg: 25, reward: 45, h: 150, color: '#d0a04a', flip: false, frames: ['/monster/giraffe/giraffe_1.png', '/monster/giraffe/giraffe_2.png', '/monster/giraffe/giraffe_3.png', '/monster/giraffe/giraffe_4.png', '/monster/giraffe/giraffe_5.png'] },
  ostrich:  { name: '타조', hp: 80, speed: 130, dmg: 15, reward: 16, h: 100, color: '#3a3a3a', flip: false, frames: ['/monster/ostrich/ostrich_1.png', '/monster/ostrich/ostrich_2.png', '/monster/ostrich/ostrich_3.png', '/monster/ostrich/ostrich_4.png', '/monster/ostrich/ostrich_5.png'] },
  lion:     { name: '사자', hp: 350, speed: 90, dmg: 45, reward: 60, h: 75, color: '#c68a3c', flip: false, frames: ['/monster/lion/lion_1.png', '/monster/lion/lion_2.png', '/monster/lion/lion_3.png', '/monster/lion/lion_4.png', '/monster/lion/lion_5.png'] },
  snake:    { name: '뱀', hp: 60, speed: 70, dmg: 18, reward: 14, h: 35, color: '#6a7a4a', flip: false, frames: ['/monster/snake/snake_1.png', '/monster/snake/snake_2.png', '/monster/snake/snake_3.png', '/monster/snake/snake_4.png', '/monster/snake/snake_5.png'] },
  turtle:   { name: '거북이', hp: 400, speed: 30, dmg: 15, reward: 40, h: 50, color: '#5a6a3a', flip: false, frames: ['/monster/turtle/turtle_1.png', '/monster/turtle/turtle_2.png', '/monster/turtle/turtle_3.png', '/monster/turtle/turtle_4.png', '/monster/turtle/turtle_5.png'] },
  komodo:   { name: '코모도 드래곤', hp: 250, speed: 55, dmg: 35, reward: 40, h: 45, color: '#6a5a5a', flip: false, frames: ['/monster/komodo/komodo_1.png', '/monster/komodo/komodo_2.png', '/monster/komodo/komodo_3.png', '/monster/komodo/komodo_4.png', '/monster/komodo/komodo_5.png'] },
  eagle:    { name: '독수리', hp: 120, speed: 140, dmg: 22, reward: 28, h: 80, color: '#5a4a3a', flip: false, air: 90, frames: ['/monster/eagle/eagle_1.png', '/monster/eagle/eagle_2.png', '/monster/eagle/eagle_3.png', '/monster/eagle/eagle_4.png', '/monster/eagle/eagle_5.png'] },
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
const WAVE_CYCLE = ['rabbit', 'antelope', 'deer', 'boar', 'wolf', 'hyena', 'bear', 'rhino', 'tiger', 'mammoth', 'monkey', 'snake', 'ostrich', 'turtle', 'croc', 'komodo', 'eagle', 'giraffe', 'lion', 'elephant']

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
      hlv: s.hlv ?? 1, hexp: s.hexp ?? 0, sp: s.sp ?? 0, ts: s.ts ?? null,
      skill: { ...statInit(), ...s.skill },
      equipped: (Array.isArray(s.equipped) ? s.equipped.slice(0, SLOT_COUNT) : [null, null, null, null]).map(si => (si != null && si < SKILLS.length ? si : null)),
      cdConf: Array.isArray(s.cdConf) && s.cdConf.length === SKILLS.length ? s.cdConf : SKILLS.map(k => k.cd),
    }
  } catch (e) {}
  return { meat: 0, wave: 1, lv: statInit(), evo: 0, hlv: 1, hexp: 0, sp: 0, skill: statInit(), equipped: [null, null, null, null], cdConf: SKILLS.map(k => k.cd), ts: null }
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
  const [equipTab, setEquipTab] = useState('무기')  // 장비 서브탭: 무기/방어구/유물
  const [tab, setTab] = useState('강화')      // 영웅 서브탭: 강화/성장/진화
  const [phase, setPhase] = useState('fighting')
  const [clearMsg, setClearMsg] = useState(null)   // 웨이브 클리어 배너 (멈춤 없음)
  const [bossReady, setBossReady] = useState(false) // 10웨이브 클리어 후 보스 도전 대기
  const [gem, setGem] = useState(init.gem || 0)      // 다이아 재화 (DEBUG 시 무한)
  const [inv, setInv] = useState(init.inv || {})     // 뽑은 장비 보유 수량 { 'w1_3': n }
  const [gacha, setGacha] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)           // 소환 결과 오버레이 { cat, items:[{k,t}] }
  const [uiCfg, setUiCfg] = useState(() => { try { const sv = JSON.parse(localStorage.getItem('paleoUiCfg') || '{}'); return { ...UI_DEFAULT, ...Object.fromEntries(Object.entries(sv).filter(([k]) => k in UI_DEFAULT)) } } catch { return { ...UI_DEFAULT } } })
  const [uiEdit, setUiEdit] = useState(false)
  const [copiedUi, setCopiedUi] = useState(false)
  const [editSel, setEditSel] = useState(null)   // 편집 모드에서 선택된 요소
  useEffect(() => { localStorage.setItem('paleoUiCfg', JSON.stringify(uiCfg)) }, [uiCfg])
  const [offReward, setOffReward] = useState(null) // 오프라인 보상 팝업
  const offDone = useRef(false)

  // 오프라인 보상: 부재 시간 동안 나갈 당시 웨이브에서 무한 전투한 것으로 계산
  useEffect(() => {
    if (offDone.current) return
    offDone.current = true
    if (!init.ts) return
    const away = Math.min(OFFLINE_CAP_SEC, (Date.now() - init.ts) / 1000)
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
    const kills = Math.floor(away * OFFLINE_RATE / killT)
    if (kills <= 0) return
    const gm = Math.floor(kills * avgMeat * st2.meatMult)
    const ge = Math.floor(kills * avgExp * st2.expMult)
    setMeat(m => m + gm)
    setHexp(x => x + ge)
    setOffReward({ sec: Math.floor(away), kills, meat: gm, exp: ge })
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
    localStorage.setItem(SAVE_KEY, JSON.stringify({ meat, wave, lv, evo, hlv, hexp, sp, skill, equipped, cdConf, gem, inv, best, ts: Date.now() }))
  }, [meat, wave, lv, evo, hlv, hexp, sp, skill, equipped, cdConf, gem, inv, best])

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
      shake: 0, scrollX: 0, needStart: true, W: 0, H: 0, groundY: 0, heroX: HERO_X, bossTimer: 0,
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
      w.enemies = []; w.stones = []; w.rocks = []; w.waves = []
      // 주의: dmgTexts/particles/pools/projs/strikes/skill은 유지 — 클리어 넘어갈 때 이펙트 끊김 방지
      w.bossBattle = false
      w.spawnLeft = 5 + Math.min(n, 15)
      w.total = w.spawnLeft
      w.killed = 0
      w.bossPending = false
      w.spawnTimer = 300
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
        acc: t.acc, eva: t.eva, air: t.air || 0,
        h: boss ? BOSS_TYPES[bi].h : t.h, color: t.color, cd: 0, flash: 0, animT: Math.random() * 10,
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
      const dt = w.paused ? 0 : Math.min((now - last) / 1000, 0.05)
      last = now
      const st = S.current
      const hero = w.hero
      const melee = st.mode === 'erectus' || st.mode === 'neander'
      const atkRange = st.mode === 'quad' ? PUNCH.range : melee ? ECLUB.range : THROW.range

      // 배경 스크롤: 이동 상태 + 앞을 막는 적이 없을 때만 전진
      const heroTargetX = w.bossBattle ? Math.round(w.W * 0.34) : HERO_X
      w.heroX += (heroTargetX - w.heroX) * Math.min(1, dt * 4)
      const atkRange0 = st.mode === 'quad' ? PUNCH.range : (st.mode === 'erectus' || st.mode === 'neander') ? ECLUB.range : THROW.range
      const blocked = w.enemies.some(e => !e.dead && e.x - w.heroX < atkRange0)
      w._blocked = blocked
      const moving = (st.phase === 'fighting' || st.phase === 'cleared') && hero.state === 'move' && !blocked && !w.bossBattle
      const scroll = moving ? SCROLL * st.mspdMult : 0
      w.scrollX += scroll * dt

      if (st.phase === 'fighting') {
        if (w.startBossFlag) { w.startBossFlag = false; w.needStart = false; startBossBattle(); hero.state = 'move'; hero.t = 0 }
        if (w.needStart) { startWave(st.wave); w.needStart = false; hero.hp = st.maxHp; hero.state = 'move'; hero.t = 0 }

        if (w.spawnLeft > 0) {
          w.spawnTimer -= dt * 1000
          if (w.spawnTimer <= 0) { spawnEnemy(); w.spawnLeft--; w.spawnTimer = 700 }
        }

        // 적: 접근 (전진 스크롤만큼 상대속도 가산) + 근접 공격
        for (const e of w.enemies) {
          e.flash = Math.max(0, e.flash - dt * 5)
          if (e.air) e.airT = Math.min(1, (e.airT ?? 0) + dt * 1.2)   // 서서히 떠오름
          if (e.stun > 0) { e.stun -= dt; continue }  // 기절 중 정지
          const stopX = w.heroX + Math.min(atkRange - 15, 45 + e.h * 0.4)
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
          } else if (st.mode === 'erectus' || st.mode === 'neander') {
            const prog = hero.t / ECLUB.total
            const inRange = w.enemies.find(e => !e.dead && e.x - w.heroX < ECLUB.range + 40)
            if (!hero.did && !inRange) {
              // 타격 전에 사거리 내 적이 사라짐(스킬 등으로 처치) → 헛스윙 방지, 걷기로 복귀
              hero.state = 'move'; hero.t = 0
            } else {
              if (!hero.did && prog >= ECLUB.hitAt) {
                hero.did = true
                if (inRange) dealDamage(inRange, st)
              }
              if (hero.t >= ECLUB.total) { hero.state = 'move'; hero.t = 0 }
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
        if (w.bossBattle) {
          const bEn = w.enemies.find(e => e.boss && !e.dead)
          const tt = Math.ceil(Math.max(0, w.bossTimer) * 10)
          const hh = bEn ? Math.ceil(bEn.hp) : -1
          if (tt !== w._btShown || hh !== w._bhShown) {
            w._btShown = tt; w._bhShown = hh
            setBossUI({ t: Math.max(0, w.bossTimer), hp: bEn ? Math.max(0, bEn.hp) : 0, maxHp: bEn ? bEn.maxHp : 1, has: !!bEn })
          }
        } else if (w._btShown !== -1) { w._btShown = -1; w._bhShown = -1; setBossUI(null) }

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
        if (st.mode === 'erectus' || st.mode === 'neander') {
          const ak = st.mode === 'neander' ? 'natk1' : 'eatk1'
          const arr = ANIM[ak].srcs
          const k = Math.min(arr.length - 1, Math.floor(hero.t / ECLUB.total * arr.length))
          return [ak, k]
        }
        const k = hero.t < THROW.windupEnd ? 0 : 1
        return ['throw', k]
      }
      const key = st.mode === 'quad' ? 'quad' : st.mode === 'erectus' ? 'ewalk' : st.mode === 'neander' ? 'nwalk' : 'walk'
      // 근접 모드: 적을 앞에 두고 대기 중(막힘)일 땐 걷기 대신 마지막 스윙 프레임 유지 → 공격↔대기 스냅 깜빡임 방지
      if (st.mode === 'erectus' && key === 'ewalk' && w._blocked) {
        return ['eatk1', ANIM.eatk1.srcs.length - 1]
      }
      if (st.mode === 'neander' && key === 'nwalk' && w._blocked) {
        return ['natk1', 0]
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
      const air = e.air ? e.air * (e.airT ?? 1) : 0   // 공중 높이 (등장 시 0→air 상승)
      const y = w.groundY - air
      const t = ENEMY_TYPES[e.type]
      const imgs = e.boss ? BIMG[e.bossIdx] : EIMG[e.type]
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
        ctx.translate(w.heroX, w.groundY)
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
    const items = Array.from({ length: n }, () => ({ k: 1 + Math.floor(Math.random() * GACHA_CATS[cat].kinds), t: rollTier(cat) }))
    setInv(v => {
      const nv = { ...v }
      for (const it of items) { const key = `${cat}:${it.k}_${it.t}`; nv[key] = (nv[key] || 0) + 1 }
      return nv
    })
    setGacha({ cat, items, roll: Date.now() })
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
  function unequipSkill(slot) {
    setEquipped(eq => { const next = [...eq]; next[slot] = null; return next })
  }

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
      .pd-fade { --fadeT: 0px; --fadeB: 28px;
        -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 var(--fadeT), #000 calc(100% - var(--fadeB)), transparent 100%);
        mask-image: linear-gradient(180deg, transparent 0, #000 var(--fadeT), #000 calc(100% - var(--fadeB)), transparent 100%); }
    `}</style>
    <style>{uiVars(uiCfg)}</style>
    <div style={st.root} onClickCapture={e => {
      if (!uiEdit) return
      const t = e.target.closest('[data-edit]')
      if (t) { e.stopPropagation(); e.preventDefault(); setEditSel(t.dataset.edit) }
    }}>
      {uiEdit && <style>{`[data-edit]{outline:1px dashed rgba(232,185,98,0.35);outline-offset:-1px;cursor:pointer}${editSel ? `[data-edit="${editSel}"]{outline:2px solid ${GOLD} !important}` : ''}`}</style>}
      <button onClick={() => { setUiEdit(v => !v); setEditSel(null) }} style={{ position: 'absolute', top: 4, right: 4, zIndex: 60, padding: '3px 8px', borderRadius: 6, border: '1px solid #6b4a24', background: uiEdit ? GOLD_D : 'rgba(20,13,7,0.8)', color: uiEdit ? '#fff' : GOLD, fontSize: 12 }}>{uiEdit ? '편집중' : '⚙'}</button>
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80 }} onClick={() => setMenuOpen(false)}>
          <div data-edit="menu" style={st.menuPanel} onClick={e => e.stopPropagation()}>
            <button style={{ ...st.menuItem, opacity: 0.5 }} onClick={() => {}}>우편함 <span style={{ fontSize: 11, opacity: 0.7 }}>준비 중</span></button>
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
      {gacha && (
        <div style={st.gachaOverlay}>
          <div className="pd-fade" ref={updFade} onScroll={e => updFade(e.currentTarget)} style={st.gachaScroll}>
            <div style={st.gachaGrid}>
              {gacha.items.map((it, i) => {
                const cellKey = `${gacha.roll}_${i}`
                const gr = gradeOf(gacha.cat, it.t)
                const hi = gr === '영웅' || gr === '전설'
                return (
                  <div key={cellKey} data-edit="gacha" className="pd-gacha-pop" style={{
                    ...st.gachaCell, borderColor: GRADE_COLOR[gr], animationDelay: `${Math.min(i * 60, 1800)}ms`,
                    boxShadow: hi ? `0 0 18px 4px ${GRADE_COLOR[gr]}66` : 'none',
                  }}>
                    <span data-edit="ggrade" style={{ ...st.gachaGrade, color: GRADE_COLOR[gr] }}>{gr}</span>
                    <img src={GACHA_CATS[gacha.cat].img(it.k, it.t)} alt="" data-edit="gimg" style={st.gachaImg} />
                    <span data-edit="gtier" style={st.gachaTier}>{it.t}등급</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={st.gachaBtns}>
            <button data-edit="gbtn" style={st.gachaBtn} onClick={() => setGacha(null)}><span data-edit="gbtntext" style={st.gachaBtnText}>확인</span></button>
            <button data-edit="gbtn" style={st.gachaBtn} onClick={() => pullGacha(gacha.cat, 10)}><span data-edit="gbtntext" style={st.gachaBtnText}>10회 소환 <span style={st.shopCost}><img src="/ui/gem.png" alt="" data-edit="shopgem" style={st.shopGemIc} />100</span></span></button>
            <button data-edit="gbtn" style={st.gachaBtn} onClick={() => pullGacha(gacha.cat, 30)}><span data-edit="gbtntext" style={st.gachaBtnText}>30회 소환 <span style={st.shopCost}><img src="/ui/gem.png" alt="" data-edit="shopgem" style={st.shopGemIc} />300</span></span></button>
          </div>
        </div>
      )}
      {uiEdit && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, margin: '0 auto', maxWidth: 420, zIndex: 61, background: 'rgba(16,10,5,0.32)', border: `2px solid ${GOLD_D}`, textShadow: '0 1px 3px rgba(0,0,0,0.9)', borderBottom: 'none', borderRadius: '10px 10px 0 0', padding: '8px 12px calc(8px + env(safe-area-inset-bottom))', maxHeight: '46%', overflowY: 'auto' }}>
          {!editSel && <div style={{ fontSize: 13, color: '#c9b596', textAlign: 'center', padding: '8px 0' }}>조정할 요소를 화면에서 탭하세요 (틀·아이콘·글자·숫자·버튼)</div>}
          {editSel && (() => {
            const g = EDIT_GROUPS[editSel]; if (!g) return null
            const nudge = (k, d, lo, hi) => setUiCfg(c => ({ ...c, [k]: Math.min(hi, Math.max(lo, Math.round((c[k] + d) * 2) / 2)) }))
            const nbtn = { width: 26, height: 26, flexShrink: 0, borderRadius: 6, border: '1px solid #5a4028', background: '#2c2013', color: GOLD, fontSize: 14, lineHeight: 1, padding: 0 }
            const rng = k => k === 'equipcols' ? 8 : k === 'equipimg' ? 100 : k === 'hph' ? 60 : k === 'btw' || k === 'bhpw' ? 320 : k === 'bth' || k === 'bhph' ? 70 : k === 'equipcell' ? 160 : (k === 'exph' || k.includes('bw') || k.includes('gap') || k === 'sph' || k.startsWith('nav') || k.startsWith('tab') ? 40 : (k === 'rowmin' ? 80 : 120))
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
                return <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 92, fontSize: 12, flexShrink: 0 }}>위치 {ax === 'X' ? '←→' : '↑↓'}</span>
                  <button style={nbtn} onClick={() => nudge(k, -1, -80, 80)}>−</button>
                  <input type="range" min={-80} max={80} step={1} value={uiCfg[k]} onChange={e => setUiCfg({ ...uiCfg, [k]: parseFloat(e.target.value) })} style={{ flex: 1, minWidth: 0 }} />
                  <button style={nbtn} onClick={() => nudge(k, 1, -80, 80)}>+</button>
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

      <div ref={wrapRef} style={st.canvasWrap}>
        <canvas ref={canvasRef} />
        <button data-edit="pausebtn" style={{ ...st.pauseBtn, opacity: paused ? 1 : 0.65 }} onClick={() => { if (!uiEdit) setPaused(p => !p) }}>{paused ? '▶' : 'II'}</button>
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
        <div data-edit="gain" style={st.gainWrap}>
          {gains.map(g => (
            <div key={g.id} style={st.gainItem}>
              <span style={st.gainCell}><img src="/ui/ic_exp.png" alt="" style={st.gainIcon} /><span style={{ color: '#6ec4ff' }}>+{g.exp}</span></span>
              <span style={st.gainCell}><img src="/ui/ic_meat.png" alt="" style={st.gainIcon} /><span style={{ color: '#ff9d6a' }}>+{g.meat}</span></span>
            </div>
          ))}
        </div>
        {clearMsg != null && <div data-edit="clearmsg" style={st.overlayText}>{typeof clearMsg === 'number' ? `웨이브 ${clearMsg} 클리어!` : clearMsg}</div>}
        {phase === 'gameover' && (
          <div style={st.overlay}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>쓰러졌다...</div>
            <button style={st.retryBtn} onClick={retry}>다시 도전</button>
          </div>
        )}
      </div>

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
              src={EVOS[evo].mode === 'quad' ? '/hero/quad/quad_1.png' : EVOS[evo].mode === 'erectus' ? '/hero/erectus_walk/ewalk_1.png' : EVOS[evo].mode === 'neander' ? '/hero/neander_walk/nwalk_1.png' : '/hero/misc/hero_idle.png'}
              alt=""
              data-edit={`evoimg${evo}`}
              style={{ height: `var(--pd-evoimg${evo})`, transform: `translate(var(--pd-evoimg${evo}-x), var(--pd-evoimg${evo}-y))` }}
            />
            <div style={{ flex: 1, marginLeft: 12 }}>
              <div data-edit="name" style={st.rowName}>{EVOS[evo].name}</div>
              <div data-edit="val" style={st.rowVal}>
                {EVOS[evo].mode === 'quad' ? '4족 질주 · 주먹질' : EVOS[evo].mode === 'erectus' ? '몽둥이 · 내려치기/올려치기' : EVOS[evo].mode === 'neander' ? '돌도끼 · 내려찍기' : '직립 보행 · 돌 던지기'} · 공격력 ×{EVOS[evo].mult}
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
          <div data-edit="spbarA" style={{ ...st.spBar, transform: 'translate(var(--pd-spbarA-x), var(--pd-spbarA-y))' }}>장착 슬롯 · 올린 스킬만 자동 발동</div>
          <div style={st.slotRow}>
            {equipped.map((si, slot) => (
              <button key={slot} data-edit="slot" style={st.slot} onClick={() => si != null && unequipSkill(slot)}>
                {si != null ? <span style={{ fontSize: 'var(--pd-slotfz)' }}>{SKILLS[si].icon}</span> : <span style={st.slotEmpty}>+</span>}
              </button>
            ))}
          </div>
          <div data-edit="spbarB" style={{ ...st.spBar, marginTop: 4, transform: 'translate(var(--pd-spbarB-x), var(--pd-spbarB-y))' }}>보유 스킬 · 탭하여 장착 <span style={{ opacity: 0.6, fontSize: 11 }}>· {EVOS[evo].name} 전용</span></div>
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
      )}

      {nav === '장비' && (
        <div data-edit="panel" style={st.frameBox}>
          <div data-edit="tab" style={st.tabsInner}>
            {['무기', '방어구', '유물'].map(t => (
              <button key={t} style={{ ...st.tabBtn, ...(equipTab === t ? st.tabActive : {}) }} onClick={() => setEquipTab(t)}>{t}</button>
            ))}
          </div>
          <div className="pd-fade" ref={updFade} onScroll={e => updFade(e.currentTarget)} style={st.panelInner}>
          {equipTab === '무기' && WEAPON_TYPES.map((wt, wi) => (
            <div key={wi}>
              <div data-edit="cat" style={{ fontSize: 'var(--pd-catfz)', fontWeight: 700, margin: '4px 2px 4px', opacity: 0.85, transform: 'translate(var(--pd-cat-x), var(--pd-cat-y))' }}>{wt}</div>
              <div style={st.equipGrid}>
                {Array.from({ length: 10 }, (_, ti) => (
                  <div key={ti} data-edit="equip" style={st.equipCell}>
                    <img src={`/equip/A/w${wi + 1}_${ti + 1}.png`} alt="" data-edit="eqimg" style={st.equipImg} />
                    <div data-edit="eqtier" style={st.equipTier}>{ti + 1}등급</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {equipTab === '방어구' && ARMOR_TYPES.map((at, ai) => (
            <div key={ai}>
              <div data-edit="cat" style={{ fontSize: 'var(--pd-catfz)', fontWeight: 700, margin: '4px 2px 4px', opacity: 0.85, transform: 'translate(var(--pd-cat-x), var(--pd-cat-y))' }}>{at}</div>
              <div style={st.equipGrid}>
                {Array.from({ length: 7 }, (_, ti) => (
                  <div key={ti} data-edit="equip" style={st.equipCell}>
                    <img src={`/equip/B/a${ai + 1}_${ti + 1}.png`} alt="" data-edit="eqimg" style={st.equipImg} />
                    <div data-edit="eqtier" style={st.equipTier}>{ti + 1}등급</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {equipTab === '유물' && RELIC_ROWS.map((rn, ri) => (
            <div key={ri}>
              <div data-edit="cat" style={{ fontSize: 'var(--pd-catfz)', fontWeight: 700, margin: '4px 2px 4px', opacity: 0.85, transform: 'translate(var(--pd-cat-x), var(--pd-cat-y))' }}>{rn}</div>
              <div style={st.equipGrid}>
                {Array.from({ length: 10 }, (_, ti) => (
                  <div key={ti} data-edit="equip" style={st.equipCell}>
                    <img src={`/relic/r${ri + 1}_${ti + 1}.png`} alt="" data-edit="eqimg" style={st.equipImg} />
                    <div data-edit="eqtier" style={st.equipTier}>{ti + 1}등급</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {nav === '상점' && (
        <div data-edit="panel" style={st.frameBox}>
          <div className="pd-fade" ref={updFade} onScroll={e => updFade(e.currentTarget)} style={st.panelInner}>
            {Object.keys(GACHA_CATS).map(cat => (
              <div key={cat} data-edit="shoprow" style={{ ...st.row, minHeight: 'var(--pd-shoprowmin)', transform: 'translate(var(--pd-shoprow-x), var(--pd-shoprow-y))' }}>
                <img src={GACHA_CATS[cat].img(1, GACHA_CATS[cat].tiers)} alt="" data-edit="shopic" style={{ height: 'var(--pd-shopic)', objectFit: 'contain', transform: 'translate(var(--pd-shopic-x), var(--pd-shopic-y))' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div data-edit="shoptitle" style={{ fontWeight: 700, fontSize: 'var(--pd-shoptfz)', transform: 'translate(var(--pd-shopt-x), var(--pd-shopt-y))' }}>{cat} 소환</div>
                  <div data-edit="shopsub" style={{ fontSize: 'var(--pd-shopsubfz)', opacity: 0.6, transform: 'translate(var(--pd-shopsub-x), var(--pd-shopsub-y))' }}>티어가 높을수록 희귀</div>
                </div>
                <button data-edit="shopbtn" style={st.shopBtn} onClick={() => pullGacha(cat, 1)}><span data-edit="shopbtext" style={st.shopBtnText}>1회<br /><span style={st.shopCost}><img src="/ui/gem.png" alt="" data-edit="shopgem" style={st.shopGemIc} />10</span></span></button>
                <button data-edit="shopbtn" style={st.shopBtn} onClick={() => pullGacha(cat, 10)}><span data-edit="shopbtext" style={st.shopBtnText}>10회<br /><span style={st.shopCost}><img src="/ui/gem.png" alt="" data-edit="shopgem" style={st.shopGemIc} />100</span></span></button>
              </div>
            ))}
          </div>
        </div>
      )}
      {nav !== '영웅' && nav !== '스킬' && nav !== '장비' && nav !== '상점' && (
        <div style={st.comingSoon}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{nav}</div>
          <div style={{ fontSize: 13, opacity: 0.6, marginTop: 6 }}>준비 중입니다</div>
        </div>
      )}

      {offReward && (
        <div style={st.offOverlay}>
          <div style={st.offBox}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>오프라인 보상</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>
              {Math.floor(offReward.sec / 3600)}시간 {Math.floor(offReward.sec % 3600 / 60)}분 · 웨이브 {wave} · {fmt(offReward.kills)}마리 사냥
            </div>
            <div style={{ fontSize: 15, marginBottom: 14 }}>🍖 +{fmt(offReward.meat)} · <span style={{ color: '#8ab4ff' }}>EXP +{fmt(offReward.exp)}</span></div>
            <button data-edit="cost" style={{ ...st.costBtn, width: '100%' }} onClick={() => setOffReward(null)}>받기</button>
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
  avatar: 40, slotmax: 50, equipcols: 5, equipgap: 11, slotfz: 23, catfz: 13, spbarfz: 12,
  equipimg: 60, equiptier: 13, equipcell: 54, nickfz: 15, lvbadgefz: 12, exph: 11, pillfz: 14, wavefz: 12,
  evoimg0: 56, evoimg1: 56, evoimg2: 56, evoimg3: 56, evoimg4: 56, evoimg5: 56,
  evoimg0X: 0, evoimg0Y: 1, evoimg1X: 0, evoimg1Y: 1, evoimg2X: 0, evoimg2Y: 1,
  evoimg3X: 0, evoimg3Y: 1, evoimg4X: 0, evoimg4Y: 1, evoimg5X: 0, evoimg5Y: 1,
  gachacell: 62, gachafz: 10, gtierfz: 10, gachaimg: 74, gainfz: 13,
  shoprowmin: 46, shopic: 38, shoptfz: 13, shopsubfz: 11, shopbw: 62, shopbfz: 12, shopgem: 12,
  gbtnfz: 13, gbtnpw: 16, gbtnph: 10,
  pbsz: 30, wjfz: 13, btw: 210, bth: 30, bhpw: 250, bhph: 36, pmw: 92, pmh: 26, pmfz: 13, pgw: 92, pgh: 26, pgfz: 13, hambsz: 26, menufz: 13, hph: 11, hpfz: 10, bossfz: 11, bossh: 40, wavebh: 44, clearfz: 24, navfz: 10, diasz: 10,
  // 위치 이동(px): 요소별 X/Y
  avatarX: 0, avatarY: 0, tabX: -1, tabY: 0, navX: 0, navY: 0, costX: 0, costY: 0, pillX: 2, pillY: 2, iconX: -3, iconY: 1,
  panelX: 0, panelY: 0, rowX: 0, rowY: -3, nameX: -3, nameY: 1, valX: -2, valY: 0, inputX: 0, inputY: 0,
  spX: 0, spY: 0, slotX: 23, slotY: 8, catX: 21, catY: -5, spbarX: 20, spbarY: 1, equipX: -9, equipY: -4, spbarAX: 13, spbarAY: 12,
  spbarBX: 15, spbarBY: 0, spbarCX: 14, spbarCY: -3, nickX: 0, nickY: 0, expX: 0, expY: 0, gainX: 0, gainY: 0,
  hpX: -3, hpY: 1, bossX: 1, bossY: -4, clearX: 0, clearY: 0, waveX: 0, waveY: 1, gachaX: 0, gachaY: 0, eqtierX: 0, eqtierY: 0, eqimgX: 0, eqimgY: 0,
  shoprowX: 0, shoprowY: 0, shopicX: 0, shopicY: 0, shoptX: 0, shoptY: 0, shopsubX: 0, shopsubY: 0,
  shopbX: 0, shopbY: 0, shopbtX: 0, shopbtY: 0, shopgemX: 0, shopgemY: 0,
  gbtnX: 0, gbtnY: 0, gbtntX: 0, gbtntY: 0, ggradeX: 0, ggradeY: 0, gtierX: 0, gtierY: 0, gimgX: 0, gimgY: 0, pmX: 0, pmY: 0, pgX: 0, pgY: 0, hambX: 0, hambY: 0, menuX: 0, menuY: 0, btX: 0, btY: 0, bhpX: 0, bhpY: 0, pbX: 0, pbY: 0, wjX: 0, wjY: 0, wtitleX: 0, wtitleY: 1, diaX: 0, diaY: 0, btextX: -1, btextY: 6,
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
  gain: { label: '획득 팝업', size: ['gainfz'], pos: 'gain' },
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
  shopic: { label: '소환 아이콘', size: ['shopic'], pos: 'shopic' },
  shoptitle: { label: '소환 제목 글자', size: ['shoptfz'], pos: 'shopt' },
  shopsub: { label: '소환 부제 글자', size: ['shopsubfz'], pos: 'shopsub' },
  shopbtn: { label: '소환 버튼(판)', size: ['shopbw'], pos: 'shopb' },
  shopbtext: { label: '소환 버튼 글자', size: ['shopbfz'], pos: 'shopbt' },
  shopgem: { label: '다이아 아이콘', size: ['shopgem'], pos: 'shopgem' },
  pillmeat: { label: '고기 알약', size: ['pmw', 'pmh', 'pmfz'], pos: 'pm' },
  pillgem: { label: '다이아 알약', size: ['pgw', 'pgh', 'pgfz'], pos: 'pg' },
  hamb: { label: '메뉴 버튼', size: ['hambsz'], pos: 'hamb' },
  pausebtn: { label: '일시정지 버튼', size: ['pbsz'], pos: 'pb' },
  wjump: { label: '웨이브 이동 창', size: ['wjfz'], pos: 'wj' },
  btimer: { label: '보스 타이머 바', size: ['btw', 'bth'], pos: 'bt' },
  bosshp: { label: '보스 체력 바', size: ['bhpw', 'bhph'], pos: 'bhp' },
  menu: { label: '메뉴 패널', size: ['menufz'], pos: 'menu' },
  bosstext: { label: '보스 버튼 글자', size: ['bossfz'], pos: 'btext' },
  clearmsg: { label: '클리어 문구', size: ['clearfz'], pos: 'clear' },
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
  shoprowmin: '박스 높이', shopic: '아이콘 크기', shoptfz: '제목 글자', shopsubfz: '부제 글자',
  shopbw: '버튼 너비', shopbfz: '버튼 글자', shopgem: '다이아 크기', gbtnfz: '버튼 글자', gbtnpw: '판 가로', gbtnph: '판 세로',
  pmw: '알약 너비', pmh: '알약 높이', pmfz: '알약 글자', pgw: '알약 너비', pgh: '알약 높이', pgfz: '알약 글자', hambsz: '버튼 크기', menufz: '메뉴 글자', pbsz: '버튼 크기', wjfz: '창 글자', btw: '타이머 너비', bth: '타이머 높이', bhpw: '체력바 너비', bhph: '체력바 높이',
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
--pd-gtierfz:${c.gtierfz}px;--pd-gachaimg:${c.gachaimg};--pd-shoprowmin:${c.shoprowmin}px;--pd-shopic:${c.shopic}px;
--pd-shoptfz:${c.shoptfz}px;--pd-shopsubfz:${c.shopsubfz}px;--pd-shopbw:${c.shopbw}px;--pd-shopbfz:${c.shopbfz}px;--pd-shopgem:${c.shopgem}px;
--pd-gbtnfz:${c.gbtnfz}px;--pd-gbtnpw:${c.gbtnpw}px;--pd-gbtnph:${c.gbtnph}px;
--pd-pmw:${c.pmw}px;--pd-pmh:${c.pmh}px;--pd-pmfz:${c.pmfz}px;--pd-pgw:${c.pgw}px;--pd-pgh:${c.pgh}px;--pd-pgfz:${c.pgfz}px;--pd-hambsz:${c.hambsz}px;--pd-menufz:${c.menufz}px;--pd-pbsz:${c.pbsz}px;--pd-wjfz:${c.wjfz}px;--pd-pb-x:${c.pbX}px;--pd-pb-y:${c.pbY}px;--pd-wj-x:${c.wjX}px;--pd-wj-y:${c.wjY}px;--pd-btw:${c.btw}px;--pd-bth:${c.bth}px;--pd-bhpw:${c.bhpw}px;--pd-bhph:${c.bhph}px;
${['bt', 'bhp'].map(k => `--pd-${k}-x:${c[k + 'X']}px;--pd-${k}-y:${c[k + 'Y']}px;`).join('')}
${['pm', 'pg', 'hamb', 'menu'].map(k => `--pd-${k}-x:${c[k + 'X']}px;--pd-${k}-y:${c[k + 'Y']}px;`).join('')}
${['eqtier', 'eqimg', 'shoprow', 'shopic', 'shopt', 'shopsub', 'shopb', 'shopbt', 'shopgem', 'gbtn', 'gbtnt', 'ggrade', 'gtier', 'gimg'].map(k => `--pd-${k}-x:${c[k + 'X']}px;--pd-${k}-y:${c[k + 'Y']}px;`).join('')}
--pd-nick-x:${c.nickX}px;--pd-nick-y:${c.nickY}px;--pd-exp-x:${c.expX}px;--pd-exp-y:${c.expY}px;
--pd-gain-x:${c.gainX}px;--pd-gain-y:${c.gainY}px;
--pd-hp-x:${c.hpX}px;--pd-hp-y:${c.hpY}px;--pd-boss-x:${c.bossX}px;--pd-boss-y:${c.bossY}px;--pd-clear-x:${c.clearX}px;--pd-clear-y:${c.clearY}px;--pd-wave-x:${c.waveX}px;--pd-wave-y:${c.waveY}px;--pd-wtitle-x:${c.wtitleX}px;--pd-wtitle-y:${c.wtitleY}px;--pd-dia-x:${c.diaX}px;--pd-dia-y:${c.diaY}px;--pd-btext-x:${c.btextX}px;--pd-btext-y:${c.btextY}px;
}`
const st = {
  outer: { position: 'fixed', inset: 0, background: '#000', display: 'flex', justifyContent: 'center' },
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
    position: 'fixed', left: '50%', top: '35%', transform: 'translate(calc(-50% + var(--pd-wj-x)), var(--pd-wj-y))',
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
  gainIcon: { height: 'calc(var(--pd-gainfz) + 6px)', objectFit: 'contain' },
  gainItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--pd-gainfz)', background: 'rgba(10,6,3,0.6)', padding: '2px 8px', borderRadius: 6 },
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
    position: 'fixed', right: 'calc((100vw - min(100vw, 420px)) / 2 + 8px)', top: 'calc(max(10px, env(safe-area-inset-top)) + 44px)', minWidth: 210,
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
    flexShrink: 0, padding: '6px 10px',
    borderStyle: 'solid', borderWidth: '9px 12px',
    borderImage: 'url(/ui/frame_btn.png) 90 130 fill / 9px 12px stretch',
    background: 'rgba(18,11,5,0.85)', color: '#f3e6d0', lineHeight: 1.35,
    touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
    minWidth: 'var(--pd-shopbw)', transform: 'translate(var(--pd-shopb-x), var(--pd-shopb-y))',
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
    padding: 'var(--pd-gbtnph) var(--pd-gbtnpw)',
    borderStyle: 'solid', borderWidth: '10px 14px',
    borderImage: 'url(/ui/frame_btn.png) 90 130 fill / 10px 14px stretch',
    background: 'rgba(18,11,5,0.85)', color: '#f3e6d0',
    transform: 'translate(var(--pd-gbtn-x), var(--pd-gbtn-y))',
  },
  gachaBtnText: { display: 'inline-block', fontSize: 'var(--pd-gbtnfz)', transform: 'translate(var(--pd-gbtnt-x), var(--pd-gbtnt-y))' },
  comingSoon: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#20160c', color: '#f3e6d0' },
  cdOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,6,3,0.72)', fontSize: 13, color: '#7ce0ff' },
  slotRow: { display: 'flex', gap: 6, padding: '2px 2px 5px' },
  slot: { flex: 1, aspectRatio: '1', maxWidth: 'var(--pd-slotmax)', transform: 'translate(var(--pd-slot-x), var(--pd-slot-y))', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#2c2013,#20160c)', border: '2px solid #5a4028', borderRadius: 10 },
  slotEmpty: { fontSize: 'var(--pd-slotfz)', color: '#6a4f30' },
  equipGrid: { display: 'grid', gridTemplateColumns: 'repeat(var(--pd-equipcols), minmax(0, var(--pd-equipcell)))', gap: 'var(--pd-equipgap)', justifyContent: 'center' },
  equipCell: { position: 'relative', aspectRatio: '1', width: '100%', maxWidth: 'var(--pd-equipcell)', justifySelf: 'center', background: 'linear-gradient(180deg,#2c2013,#1e150b)', border: '1px solid #5a4028', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transform: 'translate(var(--pd-equip-x), var(--pd-equip-y))' },
  equipImg: { width: 'var(--pd-equipimg)', height: 'var(--pd-equipimg)', objectFit: 'contain', imageRendering: 'pixelated', transform: 'translate(var(--pd-eqimg-x), var(--pd-eqimg-y))' },
  statIconImg: { width: '100%', height: '100%', objectFit: 'contain' },
  navIconImg: { width: 'var(--pd-navicon)', height: 'var(--pd-navicon)', objectFit: 'contain' },
  equipTier: { position: 'absolute', right: 3, bottom: 1, fontSize: 'var(--pd-equiptier)', color: GOLD, textShadow: '0 0 3px #000', transform: 'translate(var(--pd-eqtier-x), var(--pd-eqtier-y))' },
  offOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  offBox: { background: 'linear-gradient(180deg,#2c2013,#1e150b)', border: `2px solid ${GOLD_D}`, borderRadius: 16, padding: '20px 24px', textAlign: 'center', minWidth: 240, color: '#f3e6d0', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' },
  skillIcon: { width: 'var(--pd-icon)', height: 'var(--pd-icon)', transform: 'translate(var(--pd-icon-x), var(--pd-icon-y))', borderRadius: 8, background: 'linear-gradient(180deg,#2c2013,#1a1208)', border: '1px solid #5a4028', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 },
  progOuter: { height: 8, background: '#2a1d0d', borderRadius: 4, overflow: 'hidden', border: '1px solid #3a2a14' },
  canvasWrap: { height: '42%', position: 'relative', minHeight: 220 },
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
    flex: 1, overflowY: 'auto', minHeight: 0,
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
}

