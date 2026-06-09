'use client'

import { useState, useEffect, useRef } from 'react'
import AuthGate from '@/components/AuthGate'
import MediaUpload from '@/components/MediaUpload'
import { getCategories, addQuestion, addQuestionsBatch } from '@/lib/firebase'
import { parseCSV, parseExcel, processRows, downloadTemplate, ParsedRow } from '@/lib/csv'
import { Category, Question, POINTS_MAP, DIFFICULTY_LABEL, TYPE_LABEL } from '@/lib/types'
import {
  ArrowRight, Upload, Download, FileText, CheckCircle, AlertTriangle,
  Plus, FileSpreadsheet, PencilLine, Trash2,
} from 'lucide-react'

const card = 'bg-white rounded-[18px] border-[1.5px] border-[var(--border)]'

export default function AddPage() {
  const [tab, setTab] = useState<'file' | 'manual'>('file')
  const [cats, setCats] = useState<Category[]>([])
  useEffect(() => { getCategories().then(setCats).catch(() => {}) }, [])

  return (
    <AuthGate>
      <main className="max-w-[960px] mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <a href="/" className="flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--blue)] transition-colors">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </a>
          <h1 className="text-2xl font-black">رفع الأسئلة</h1>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('file')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-sm font-bold border-2 transition-all ${tab === 'file' ? 'border-[var(--blue)] bg-[var(--blue-soft)] text-[var(--blue-dark)]' : 'border-[var(--border)] bg-white text-[var(--ink-soft)]'}`}>
            <FileSpreadsheet className="w-4 h-4" /> رفع ملف
          </button>
          <button onClick={() => setTab('manual')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-sm font-bold border-2 transition-all ${tab === 'manual' ? 'border-[var(--blue)] bg-[var(--blue-soft)] text-[var(--blue-dark)]' : 'border-[var(--border)] bg-white text-[var(--ink-soft)]'}`}>
            <PencilLine className="w-4 h-4" /> إدخال يدوي
          </button>
        </div>

        {tab === 'file' ? <FileTab cats={cats} /> : <ManualTab cats={cats} />}
      </main>
    </AuthGate>
  )
}

// ════════════════════ رفع ملف ════════════════════
function FileTab({ cats }: { cats: Category[] }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState({ success: 0, failed: 0 })

  const handleFile = async (file: File) => {
    setFileName(file.name); setStatus('idle'); setRows([]); setResult({ success: 0, failed: 0 }); setParsing(true)
    try {
      const isExcel = /\.(xlsx|xls)$/i.test(file.name)
      const parsed = isExcel ? await parseExcel(file) : parseCSV(await file.text())
      setRows(processRows(parsed, cats))
    } catch (e) { console.error(e) }
    setParsing(false)
  }

  const upload = async () => {
    const valid = rows.filter(r => r.valid).map(({ valid, error, ...q }) => q as Omit<Question, 'id'>)
    if (!valid.length) return
    setStatus('uploading'); setProgress(0)
    const res = await addQuestionsBatch(valid, (done, total) => setProgress(Math.round((done / total) * 100)))
    setResult(res); setStatus(res.failed === 0 ? 'done' : 'error')
  }

  const validCount = rows.filter(r => r.valid).length
  const invalidCount = rows.length - validCount

  return (
    <>
      <div className={`${card} p-5 mb-5`}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center bg-[var(--blue-soft)]">
              <FileText className="w-5 h-5 text-[var(--blue)]" />
            </div>
            <div>
              <div className="font-bold text-sm">ملف CSV أو Excel</div>
              <div className="text-xs text-[var(--ink-faint)] mt-0.5">يدعم النص · الصور · الصوت · الفيديو · الخيارات</div>
            </div>
          </div>
          <button onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-bold border border-[var(--border)] text-[var(--blue-dark)] bg-[var(--blue-soft)] hover:bg-[#C5DFFB] transition-colors">
            <Download className="w-4 h-4" /> تحميل القالب
          </button>
        </div>

        <div onClick={() => !parsing && fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          className="border-2 border-dashed border-[var(--border)] rounded-[14px] p-10 text-center cursor-pointer bg-[#F7FAFD] hover:border-[var(--blue)] transition-colors">
          <Upload className="w-9 h-9 mx-auto mb-3 text-[var(--ink-faint)]" />
          {parsing
            ? <p className="text-[var(--blue)] font-bold animate-pulse">جاري تحليل الملف...</p>
            : <>
                <p className="text-[var(--ink-soft)] font-bold mb-1">اسحب الملف هنا أو اضغط للاختيار</p>
                <p className="text-xs text-[var(--ink-faint)]">{fileName || 'CSV أو Excel (.xlsx / .xls)'}</p>
              </>}
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,text/csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      </div>

      {rows.length > 0 && (
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="font-bold">معاينة ({rows.length})</div>
            <div className="flex gap-3 text-sm">
              <span className="text-[var(--green-dark)] font-bold">✅ {validCount} صالح</span>
              {invalidCount > 0 && <span className="text-[var(--red)] font-bold">❌ {invalidCount} خطأ</span>}
            </div>
          </div>

          <div className="rounded-[12px] border border-[var(--border)] overflow-auto max-h-80">
            <table className="w-full text-xs min-w-[680px]">
              <thead className="sticky top-0 bg-[var(--blue-soft)]">
                <tr>
                  {['#', 'السؤال', 'الإجابة', 'النوع', 'الفئة', 'الصعوبة', 'الحالة'].map(h => (
                    <th key={h} className="text-right px-3 py-2 text-[var(--blue-dark)] font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-[var(--border-soft)]" style={{ background: r.valid ? undefined : 'var(--red-soft)' }}>
                    <td className="px-3 py-2 text-[var(--ink-faint)]">{i + 1}</td>
                    <td className="px-3 py-2 max-w-[160px]"><span className="truncate block">{r.content}</span></td>
                    <td className="px-3 py-2 max-w-[110px] text-[var(--ink-soft)]"><span className="truncate block">{r.answer}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">{TYPE_LABEL[r.type]}</td>
                    <td className="px-3 py-2 text-[var(--ink-soft)] whitespace-nowrap">{cats.find(c => c.id === r.categoryId)?.name || r.categoryId}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{DIFFICULTY_LABEL[r.difficulty]}</td>
                    <td className="px-3 py-2">{r.valid ? <CheckCircle className="w-4 h-4 text-[var(--green)]" /> : <span className="text-[var(--red)] text-[10px]">{r.error}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {status === 'uploading' ? (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-[var(--ink-soft)] mb-2"><span>جاري الرفع...</span><span>{progress}%</span></div>
              <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--blue)' }} />
              </div>
            </div>
          ) : status === 'done' ? (
            <div className="mt-4 flex items-center gap-3 p-4 rounded-[12px] bg-[var(--green-soft)] border border-[var(--green)]">
              <CheckCircle className="w-5 h-5 text-[var(--green)]" />
              <span className="text-[var(--green-dark)] font-bold">تم رفع {result.success} سؤال بنجاح! 🎉</span>
            </div>
          ) : status === 'error' ? (
            <div className="mt-4 flex items-center gap-3 p-4 rounded-[12px] bg-[var(--red-soft)] border border-[var(--red)]">
              <AlertTriangle className="w-5 h-5 text-[var(--red)]" />
              <span className="text-[var(--red-dark)] font-bold">تم رفع {result.success} ، فشل {result.failed}</span>
            </div>
          ) : (
            <button onClick={upload} disabled={validCount === 0}
              className="mt-4 w-full py-3 rounded-[12px] font-bold text-sm border-2 border-[var(--blue)] bg-[var(--blue-soft)] text-[var(--blue-dark)] hover:bg-[#C5DFFB] transition-colors disabled:opacity-40">
              رفع {validCount} سؤال ←
            </button>
          )}
        </div>
      )}
    </>
  )
}

// ════════════════════ إدخال يدوي ════════════════════
const emptyForm = {
  content: '', answer: '', categoryId: '', difficulty: 'easy' as Question['difficulty'],
  type: 'text' as Question['type'], hint: '', mediaUrl: '',
  answerMediaUrl: '', answerMediaType: null as Question['answerMediaType'] | null,
  options: ['', '', '', ''], isTrialQuestion: false,
}

function ManualTab({ cats }: { cats: Category[] }) {
  const [f, setF] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof f, v: any) => setF(p => ({ ...p, [k]: v }))

  const canSave = f.content.trim() && f.answer.trim() && f.categoryId
  const acceptForType = f.type === 'image' ? 'image/*' : f.type === 'audio' ? 'audio/*' : f.type === 'video' ? 'video/*' : ''

  const save = async () => {
    if (!canSave) return
    setSaving(true); setDone(false)
    const opts = f.options.map(o => o.trim()).filter(Boolean)
    const q: Omit<Question, 'id'> = {
      content: f.content.trim(), answer: f.answer.trim(), categoryId: f.categoryId,
      difficulty: f.difficulty, type: f.type, points: POINTS_MAP[f.difficulty],
      isTrialQuestion: f.isTrialQuestion,
      ...(f.hint.trim() ? { hint: f.hint.trim() } : {}),
      ...(f.type !== 'text' && f.mediaUrl ? { mediaUrl: f.mediaUrl } : {}),
      ...(f.answerMediaUrl ? { answerMediaUrl: f.answerMediaUrl, answerMediaType: f.answerMediaType || 'image' } : {}),
      ...(opts.length >= 2 ? { options: opts } : {}),
    }
    try { await addQuestion(q); setDone(true); setF({ ...emptyForm }) } catch {}
    setSaving(false)
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-[var(--border)] text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white'

  return (
    <div className={`${card} p-6`}>
      {done && (
        <div className="mb-5 flex items-center gap-3 p-3.5 rounded-[12px] bg-[var(--green-soft)] border border-[var(--green)]">
          <CheckCircle className="w-5 h-5 text-[var(--green)]" />
          <span className="text-[var(--green-dark)] font-bold text-sm">تم حفظ السؤال! تقدر تضيف الجاي</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">الفئة *</label>
          <select value={f.categoryId} onChange={e => set('categoryId', e.target.value)} className={inputCls}>
            <option value="">— اختر الفئة —</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">الصعوبة *</label>
          <select value={f.difficulty} onChange={e => set('difficulty', e.target.value)} className={inputCls}>
            <option value="easy">سهل (15)</option>
            <option value="medium">متوسط (30)</option>
            <option value="hard">صعب (50)</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">نص السؤال *</label>
        <textarea value={f.content} onChange={e => set('content', e.target.value)} rows={2} className={inputCls} placeholder="اكتب السؤال هنا..." />
      </div>

      <div className="mb-4">
        <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">الإجابة *</label>
        <input value={f.answer} onChange={e => set('answer', e.target.value)} className={inputCls} placeholder="الإجابة الصحيحة" />
      </div>

      <div className="mb-4">
        <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">نوع السؤال</label>
        <div className="flex gap-2 flex-wrap">
          {(['text', 'image', 'audio', 'video'] as const).map(t => (
            <button key={t} type="button"
              onClick={() => { set('type', t); if (t === 'text') set('mediaUrl', '') }}
              className={`px-4 py-2 rounded-[10px] text-sm font-bold border-2 transition-all ${f.type === t ? 'border-[var(--blue)] bg-[var(--blue-soft)] text-[var(--blue-dark)]' : 'border-[var(--border)] text-[var(--ink-soft)]'}`}>
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {f.type !== 'text' && (
        <div className="mb-4">
          <MediaUpload label={`وسيطة السؤال (${TYPE_LABEL[f.type]})`} accept={acceptForType}
            value={f.mediaUrl} mediaType={f.type as any}
            onChange={(url) => set('mediaUrl', url)} onClear={() => set('mediaUrl', '')} />
        </div>
      )}

      <div className="mb-4">
        <MediaUpload label="وسيطة الإجابة (اختياري — صورة/صوت/فيديو)" accept="image/*,audio/*,video/*"
          value={f.answerMediaUrl} mediaType={f.answerMediaType}
          onChange={(url, kind) => { set('answerMediaUrl', url); set('answerMediaType', kind) }}
          onClear={() => { set('answerMediaUrl', ''); set('answerMediaType', null) }} />
      </div>

      <div className="mb-4">
        <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">تلميح (اختياري)</label>
        <input value={f.hint} onChange={e => set('hint', e.target.value)} className={inputCls} placeholder="تلميح للسؤال" />
      </div>

      <div className="mb-5">
        <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">خيارات الإجابة (اختياري — للاختيار من متعدد)</label>
        <div className="grid sm:grid-cols-2 gap-2">
          {f.options.map((o, i) => (
            <input key={i} value={o} onChange={e => { const n = [...f.options]; n[i] = e.target.value; set('options', n) }}
              className={inputCls} placeholder={`خيار ${i + 1}`} />
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 mb-6 cursor-pointer w-fit">
        <input type="checkbox" checked={f.isTrialQuestion} onChange={e => set('isTrialQuestion', e.target.checked)} className="w-4 h-4 accent-[var(--blue)]" />
        <span className="text-sm text-[var(--ink-soft)]">سؤال تجريبي (يظهر في الوضع التجريبي)</span>
      </label>

      <div className="flex gap-3">
        <button onClick={save} disabled={!canSave || saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] font-bold text-sm border-2 border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-dark)] hover:bg-[#9FE1CB] transition-colors disabled:opacity-40">
          {saving ? '⏳ جاري الحفظ...' : <><Plus className="w-4 h-4" /> حفظ السؤال</>}
        </button>
        <button onClick={() => setF({ ...emptyForm })} type="button"
          className="px-5 py-3 rounded-[12px] font-bold text-sm border border-[var(--border)] text-[var(--ink-soft)] hover:text-[var(--red)] transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
