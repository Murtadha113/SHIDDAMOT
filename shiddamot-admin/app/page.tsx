'use client'

import AuthGate from '@/components/AuthGate'
import { Upload, ListChecks, FolderTree, ArrowLeft, Package, BarChart3, FileDown } from 'lucide-react'

const TILES = [
  { href: '/questions/add', icon: Upload, title: 'رفع الأسئلة', desc: 'ملف CSV/Excel أو إدخال يدوي', color: 'var(--blue)', bg: 'var(--blue-soft)' },
  { href: '/questions', icon: ListChecks, title: 'مراجعة الأسئلة', desc: 'تصفّح وتعديل وحذف حسب الفئة', color: 'var(--green-dark)', bg: 'var(--green-soft)' },
  { href: '/categories', icon: FolderTree, title: 'الفئات', desc: 'إضافة وتعديل الفئات ومعاينتها', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  { href: '/majlis-categories', icon: Package, title: 'فئات المجلس', desc: 'تفعيل الفئات لوضع المجلس', color: 'var(--blue)', bg: 'var(--blue-soft)' },
  { href: '/categories-status', icon: BarChart3, title: 'جاهزية الفئات', desc: 'كم لعبة تكفي كل فئة', color: 'var(--green-dark)', bg: 'var(--green-soft)' },
  { href: '/export-pdf', icon: FileDown, title: 'تصدير PDF', desc: 'تصدير أسئلة الفئة لملف PDF عربي', color: 'var(--amber)', bg: 'var(--amber-soft)' },
]

export default function Home() {
  return (
    <AuthGate>
      <main className="max-w-[860px] mx-auto p-6 pt-10">
        <h1 className="text-2xl font-black mb-1">لوحة الإدارة</h1>
        <p className="text-sm text-[var(--ink-soft)] mb-8">اختر القسم اللي تبي تشتغل عليه</p>

        <div className="grid sm:grid-cols-2 gap-4">
          {TILES.map(t => (
            <a key={t.href} href={t.href}
              className="group bg-white rounded-[18px] border-[1.5px] border-[var(--border)] p-5 hover:border-[var(--blue)] hover:shadow-[0_6px_20px_rgba(43,125,212,0.1)] transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center" style={{ background: t.bg }}>
                  <t.icon className="w-6 h-6" style={{ color: t.color }} />
                </div>
                <ArrowLeft className="w-5 h-5 text-[var(--ink-faint)] group-hover:text-[var(--blue)] transition-colors" />
              </div>
              <h2 className="text-lg font-black mb-1">{t.title}</h2>
              <p className="text-[13px] text-[var(--ink-soft)]">{t.desc}</p>
            </a>
          ))}
        </div>
      </main>
    </AuthGate>
  )
}
