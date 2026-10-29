import React from 'react'
import ReactDOM from 'react-dom/client'
// 글꼴은 게임 안에 넣어 둔다(2026-10-29) — 구글 폰트 서버가 느리거나 막혀도(앱 포함) 같은 글꼴
import '@fontsource/do-hyeon'
import '@fontsource/jua'
import App from './App.jsx'
import { CrashGuard } from './Crash.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(<CrashGuard><App /></CrashGuard>)
