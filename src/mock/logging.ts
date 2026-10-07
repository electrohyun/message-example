import { isServerLogOutput, printServerLog } from './server-log'
import type { ServerLogger } from './server-log'

// Diagnostic records use a separate channel from the Socket.IO bridge.
export const MOCK_WORKER_NAME = 'smocket-message-v1-' + __MESSAGE_WORKER_VERSION__
const LOG_CHANNEL_NAME = MOCK_WORKER_NAME + '-logs'
const LOG_MESSAGE_TYPE = 'mock-server-log'
let pageChannel: BroadcastChannel | undefined

export function listenToMockServerLogs() {
  if (pageChannel) return
  const channel = new BroadcastChannel(LOG_CHANNEL_NAME)
  pageChannel = channel
  channel.addEventListener('message', (event) => {
    if (event.data?.type === LOG_MESSAGE_TYPE && isServerLogOutput(event.data.entry)) {
      printServerLog(event.data.entry)
    }
  })
  window.addEventListener('pagehide', () => {
    channel.close()
    if (pageChannel === channel) pageChannel = undefined
  }, { once: true })
}

export function createMockServerLogger(): ServerLogger {
  const channel = new BroadcastChannel(LOG_CHANNEL_NAME)
  return (entry) => {
    printServerLog(entry)
    try {
      channel.postMessage({ type: LOG_MESSAGE_TYPE, entry })
    } catch {
      // A diagnostic forwarding failure must not interrupt server processing.
    }
  }
}
