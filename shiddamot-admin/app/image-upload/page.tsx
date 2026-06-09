'use client'

import { useState, useRef } from 'react'
import AuthGate from '@/components/AuthGate'
import { ArrowRight, Upload, Copy, Check, Loader2, ImageIcon, ExternalLink } from 'lucide-react'

const card = 'bg-white rounded-[18px] border-[1.5px] border-[var(--border)]'

interface Item { id: string; name: string; url: string; preview: string }

export default function ImageUploadPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!list.length) { setErr('اختر ملف صورة'); return }
    setBusy(true); setErr('')
    for (const file of list) {
      const preview = URL.createObjectURL(file)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'فشل الرفع')
        setItems(prev => [{ id: `${Date.now()}-${Math.random()}`, name: file.name, url: data.url, preview }, ...prev])
      } catch (e: any) {
        setErr(e?.message || 'فشل رفع ' + file.name)
      }
    }
    setBusy(false)
  }

  const copy = async (item: Item) => {
    try {
      await navigator.clipboard.writeText(item.url)
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = item.url; document.body.appendChild(ta); ta.select()
      document.execCommand('copy'); document.body.removeChild(ta)
      setCopiedId(item.id); setTimeout(() => setCopiedId(null), 2000)
    }
  }

  return (
    <AuthGate>
      <main className="max-w-[760px] mx-auto p-6">
        <div className="flex items-center gap-3 mb-2">
          <a href="/" className="flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--blue)] transition-colors">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </a>
          <h1 className="text-2xl font-black">رفع صورة</h1>
        </div>
        <p className="text-sm text-[var(--ink-soft)] mb-6">ارفع صورة على imgBB واحصل على الرابط جاهز للنسخ</p>

        <div
          onClick={() => !busy && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files) }}
          className="rounded-[16px] border-2 border-dashed p-10 text-center cursor-pointer transition-all bg-white"
          style={{ borderColor: dragOver ? 'var(--blue)' : 'var(--border)', background: dragOver ? 'var(--blue-soft)' : 'white' }}>
          {busy
            ? <><Loader2 className="w-9 h-9 mx-auto mb-3 text-[var(--blue)] animate-spin" /><p className="text-[var(--blue-dark)] font-bold">جاري الرفع...</p></>
            : <>
                <div className="w-14 h-14 rounded-[16px] bg-[var(--blue-soft)] flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-[var(--blue)]" />
                </div>
                <p className="text-[var(--ink-soft)] font-bold mb-1">اسحب الصورة هنا أو اضغط للاختيار</p>
                <p className="text-xs text-[var(--ink-faint)]">PNG · JPG · WebP · GIF — تقدر ترفع أكثر من وحدة</p>
              </>}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) upload(e.target.files); e.target.value = '' }} />
        </div>

        {err && <div className="mt-4 p-3 rounded-[10px] text-sm font-bold" style={{ background: 'var(--red-soft)', color: 'var(--red-dark)' }}>⚠️ {err}</div>}

        {items.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink-soft)]">
              <ImageIcon className="w-4 h-4" /> الصور المرفوعة ({items.length})
            </div>
            {items.map(item => (
              <div key={item.id} className={`${card} p-3 flex items-center gap-3`}>
                <img src={item.preview} alt="" className="w-16 h-16 rounded-[10px] object-cover flex-shrink-0 border border-[var(--border)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate mb-1.5">{item.name}</p>
                  <div className="flex items-center gap-1.5 bg-[var(--bg)] rounded-[8px] px-2.5 py-1.5">
                    <span dir="ltr" className="flex-1 text-[11px] text-[var(--ink-soft)] truncate">{item.url}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => copy(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold border-2 transition-all"
                    style={copiedId === item.id
                      ? { borderColor: 'var(--green)', background: 'var(--green-soft)', color: 'var(--green-dark)' }
                      : { borderColor: 'var(--blue)', background: 'var(--blue-soft)', color: 'var(--blue-dark)' }}>
                    {copiedId === item.id ? <><Check className="w-3.5 h-3.5" /> تم النسخ</> : <><Copy className="w-3.5 h-3.5" /> نسخ</>}
                  </button>
                  <a href={item.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold border border-[var(--border)] text-[var(--ink-soft)] hover:text-[var(--blue)] transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> فتح
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AuthGate>
  )
}
