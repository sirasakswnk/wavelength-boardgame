import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../lib/errors'

export function useAction() {
  const lock = useRef(false)
  const retry = useRef<(() => Promise<unknown>) | null>(null)
  const alive = useRef(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  const report = useCallback((e: unknown) => { if (alive.current) setError(errorMessage(e)) }, [])
  const run = useCallback(async (action: () => Promise<unknown>) => {
    if (lock.current) return
    lock.current = true
    retry.current = action
    setBusy(true)
    setError(null)
    try { await action(); retry.current = null }
    catch (e) { report(e) }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }, [report])
  return { busy, error, report, run, retry: () => { if (retry.current) void run(retry.current) } }
}
