'use client'

import { useState, useEffect } from 'react'
import AuthGate from '@/components/AuthGate'
import { getCategories, getAllQuestions } from '@/lib/firebase'
import { Question } from '@/lib/types'
import { ArrowRight, RefreshCw } from 'lucide-react'

const TARGET_GAMES = 12
const PER_GAME = 2

interface CategoryStats {
  id: string; name: string
  easy: number; medium: number; hard: number
  totalQuestions: number; gamesReady: number
}

function getStatus(games: number): 'ready' | 'warning' | 'danger' {
  if (games >= TARGET_GAMES) return 'ready'
  if (games >= TARGET_GAMES / 2) return 'warning'
  return 'danger'
}

const STATUS = {
  ready:   { label: 'جاهزة',       bg: 'var(--green-soft)', border: 'var(--green)', text: 'var(--green-dark)' },
  warning: { label: 'تحتاج تعبئة', bg: 'var(--amber-soft)', border: 'var(--amber)', text: 'var(--amber)' },
  danger:  { label: 'ناقصة',        bg: 'var(--red-soft)',   border: 'var(--red)',   text: 'var(--red-dark)' },
}

const card = 'bg-white rounded-[18px] border-[1.5px] border-[var(--border)]'

export default function CategoriesStatusPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CategoryStats[]>([])
  const [filter, setFilter] = useState<'all' | 'ready' | 'warning' | 'danger'>('all')
  const [sortBy, setSortBy] = useState<'games' | 'total' | 'name'>('games')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [categories, questions] = await Promise.all([getCategories(), getAllQuestions()])
      const map: Record<string, CategoryStats> = {}
      categories.forEach(c => { map[c.id] = { id: c.id, name: c.name, easy: 0, medium: 0, hard: 0, totalQuestions: 0, gamesReady: 0 } })
      questions.forEach((q: Question) => {
        if (!map[q.categoryId]) return
        if (q.difficulty === 'easy') map[q.categoryId].easy++
        else if (q.difficulty === 'medium') map[q.categoryId].medium++
        else if (q.difficulty === 'hard') map[q.categoryId].hard++
        map[q.categoryId].totalQuestions++
      })
      Object.values(map).forEach(c => { c.gamesReady = Math.floor(Math.min(c.easy, c.medium, c.hard) / PER_GAME) })
      setStats(Object.values(map))
    } catch {}
    setLoading(false)
  }

  const filtered = stats
    .filter(c => filter === 'all' || getStatus(c.gamesReady) === filter)
    .sort((a, b) => {
      if (sortBy === 'games') return a.gamesReady - b.gamesReady
      if (sortBy === 'total') return b.totalQuestions - a.totalQuestions
      return a.name.localeCompare(b.name, 'ar')
    })

  const readyCount   = stats.filter(c => getStatus(c.gamesReady) === 'ready').length
  const warningCount = stats.filter(c => getStatus(c.gamesReady) === 'warning').length
  const dangerCount  = stats.filter(c => getStatus(c.gamesReady) === 'danger').length

  return (
    <AuthGate>
      <main className="max-w-[1100px] mx-auto p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--blue)] transition-colors">
              <ArrowRight className="w-4 h-4" /> الرئيسية
            </a>
            <div>
              <h1 className="text-2xl font-black">جاهزية الفئات</h1>
              <p className="text-xs text-[var(--ink-soft)] mt-0.5">كم لعبة تكفي كل فئة حسب الأسئلة الموجودة</p>
            </div>
          </div>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-bold border border-[var(--border)] text-[var(--blue-dark)] bg-[var(--blue-soft)] hover:bg-[#C5DFFB] transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20"><div className="spinner" /><p className="text-[var(--ink-soft)] text-sm">جاري جلب البيانات...</p></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'إجمالي الفئات', value: stats.length, color: 'var(--blue)', icon: '📂' },
                { label: `جاهزة (≥${TARGET_GAMES})`, value: readyCount, color: 'var(--green-dark)', icon: '✅' },
                { label: 'تحتاج تعبئة', value: warningCount, color: 'var(--amber)', icon: '⚠️' },
                { label: 'ناقصة جداً', value: dangerCount, color: 'var(--red)', icon: '🚨' },
              ].map((it, i) => (
                <div key={i} className={`${card} p-4 flex items-center gap-3`}>
                  <span className="text-2xl">{it.icon}</span>
                  <div>
                    <div className="text-2xl font-black leading-none" style={{ color: it.color }}>{it.value}</div>
                    <div className="text-xs text-[var(--ink-soft)] mt-1">{it.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={`${card} p-4 mb-5`}>
              <div className="flex justify-between text-xs text-[var(--ink-soft)] mb-2">
                <span>نسبة الجاهزية</span>
                <span className="font-bold text-[var(--ink)]">{readyCount} / {stats.length} فئة جاهزة</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${stats.length ? (readyCount / stats.length) * 100 : 0}%`, background: 'linear-gradient(90deg, var(--green), var(--blue))' }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 mb-4 items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: 'all', label: `الكل (${stats.length})` },
                  { key: 'danger', label: `ناقصة (${dangerCount})` },
                  { key: 'warning', label: `تحتاج (${warningCount})` },
                  { key: 'ready', label: `جاهزة (${readyCount})` },
                ] as const).map(fl => (
                  <button key={fl.key} onClick={() => setFilter(fl.key)}
                    className="px-3.5 py-1.5 rounded-[10px] text-xs font-bold border-[1.5px] transition-all"
                    style={filter === fl.key
                      ? { background: 'var(--blue)', borderColor: 'var(--blue)', color: 'white' }
                      : { background: 'white', borderColor: 'var(--border)', color: 'var(--ink-soft)' }}>
                    {fl.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-[var(--ink-soft)]">ترتيب:</span>
                {([
                  { key: 'games', label: 'الأقل أولاً' },
                  { key: 'total', label: 'الأكثر أسئلة' },
                  { key: 'name', label: 'الاسم' },
                ] as const).map(s => (
                  <button key={s.key} onClick={() => setSortBy(s.key)}
                    className="px-3 py-1.5 rounded-[8px] text-xs border transition-all"
                    style={sortBy === s.key
                      ? { background: 'var(--blue-soft)', borderColor: 'var(--blue)', color: 'var(--blue-dark)' }
                      : { background: 'transparent', borderColor: 'var(--border)', color: 'var(--ink-soft)' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="grid items-center px-5 py-3 border-b border-[var(--border)] bg-[var(--blue-soft)]"
                    style={{ gridTemplateColumns: '1fr 70px 70px 70px 80px 110px 110px' }}>
                    {['الفئة', 'سهل', 'وسط', 'صعب', 'إجمالي', 'ألعاب جاهزة', 'الحالة'].map((h, i) => (
                      <div key={i} className="text-[11px] font-bold text-[var(--blue-dark)]" style={{ textAlign: i === 0 ? 'right' : 'center' }}>{h}</div>
                    ))}
                  </div>

                  {filtered.length === 0 ? (
                    <div className="text-center py-10 text-[var(--ink-soft)] text-sm">لا توجد فئات في هذا الفلتر</div>
                  ) : filtered.map((cat, i) => {
                    const cfg = STATUS[getStatus(cat.gamesReady)]
                    const minLevel = Math.min(cat.easy, cat.medium, cat.hard)
                    const needed = Math.max(0, TARGET_GAMES * PER_GAME - minLevel)
                    return (
                      <div key={cat.id} className="grid items-center px-5 py-3 hover:bg-[var(--bg)] transition-colors"
                        style={{ gridTemplateColumns: '1fr 70px 70px 70px 80px 110px 110px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                        <div className="text-sm font-bold">{cat.name}</div>
                        {[
                          { val: cat.easy, isMin: cat.easy === minLevel },
                          { val: cat.medium, isMin: cat.medium === minLevel },
                          { val: cat.hard, isMin: cat.hard === minLevel },
                        ].map((col, ci) => (
                          <div key={ci} className="text-center text-sm font-bold"
                            style={{ color: col.val >= TARGET_GAMES * PER_GAME ? 'var(--green-dark)' : col.isMin && col.val < TARGET_GAMES * PER_GAME ? 'var(--red)' : 'var(--ink-soft)' }}>
                            {col.val}
                          </div>
                        ))}
                        <div className="text-center text-[13px] text-[var(--ink-soft)]">{cat.totalQuestions}</div>
                        <div className="text-center">
                          <span className="text-base font-black" style={{ color: cfg.text }}>{cat.gamesReady}</span>
                          <span className="text-[11px] text-[var(--ink-faint)]"> / {TARGET_GAMES}</span>
                          {needed > 0 && <div className="text-[10px] text-[var(--ink-faint)] mt-0.5">يحتاج +{needed}</div>}
                        </div>
                        <div className="text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.border }} />
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] text-[var(--ink-faint)]">
              💡 الألعاب الجاهزة = أقل مستوى (سهل/وسط/صعب) ÷ {PER_GAME} — الرقم الأحمر هو المستوى الأقل اللي يحدد جاهزية الفئة
            </p>
          </>
        )}
      </main>
    </AuthGate>
  )
}
