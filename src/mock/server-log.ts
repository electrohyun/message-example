export type ServerLogKind = 'REQUEST' | 'CONNECT' | 'CREATE' | 'JOIN' | 'LEAVE' | 'CLOSE' | 'UPDATE' | 'SEND' | 'ACK' | 'MARKER' | 'RESET' | 'REJECT' | 'ERROR' | 'READY' | 'INFO'
export interface ServerLog {
  kind: ServerLogKind
  caseId: string
  summary: string
  details: Record<string, unknown>
}
export interface ServerLogBlock {
  caseId: string
  title: string
  entries: ServerLog[]
}
export type ServerLogOutput = ServerLog | ServerLogBlock
export type ServerLogger = (output: ServerLogOutput) => void

const colors: Record<ServerLogKind, string> = {
  REQUEST: '#2563eb', CONNECT: '#15803d', CREATE: '#15803d', JOIN: '#15803d',
  LEAVE: '#64748b', CLOSE: '#64748b', UPDATE: '#2563eb', SEND: '#2563eb',
  ACK: '#15803d', MARKER: '#2563eb', RESET: '#7c3aed', REJECT: '#b45309',
  ERROR: '#b91c1c', READY: '#15803d', INFO: '#64748b',
}

function isServerLog(value: unknown): value is ServerLog {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<ServerLog>
  return typeof entry.kind === 'string' && Object.hasOwn(colors, entry.kind)
    && typeof entry.caseId === 'string' && typeof entry.summary === 'string'
    && entry.details !== null && typeof entry.details === 'object' && !Array.isArray(entry.details)
}

export function isServerLogOutput(value: unknown): value is ServerLogOutput {
  if (isServerLog(value)) return true
  if (!value || typeof value !== 'object') return false
  const block = value as Partial<ServerLogBlock>
  return typeof block.caseId === 'string' && typeof block.title === 'string'
    && Array.isArray(block.entries) && block.entries.every(isServerLog)
}

function printEntry(entry: ServerLog, grouped: boolean) {
  const code = grouped ? '' : entry.caseId.padEnd(6) + ' '
  const args = [
    '%c ' + entry.kind.padEnd(7) + ' %c ' + code + '%c' + entry.summary,
    'background:' + colors[entry.kind] + ';color:white;font-weight:bold;border-radius:3px;font-family:monospace;',
    'color:#64748b;font-weight:bold;font-family:monospace;',
    'color:inherit;font-weight:normal;',
  ]
  if (Object.keys(entry.details).length) {
    console.groupCollapsed(...args)
    console.info('상세 정보', entry.details)
    console.groupEnd()
  } else {
    console.info(...args)
  }
}

export function printServerLog(output: ServerLogOutput) {
  if ('entries' in output) {
    const heading = [output.caseId, output.title].filter(Boolean).join(' ')
    console.group('%c── ' + heading + ' ──', 'color:#64748b;font-weight:bold;')
    for (const entry of output.entries) printEntry(entry, true)
    console.groupEnd()
  } else {
    printEntry(output, false)
  }
}
