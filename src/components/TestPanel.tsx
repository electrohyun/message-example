import type { MessageSession } from '../hooks/useMessageSession'
import type { Mode } from '../types'

interface TestPanelProps {
  session: MessageSession
  mode: Mode
}

export default function TestPanel({ session, mode }: TestPanelProps) {
  const connected = session.status === 'connected' && session.user !== null
  const disabled = !connected || session.busy

  function resetAll() {
    if (window.confirm('모든 사용자의 연결과 대화방·대화 기록을 초기화할까요?')) void session.reset()
  }

  return (
    <details className="test-panel">
      <summary>연결·수신 확인 <span>{session.connectionId ? session.connectionId.slice(-8) : '미접속'}</span></summary>
      <div className="test-panel-body">
        <dl className="connection-info">
          <dt>환경</dt><dd>{mode === 'mock' ? '모킹 서버' : '실제 서버'}</dd>
          <dt>상태</dt><dd>{session.status === 'connected' ? '접속됨' : session.status === 'connecting' ? '접속 중' : '미접속'}</dd>
          <dt>사용자</dt><dd>{session.user?.name ?? '—'}</dd>
          <dt>연결 ID</dt><dd><code>{session.connectionId ?? '—'}</code></dd>
        </dl>
        {session.users.length > 0 && (
          <div className="panel-section">
            <h3>접속 중인 사용자</h3>
            {session.users.map((peer) => <p className="peer-entry" key={peer.id}>{peer.name} <code>{peer.id}</code></p>)}
          </div>
        )}
        <div className="panel-section">
          <h3>ACK 확인</h3>
          <div className="panel-actions">
            <button type="button" disabled={disabled} onClick={() => { void session.checkAck('callback') }}>콜백 ACK</button>
            <button type="button" disabled={disabled} onClick={() => { void session.checkAck('promise') }}>Promise ACK</button>
          </div>
          <p className="panel-result" role="status">{session.ackResult || '버튼을 눌러 서버 응답을 확인하세요.'}</p>
        </div>
        <div className="panel-section">
          <h3>후속 확인 이벤트</h3>
          <p className="field-help">메시지 전송 ACK를 확인한 뒤 송신 탭에서 marker를 보내세요. 다른 탭에서도 같은 marker가 도착한 뒤 대상 메시지가 채팅에 표시됐는지 확인하세요.</p>
          <div className="panel-actions">
            <button type="button" disabled={disabled} onClick={() => { void session.sendMarker() }}>marker 보내기</button>
          </div>
          <p className="panel-result">마지막 도착: {session.markerId || '없음'}</p>
        </div>
        <div className="panel-section">
          <h3>이벤트 기록</h3>
          {session.events.length === 0 && <p className="panel-empty">이벤트 기록이 없습니다.</p>}
          <ol className="event-list">
            {session.events.slice(-15).reverse().map((event) => (
              <li key={event.id}><span>{event.time} · {event.event}</span>{event.detail && <code>{event.detail}</code>}</li>
            ))}
          </ol>
        </div>
        <div className="panel-actions">
          <button className="reset-button" type="button" disabled={disabled} onClick={resetAll}>전체 초기화</button>
        </div>
      </div>
    </details>
  )
}
