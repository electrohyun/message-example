import type { Message } from './protocol'

export type { Delivery, Message, Participant, Room } from './protocol'
export type { Mode } from './connections/connection'
export type SendStatus = 'idle' | 'sending' | 'sent' | 'failed'
export interface DisplayMessage extends Message {
  displayId: string
}
export interface RoomNotice {
  id: string
  kind: 'presence'
  roomId: string
  text: string
  sentAt: string
}
export type ChatEntry = DisplayMessage | RoomNotice
export interface EventRecord {
  id: number
  time: string
  event: string
  detail: string
}
