import { useEffect, useRef, useState } from 'react'
import { createConnection } from '../connections'
import type { MessageConnection, Mode } from '../connections'
import type { AckCheck, AckResult, Delivery, Participant, Room } from '../protocol'
import type { ChatEntry, EventRecord, RoomNotice, SendStatus } from '../types'

interface ConnectionLease {
  connection: MessageConnection
  controller: AbortController
  unsubscribe: Array<() => void>
  user?: Participant
  roomsVersion: number
  roomsSnapshot: Room[]
  resetting: boolean
}

function release(lease: ConnectionLease) {
  lease.controller.abort()
  for (const unsubscribe of lease.unsubscribe) unsubscribe()
  lease.unsubscribe = []
  lease.connection.disconnect()
}

// This cancels UI work on disconnect. It is not an ACK timeout implementation.
function whileConnected<T>(reply: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error('접속이 종료되었습니다.'))
    if (signal.aborted) {
      void reply.catch(() => {})
      abort()
      return
    }
    signal.addEventListener('abort', abort, { once: true })
    reply.then(
      (value) => { signal.removeEventListener('abort', abort); resolve(value) },
      (error: unknown) => { signal.removeEventListener('abort', abort); reject(error) },
    )
  })
}

export function useMessageSession() {
  const active = useRef<ConnectionLease | null>(null)
  const eventId = useRef(0)
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [user, setUser] = useState<Participant | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [users, setUsers] = useState<Participant[]>([])
  const [roomId, setRoomId] = useState<string | null>(null)
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [events, setEvents] = useState<EventRecord[]>([])
  const [pending, setPending] = useState(0)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [ackResult, setAckResult] = useState('')
  const [markerId, setMarkerId] = useState('')

  function record(event: string, detail: string) {
    const entry = { id: ++eventId.current, time: new Date().toLocaleTimeString('ko-KR'), event, detail }
    setEvents((current) => [...current.slice(-39), entry])
  }

  function clearRecords() {
    setEntries([])
    setSendStatus('idle')
    setEvents([])
    setAckResult('')
    setMarkerId('')
    eventId.current = 0
  }

  async function request<T>(
    label: string, action: (connection: MessageConnection) => Promise<AckResult<T>>,
  ): Promise<T | undefined> {
    const lease = active.current
    if (!lease?.connection.connected || lease.controller.signal.aborted) {
      setError('먼저 접속해주세요.')
      return undefined
    }
    setPending((count) => count + 1)
    setError('')
    record('요청 · ' + label, '')
    try {
      const result = await whileConnected(action(lease.connection), lease.controller.signal)
      if (active.current !== lease || lease.controller.signal.aborted) return undefined
      if (!result.ok) throw new Error(result.error)
      record('ACK · ' + label, JSON.stringify(result.data))
      setFeedback('요청을 처리했습니다.')
      return result.data
    } catch (failure) {
      if (active.current === lease && !lease.controller.signal.aborted) {
        const message = failure instanceof Error ? failure.message : '요청을 처리하지 못했습니다.'
        setError(message)
        record('실패 · ' + label, message)
      }
      return undefined
    } finally {
      if (active.current === lease) setPending((count) => Math.max(0, count - 1))
    }
  }

  async function refreshRooms() {
    const lease = active.current
    const version = lease?.roomsVersion
    const result = await request('rooms:list', (connection) => connection.listRooms())
    // A later pushed update wins over an earlier list ACK.
    if (result && active.current === lease && !lease?.controller.signal.aborted && lease?.roomsVersion === version) setRooms(result)
  }

  function disconnect() {
    const lease = active.current
    active.current = null
    if (lease) release(lease)
    setStatus('disconnected')
    setUser(null)
    setConnectionId(null)
    setRoomId(null)
    setRooms([])
    setUsers([])
    setPending(0)
    setError('')
    setFeedback('접속을 종료했습니다.')
    record('disconnect', '사용자가 접속을 종료했습니다.')
  }

  function connect(mode: Mode, name: string, token: string) {
    const previous = active.current
    active.current = null
    if (previous) release(previous)
    setStatus('connecting')
    setUser(null)
    setConnectionId(null)
    setRoomId(null)
    setRooms([])
    setUsers([])
    setPending(0)
    setError('')
    setFeedback('')
    clearRecords()

    let connection: MessageConnection
    try {
      connection = createConnection(mode, name, token)
    } catch (failure) {
      setStatus('disconnected')
      setError(failure instanceof Error ? failure.message : '접속을 시작하지 못했습니다.')
      return
    }
    const lease: ConnectionLease = {
      connection, controller: new AbortController(), unsubscribe: [], roomsVersion: 0, roomsSnapshot: [], resetting: false,
    }
    active.current = lease
    const owns = () => active.current === lease && !lease.controller.signal.aborted

    function connectionFailed(message: string) {
      if (active.current !== lease) return
      active.current = null
      release(lease)
      setStatus('disconnected')
      setUser(null)
      setConnectionId(null)
      setRoomId(null)
      setRooms([])
      setUsers([])
      setPending(0)
      setError(message)
      record('connect_error', message)
    }

    lease.unsubscribe = [
      connection.onEvent((event, ...args) => {
        if (!owns()) return
        record(event, JSON.stringify(args))
      }),
      connection.onConnect(() => {
        if (!owns()) return
        setStatus('connected')
        setConnectionId(connection.id ?? null)
        record('connect', connection.id ?? '')
        void request('session:info', (client) => client.getSession()).then((identity) => {
          if (identity && owns()) { lease.user = identity; setUser(identity) }
        })
        void refreshRooms()
      }),
      connection.onSession((identity) => {
        if (!owns()) return
        lease.user = identity
        setUser(identity)
        setConnectionId(identity.id)
      }),
      connection.onRooms((snapshot) => {
        if (!owns()) return
        const identity = lease.user?.id ?? connection.id
        const notices: RoomNotice[] = []
        for (const room of snapshot) {
          const previous = lease.roomsSnapshot.find((entry) => entry.id === room.id)
          const wasInside = previous?.participants.some((peer) => peer.id === identity) ?? false
          const isInside = room.participants.some((peer) => peer.id === identity)
          if (!wasInside && !isInside) continue

          // On entry, report our own arrival rather than treating existing
          // occupants as new arrivals. Later snapshots describe actual changes.
          const arrivals = wasInside
            ? room.participants.filter((peer) => !previous?.participants.some((old) => old.id === peer.id))
            : room.participants.filter((peer) => peer.id === identity)
          const departures = wasInside
            ? (previous?.participants ?? []).filter((peer) => !room.participants.some((next) => next.id === peer.id))
            : []
          for (const [participants, action] of [[departures, '퇴장'], [arrivals, '입장']] as const) {
            for (const peer of participants) {
              notices.push({
                id: crypto.randomUUID(), kind: 'presence', roomId: room.id,
                text: peer.name + '님이 ' + action + '했습니다.', sentAt: new Date().toISOString(),
              })
            }
          }
        }
        lease.roomsSnapshot = snapshot
        lease.roomsVersion++
        if (notices.length) setEntries((current) => [...current, ...notices])
        setRooms(snapshot)
      }),
      connection.onUsers((snapshot) => { if (owns()) setUsers(snapshot) }),
      connection.onMessage((message) => {
        if (!owns()) return
        const entry: ChatEntry = { ...message, displayId: crypto.randomUUID() }
        setEntries((current) => [...current, entry])
      }),
      connection.onMarker((marker) => {
        if (!owns()) return
        setMarkerId(marker.id)
      }),
      connection.onReset(() => {
        if (active.current !== lease) return
        lease.resetting = true
        lease.controller.abort()
        clearRecords()
        setPending(0)
        setRoomId(null)
        setError('')
        setFeedback('전체 연결과 대화방을 초기화했습니다.')
      }),
      connection.onDisconnect((reason) => {
        if (active.current !== lease) return
        active.current = null
        release(lease)
        setStatus('disconnected')
        setUser(null)
        setConnectionId(null)
        setRoomId(null)
        setRooms([])
        setUsers([])
        setPending(0)
        setError('')
        if (!lease.resetting) {
          setFeedback('접속이 종료되었습니다: ' + reason)
          record('disconnect', reason)
        }
      }),
      connection.onError((failure) => connectionFailed(failure.message)),
    ]
    try { connection.start() } catch (failure) {
      connectionFailed(failure instanceof Error ? failure.message : '접속을 시작하지 못했습니다.')
    }
  }

  async function joinRoom(nextRoomId: string) {
    const lease = active.current
    const result = await request('rooms:join', (connection) => connection.joinRoom(nextRoomId))
    if (!result || active.current !== lease || lease?.controller.signal.aborted) return
    setRooms((current) => current.some((room) => room.id === result.id) ? current : [...current, result])
    setRoomId(result.id)
    setSendStatus('idle')
    setFeedback(result.name + '에 입장했습니다.')
  }

  async function createRoom(name: string) {
    const lease = active.current
    const result = await request('rooms:create', (connection) => connection.createRoom(name))
    if (!result || active.current !== lease || lease?.controller.signal.aborted) return
    setRooms((current) => current.some((room) => room.id === result.id) ? current : [...current, result])
    setRoomId(result.id)
    setSendStatus('idle')
    setFeedback(result.name + '을 만들었습니다.')
  }

  async function leaveRoom() {
    const lease = active.current
    const result = await request('rooms:leave', (connection) => connection.leaveRoom())
    if (!result || active.current !== lease || lease?.controller.signal.aborted) return
    setRoomId(null)
    setSendStatus('idle')
    setFeedback('대기실로 돌아왔습니다.')
  }

  async function sendMessage(text: string, delivery: Delivery, recipientId?: string): Promise<boolean> {
    const lease = active.current
    if (!lease?.connection.connected || lease.controller.signal.aborted || !lease.user || !roomId) {
      setError('먼저 대화방에 입장해주세요.')
      return false
    }
    setSendStatus('sending')
    const result = await request('message:send', (connection) => connection.sendMessage({
      requestId: crypto.randomUUID(), text, delivery, ...(recipientId ? { recipientId } : {}),
    }))
    if (active.current !== lease || lease.controller.signal.aborted) return false
    if (!result) { setSendStatus('failed'); return false }
    setSendStatus('sent')
    setFeedback('메시지를 전송했습니다.')
    return true
  }

  async function checkAck(method: 'callback' | 'promise') {
    const lease = active.current
    const result = await request('ack:check · ' + method, (connection) => method === 'promise'
      ? connection.checkAck('')
      : new Promise<AckResult<AckCheck>>((resolve) => connection.checkAckCallback('', resolve)))
    if (result && active.current === lease && !lease?.controller.signal.aborted) setAckResult((method === 'callback' ? '콜백 ACK' : 'Promise ACK') + ' 응답을 받았습니다.')
  }

  async function sendMarker() {
    await request('diagnostics:marker', (connection) => connection.sendMarker())
  }

  async function reset() {
    await request('demo:reset', (connection) => connection.reset())
  }

  useEffect(() => {
    // A refreshed effect has already released its previous connection.
    if (!active.current) {
      setStatus('disconnected')
      setUser(null)
      setConnectionId(null)
      setRoomId(null)
      setRooms([])
      setUsers([])
      setPending(0)
    }
    const onPageHide = () => {
      const lease = active.current
      active.current = null
      if (lease) release(lease)
      setStatus('disconnected')
      setUser(null)
      setConnectionId(null)
      setRoomId(null)
      setRooms([])
      setUsers([])
      setPending(0)
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      const lease = active.current
      active.current = null
      if (lease) release(lease)
    }
  }, [])

  return {
    status, user, connectionId, rooms, users, roomId, entries, sendStatus, events,
    busy: pending > 0, error, feedback, ackResult, markerId,
    connect, disconnect, refreshRooms, joinRoom, createRoom, leaveRoom,
    sendMessage, checkAck, sendMarker, reset,
  }
}

export type MessageSession = ReturnType<typeof useMessageSession>
