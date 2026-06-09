import * as XLSX from 'xlsx'
import { Category, Question, POINTS_MAP } from './types'

export type ParsedRow = Omit<Question, 'id'> & { valid: boolean; error?: string }

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let col = '', row: string[] = [], inQuotes = false
  const t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < t.length; i++) {
    const ch = t[i], next = t[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') { col += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else col += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { row.push(col.trim()); col = '' }
      else if (ch === '\n') { row.push(col.trim()); col = ''; if (row.some(c => c)) rows.push(row); row = [] }
      else col += ch
    }
  }
  if (col || row.length) { row.push(col.trim()); if (row.some(c => c)) rows.push(row) }
  return rows
}

export async function parseExcel(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  return data.map(r => r.map((c: any) => String(c ?? '').trim()))
}

export function processRows(parsed: string[][], cats: Category[]): ParsedRow[] {
  if (parsed.length < 2) return []
  const headers = parsed[0].map(h => h.toLowerCase().replace(/\s+/g, '').trim())
  const idx = (keys: string[]) => headers.findIndex(h => keys.includes(h))

  const contentIdx        = idx(['content', 'question', 'السؤال', 'نص'])
  const answerIdx         = idx(['answer', 'الإجابة', 'الجواب'])
  const categoryIdx       = idx(['categoryid', 'category_id', 'category', 'الفئة', 'القسم'])
  const diffIdx           = idx(['difficulty', 'diff', 'الصعوبة'])
  const hintIdx           = idx(['hint', 'تلميح'])
  const typeIdx           = idx(['type', 'نوع'])
  const mediaUrlIdx       = idx(['mediaurl', 'media_url', 'media', 'الوسيطة', 'رابط'])
  const trialIdx          = idx(['istrial', 'trial', 'istrialquestion', 'تجريبي'])
  const answerMediaUrlIdx = idx(['answermediaurl', 'answer_media_url', 'answermedia', 'صورةالجواب'])
  const answerMediaTypeIdx= idx(['answermediatype', 'answer_media_type', 'نوعصورةالجواب'])
  const optionIdxs = [
    idx(['option1', 'opt1', 'خيار1', 'choice1']),
    idx(['option2', 'opt2', 'خيار2', 'choice2']),
    idx(['option3', 'opt3', 'خيار3', 'choice3']),
    idx(['option4', 'opt4', 'خيار4', 'choice4']),
  ]

  return parsed.slice(1).filter(r => r.some(c => c)).map(cols => {
    const content    = cols[contentIdx]?.trim() || ''
    const answer     = cols[answerIdx]?.trim() || ''
    const categoryRaw= cols[categoryIdx]?.trim() || ''
    const difficulty = (cols[diffIdx]?.trim().toLowerCase() || 'easy') as Question['difficulty']
    const hint       = hintIdx >= 0 ? cols[hintIdx]?.trim() : ''
    const isTrial    = trialIdx >= 0 ? cols[trialIdx]?.trim().toLowerCase() === 'true' : false
    const typeRaw    = typeIdx >= 0 ? cols[typeIdx]?.trim().toLowerCase() : 'text'
    const type       = (['image', 'audio', 'video'].includes(typeRaw) ? typeRaw : 'text') as Question['type']
    const mediaUrl   = mediaUrlIdx >= 0 ? cols[mediaUrlIdx]?.trim() : ''
    const answerMediaUrl = answerMediaUrlIdx >= 0 ? cols[answerMediaUrlIdx]?.trim() : ''
    const amtRaw     = answerMediaTypeIdx >= 0 ? cols[answerMediaTypeIdx]?.trim().toLowerCase() : ''
    const answerMediaType = (['image', 'video', 'audio'].includes(amtRaw) ? amtRaw : answerMediaUrl ? 'image' : null) as Question['answerMediaType'] | null
    const rawOpts = optionIdxs.map(i => i >= 0 ? cols[i]?.trim() : '').filter(Boolean) as string[]
    const options = rawOpts.length >= 2 ? rawOpts : undefined

    const cat = cats.find(c => c.id === categoryRaw) || cats.find(c => c.name === categoryRaw)
    const categoryId = cat?.id || categoryRaw

    let error = ''
    if (!content) error = 'نص السؤال فارغ'
    else if (!answer) error = 'الإجابة فارغة'
    else if (!cat) error = `الفئة "${categoryRaw}" غير موجودة`
    else if (!['easy', 'medium', 'hard'].includes(difficulty)) error = 'الصعوبة غير صحيحة'

    return {
      content, answer, categoryId, difficulty, type,
      hint: hint || '', mediaUrl: mediaUrl || undefined,
      answerMediaUrl: answerMediaUrl || undefined,
      answerMediaType: answerMediaType || undefined,
      options, isTrialQuestion: isTrial, points: POINTS_MAP[difficulty] || 15,
      valid: !error, error,
    }
  })
}

export function downloadTemplate() {
  const csv = [
    'content,answer,categoryId,difficulty,hint,type,mediaUrl,answerMediaUrl,answerMediaType,option1,option2,option3,option4,trial',
    'ما عاصمة البحرين؟,المنامة,35,easy,عاصمة خليجية,text,,,,,,,,false',
    'من اخترع الهاتف؟,غراهام بيل,25,medium,,image,https://example.com/q.jpg,https://example.com/a.jpg,image,غراهام بيل,نيوتن,أديسون,فلمنج,false',
    'اسمع الصوت,الأذان,30,easy,,audio,https://cdn.b-cdn.net/audio/x.mp3,,,,,,,false',
    'شوف الفيديو,كأس العالم,45,hard,,video,https://cdn.b-cdn.net/videos/x.mp4,,,,,,,false',
  ].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'template_questions.csv' })
  a.click()
}
