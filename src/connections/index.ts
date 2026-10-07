import { createRealConnection } from './real'
import { createMockConnection } from './mock'
import type { MessageConnection, Mode } from './connection'

export function createConnection(mode: Mode, name: string, token: string): MessageConnection {
  return mode === 'real' ? createRealConnection(name, token) : createMockConnection(name, token)
}
export type { MessageConnection, Mode } from './connection'
