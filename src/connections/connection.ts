import type {
  AckCheck, AckResult, Marker, Message, Participant, Room, SendMessage,
} from '../protocol'

export type Mode = 'real' | 'mock'
export type Unsubscribe = () => void

// The application uses this small common surface instead of pretending that
// SharedWorker exposes the complete Socket.IO Client API.
export interface MessageConnection {
  readonly id: string | undefined
  readonly connected: boolean
  start(): void
  disconnect(): void
  onConnect(listener: () => void): Unsubscribe
  onError(listener: (error: Error) => void): Unsubscribe
  onDisconnect(listener: (reason: string) => void): Unsubscribe
  onSession(listener: (user: Participant) => void): Unsubscribe
  onRooms(listener: (rooms: Room[]) => void): Unsubscribe
  onUsers(listener: (users: Participant[]) => void): Unsubscribe
  onMessage(listener: (message: Message) => void): Unsubscribe
  onMarker(listener: (marker: Marker) => void): Unsubscribe
  onReset(listener: () => void): Unsubscribe
  onEvent(listener: (event: string, ...args: unknown[]) => void): Unsubscribe
  getSession(): Promise<AckResult<Participant>>
  listRooms(): Promise<AckResult<Room[]>>
  createRoom(name: string): Promise<AckResult<Room>>
  joinRoom(roomId: string): Promise<AckResult<Room>>
  leaveRoom(): Promise<AckResult<{ roomId: string | null }>>
  sendMessage(request: SendMessage): Promise<AckResult<Message>>
  checkAck(value: string): Promise<AckResult<AckCheck>>
  checkAckCallback(value: string, callback: (result: AckResult<AckCheck>) => void): void
  sendMarker(): Promise<AckResult<Marker>>
  reset(): Promise<AckResult<{ reset: true }>>
}
