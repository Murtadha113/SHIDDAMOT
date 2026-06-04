import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { url } = await req.json()

    const BUNNY_ZONE = process.env.BUNNY_STORAGE_ZONE
    const BUNNY_KEY  = process.env.BUNNY_API_KEY
    const BUNNY_CDN  = process.env.BUNNY_CDN_URL

    if (!url || !BUNNY_ZONE || !BUNNY_KEY || !BUNNY_CDN) {
      return NextResponse.json({ error: 'missing config' }, { status: 400 })
    }

    // 1. تنزيل من Cloudinary (على السيرفر — بدون CORS)
    const fileRes = await fetch(url)
    if (!fileRes.ok) throw new Error(`فشل التنزيل: ${fileRes.status}`)
    const buffer = await fileRes.arrayBuffer()

    // 2. اسم الملف
    const parts   = url.split('/')
    const rawName = parts[parts.length - 1].split('?')[0]
    const ext     = rawName.includes('.') ? rawName.split('.').pop() : 'mp4'
    const base    = rawName.replace(/\.[^.]+$/, '')
    const fileName = `${base}_${Date.now()}.${ext}`

    // 3. رفع على Bunny
    const uploadRes = await fetch(
      `https://storage.bunnycdn.com/${BUNNY_ZONE}/videos/${fileName}`,
      {
        method: 'PUT',
        headers: {
          AccessKey: BUNNY_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      }
    )
    if (!uploadRes.ok) throw new Error(`فشل الرفع: ${uploadRes.status}`)

    return NextResponse.json({ newUrl: `${BUNNY_CDN}/videos/${fileName}` })
  } catch (err) {
    console.error('migrate-file error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
