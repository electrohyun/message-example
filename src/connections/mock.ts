import { connectSharedWorker } from 'smocket-client/shared-worker'
import type { SharedWorkerSocket } from 'smocket-client/shared-worker'
import type { ClientToServerEvents, ServerToClientEvents } from '../protocol'
import type { MessageConnection } from './connection'
import { listenToMockServerLogs, MOCK_WORKER_NAME } from '../mock/logging'

const MOCK_URL = 'http://message.mock'
let cached: {
  worker: SharedWorker
  socket: SharedWorkerSocket<ServerToClientEvents, ClientToServerEvents>
} | undefined

export function createMockConnection(name: string, token: string): MessageConnection {
  if (typeof SharedWorker !== 'function') {
    throw new Error('이 브라우저는 SharedWorker를 지원하지 않습니다. Chrome·Edge를 사용하거나 실제 서버 모드를 선택해주세요.')
  }
  listenToMockServerLogs()
  let firstConnection = false
  if (!cached) {
    const worker = new SharedWorker(new URL('../mock/worker.ts', import.meta.url), {
      name: MOCK_WORKER_NAME,
      type: 'module',
    })
    const socket = connectSharedWorker<ServerToClientEvents, ClientToServerEvents>(worker.port, {
      url: MOCK_URL, auth: { name, token },
    })
    cached = { worker, socket }
    firstConnection = true
  }
  const { worker, socket } = cached
  socket.auth = { name, token }
  // The factory starts the first connection itself. Later attempts reuse one
  // page-owned facade/port and create a fresh connection generation.
  const start = () => { if (!firstConnection) socket.connect() }
  return {
    get id() { return socket.id },
    get connected() { return socket.connected },
    start,
    disconnect() { socket.disconnect() },
    onConnect(listener) {
      socket.on('connect', listener)
      return () => { socket.off('connect', listener) }
    },
    onError(listener) {
      socket.on('connect_error', listener)
      socket.on('bridge_error', listener)
      const onWorkerError = (event: ErrorEvent) => {
        if (cached?.socket === socket) cached = undefined
        listener(new Error(event.message || '모킹 Worker를 시작하지 못했습니다. 페이지를 새로고침해주세요.'))
      }
      worker.addEventListener('error', onWorkerError)
      return () => {
        socket.off('connect_error', listener)
        socket.off('bridge_error', listener)
        worker.removeEventListener('error', onWorkerError)
      }
    },
    onDisconnect(listener) {
      socket.on('disconnect', listener)
      return () => { socket.off('disconnect', listener) }
    },
    onSession(listener) {
      socket.on('session:ready', listener)
      return () => { socket.off('session:ready', listener) }
    },
    onRooms(listener) {
      socket.on('rooms:changed', listener)
      return () => { socket.off('rooms:changed', listener) }
    },
    onUsers(listener) {
      socket.on('users:changed', listener)
      return () => { socket.off('users:changed', listener) }
    },
    onMessage(listener) {
      socket.on('message:received', listener)
      return () => { socket.off('message:received', listener) }
    },
    onMarker(listener) {
      socket.on('diagnostics:marker', listener)
      return () => { socket.off('diagnostics:marker', listener) }
    },
    onReset(listener) {
      socket.on('demo:reset', listener)
      return () => { socket.off('demo:reset', listener) }
    },
    onEvent(listener) {
      socket.onAny(listener)
      return () => { socket.offAny(listener) }
    },
    getSession() { return socket.emitWithAck('session:info') },
    listRooms() { return socket.emitWithAck('rooms:list') },
    createRoom(name) { return socket.emitWithAck('rooms:create', { name }) },
    joinRoom(roomId) { return socket.emitWithAck('rooms:join', { roomId }) },
    leaveRoom() { return socket.emitWithAck('rooms:leave') },
    sendMessage(request) { return socket.emitWithAck('message:send', request) },
    checkAck(value) { return socket.emitWithAck('ack:check', { value }) },
    checkAckCallback(value, callback) { socket.emit('ack:check', { value }, callback) },
    sendMarker() { return socket.emitWithAck('diagnostics:marker') },
    reset() { return socket.emitWithAck('demo:reset') },
  }
}
