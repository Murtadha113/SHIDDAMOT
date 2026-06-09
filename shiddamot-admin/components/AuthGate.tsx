'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth'
import { auth, checkIsAdmin } from '@/lib/firebase'
import { LogOut, User as UserIcon } from 'lucide-react'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) { setUser(u); setIsAdmin(await checkIsAdmin(u.uid)) }
      else { setUser(null); setIsAdmin(false) }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const doLogin = async () => {
    if (!email || !pass) { setErr('الرجاء إدخال الإيميل وكلمة المرور'); return }
    setBusy(true); setErr('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass)
    } catch (e: any) {
      const c = e?.code || ''
      setErr(
        c.includes('wrong-password') || c.includes('invalid-credential') ? 'كلمة المرور غلط'
        : c.includes('user-not-found') ? 'الحساب غير موجود'
        : c.includes('invalid-email') ? 'الإيميل غير صحيح'
        : 'خطأ في تسجيل الدخول'
      )
    }
    setBusy(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="spinner" />
        <p className="text-[var(--ink-soft)]">جاري التحقق...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-[20px] border border-[var(--border)] p-9 max-w-[400px] w-full text-center shadow-[0_4px_24px_rgba(43,125,212,0.08)]">
          <div className="text-5xl mb-3">🔐</div>
          <h2 className="text-[22px] font-black mb-1.5">شدة موت — لوحة الأسئلة</h2>
          <p className="text-sm text-[var(--ink-soft)] mb-7">سجّل دخولك بحساب الأدمن</p>
          <div className="text-right mb-3.5">
            <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">الإيميل</label>
            <input type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full px-3.5 py-3 rounded-[10px] border-[1.5px] border-[var(--border)] text-sm text-left outline-none focus:border-[var(--blue)] transition-colors" />
          </div>
          <div className="text-right mb-3.5">
            <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">كلمة المرور</label>
            <input type="password" dir="ltr" value={pass} onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="••••••••"
              className="w-full px-3.5 py-3 rounded-[10px] border-[1.5px] border-[var(--border)] text-sm text-left outline-none focus:border-[var(--blue)] transition-colors" />
          </div>
          <button onClick={doLogin} disabled={busy}
            className="w-full py-3 rounded-[12px] border-2 border-[var(--blue)] bg-[var(--blue-soft)] text-[var(--blue-dark)] text-base font-bold mt-2 hover:bg-[#C5DFFB] transition-colors disabled:opacity-50">
            {busy ? '⏳ جاري الدخول...' : 'دخول →'}
          </button>
          {err && <div className="mt-3 py-2.5 px-3.5 rounded-[10px] bg-[var(--red-soft)] text-[var(--red-dark)] text-[13px] font-bold">{err}</div>}
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center">
        <div className="text-5xl">🚫</div>
        <h2 className="text-xl font-black">ليس لديك صلاحية</h2>
        <p className="text-[var(--ink-soft)]">هذا الحساب ليس أدمن</p>
        <button onClick={() => signOut(auth)}
          className="px-5 py-2.5 rounded-[10px] border border-[var(--border)] text-[var(--ink-soft)] hover:text-[var(--red)] transition-colors">
          تسجيل خروج
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white border-b border-[var(--border)] px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <a href="/" className="text-base font-black flex items-center gap-2">🎯 شدة موت — لوحة الأسئلة</a>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-[var(--blue-soft)] rounded-full px-3.5 py-1.5 text-[13px] font-bold text-[var(--blue-dark)]">
            <UserIcon className="w-3.5 h-3.5" /> {user.email}
          </div>
          <button onClick={() => signOut(auth)}
            className="flex items-center gap-1.5 text-[var(--ink-faint)] hover:text-[var(--red)] text-[13px] transition-colors px-2 py-1">
            <LogOut className="w-4 h-4" /> خروج
          </button>
        </div>
      </div>
      {children}
    </>
  )
}
