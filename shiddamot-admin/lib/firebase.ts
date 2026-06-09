'use client'

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import {
  getFirestore, Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, where, writeBatch, getCountFromServer, deleteField,
} from 'firebase/firestore'
import type { Category, Question } from './types'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// ═══ تهيئة كسولة (lazy) — تشتغل أول استخدام بالمتصفح فقط ═══
let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _db: Firestore | null = null

function app(): FirebaseApp {
  if (!_app) _app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return _app
}
export function getAuthInstance(): Auth {
  if (!_auth) _auth = getAuth(app())
  return _auth
}
function db(): Firestore {
  if (!_db) _db = getFirestore(app())
  return _db
}

const COL = { questions: 'questions', categories: 'categories' }

// ═══════════════ ADMIN ═══════════════
export async function checkIsAdmin(uid: string): Promise<boolean> {
  if (uid === process.env.NEXT_PUBLIC_ADMIN_UID) return true
  try {
    const snap = await getDoc(doc(db(), 'users', uid))
    return snap.exists() && snap.data().isAdmin === true
  } catch { return false }
}

// ═══════════════ CATEGORIES ═══════════════
export async function getCategories(): Promise<Category[]> {
  const snap = await getDocs(collection(db(), COL.categories))
  const cats = snap.docs.map(d => ({ ...d.data(), id: d.id } as Category))
  cats.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order
    return (a.name || '').localeCompare(b.name || '', 'ar')
  })
  return cats
}

export async function addCategory(name: string, imageUrl = ''): Promise<string> {
  const ref = await addDoc(collection(db(), COL.categories), { name, imageUrl, createdAt: new Date() })
  await updateDoc(doc(db(), COL.categories, ref.id), { id: ref.id })
  return ref.id
}

export async function updateCategory(
  id: string,
  data: { name?: string; imageUrl?: string; isHidden?: boolean; isMajlis?: boolean }
): Promise<void> {
  await updateDoc(doc(db(), COL.categories, id), data)
}

// حفظ جماعي لحالة "فئة المجلس"
export async function saveMajlisFlags(updates: { id: string; isMajlis: boolean }[]): Promise<void> {
  const batch = writeBatch(db())
  updates.forEach(u => batch.update(doc(db(), COL.categories, u.id), { isMajlis: u.isMajlis }))
  await batch.commit()
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db(), COL.categories, id))
}

// عدد الأسئلة لكل فئة — aggregation query (ما ينزّل المستندات)
export async function getCategoryCounts(catIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  await Promise.all(catIds.map(async (id) => {
    try {
      const q = query(collection(db(), COL.questions), where('categoryId', '==', id))
      const snap = await getCountFromServer(q)
      out[id] = snap.data().count
    } catch { out[id] = 0 }
  }))
  return out
}

// ═══════════════ QUESTIONS ═══════════════
export async function getQuestionsByCategory(categoryId: string): Promise<Question[]> {
  const q = query(collection(db(), COL.questions), where('categoryId', '==', categoryId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Question))
}

// يُستخدم فقط لتقرير جاهزية الفئات (إجراء أدمن نادر، بضغطة زر)
export async function getAllQuestions(): Promise<Question[]> {
  try {
    const snap = await getDocs(collection(db(), COL.questions))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Question))
  } catch { return [] }
}

export async function addQuestion(question: Omit<Question, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db(), COL.questions), { ...question, createdAt: new Date() })
  return ref.id
}

// رفع جماعي بـ batch — كل batch حتى 450 سؤال في طلب واحد
export async function addQuestionsBatch(
  questions: Omit<Question, 'id'>[],
  onProgress?: (done: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  let success = 0, failed = 0
  const CHUNK = 450
  for (let i = 0; i < questions.length; i += CHUNK) {
    const slice = questions.slice(i, i + CHUNK)
    const batch = writeBatch(db())
    slice.forEach(q => {
      const ref = doc(collection(db(), COL.questions))
      batch.set(ref, { ...q, createdAt: new Date() })
    })
    try {
      await batch.commit()
      success += slice.length
    } catch {
      failed += slice.length
    }
    onProgress?.(Math.min(i + CHUNK, questions.length), questions.length)
  }
  return { success, failed }
}

export async function updateQuestion(id: string, data: Partial<Question>): Promise<void> {
  const clean = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === undefined ? deleteField() : v])
  )
  await updateDoc(doc(db(), COL.questions, id), clean as any)
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db(), COL.questions, id))
}

// حذف جماعي
export async function deleteQuestionsBatch(ids: string[]): Promise<void> {
  const CHUNK = 450
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db())
    ids.slice(i, i + CHUNK).forEach(id => batch.delete(doc(db(), COL.questions, id)))
    await batch.commit()
  }
}
