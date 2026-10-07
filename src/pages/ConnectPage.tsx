import { useState } from 'react'
import type { FormEvent } from 'react'
import Icon from '../components/Icon'
import type { Mode } from '../types'

interface ConnectPageProps {
  initialName: string
  initialToken: string
  mode: Mode
  connecting: boolean
  error: string
  onCancel: () => void
  onModeChange: (mode: Mode) => void
  onConnect: (name: string, token: string) => void
}

export default function ConnectPage({ initialName, initialToken, mode, connecting, error, onCancel, onModeChange, onConnect }: ConnectPageProps) {
  const [name, setName] = useState(initialName)
  const [token, setToken] = useState(initialToken)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim() && !connecting) onConnect(name.trim(), token.trim())
  }

  return (
    <section className="app-window connect-window" aria-label="접속 화면">
      <header className="chat-header">
        <span className="room-symbol"><Icon name="message" size={24} /></span>
        <div className="room-details"><h2>접속</h2><p>대기실에 입장하기</p></div>
      </header>
      <div className="connect-body">
        <div className="connect-intro">
          <div className="connect-mark"><Icon name="message" size={32} /></div>
          <h3>대화를 시작해보세요</h3>
          <p>각 탭에서 다른 이름으로 접속할 수 있어요.</p>
        </div>
        <form className="connect-form" onSubmit={submit}>
          <div className="form-field">
            <span className="field-label">연결 환경</span>
            <div className="user-switcher mode-switcher" role="group" aria-label="연결 환경">
              <button type="button" aria-pressed={mode === 'mock'} disabled={connecting} onClick={() => onModeChange('mock')}>모킹 서버</button>
              <button type="button" aria-pressed={mode === 'real'} disabled={connecting} onClick={() => onModeChange('real')}>실제 서버</button>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="display-name">사용자 이름</label>
            <input id="display-name" value={name} onChange={(event) => setName(event.target.value)}
              placeholder="A, B 또는 사용할 이름" autoComplete="nickname" maxLength={24} required disabled={connecting} />
          </div>
          <div className="form-field">
            <label htmlFor="test-token">테스트용 토큰</label>
            <input id="test-token" value={token} onChange={(event) => setToken(event.target.value)}
              placeholder="demo-token" autoComplete="off" required disabled={connecting} />
            <p className="field-help">기본값은 demo-token이에요. 다른 값으로 접속하면 거절돼요.</p>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={!name.trim() || !token.trim() || connecting}>
            {connecting ? '접속 중…' : '접속하기'}<Icon name="chevron" size={18} />
          </button>
          {connecting && <button className="secondary-button" type="button" onClick={onCancel}>접속 취소</button>}
        </form>
      </div>
      <footer className="screen-footer connect-footer">입력한 이름은 대화방에서 표시돼요.</footer>
    </section>
  )
}
