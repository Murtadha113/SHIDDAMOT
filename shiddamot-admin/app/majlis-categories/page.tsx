'use client'

import { useState, useEffect } from 'react'
import AuthGate from '@/components/AuthGate'
import { getCategories, saveMajlisFlags } from '@/lib/firebase'
import { Category } from '@/lib/types'
import { ArrowRight, Save, Check, FolderOpen, Loader2, CheckSquare, Square } from 'lucide-react'

const card = 'bg-white rounded-[18px] border-[1.5px] border-[var(--border)]'

export default function MajlisCategoriesPage() {
  const [cats, setCats] = useState<(Category & { isMajlis: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const c = await getCategories()
      setCats(c.map(x => ({ ...x, isMajlis: x.isMajlis ?? false })))
    } catch {}
    setLoading(false)
  }

  const toggle = (id: string) =>
    setCats(prev => prev.map(c => c.id === id ? { ...c, isMajlis: !c.isMajlis } : c))

  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      await saveMajlisFlags(cats.map(c => ({ id: c.id, isMajlis: c.isMajlis })))
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch { alert('صار خطأ أثناء الحفظ') }
    setSaving(false)
  }

  const majlisCount = cats.filter(c => c.isMajlis).length

  return (
    <AuthGate>
      <main className="max-w-[1000px] mx-auto p-6">
        <div className="flex items-center gap-3 mb-2">
          <a href="/" className="flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--blue)] transition-colors">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </a>
          <h1 className="text-2xl font-black">فئات المجلس</h1>
        </div>
        <p className="text-sm text-[var(--ink-soft)] mb-6">الفئات المفعّلة هنا تظهر في وضع المجلس · {majlisCount} من {cats.length}</p>

        <div className="flex items-center gap-2.5 mb-5 flex-wrap">
          <button onClick={() => setCats(p => p.map(c => ({ ...c, isMajlis: true })))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold border border-[var(--border)] text-[var(--blue-dark)] bg-[var(--blue-soft)] hover:bg-[#C5DFFB] transition-colors">
            <CheckSquare className="w-3.5 h-3.5" /> تحديد الكل
          </button>
          <button onClick={() => setCats(p => p.map(c => ({ ...c, isMajlis: false })))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-bold border border-[var(--border)] text-[var(--ink-soft)] hover:bg-[var(--bg)] transition-colors">
            <Square className="w-3.5 h-3.5" /> إلغاء الكل
          </button>

          <div className="mr-auto flex items-center gap-3">
            {saved && <span className="text-sm text-[var(--green-dark)] font-bold flex items-center gap-1"><Check className="w-4 h-4" /> تم الحفظ</span>}
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-sm font-bold border-2 border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-dark)] hover:bg-[#9FE1CB] transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner" /></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            {cats.map(c => (
              <button key={c.id} onClick={() => toggle(c.id)}
                className="flex items-center gap-3 p-3.5 rounded-[12px] border-[1.5px] text-right transition-all"
                style={{
                  background: c.isMajlis ? 'var(--blue-soft)' : 'white',
                  borderColor: c.isMajlis ? 'var(--blue)' : 'var(--border)',
                }}>
                <div className="w-10 h-10 rounded-[10px] overflow-hidden flex-shrink-0 flex items-center justify-center bg-[var(--bg)]">
                  {c.imageUrl
                    ? <img src={c.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <FolderOpen className="w-4 h-4 text-[var(--blue)]" />}
                </div>
                <span className="flex-1 text-sm font-bold truncate" style={{ color: c.isMajlis ? 'var(--blue-dark)' : 'var(--ink)' }}>
                  {c.name}
                </span>
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all"
                  style={{
                    borderColor: c.isMajlis ? 'var(--blue)' : 'var(--border)',
                    background: c.isMajlis ? 'var(--blue)' : 'transparent',
                  }}>
                  {c.isMajlis && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </AuthGate>
  )
}
