// 오류로 게임이 멈췄을 때 보여 주는 화면(2026-10-29) — 흰 화면 대신 안내와 '다시 시작'
// 세이브는 이 기기에 마지막으로 저장된 상태 그대로 남아 있고, 다시 켜면 클라우드와 맞춘다
import React from 'react'
import { T } from './i18n.js'

const box = {
  position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(16,10,5,0.92)', fontFamily: "'Do Hyeon','Jua',-apple-system,'Noto Sans KR',sans-serif",
}
const win = {
  width: 280, padding: '20px 16px 16px', boxSizing: 'border-box', borderRadius: 12, textAlign: 'center',
  background: 'linear-gradient(180deg,#2a1d10,#160f07)', border: '2px solid #b07a2e', color: '#e8d5b0',
}
const btn = {
  marginTop: 16, width: 140, height: 40, border: '1px solid #b07a2e', borderRadius: 8, padding: 0,
  background: 'linear-gradient(180deg,#d4872e,#a85f1f)', color: '#fff', fontSize: 16, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer',
}

export function CrashScreen() {
  return (
    <div style={box}>
      <div style={win}>
        <div style={{ fontSize: 19, fontWeight: 800, color: '#e8b962' }}>{T('문제가 생겼어요')}</div>
        <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5, wordBreak: 'keep-all' }}>{T('게임을 다시 시작해 주세요. 진행 기록은 그대로 남아 있어요.')}</div>
        <button style={btn} onClick={() => location.reload()}>{T('다시 시작')}</button>
      </div>
    </div>
  )
}

// 화면을 그리다 난 오류(React)를 잡는다
export class CrashGuard extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { try { console.error('[paleo] crash', err) } catch {} }
  render() { return this.state.err ? <CrashScreen /> : this.props.children }
}
