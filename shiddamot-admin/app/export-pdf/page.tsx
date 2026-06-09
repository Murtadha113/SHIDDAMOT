'use client'

import { useEffect, useState } from 'react'
import AuthGate from '@/components/AuthGate'
import { getCategories, getQuestionsByCategory, getAllQuestions } from '@/lib/firebase'
import { Category, Question } from '@/lib/types'
import { ArrowRight, FileDown } from 'lucide-react'

// ─── باني PDF عربي عبر Canvas (يرسم النص العربي صح بدون انعكاس) ───
async function buildArabicPDF(
  questions: Question[], title: string, fileName: string,
  includeMedia: boolean, questionImgMaxH: number, answerImgMaxH: number,
  onProgress: (msg: string) => void
) {
  const { jsPDF } = await import('jspdf')
  const PAGE_W = 595, PAGE_H = 842, MARGIN = 36
  const CONTENT_W = PAGE_W - MARGIN * 2, SCALE = 2

  const canvas = document.createElement('canvas')
  canvas.width = PAGE_W * SCALE; canvas.height = PAGE_H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
  let pageIndex = 0
  const diffLabel: Record<string, string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }
  const diffColor: Record<string, string> = { easy: '#27ae78', medium: '#e8a732', hard: '#dc5050' }

  async function loadImage(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = url
      setTimeout(() => resolve(null), 8000)
    })
  }

  function clearPage() {
    ctx.clearRect(0, 0, PAGE_W, PAGE_H)
    ctx.fillStyle = '#f7f9fc'; ctx.fillRect(0, 0, PAGE_W, PAGE_H)
    ctx.fillStyle = '#0d2a4a'; ctx.fillRect(0, 0, PAGE_W, 62)
    ctx.font = 'bold 20px Tajawal, Cairo, Segoe UI, Arial'
    ctx.fillStyle = '#ffffff'; ctx.direction = 'rtl'; ctx.textAlign = 'center'
    ctx.fillText(title, PAGE_W / 2, 34)
    ctx.font = '11px Tajawal, Cairo, Segoe UI, Arial'
    ctx.fillStyle = '#a8c4e0'
    ctx.fillText(`${questions.length} سؤال  |  ${new Date().toLocaleDateString('ar-BH')}`, PAGE_W / 2, 52)
  }

  function wrapText(text: string, maxWidth: number, font: string): string[] {
    ctx.font = font
    const words = text.split(' '); const lines: string[] = []; let cur = ''
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w
      if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w }
      else cur = test
    }
    if (cur) lines.push(cur)
    return lines.length ? lines : ['']
  }

  async function flushPage() {
    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    if (pageIndex > 0) doc.addPage()
    doc.addImage(imgData, 'JPEG', 0, 0, PAGE_W, PAGE_H)
    pageIndex++
  }

  clearPage()
  let y = 78

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx]
    onProgress(`جاري تصدير السؤال ${idx + 1} من ${questions.length}...`)

    let questionImg: HTMLImageElement | null = null
    let answerImg: HTMLImageElement | null = null
    if (includeMedia) {
      if (q.mediaUrl && q.type === 'image') { onProgress(`تحميل صورة السؤال ${idx + 1}...`); questionImg = await loadImage(q.mediaUrl) }
      if (q.answerMediaUrl && q.answerMediaType === 'image' && !q.answerMediaUrl.startsWith('data:')) { onProgress(`تحميل صورة الإجابة ${idx + 1}...`); answerImg = await loadImage(q.answerMediaUrl) }
    }

    const contentLines = wrapText(`${idx + 1}. ${q.content}`, CONTENT_W - 28, 'bold 14px Tajawal, Cairo, Arial')
    const answerLines = wrapText(`الإجابة: ${q.answer}`, CONTENT_W - 28, '11px Tajawal, Cairo, Arial')
    const hintLines = q.hint ? wrapText(`تلميح: ${q.hint}`, CONTENT_W - 28, '10px Tajawal, Cairo, Arial') : []
    const lineH = 18

    function calcImgH(img: HTMLImageElement | null, maxH: number): number {
      if (!img) return 0
      const ratio = img.naturalWidth / img.naturalHeight
      return Math.min((CONTENT_W - 28) / ratio, maxH) + 8
    }
    const qImgH = calcImgH(questionImg, questionImgMaxH)
    const aImgH = calcImgH(answerImg, answerImgMaxH)

    const cardH = 18 + contentLines.length * lineH + qImgH + 6 + answerLines.length * lineH + aImgH + (hintLines.length ? 4 + hintLines.length * lineH : 0) + 14

    if (y + cardH > PAGE_H - MARGIN) { await flushPage(); clearPage(); y = 78 }

    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(MARGIN, y, CONTENT_W, cardH, 8); ctx.fill()

    const diff = q.difficulty || 'medium'
    ctx.fillStyle = diffColor[diff] || '#888'; ctx.beginPath(); ctx.roundRect(MARGIN + 10, y + 8, 44, 18, 5); ctx.fill()
    ctx.font = 'bold 10px Tajawal, Cairo, Arial'; ctx.fillStyle = '#ffffff'; ctx.direction = 'rtl'; ctx.textAlign = 'center'
    ctx.fillText(diffLabel[diff] || diff, MARGIN + 32, y + 20)

    if (includeMedia && (questionImg || answerImg)) {
      ctx.fillStyle = '#2b7dd4'; ctx.beginPath(); ctx.roundRect(MARGIN + 60, y + 8, 30, 18, 5); ctx.fill()
      ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#ffffff'; ctx.fillText('📷', MARGIN + 75, y + 21)
    }

    ctx.font = 'bold 14px Tajawal, Cairo, Arial'; ctx.fillStyle = '#1e2a3a'; ctx.direction = 'rtl'; ctx.textAlign = 'right'
    let textY = y + 22
    for (const line of contentLines) { ctx.fillText(line, MARGIN + CONTENT_W - 10, textY); textY += lineH }

    if (questionImg && qImgH > 0) {
      const ratio = questionImg.naturalWidth / questionImg.naturalHeight
      const imgW = CONTENT_W - 28, imgH = Math.min(imgW / ratio, questionImgMaxH)
      ctx.drawImage(questionImg, MARGIN + (CONTENT_W - imgW) / 2, textY + 4, imgW, imgH)
      textY += imgH + 8
    }

    ctx.strokeStyle = '#e8eef5'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(MARGIN + 10, textY + 2); ctx.lineTo(MARGIN + CONTENT_W - 10, textY + 2); ctx.stroke()
    textY += 8

    ctx.font = '11px Tajawal, Cairo, Arial'; ctx.fillStyle = '#1a6645'; ctx.direction = 'rtl'; ctx.textAlign = 'right'
    for (const line of answerLines) { ctx.fillText(line, MARGIN + CONTENT_W - 10, textY); textY += lineH }

    if (answerImg && aImgH > 0) {
      const ratio = answerImg.naturalWidth / answerImg.naturalHeight
      const imgW = CONTENT_W - 28, imgH = Math.min(imgW / ratio, answerImgMaxH)
      const imgX = MARGIN + (CONTENT_W - imgW) / 2
      ctx.fillStyle = 'rgba(39,174,120,0.06)'; ctx.fillRect(imgX - 4, textY, imgW + 8, imgH + 8)
      ctx.drawImage(answerImg, imgX, textY + 4, imgW, imgH)
      textY += imgH + 12
    }

    if (hintLines.length) {
      ctx.font = '10px Tajawal, Cairo, Arial'; ctx.fillStyle = '#5a7aaa'; textY += 2
      for (const line of hintLines) { ctx.fillText(line, MARGIN + CONTENT_W - 10, textY); textY += lineH }
    }

    y += cardH + 8
  }

  await flushPage()

  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFillColor(13, 42, 74); doc.rect(0, PAGE_H - 24, PAGE_W, 24, 'F')
    doc.setFontSize(8); doc.setTextColor(168, 196, 224)
    doc.text(`${i} / ${total}`, PAGE_W / 2, PAGE_H - 8, { align: 'center' })
  }
  doc.save(fileName)
}

const card = 'bg-white rounded-[18px] border-[1.5px] border-[var(--border)]'

export default function ExportPdfPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCat, setSelectedCat] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [fetching, setFetching] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState('')
  const [includeMedia, setIncludeMedia] = useState(true)
  const [questionImgSize, setQuestionImgSize] = useState(160)
  const [answerImgSize, setAnswerImgSize] = useState(160)

  useEffect(() => {
    getCategories().then(cats => {
      setCategories(cats)
      if (cats.length) setSelectedCat(cats[0].id)
    }).catch(() => {})
  }, [])

  const handleFetch = async () => {
    if (!selectedCat) return
    setFetching(true); setMessage(''); setQuestions([])
    try {
      const qs = selectedCat === '__all__' ? await getAllQuestions() : await getQuestionsByCategory(selectedCat)
      setQuestions(qs)
      setMessage(`✅ تم تحميل ${qs.length} سؤال`)
    } catch { setMessage('❌ فشل تحميل الأسئلة، حاول مرة ثانية') }
    setFetching(false)
  }

  const exportPdf = async () => {
    if (!questions.length) { setMessage('ما في أسئلة محمّلة بعد'); return }
    setExporting(true)
    try {
      const title = selectedCat === '__all__' ? 'كل الأسئلة' : (categories.find(c => c.id === selectedCat)?.name || 'الأسئلة')
      const fileName = `questions-${title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_\u0600-\u06FF]/g, '')}.pdf`
      await buildArabicPDF(questions, title, fileName, includeMedia, questionImgSize, answerImgSize, setMessage)
      setMessage('✅ تم إنشاء ملف PDF بنجاح!')
    } catch { setMessage('❌ صار خطأ أثناء إنشاء PDF') }
    setExporting(false)
  }

  const mediaCount = questions.filter(q => (q.mediaUrl && q.type === 'image') || (q.answerMediaUrl && q.answerMediaType === 'image')).length

  return (
    <AuthGate>
      <main className="max-w-[1000px] mx-auto p-6">
        <div className="flex items-center gap-3 mb-2">
          <a href="/" className="flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-[var(--blue)] transition-colors">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </a>
          <h1 className="text-2xl font-black">تصدير الأسئلة PDF</h1>
        </div>
        <p className="text-sm text-[var(--ink-soft)] mb-6">دعم كامل للعربية — اختر فئة، حمّل الأسئلة، ثم نزّل PDF</p>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-5">
          {/* Controls */}
          <div className={`${card} p-5 space-y-4 h-fit`}>
            <div>
              <label className="block text-[13px] font-bold text-[var(--blue-dark)] mb-1.5">الفئة</label>
              <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[10px] border-[1.5px] border-[var(--border)] text-sm outline-none focus:border-[var(--blue)] transition-colors bg-white">
                <option value="__all__">🗂️ كل الفئات</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <button onClick={handleFetch} disabled={!selectedCat || fetching}
              className="w-full py-2.5 rounded-[10px] text-sm font-bold border-2 border-[var(--blue)] bg-[var(--blue-soft)] text-[var(--blue-dark)] hover:bg-[#C5DFFB] transition-colors disabled:opacity-50">
              {fetching ? '⏳ جاري التحميل...' : 'تحميل الأسئلة'}
            </button>

            <div onClick={() => setIncludeMedia(v => !v)}
              className="flex items-center justify-between rounded-[12px] border-[1.5px] px-4 py-3 cursor-pointer transition-all"
              style={{ borderColor: includeMedia ? 'var(--blue)' : 'var(--border)', background: includeMedia ? 'var(--blue-soft)' : 'transparent' }}>
              <div>
                <p className="text-sm font-bold">تضمين الصور</p>
                <p className="text-xs text-[var(--ink-soft)] mt-0.5">{mediaCount > 0 ? `${mediaCount} سؤال فيه صور` : 'ما في أسئلة بصور'}</p>
              </div>
              <div className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0" style={{ background: includeMedia ? 'var(--blue)' : 'var(--border)' }}>
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow" style={{ left: includeMedia ? '24px' : '4px' }} />
              </div>
            </div>

            {includeMedia && (
              <div className="space-y-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg)] p-4">
                <p className="text-xs font-bold text-[var(--ink-soft)]">حجم الصور في PDF</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[var(--ink-soft)]"><span>صورة السؤال</span><span className="text-[var(--blue-dark)] font-bold">{questionImgSize}px</span></div>
                  <input type="range" min={60} max={400} step={20} value={questionImgSize} onChange={e => setQuestionImgSize(Number(e.target.value))} className="w-full accent-[var(--blue)]" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[var(--ink-soft)]"><span>صورة الإجابة</span><span className="text-[var(--green-dark)] font-bold">{answerImgSize}px</span></div>
                  <input type="range" min={60} max={400} step={20} value={answerImgSize} onChange={e => setAnswerImgSize(Number(e.target.value))} className="w-full accent-[var(--green)]" />
                </div>
              </div>
            )}

            <button onClick={exportPdf} disabled={!questions.length || exporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-bold border-2 border-[var(--green)] bg-[var(--green-soft)] text-[var(--green-dark)] hover:bg-[#9FE1CB] transition-colors disabled:opacity-50">
              {exporting ? '⏳ يتم الإنشاء...' : <><FileDown className="w-4 h-4" /> {includeMedia ? 'تصدير PDF مع الصور' : 'تصدير PDF'}</>}
            </button>

            {message && (
              <p className="text-sm rounded-[10px] px-3 py-2 font-bold"
                style={message.startsWith('✅') ? { background: 'var(--green-soft)', color: 'var(--green-dark)' }
                  : message.startsWith('❌') ? { background: 'var(--red-soft)', color: 'var(--red-dark)' }
                  : { background: 'var(--bg)', color: 'var(--ink-soft)' }}>
                {message}
              </p>
            )}
          </div>

          {/* Preview */}
          <div className={`${card} p-5`}>
            <h2 className="font-bold mb-1">معاينة</h2>
            <p className="text-sm text-[var(--ink-soft)] mb-4">المحتوى اللي بينضاف للـ PDF</p>
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pl-1">
              {questions.length === 0 ? (
                <div className="rounded-[14px] border-2 border-dashed border-[var(--border)] bg-[var(--bg)] p-8 text-sm text-[var(--ink-soft)] text-center">
                  ما في أسئلة محمّلة. اختر فئة واضغط "تحميل الأسئلة".
                </div>
              ) : questions.map((q, idx) => (
                <div key={q.id} className="rounded-[12px] border border-[var(--border)] bg-[var(--bg)] p-3.5">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-black text-[var(--blue-dark)]">سؤال {idx + 1}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={q.difficulty === 'easy' ? { background: 'var(--green-soft)', color: 'var(--green-dark)' }
                        : q.difficulty === 'medium' ? { background: 'var(--amber-soft)', color: 'var(--amber)' }
                        : { background: 'var(--red-soft)', color: 'var(--red-dark)' }}>
                      {q.difficulty === 'easy' ? 'سهل' : q.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                    </span>
                    {((q.mediaUrl && q.type === 'image') || (q.answerMediaUrl && q.answerMediaType === 'image')) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--blue-soft)] text-[var(--blue-dark)]">📷 صور</span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{q.content}</p>
                  {q.mediaUrl && q.type === 'image' && <img src={q.mediaUrl} alt="" className="mt-2 rounded-lg max-h-24 object-contain border border-[var(--border)]" />}
                  <p className="mt-2 text-sm text-[var(--green-dark)] font-bold">الإجابة: {q.answer}</p>
                  {q.answerMediaUrl && q.answerMediaType === 'image' && !q.answerMediaUrl.startsWith('data:') && <img src={q.answerMediaUrl} alt="" className="mt-2 rounded-lg max-h-24 object-contain border border-[var(--green)]" />}
                  {q.hint && <p className="mt-1 text-xs text-[var(--ink-soft)]">💡 {q.hint}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AuthGate>
  )
}
