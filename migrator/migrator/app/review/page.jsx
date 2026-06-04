'use client'

import { useEffect, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore'
import dynamic from 'next/dynamic'

const FIREBASE_CONFIG = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getDB() {
  const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0]
  return getFirestore(app)
}

function ReviewPageInner() {
  const [questions, setQuestions] = useState([])
  const [categories, setCategories] = useState({})
  const [decisions, setDecisions] = useState({})
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [log, setLog] = useState([])
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    async function load() {
      const db = getDB()
      const [qSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db, 'questions'), where('type', '==', 'video'))),
        getDocs(collection(db, 'categories')),
      ])
      const catMap = {}
      cSnap.forEach(d => { catMap[d.id] = d.data().name })
      setCategories(catMap)

      const isCloud = url => url && (url.includes('cloudinary.com') || url.includes('res.cloudinary.com'))

      const withCloud = qSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(q => isCloud(q.mediaUrl) || (isCloud(q.answerMediaUrl) && q.answerMediaType === 'video'))

      setQuestions(withCloud)
      setLoading(false)
    }
    load()
  }, [])

  const decide = (id, dec) => setDecisions(p => ({ ...p, [id]: dec }))

  const approved = Object.values(decisions).filter(d => d === 'approved').length
  const rejected = Object.values(decisions).filter(d => d === 'rejected').length
  const pending  = questions.length - approved - rejected

  async function migrateFile(url) {
    const res = await fetch('/api/migrate-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data.newUrl
  }

  async function startMigration() {
    const toMigrate = questions.filter(q => decisions[q.id] === 'approved')
    setMigrating(true)
    setLog(toMigrate.map(q => ({ id: q.id, status: 'pending' })))
    const db = getDB()

    for (let i = 0; i < toMigrate.length; i++) {
      const q = toMigrate[i]
      setLog(p => p.map((l, idx) => idx === i ? { ...l, status: 'migrating' } : l))
      try {
        const updates = {}
        const isCloud = url => url && (url.includes('cloudinary.com') || url.includes('res.cloudinary.com'))
        if (isCloud(q.mediaUrl))
          updates.mediaUrl = await migrateFile(q.mediaUrl)
        if (isCloud(q.answerMediaUrl) && q.answerMediaType === 'video')
          updates.answerMediaUrl = await migrateFile(q.answerMediaUrl)

        await updateDoc(doc(db, 'questions', q.id), updates)
        setLog(p => p.map((l, idx) => idx === i ? { ...l, status: 'done' } : l))
      } catch (err) {
        setLog(p => p.map((l, idx) => idx === i ? { ...l, status: 'failed', error: err.message } : l))
      }
      await new Promise(r => setTimeout(r, 300))
    }
    setMigrating(false)
  }

  const thumb = url =>
    url.replace('/upload/', '/upload/w_320,h_200,c_fill,so_2/').replace(/\.[^.]+$/, '.jpg')

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div style={{ width:40, height:40, border:'4px solid #D8EAF8', borderTopColor:'#2B7DD4', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#3A6A9A', marginTop:16, fontFamily:'Tajawal' }}>جاري التحميل...</p>
    </div>
  )

  return (
    <div style={{ background:'#EBF3FB', minHeight:'100vh', fontFamily:'Tajawal, sans-serif', color:'#0D2A4A' }} dir="rtl">
      <div style={{ background:'white', borderBottom:'1px solid #D8EAF8', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <h1 style={{ fontSize:18, fontWeight:900 }}>🎬 نقل الفيديوهات — Cloudinary → Bunny CDN</h1>
        <div style={{ display:'flex', gap:8 }}>
          <span style={{ background:'#E1F5EE', color:'#0F6E56', padding:'5px 14px', borderRadius:20, fontSize:13, fontWeight:700 }}>✅ {approved}</span>
          <span style={{ background:'#FEF3EA', color:'#BA7517', padding:'5px 14px', borderRadius:20, fontSize:13, fontWeight:700 }}>⏳ {pending}</span>
          <span style={{ background:'#FAECE7', color:'#993C1D', padding:'5px 14px', borderRadius:20, fontSize:13, fontWeight:700 }}>❌ {rejected}</span>
        </div>
      </div>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'24px 16px 120px' }}>
        {questions.length === 0 && (
          <div style={{ textAlign:'center', padding:'80px 20px', color:'#6B8AA8', fontSize:18, fontWeight:700 }}>
            <div style={{ fontSize:56 }}>🎉</div>
            <p>ما في فيديوهات على Cloudinary!</p>
          </div>
        )}

        {questions.map(q => {
          const dec = decisions[q.id] || 'pending'
          const isCloud = url => url && (url.includes('cloudinary.com') || url.includes('res.cloudinary.com'))
          const hasQV = isCloud(q.mediaUrl)
          const hasAV = isCloud(q.answerMediaUrl) && q.answerMediaType === 'video'
          return (
            <div key={q.id} style={{ background:'white', borderRadius:18, borderStyle:'solid', borderWidth: dec !== 'pending' ? 2 : 1, borderColor: dec === 'approved' ? '#1D9E75' : dec === 'rejected' ? '#D85A30' : '#D8EAF8', padding:20, marginBottom:14 }}>
              <div style={{ display:'inline-flex', gap:4, fontSize:12, padding:'4px 12px', borderRadius:8, background:'#EBF3FB', color:'#2B7DD4', marginBottom:12, fontWeight:700 }}>
                🏷️ {categories[q.categoryId] || q.categoryId}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                {[
                  { label: '🎬 فيديو السؤال', url: hasQV ? q.mediaUrl : null },
                  { label: '✅ فيديو الجواب', url: hasAV ? q.answerMediaUrl : null },
                ].map(({ label, url }) => (
                  <div key={label}>
                    <div style={{ fontSize:12, color:'#6B8AA8', fontWeight:700, marginBottom:6 }}>{label}</div>
                    {url ? (
                      <div style={{ position:'relative', height:110, borderRadius:12, overflow:'hidden', cursor:'pointer', background:'#EBF3FB' }} onClick={() => setPreview(url)}>
                        <img src={thumb(url)} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} alt="" onError={e => e.target.style.display='none'} />
                        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.3)', fontSize:28, color:'white' }}>▶</div>
                      </div>
                    ) : (
                      <div style={{ height:110, background:'#F0F4F8', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'#9BA8B8', fontSize:13 }}>لا يوجد</div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                {[
                  { label: 'السؤال', val: q.content },
                  { label: 'الجواب', val: q.answer },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background:'#F7FAFD', borderRadius:10, padding:'10px 14px' }}>
                    <div style={{ fontSize:11, color:'#9BA8B8', marginBottom:3 }}>{label}</div>
                    <div style={{ fontSize:14, fontWeight:700, lineHeight:1.5 }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', gap:8, borderTop:'1px solid #E2EAF4', paddingTop:14 }}>
                <button style={{ flex:1, padding:10, borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif', border:'2px solid #1D9E75', color:'#0F6E56', background: dec==='approved' ? '#E1F5EE' : 'transparent' }}
                  onClick={() => decide(q.id, 'approved')}>✅ موافق — ينتقل الفيديوين</button>
                <button style={{ flex:1, padding:10, borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif', border:'2px solid #D85A30', color:'#993C1D', background: dec==='rejected' ? '#FAECE7' : 'transparent' }}
                  onClick={() => decide(q.id, 'rejected')}>❌ تجاهل</button>
              </div>
            </div>
          )
        })}

        {log.length > 0 && (
          <div style={{ background:'white', borderRadius:16, border:'1px solid #D8EAF8', padding:20, marginTop:16 }}>
            <h2 style={{ fontSize:16, fontWeight:800, marginBottom:12 }}>📋 سجل النقل</h2>
            {log.map((l, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:'#F7FAFD', marginBottom:6 }}>
                <span>{l.status==='done'?'✅':l.status==='failed'?'❌':l.status==='migrating'?'🔄':'⏳'}</span>
                <span style={{ flex:1, fontSize:12, fontFamily:'monospace', color:'#3A6A9A' }}>{l.id.substring(0,24)}...</span>
                <span style={{ fontSize:12, fontWeight:700, color: l.status==='done'?'#0F6E56':l.status==='failed'?'#993C1D':'#6B8AA8' }}>
                  {l.status==='done'?'تم':l.status==='failed'?`فشل: ${l.error}`:l.status==='migrating'?'جاري...':'معلق'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {questions.length > 0 && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'white', borderTop:'1px solid #D8EAF8', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:14, color:'#6B8AA8' }}>
            {approved > 0 ? `${approved} سؤال — ${approved*2} فيديو جاهز` : 'راجع الأسئلة وأعطِ موافقتك'}
          </span>
          <button
            style={{ padding:'12px 32px', borderRadius:12, border:'2px solid #1D9E75', background:'#E1F5EE', color:'#0F6E56', fontSize:15, fontWeight:700, fontFamily:'Tajawal, sans-serif', opacity: approved===0||migrating ? 0.4 : 1, cursor: approved===0||migrating ? 'not-allowed' : 'pointer' }}
            disabled={approved===0||migrating}
            onClick={startMigration}>
            {migrating ? '⏳ جاري النقل...' : '🚀 ابدأ النقل'}
          </button>
        </div>
      )}

      {preview && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setPreview(null)}>
          <div style={{ background:'white', borderRadius:18, padding:16, width:'90%', maxWidth:580 }} onClick={e => e.stopPropagation()}>
            <video src={preview} controls autoPlay style={{ width:'100%', borderRadius:12, maxHeight:380 }} />
            <button style={{ marginTop:12, width:'100%', padding:10, borderRadius:10, border:'1px solid #D8EAF8', background:'transparent', fontFamily:'Tajawal, sans-serif', fontSize:14, color:'#6B8AA8', cursor:'pointer' }}
              onClick={() => setPreview(null)}>إغلاق</button>
          </div>
        </div>
      )}
    </div>
  )
}

const ReviewPage = dynamic(() => Promise.resolve(ReviewPageInner), { ssr: false })
export default ReviewPage
