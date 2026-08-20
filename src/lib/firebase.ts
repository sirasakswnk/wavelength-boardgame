// จุดเชื่อม Firebase — อ่าน config จาก .env (VITE_FIREBASE_*)
// ยังไม่มี config ก็ไม่พัง: firebaseReady = false, ตัวเกมจะโชว์ว่ายังต่อไม่ได้
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth } from 'firebase/auth'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** true เมื่อเติม config ครบพอเริ่มต่อได้ */
export const firebaseReady = Boolean(cfg.apiKey && cfg.databaseURL)

let app: FirebaseApp | null = null
let db: Database | null = null
let auth: Auth | null = null

export function getFirebase() {
  if (!firebaseReady) {
    throw new Error('ยังไม่ได้ตั้งค่า Firebase — เติมค่า VITE_FIREBASE_* ในไฟล์ .env')
  }
  if (!app) {
    app = initializeApp(cfg)
    db = getDatabase(app)
    auth = getAuth(app)
  }
  return { app: app!, db: db!, auth: auth! }
}

/** ล็อกอินนิรนาม (เงียบๆ ไม่มีหน้า login) → คืน uid คงที่ต่อ browser */
export function ensureAnonAuth(): Promise<string> {
  const { auth } = getFirebase()
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid)
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub()
        resolve(user.uid)
      }
    })
    signInAnonymously(auth).catch((err) => {
      unsub()
      reject(err)
    })
  })
}
