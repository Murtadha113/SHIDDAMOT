'use client'

import { useState, useEffect } from 'react'
import AuthGate from '@/components/AuthGate'
import MediaUpload from '@/components/MediaUpload'
import { getCategories, getCategoryCounts, addCategory, updateCategory, deleteCategory } from '@/lib/firebase'
import { Category } from '@/lib/types'
import {
  ArrowRight, Plus, Edit2, Trash2, Save, X, FolderOpen, Eye, EyeOff, Loader2,
} from 'lucide-react'

const card = 'bg-white rounded-[18px] border-[1.5px] border-[var(--border)]'

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newImg, setNewImg] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const c = await getCategories()
      setCats(c); setLoading(false)
      setCounts(await getCategoryCounts(c.map(x => x.id)))
    } catch { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const doAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await addCategory(newName.trim(), newImg)
      setNewName(''); setNewImg(''); setAdding(false)
      await load()
    } catch {}
    setSaving(false)
  }

  const doDelete = async (c: Category) => {
    const n = counts[c.id] || 0
    if (!confirm(`حذف فئة "${c.name}"؟${n > 0 ? `\n⚠️ فيها ${n} سؤال — ما راح تنحذف الأسئلة بل تبقى بدون فئة.` : ''}`)) return
    await deleteCategory(c.id)
    setCats(cs => cs.filter(x => x.id !== c.id))
  }

  const toggleHidden = async (c: Category) => {
    await updateCategory(c.id, { isHidden: !c.isHidden })
    setCats(cs => cs.map(x => x.id === c.id ? { ...x, isHidden: !x.isHidden } : x))
  }

  return (
    <AuthGate>
      <main className="max-w-[1000px] mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <a href="/" className="flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--blue)] transition-colors">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </a>
          <h1 className="text-2xl font-black">الفئات</h1>
          <span className="text-xs font-bold text-[var(--ink-faint)] bg-white border border-[var(--border)] rounded-full px-3 py-1">{cats.length} فئة</span>
          <button onClick={() => setAdding(a => !a)}
            className="mr-auto flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-bold border-2 border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-dark)] hover:bg-[#9FE1CB] transition-colors">
            <Plus className="w-4 h-4" /> فئة جديدة
          </button>
        </div>

        {adding && (
          <div className={`${card} p-5 mb-5`}>
            <h3 className="font-bold mb-3">إضافة فئة</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">اسم الفئة</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: تاريخ البحرين"
                  className="w-full px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-[var(--border)] text-sm outline-none focus:border-[var(--blue)] transition-colors" />
              </div>
              <MediaUpload label="صورة الفئة (اختياري)" accept="image/*" value={newImg} mediaType="image"
                onChange={url => setNewImg(url)} onClear={() => setNewImg('')} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={doAdd} disabled={!newName.trim() || saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-bold text-sm border-2 border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-dark)] hover:bg-[#9FE1CB] transition-colors disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إضافة
              </button>
              <button onClick={() => { setAdding(false); setNewName(''); setNewImg('') }}
                className="px-5 py-2.5 rounded-[10px] font-bold text-sm border border-[var(--border)] text-[var(--ink-soft)]">إلغاء</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cats.map(c => (
              <div key={c.id} className={`${card} overflow-hidden ${c.isHidden ? 'opacity-60' : ''}`}>
                <div className="h-28 bg-[var(--blue-soft)] relative">
                  {c.imageUrl
                    ? <img src={c.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <div className="w-full h-full flex items-center justify-center"><FolderOpen className="w-10 h-10 text-[var(--blue)] opacity-40" /></div>}
                  <span className="absolute top-2 right-2 text-[11px] font-bold bg-white/90 rounded-full px-2.5 py-1 text-[var(--ink-soft)]">
                    {counts[c.id] ?? '—'} سؤال
                  </span>
                  {c.isHidden && <span className="absolute top-2 left-2 text-[11px] font-bold bg-[var(--red-soft)] text-[var(--red-dark)] rounded-full px-2.5 py-1">مخفية</span>}
                </div>
                <div className="p-3.5 flex items-center justify-between gap-2">
                  <span className="font-bold text-sm truncate">{c.name}</span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleHidden(c)} title={c.isHidden ? 'إظهار' : 'إخفاء'}
                      className="w-7 h-7 rounded-lg bg-[var(--bg)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--blue)] transition-colors">
                      {c.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditing(c)}
                      className="w-7 h-7 rounded-lg bg-[var(--blue-soft)] flex items-center justify-center text-[var(--blue)] hover:bg-[#C5DFFB] transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => doDelete(c)}
                      className="w-7 h-7 rounded-lg bg-[var(--red-soft)] flex items-center justify-center text-[var(--red)] hover:bg-[#F5D5C8] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <EditCatModal cat={editing} onClose={() => setEditing(null)}
            onSaved={updated => { setCats(cs => cs.map(x => x.id === updated.id ? updated : x)); setEditing(null) }} />
        )}
      </main>
    </AuthGate>
  )
}

function EditCatModal({ cat, onClose, onSaved }: { cat: Category; onClose: () => void; onSaved: (c: Category) => void }) {
  const [name, setName] = useState(cat.name)
  const [img, setImg] = useState(cat.imageUrl || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateCategory(cat.id, { name: name.trim(), imageUrl: img })
      onSaved({ ...cat, name: name.trim(), imageUrl: img })
    } catch {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[18px] w-full max-w-[440px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h3 className="font-black text-lg">تعديل الفئة</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--bg)] flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">اسم الفئة</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-[var(--border)] text-sm outline-none focus:border-[var(--blue)] transition-colors" />
          </div>
          <MediaUpload label="صورة الفئة" accept="image/*" value={img} mediaType="image"
            onChange={url => setImg(url)} onClear={() => setImg('')} />
        </div>
        <div className="flex gap-3 p-5 border-t border-[var(--border)]">
          <button onClick={save} disabled={!name.trim() || saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] font-bold text-sm border-2 border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-dark)] hover:bg-[#9FE1CB] transition-colors disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
          </button>
          <button onClick={onClose} className="px-5 py-3 rounded-[12px] font-bold text-sm border border-[var(--border)] text-[var(--ink-soft)]">إلغاء</button>
        </div>
      </div>
    </div>
  )
}
