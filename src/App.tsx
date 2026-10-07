import { useEffect, useState } from 'react'
import ConnectPage from './pages/ConnectPage'
import LobbyPage from './pages/LobbyPage'
import ChatPage from './pages/ChatPage'
import TestPanel from './components/TestPanel'
import { useMessageSession } from './hooks/useMessageSession'
import type { Mode } from './types'

const pageLabels = { connect: '접속', lobby: '대기실', chat: '채팅방' } as const
const initialQuery = new URLSearchParams(window.location.search)
const requestedMode = initialQuery.get('mode') ?? import.meta.env.VITE_DEFAULT_MODE ?? import.meta.env.MODE
const initialMode: Mode = requestedMode === 'real' ? 'real' : 'mock'

function App() {
  const session = useMessageSession()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState(initialQuery.get('name') ?? initialQuery.get('label') ?? '')
  const [token, setToken] = useState('demo-token')
  const room = session.rooms.find((entry) => entry.id === session.roomId)
  const page = !session.user ? 'connect' : room ? 'chat' : 'lobby'
  const visibleEntries = room ? session.entries.filter((entry) => 'kind' in entry
    ? entry.roomId === room.id
    : entry.delivery === 'notice' || entry.delivery === 'private' || entry.roomId === room.id) : []

  useEffect(() => {
    document.title = pageLabels[page] + ' · 채팅 App'
    const url = new URL(window.location.href)
    url.searchParams.set('mode', mode)
    url.hash = page === 'chat' && session.roomId ? '/chat/' + encodeURIComponent(session.roomId) : '/' + page
    window.history.replaceState(null, '', url)
  }, [page, session.roomId, mode])

  function connect(nextName: string, nextToken: string) {
    setName(nextName)
    setToken(nextToken)
    session.connect(mode, nextName, nextToken)
  }

  return (
    <main className="preview-page">
      <div className="preview-shell">
        <header className="preview-heading">
          <h1>채팅 App</h1>
          <span className="preview-tag">{mode === 'mock' ? '모킹 서버' : '실제 서버'}</span>
        </header>
        {page === 'connect' && (
          <ConnectPage initialName={name} initialToken={token} mode={mode} connecting={session.status !== 'disconnected'}
            error={session.error} onCancel={session.disconnect} onModeChange={setMode} onConnect={connect} />
        )}
        {page === 'lobby' && session.user && (
          <LobbyPage rooms={session.rooms} user={session.user} busy={session.busy} onJoinRoom={session.joinRoom}
            onCreateRoom={session.createRoom} onRefresh={session.refreshRooms} onDisconnect={session.disconnect} />
        )}
        {page === 'chat' && room && session.user && (
          <ChatPage key={room.id} room={room} entries={visibleEntries} sendStatus={session.sendStatus} user={session.user} users={session.users}
            busy={session.busy} onSendMessage={session.sendMessage} onLeaveRoom={session.leaveRoom} onDisconnect={session.disconnect} />
        )}
        {page !== 'connect' && session.error && <p className="app-error" role="alert">{session.error}</p>}
        <TestPanel key={session.connectionId ?? 'disconnected'} session={session} mode={mode} />
        <p className="preview-note" role="status">
          {session.feedback || (page === 'connect' ? '접속 후 원하는 대화방에 참여할 수 있어요.' : page === 'lobby'
            ? '다른 탭에서 접속하면 함께 대화할 수 있어요.' : '메시지를 보내 함께 대화해보세요.')}
        </p>
      </div>
    </main>
  )
}
export default App
