import { useEffect, useState } from 'react'
import { ensureAnonAuth, firebaseReady } from '../lib/firebase'

/** ล็อกอินนิรนามอัตโนมัติ คืน uid (null ระหว่างรอ) */
export function useAuth() {
  const [uid, setUid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseReady) return
    let alive = true
    ensureAnonAuth()
      .then((u) => {
        if (alive) setUid(u)
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      alive = false
    }
  }, [])

  return { uid, error, ready: firebaseReady }
}
