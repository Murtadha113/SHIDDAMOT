'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'

type Props = {
  label: string
  accept: string // e.g. "image/*" or "audio/*,video/*" or "image/*,audio/*,video/*"
  value: string
  mediaType?: 'image' | 'audio' | 'video' | null
  onChange: (url: string, kind: 'image' | 'audio' | 'video') => void
  onClear: () => void
}

export default function MediaUpload({ label, accept, value, mediaType, onChange, onClear }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const handle = async (file: File) => {
    setBusy(true); setErr('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل الرفع')
      onChange(data.url, data.kind)
    } catch (e: any) {
      setErr(e?.message || 'فشل الرفع')
    }
    setBusy(false)
  }

  return (
    <div>
      <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">{label}</label>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }} />

      {value ? (
        <div className="relative rounded-[12px] border border-[var(--border)] overflow-hidden bg-[#F7FAFD] p-2">
          <button onClick={onClear} type="button"
            className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          {mediaType === 'image'
            ? <img src={value} alt="" className="w-full max-h-44 object-contain rounded-lg" />
            : mediaType === 'audio'
            ? <audio src={value} controls className="w-full mt-1" />
            : <video src={value} controls className="w-full max-h-44 rounded-lg" />}
          <p className="text-[10px] text-[var(--ink-faint)] mt-1.5 truncate" dir="ltr">{value}</p>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} disabled={busy}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-[12px] border-2 border-dashed border-[var(--border)] bg-[#F7FAFD] hover:border-[var(--blue)] transition-colors disabled:opacity-60">
          {busy
            ? <><Loader2 className="w-6 h-6 text-[var(--blue)] animate-spin" /><span className="text-[13px] text-[var(--blue-dark)] font-bold">جاري الرفع...</span></>
            : <><Upload className="w-6 h-6 text-[var(--ink-faint)]" /><span className="text-[13px] text-[var(--ink-soft)]">اضغط للرفع</span></>}
        </button>
      )}
      {err && <p className="text-[11px] text-[var(--red)] mt-1.5 font-bold">{err}</p>}
    </div>
  )
}
