import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// التحقق إن المستخدم أدمن عبر Firebase REST (الـ idToken يجي من المتصفح)
async function verifyAdmin(idToken: string): Promise<boolean> {
  try {
    const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const adminUid = process.env.NEXT_PUBLIC_ADMIN_UID
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
    )
    const data = await res.json()
    if (!res.ok || !data.users?.[0]) return false
    return data.users[0].localId === adminUid
  } catch { return false }
}

export async function POST(req: NextRequest) {
  try {
    const { systemPrompt, userPrompt, idToken } = await req.json()

    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await verifyAdmin(idToken))) return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 })
    if (!systemPrompt || !userPrompt) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY غير موجود في .env' }, { status: 500 })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data.error?.message || 'Claude API error' }, { status: res.status })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
