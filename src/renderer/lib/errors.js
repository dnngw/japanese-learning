// Electron prefixes IPC errors with "Error invoking remote method '…': Error: ".
export function errorMessage(err) {
  const msg = err?.message ?? String(err)
  return msg.replace(/^Error invoking remote method '[^']+': (?:\w*Error: )?/, '')
}
