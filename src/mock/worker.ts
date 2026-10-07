/// <reference lib="webworker" />

import { Server } from 'smocket'
import { attachSharedWorker } from 'smocket/shared-worker'
import { registerMessageApplication } from './application'
import { createMockServerLogger } from './logging'
import type { ClientToServerEvents, ConnectionData, ServerToClientEvents } from '../protocol'

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, ConnectionData>('http://message.mock')
registerMessageApplication(io, createMockServerLogger())

const workerScope = globalThis as unknown as SharedWorkerGlobalScope
workerScope.onconnect = (event) => {
  const port = event.ports[0]
  if (port) attachSharedWorker(io, port)
}
