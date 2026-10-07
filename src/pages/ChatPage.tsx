import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Icon from '../components/Icon'
import type { ChatEntry, Delivery, Participant, Room, SendStatus } from '../types'

interface ChatPageProps {
  room: Room
  entries: ChatEntry[]
  sendStatus: SendStatus
  user: Participant
  users: Participant[]
  busy: boolean
  onSendMessage: (text: string, delivery: Delivery, recipientId?: string) => Promise<boolean>
  onLeaveRoom: () => Promise<void>
  onDisconnect: () => void
}

const statusLabels = { idle: '', sending: '전송 중…', sent: '전송 완료', failed: '전송 실패' }

export default function ChatPage({ room, entries, sendStatus, user, users, busy, onSendMessage, onLeaveRoom, onDisconnect }: ChatPageProps) {
  const [draft, setDraft] = useState('')
  const [delivery, setDelivery] = useState<Delivery>('room')
  const [recipientId, setRecipientId] = useState('')
  const messageList = useRef<HTMLDivElement>(null)
  const peers = users.filter((peer) => peer.id !== user.id)
  const canSend = delivery !== 'private' || peers.some((peer) => peer.id === recipientId)

  useEffect(() => {
    if (messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight
  }, [entries])

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy || !canSend) return
    if (await onSendMessage(text, delivery, delivery === 'private' ? recipientId : undefined)) setDraft('')
  }

  return (
    <section className="app-window chat-window" aria-label={room.name + ' 대화 화면'}>
      <header className="chat-header">
        <button className="icon-button back-button" type="button" disabled={busy} onClick={() => { void onLeaveRoom() }}
          aria-label="방에서 나가 대기실로 이동"><Icon name="back" /></button>
        <div className="room-details">
          <h2>{room.name}</h2>
          <p>{room.participants.length}명 참여 중 · {room.participants.map((peer) => peer.name).join(' · ')}</p>
        </div>
        <span className="current-user" aria-label={'현재 사용자 ' + user.name}>{user.name.slice(0, 1)}</span>
        <button className="icon-button" type="button" onClick={onDisconnect} aria-label="접속 종료"><Icon name="logout" /></button>
      </header>

      <div className="message-controls">
        <label htmlFor="delivery">전달 방식</label>
        <select id="delivery" value={delivery} disabled={busy} onChange={(event) => setDelivery(event.target.value as Delivery)}>
          <option value="room">방 메시지 · 모두 수신</option>
          <option value="others">방 메시지 · 송신자 제외</option>
          <option value="private">개인 메시지</option>
          <option value="notice">전체 공지</option>
        </select>
        {delivery === 'private' && (
          <select aria-label="개인 메시지 수신자" value={recipientId} disabled={busy} onChange={(event) => setRecipientId(event.target.value)}>
            <option value="">수신자를 선택하세요</option>
            {peers.map((peer) => <option key={peer.id} value={peer.id}>{peer.name} · {peer.id.slice(-5)}</option>)}
          </select>
        )}
      </div>

      <div className="message-list" ref={messageList} role="log" aria-label="대화 기록" aria-live="polite">
        <div className="date-divider"><span>대화 기록</span></div>
        {!entries.some((entry) => !('kind' in entry)) && <p className="empty-chat">첫 메시지를 남겨보세요.</p>}
        {entries.map((message) => {
          if ('kind' in message) {
            return <p key={message.id} className="room-notice">{message.text}</p>
          }
          const isOwn = message.sender.id === user.id
          const badge = message.delivery === 'private' ? '개인 · ' + (isOwn ? message.recipient?.name ?? '' : '나에게')
            : message.delivery === 'notice' ? '전체 공지' : ''
          return (
            <div key={message.displayId} data-message-id={message.id}
              className={'message ' + (isOwn ? 'message-own' : 'message-other') + (message.delivery === 'notice' ? ' message-notice' : '')}>
              {!isOwn && <span className="message-author">{message.sender.name}</span>}
              {badge && <span className="message-kind">{badge}</span>}
              <div className="message-content">
                <p className="message-bubble">{message.text}</p>
                <span className="message-meta">
                  <time className="message-time" dateTime={message.sentAt}>{new Date(message.sentAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</time>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <form className="composer" onSubmit={(event) => { void sendMessage(event) }}>
        <label className="composer-label" htmlFor="message-input">{user.name}로 보내기</label>
        <div className="composer-field">
          <input id="message-input" type="text" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000}
            onKeyDown={(event) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }}
            placeholder={canSend ? '메시지를 입력하세요' : '먼저 수신자를 선택하세요'} autoComplete="off" disabled={busy} />
          <button type="submit" aria-label="메시지 전송" disabled={!draft.trim() || busy || !canSend}><Icon name="send" size={18} /></button>
        </div>
        {sendStatus !== 'idle' && (
          <p className={'send-result' + (sendStatus === 'failed' ? ' send-result-failed' : '')} role="status">{statusLabels[sendStatus]}</p>
        )}
      </form>
    </section>
  )
}
