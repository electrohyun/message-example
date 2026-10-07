import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '../protocol'
import type { MessageConnection } from './connection'

export function createRealConnection(name: string, token: string): MessageConnection {
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    import.meta.env.VITE_SERVER_URL || 'http://127.0.0.1:3001',
    { auth: { name, token }, autoConnect: false, reconnection: false, forceNew: true },
  )
  const start = () => { socket.connect() }
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
      return () => {
        socket.off('connect_error', listener)
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
