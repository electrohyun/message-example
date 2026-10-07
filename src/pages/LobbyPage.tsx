import { useState } from 'react'
import type { FormEvent } from 'react'
import Icon from '../components/Icon'
import type { Participant, Room } from '../types'

interface LobbyPageProps {
  rooms: Room[]
  user: Participant
  busy: boolean
  onJoinRoom: (roomId: string) => Promise<void>
  onCreateRoom: (name: string) => Promise<void>
  onRefresh: () => Promise<void>
  onDisconnect: () => void
}

export default function LobbyPage({ rooms, user, busy, onJoinRoom, onCreateRoom, onRefresh, onDisconnect }: LobbyPageProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [roomName, setRoomName] = useState('')

  function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (roomName.trim() && !busy) void onCreateRoom(roomName.trim())
  }

  return (
    <section className="app-window lobby-window" aria-label="대기실 화면">
      <header className="chat-header">
        <span className="room-symbol"><Icon name="users" size={24} /></span>
        <div className="room-details"><h2>대기실</h2><p>참여할 대화방을 선택하세요</p></div>
        <span className="current-user" aria-label={'현재 사용자 ' + user.name}>{user.name.slice(0, 1)}</span>
      </header>
      <div className="lobby-body">
        <div className="lobby-greeting">
          <span className="connection-dot" aria-hidden="true" />
          <p><strong>{user.name}</strong>님, 반가워요.</p>
          <span className="status-label">대기 중</span>
        </div>
        <div className="room-list-heading">
          <h3>대화방 <span>{rooms.length}</span></h3>
          <div className="inline-actions">
            <button className="quiet-button" type="button" disabled={busy} onClick={() => { void onRefresh() }}>새로고침</button>
            <button className="text-button" type="button" disabled={busy} onClick={() => setIsCreating((value) => !value)}
              aria-expanded={isCreating} aria-controls="create-room-form"><Icon name="plus" size={16} />방 만들기</button>
          </div>
        </div>
        {isCreating && (
          <form id="create-room-form" className="create-room-form" onSubmit={createRoom}>
            <div className="form-field">
              <label htmlFor="room-name">새 대화방 이름</label>
              <input id="room-name" value={roomName} onChange={(event) => setRoomName(event.target.value)}
                placeholder="대화방 이름을 입력하세요" autoFocus maxLength={32} required disabled={busy} />
            </div>
            <div className="form-actions">
              <button className="secondary-button" type="button" disabled={busy} onClick={() => setIsCreating(false)}>취소</button>
              <button className="primary-button" type="submit" disabled={!roomName.trim() || busy}>{busy ? '요청 중…' : '만들고 입장하기'}</button>
            </div>
          </form>
        )}
        <div className="room-list">
          {rooms.map((room) => (
            <button className="room-card" key={room.id} type="button" disabled={busy} onClick={() => { void onJoinRoom(room.id) }}>
              <span className="room-list-symbol" aria-hidden="true">#</span>
              <span className="room-card-details">
                <span className="room-card-name">{room.name}</span>
                <span className="room-card-description">{room.description}</span>
                <span className="room-card-members"><Icon name="users" size={14} />{room.participants.length}명 참여 중</span>
                {room.participants.length > 0 && <span className="room-card-description">{room.participants.map((peer) => peer.name).join(' · ')}</span>}
              </span>
              <span className="room-card-arrow"><Icon name="chevron" size={18} /></span>
            </button>
          ))}
        </div>
        <p className="lobby-hint">{busy ? '서버 응답을 기다리고 있어요.' : '대화방을 누르면 바로 입장할 수 있어요.'}</p>
      </div>
      <footer className="screen-footer lobby-footer">
        <span className="footer-user"><span className="connection-dot" aria-hidden="true" />{user.name}</span>
        <button className="quiet-button" type="button" onClick={onDisconnect}><Icon name="logout" size={16} />접속 종료</button>
      </footer>
    </section>
  )
}
