import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// رفع الصور إلى imgBB (سيرفر — المفتاح مخفي)
async function uploadImage(file: File): Promise<string> {
  const key = process.env.IMGBB_API_KEY
  if (!key) throw new Error('IMGBB_API_KEY غير موجود في .env')
  const buffer = Buffer.from(await file.arrayBuffer())
  const fd = new FormData()
  fd.append('image', buffer.toString('base64'))
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, { method: 'POST', body: fd })
  const data = await res.json()
  if (data?.success) return data.data.url as string
  throw new Error('فشل رفع الصورة إلى imgBB')
}

// رفع الصوت/الفيديو إلى Bunny CDN (سيرفر — AccessKey مخفي)
async function uploadToBunny(file: File): Promise<string> {
  const zone = process.env.BUNNY_STORAGE_ZONE
  const key = process.env.BUNNY_STORAGE_KEY
  const cdn = process.env.BUNNY_CDN_URL
  if (!zone || !key || !cdn) throw new Error('إعدادات Bunny غير مكتملة في .env')

  const raw = file.name.split('/').pop() || 'file'
  const ext = (raw.includes('.') ? raw.split('.').pop() : '') || (file.type.startsWith('audio') ? 'mp3' : 'mp4')
  const base = raw.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'media'
  const name = `${base}_${Date.now()}.${ext}`
  const folder = file.type.startsWith('audio') ? 'audio' : 'videos'

  const buffer = Buffer.from(await file.arrayBuffer())
  const res = await fetch(`https://storage.bunnycdn.com/${zone}/${folder}/${name}`, {
    method: 'PUT',
    headers: { AccessKey: key, 'Content-Type': 'application/octet-stream' },
    body: buffer,
  })
  if (!res.ok) throw new Error(`فشل الرفع إلى Bunny (${res.status})`)
  return `https://${cdn}/${folder}/${name}`
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 })

    const mime = file.type || ''
    let url: string
    if (mime.startsWith('image/')) {
      url = await uploadImage(file)
    } else if (mime.startsWith('audio/') || mime.startsWith('video/')) {
      url = await uploadToBunny(file)
    } else {
      return NextResponse.json({ error: 'نوع ملف غير مدعوم' }, { status: 400 })
    }

    const kind = mime.startsWith('image/') ? 'image' : mime.startsWith('audio/') ? 'audio' : 'video'
    return NextResponse.json({ url, kind })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'خطأ أثناء الرفع' }, { status: 500 })
  }
}
