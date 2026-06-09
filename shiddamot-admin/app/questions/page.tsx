'use client'

import { useState, useEffect } from 'react'
import AuthGate from '@/components/AuthGate'
import MediaUpload from '@/components/MediaUpload'
import {
  getCategories, getCategoryCounts, getQuestionsByCategory,
  updateQuestion, deleteQuestion, deleteQuestionsBatch,
} from '@/lib/firebase'
import { Category, Question, POINTS_MAP, DIFFICULTY_LABEL, TYPE_LABEL } from '@/lib/types'
import {
  ArrowRight, Search, Edit2, Trash2, Save, X, CheckSquare, Square,
  Loader2, RefreshCw, FolderOpen,
} from 'lucide-react'

const card = 'bg-white rounded-[18px] border-[1.5px] border-[var(--border)]'

export default function QuestionsPage() {
  const [cats, setCats] = useState<Category[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [diffFilter, setDiffFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Question | null>(null)
  const [catLoading, setCatLoading] = useState(true)

  useEffect(() => {
    getCategories().then(async (c) => {
      setCats(c)
      setCatLoading(false)
      setCounts(await getCategoryCounts(c.map(x => x.id)))
    }).catch(() => setCatLoading(false))
  }, [])

  const openCat = async (cat: Category) => {
    setSelectedCat(cat); setLoading(true); setSelected(new Set())
    setSearch(''); setDiffFilter(''); setTypeFilter('')
    try { setQuestions(await getQuestionsByCategory(cat.id)) } catch { setQuestions([]) }
    setLoading(false)
  }

  const reload = async () => {
    if (!selectedCat) return
    setLoading(true)
    try { setQuestions(await getQuestionsByCategory(selectedCat.id)) } catch {}
    setLoading(false)
  }

  const filtered = questions.filter(q =>
    (!search || q.content.includes(search) || q.answer.includes(search)) &&
    (!diffFilter || q.difficulty === diffFilter) &&
    (!typeFilter || q.type === typeFilter)
  )

  const toggleSel = (id: string) => {
    const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n)
  }
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(q => q.id)))
  }

  const doDelete = async (id: string) => {
    if (!confirm('متأكد من حذف هذا السؤال؟')) return
    await deleteQuestion(id)
    setQuestions(qs => qs.filter(q => q.id !== id))
    setCounts(c => selectedCat ? { ...c, [selectedCat.id]: (c[selectedCat.id] || 1) - 1 } : c)
  }

  const doBulkDelete = async () => {
    if (!selected.size || !confirm(`متأكد من حذف ${selected.size} سؤال؟`)) return
    const ids = [...selected]
    await deleteQuestionsBatch(ids)
    setQuestions(qs => qs.filter(q => !selected.has(q.id)))
    setCounts(c => selectedCat ? { ...c, [selectedCat.id]: Math.max(0, (c[selectedCat.id] || 0) - ids.length) } : c)
    setSelected(new Set())
  }

  return (
    <AuthGate>
      <main className="max-w-[1100px] mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <a href="/" className="flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--blue)] transition-colors">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </a>
          <h1 className="text-2xl font-black">مراجعة الأسئلة</h1>
        </div>

        {!selectedCat ? (
          // ─── اختيار الفئة ───
          <div className={`${card} p-5`}>
            <p className="text-sm text-[var(--ink-soft)] mb-4">اختر فئة لعرض أسئلتها</p>
            {catLoading ? (
              <div className="flex justify-center py-10"><div className="spinner" /></div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {cats.map(c => (
                  <button key={c.id} onClick={() => openCat(c)}
                    className="flex items-center justify-between p-3.5 rounded-[12px] border border-[var(--border)] hover:border-[var(--blue)] hover:bg-[var(--blue-soft)] transition-all text-right">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {c.imageUrl
                        ? <img src={c.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        : <div className="w-9 h-9 rounded-lg bg-[var(--blue-soft)] flex items-center justify-center flex-shrink-0"><FolderOpen className="w-4 h-4 text-[var(--blue)]" /></div>}
                      <span className="font-bold text-sm truncate">{c.name}</span>
                    </div>
                    <span className="text-xs font-bold text-[var(--ink-faint)] bg-[var(--bg)] rounded-full px-2.5 py-1 flex-shrink-0">
                      {counts[c.id] ?? '—'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          // ─── أسئلة الفئة ───
          <>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <button onClick={() => setSelectedCat(null)}
                className="flex items-center gap-1.5 text-sm font-bold text-[var(--blue-dark)] bg-[var(--blue-soft)] rounded-[10px] px-3.5 py-2 hover:bg-[#C5DFFB] transition-colors">
                <ArrowRight className="w-4 h-4" /> كل الفئات
              </button>
              <h2 className="text-lg font-black">{selectedCat.name}</h2>
              <span className="text-xs font-bold text-[var(--ink-faint)] bg-white border border-[var(--border)] rounded-full px-3 py-1">{questions.length} سؤال</span>
              <button onClick={reload} className="text-[var(--ink-faint)] hover:text-[var(--blue)] transition-colors"><RefreshCw className="w-4 h-4" /></button>
            </div>

            <div className={`${card} p-4 mb-4`}>
              <div className="flex gap-2.5 flex-wrap items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-[var(--ink-faint)] absolute right-3 top-1/2 -translate-y-1/2" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في السؤال أو الإجابة..."
                    className="w-full pr-9 pl-3 py-2.5 rounded-[10px] border-[1.5px] border-[var(--border)] text-sm outline-none focus:border-[var(--blue)] transition-colors" />
                </div>
                <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-[10px] border-[1.5px] border-[var(--border)] text-sm outline-none focus:border-[var(--blue)]">
                  <option value="">كل الصعوبات</option>
                  <option value="easy">سهل</option><option value="medium">متوسط</option><option value="hard">صعب</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-[10px] border-[1.5px] border-[var(--border)] text-sm outline-none focus:border-[var(--blue)]">
                  <option value="">كل الأنواع</option>
                  <option value="text">نص</option><option value="image">صورة</option><option value="audio">صوت</option><option value="video">فيديو</option>
                </select>
              </div>

              {filtered.length > 0 && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border-soft)]">
                  <button onClick={toggleAll} className="flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--blue)] transition-colors">
                    {selected.size === filtered.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    تحديد الكل ({filtered.length})
                  </button>
                  {selected.size > 0 && (
                    <button onClick={doBulkDelete}
                      className="flex items-center gap-1.5 text-sm font-bold text-[var(--red)] hover:text-[var(--red-dark)] transition-colors mr-auto">
                      <Trash2 className="w-4 h-4" /> حذف المحدد ({selected.size})
                    </button>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className={`${card} p-12 text-center text-[var(--ink-soft)]`}>
                {questions.length === 0 ? 'ما في أسئلة في هذه الفئة' : 'ما في نتائج مطابقة'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filtered.map(q => (
                  <QuestionCard key={q.id} q={q} selected={selected.has(q.id)}
                    onToggle={() => toggleSel(q.id)} onEdit={() => setEditing(q)} onDelete={() => doDelete(q.id)} />
                ))}
              </div>
            )}
          </>
        )}

        {editing && (
          <EditModal q={editing} cats={cats}
            onClose={() => setEditing(null)}
            onSaved={(updated) => { setQuestions(qs => qs.map(x => x.id === updated.id ? updated : x)); setEditing(null) }} />
        )}
      </main>
    </AuthGate>
  )
}

// ─── بطاقة سؤال ───
function QuestionCard({ q, selected, onToggle, onEdit, onDelete }: {
  q: Question; selected: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void
}) {
  const diffColor = q.difficulty === 'easy' ? 'var(--green)' : q.difficulty === 'medium' ? 'var(--amber)' : 'var(--red)'
  return (
    <div className={`${card} p-4 ${selected ? 'ring-2 ring-[var(--blue)]' : ''}`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 flex-shrink-0 text-[var(--ink-faint)] hover:text-[var(--blue)] transition-colors">
          {selected ? <CheckSquare className="w-5 h-5 text-[var(--blue)]" /> : <Square className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-bold">{TYPE_LABEL[q.type]}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: diffColor, background: `${diffColor}1a` }}>
              {DIFFICULTY_LABEL[q.difficulty]} · {q.points}
            </span>
            {q.isTrialQuestion && <span className="text-[11px] font-bold text-[var(--blue-dark)] bg-[var(--blue-soft)] px-2 py-0.5 rounded-full">تجريبي</span>}
            {q.options && q.options.length >= 2 && <span className="text-[11px] text-[var(--amber)] font-bold">{q.options.length} خيارات</span>}
          </div>
          <p className="font-bold text-[15px] mb-1 leading-relaxed">{q.content}</p>
          <p className="text-sm text-[var(--green-dark)] font-bold">✓ {q.answer}</p>
          {q.hint && <p className="text-xs text-[var(--ink-faint)] mt-1">💡 {q.hint}</p>}

          {(q.mediaUrl || q.answerMediaUrl) && (
            <div className="flex gap-2 mt-2.5">
              {q.mediaUrl && <MediaThumb url={q.mediaUrl} type={q.type} label="سؤال" />}
              {q.answerMediaUrl && <MediaThumb url={q.answerMediaUrl} type={q.answerMediaType || 'image'} label="جواب" />}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button onClick={onEdit} className="w-8 h-8 rounded-lg bg-[var(--blue-soft)] flex items-center justify-center text-[var(--blue)] hover:bg-[#C5DFFB] transition-colors"><Edit2 className="w-4 h-4" /></button>
          <button onClick={onDelete} className="w-8 h-8 rounded-lg bg-[var(--red-soft)] flex items-center justify-center text-[var(--red)] hover:bg-[#F5D5C8] transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}

function MediaThumb({ url, type, label }: { url: string; type: string; label: string }) {
  return (
    <div className="relative">
      {type === 'image'
        ? <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover border border-[var(--border)]" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        : type === 'audio'
        ? <a href={url} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-lg bg-[#F0E8FB] flex items-center justify-center text-xl">🎵</a>
        : <a href={url} target="_blank" rel="noreferrer" className="w-14 h-14 rounded-lg bg-[#FBE8F0] flex items-center justify-center text-xl">🎬</a>}
      <span className="absolute -bottom-1.5 right-1/2 translate-x-1/2 text-[8px] bg-white border border-[var(--border)] rounded px-1 text-[var(--ink-faint)]">{label}</span>
    </div>
  )
}

// ─── نافذة التعديل ───
function EditModal({ q, cats, onClose, onSaved }: {
  q: Question; cats: Category[]; onClose: () => void; onSaved: (q: Question) => void
}) {
  const [f, setF] = useState({
    content: q.content, answer: q.answer, categoryId: q.categoryId,
    difficulty: q.difficulty, type: q.type, hint: q.hint || '',
    mediaUrl: q.mediaUrl || '', answerMediaUrl: q.answerMediaUrl || '',
    answerMediaType: q.answerMediaType || null,
    options: [...(q.options || []), '', '', '', ''].slice(0, 4),
    isTrialQuestion: q.isTrialQuestion || false,
  })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof f, v: any) => setF(p => ({ ...p, [k]: v }))
  const inputCls = 'w-full px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-[var(--border)] text-sm outline-none focus:border-[var(--blue)] transition-colors'
  const acceptForType = f.type === 'image' ? 'image/*' : f.type === 'audio' ? 'audio/*' : f.type === 'video' ? 'video/*' : ''

  const save = async () => {
    setSaving(true)
    const opts = f.options.map(o => o.trim()).filter(Boolean)
    const data: Partial<Question> = {
      content: f.content.trim(), answer: f.answer.trim(), categoryId: f.categoryId,
      difficulty: f.difficulty, type: f.type, points: POINTS_MAP[f.difficulty],
      isTrialQuestion: f.isTrialQuestion,
      hint: f.hint.trim() || undefined,
      mediaUrl: f.type !== 'text' && f.mediaUrl ? f.mediaUrl : undefined,
      answerMediaUrl: f.answerMediaUrl || undefined,
      answerMediaType: f.answerMediaUrl ? (f.answerMediaType || 'image') : undefined,
      options: opts.length >= 2 ? opts : undefined,
    }
    try {
      await updateQuestion(q.id, data)
      onSaved({ ...q, ...data, hint: data.hint, mediaUrl: data.mediaUrl, answerMediaUrl: data.answerMediaUrl, answerMediaType: data.answerMediaType, options: data.options } as Question)
    } catch {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[18px] w-full max-w-[560px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] sticky top-0 bg-white z-10">
          <h3 className="font-black text-lg">تعديل السؤال</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--bg)] flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">الفئة</label>
              <select value={f.categoryId} onChange={e => set('categoryId', e.target.value)} className={inputCls}>
                {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">الصعوبة</label>
              <select value={f.difficulty} onChange={e => set('difficulty', e.target.value)} className={inputCls}>
                <option value="easy">سهل (15)</option><option value="medium">متوسط (30)</option><option value="hard">صعب (50)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">نص السؤال</label>
            <textarea value={f.content} onChange={e => set('content', e.target.value)} rows={2} className={inputCls} />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">الإجابة</label>
            <input value={f.answer} onChange={e => set('answer', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">النوع</label>
            <div className="flex gap-2 flex-wrap">
              {(['text', 'image', 'audio', 'video'] as const).map(t => (
                <button key={t} type="button" onClick={() => { set('type', t); if (t === 'text') set('mediaUrl', '') }}
                  className={`px-3.5 py-2 rounded-[10px] text-sm font-bold border-2 transition-all ${f.type === t ? 'border-[var(--blue)] bg-[var(--blue-soft)] text-[var(--blue-dark)]' : 'border-[var(--border)] text-[var(--ink-soft)]'}`}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {f.type !== 'text' && (
            <MediaUpload label={`وسيطة السؤال (${TYPE_LABEL[f.type]})`} accept={acceptForType}
              value={f.mediaUrl} mediaType={f.type as any}
              onChange={url => set('mediaUrl', url)} onClear={() => set('mediaUrl', '')} />
          )}

          <MediaUpload label="وسيطة الإجابة (اختياري)" accept="image/*,audio/*,video/*"
            value={f.answerMediaUrl} mediaType={f.answerMediaType}
            onChange={(url, kind) => { set('answerMediaUrl', url); set('answerMediaType', kind) }}
            onClear={() => { set('answerMediaUrl', ''); set('answerMediaType', null) }} />

          <div>
            <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">تلميح</label>
            <input value={f.hint} onChange={e => set('hint', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">الخيارات</label>
            <div className="grid grid-cols-2 gap-2">
              {f.options.map((o, i) => (
                <input key={i} value={o} onChange={e => { const n = [...f.options]; n[i] = e.target.value; set('options', n) }}
                  className={inputCls} placeholder={`خيار ${i + 1}`} />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input type="checkbox" checked={f.isTrialQuestion} onChange={e => set('isTrialQuestion', e.target.checked)} className="w-4 h-4 accent-[var(--blue)]" />
            <span className="text-sm text-[var(--ink-soft)]">سؤال تجريبي</span>
          </label>
        </div>

        <div className="flex gap-3 p-5 border-t border-[var(--border)] sticky bottom-0 bg-white">
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[12px] font-bold text-sm border-2 border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-dark)] hover:bg-[#9FE1CB] transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ التعديلات
          </button>
          <button onClick={onClose} className="px-5 py-3 rounded-[12px] font-bold text-sm border border-[var(--border)] text-[var(--ink-soft)]">إلغاء</button>
        </div>
      </div>
    </div>
  )
}
