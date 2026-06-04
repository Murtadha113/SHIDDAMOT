'use client'

import { useEffect, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'

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

export default function ReviewPage() {
  const [questions, setQuestions]     = useState([])
  const [categories, setCategories]   = useState({})
  const [decisions, setDecisions]     = useState({})
  const [loading, setLoading]         = useState(true)
  const [migrating, setMigrating]     = useState(false)
  const [log, setLog]                 = useState([])
  const [preview, setPreview]         = useState(null)

  useEffect(() => {
    async function load() {
      const db = getDB()
      const [qSnap, cSnap] = await Promise.all([
        getDocs(collection(db, 'questions')),
        getDocs(collection(db, 'categories')),
      ])
      const catMap = {}
      cSnap.forEach(d => { catMap[d.id] = d.data().name })
      setCategories(catMap)

      const withCloud = qSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(q =>
          q.mediaUrl?.includes('cloudinary.com') ||
          q.answerMediaUrl?.includes('cloudinary.com')
        )
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
        if (q.mediaUrl?.includes('cloudinary.com'))
          updates.mediaUrl = await migrateFile(q.mediaUrl)
        if (q.answerMediaUrl?.includes('cloudinary.com'))
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
    <div style={S.center}>
      <div style={S.spinner} />
      <p style={{ color: '#3A6A9A', marginTop: 16, fontFamily: 'Tajawal' }}>جاري التحميل...</p>
    </div>
  )

  return (
    <div style={S.page} dir="rtl">
      {/* header */}
      <div style={S.topBar}>
        <h1 style={S.h1}>🎬 نقل الفيديوهات — Cloudinary → Bunny CDN</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={S.badge('#E1F5EE','#0F6E56')}>✅ {approved}</span>
          <span style={S.badge('#FEF3EA','#BA7517')}>⏳ {pending}</span>
          <span style={S.badge('#FAECE7','#993C1D')}>❌ {rejected}</span>
        </div>
      </div>

      <div style={S.wrap}>
        {questions.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 56 }}>🎉</div>
            <p>ما في فيديوهات على Cloudinary!</p>
          </div>
        )}

        {questions.map(q => {
          const dec    = decisions[q.id] || 'pending'
          const hasQV  = q.mediaUrl?.includes('cloudinary.com')
          const hasAV  = q.answerMediaUrl?.includes('cloudinary.com')
          return (
            <div key={q.id} style={{ ...S.card, borderColor: dec === 'approved' ? '#1D9E75' : dec === 'rejected' ? '#D85A30' : '#D8EAF8', borderWidth: dec !== 'pending' ? 2 : 1 }}>
              <div style={S.catBadge}>🏷️ {categories[q.categoryId] || q.categoryId}</div>

              {/* فيديوهات */}
              <div style={S.grid2}>
                {[
                  { label: '🎬 فيديو السؤال', url: hasQV ? q.mediaUrl : null },
                  { label: '✅ فيديو الجواب', url: hasAV ? q.answerMediaUrl : null },
                ].map(({ label, url }) => (
                  <div key={label}>
                    <div style={S.vLabel}>{label}</div>
                    {url ? (
                      <div style={S.thumbWrap} onClick={() => setPreview(url)}>
                        <img src={thumb(url)} style={S.thumbImg} alt="" onError={e => e.target.style.display='none'} />
                        <div style={S.playIco}>▶</div>
                      </div>
                    ) : (
                      <div style={S.noV}>لا يوجد</div>
                    )}
                  </div>
                ))}
              </div>

              {/* نصوص */}
              <div style={S.grid2}>
                {[
                  { label: 'السؤال', val: q.content },
                  { label: 'الجواب',  val: q.answer  },
                ].map(({ label, val }) => (
                  <div key={label} style={S.tbox}>
                    <div style={S.tLabel}>{label}</div>
                    <div style={S.tVal}>{val}</div>
                  </div>
                ))}
              </div>

              {/* أزرار */}
              <div style={{ display:'flex', gap:8, borderTop:'1px solid #E2EAF4', paddingTop:14, marginTop:4 }}>
                <button style={{ ...S.btn, borderColor:'#1D9E75', color:'#0F6E56', background: dec==='approved'?'#E1F5EE':'transparent' }}
                  onClick={() => decide(q.id, 'approved')}>✅ موافق — ينتقل الفيديوين</button>
                <button style={{ ...S.btn, borderColor:'#D85A30', color:'#993C1D', background: dec==='rejected'?'#FAECE7':'transparent' }}
                  onClick={() => decide(q.id, 'rejected')}>❌ تجاهل</button>
              </div>
            </div>
          )
        })}

        {/* سجل النقل */}
        {log.length > 0 && (
          <div style={S.logBox}>
            <h2 style={{ fontSize:16, fontWeight:800, marginBottom:12 }}>📋 سجل النقل</h2>
            {log.map((l, i) => (
              <div key={i} style={S.logItem}>
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

      {/* bottom bar */}
      {questions.length > 0 && (
        <div style={S.bottomBar}>
          <span style={{ fontSize:14, color:'#6B8AA8' }}>
            {approved > 0 ? `${approved} سؤال — ${approved*2} فيديو جاهز` : 'راجع الأسئلة وأعطِ موافقتك'}
          </span>
          <button style={{ ...S.migrateBtn, opacity: approved===0||migrating ? 0.4 : 1, cursor: approved===0||migrating?'not-allowed':'pointer' }}
            disabled={approved===0||migrating} onClick={startMigration}>
            {migrating ? '⏳ جاري النقل...' : '🚀 ابدأ النقل'}
          </button>
        </div>
      )}

      {/* modal */}
      {preview && (
        <div style={S.modalBg} onClick={() => setPreview(null)}>
          <div style={S.modalInner} onClick={e => e.stopPropagation()}>
            <video src={preview} controls autoPlay style={{ width:'100%', borderRadius:12, maxHeight:380 }} />
            <button style={S.modalClose} onClick={() => setPreview(null)}>إغلاق</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── styles ──
const S = {
  page:      { background:'#EBF3FB', minHeight:'100vh', fontFamily:'Tajawal, sans-serif', color:'#0D2A4A' },
  center:    { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh' },
  spinner:   { width:40, height:40, border:'4px solid #D8EAF8', borderTopColor:'#2B7DD4', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  topBar:    { background:'white', borderBottom:'1px solid #D8EAF8', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 },
  h1:        { fontSize:18, fontWeight:900 },
  badge:     (bg, color) => ({ background:bg, color, padding:'5px 14px', borderRadius:20, fontSize:13, fontWeight:700 }),
  wrap:      { maxWidth:860, margin:'0 auto', padding:'24px 16px 120px' },
  card:      { background:'white', borderRadius:18, borderStyle:'solid', padding:20, marginBottom:14, transition:'border-color 0.2s' },
  catBadge:  { display:'inline-flex', gap:4, fontSize:12, padding:'4px 12px', borderRadius:8, background:'#EBF3FB', color:'#2B7DD4', marginBottom:12, fontWeight:700 },
  grid2:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 },
  vLabel:    { fontSize:12, color:'#6B8AA8', fontWeight:700, marginBottom:6 },
  thumbWrap: { position:'relative', height:110, borderRadius:12, overflow:'hidden', cursor:'pointer', background:'#EBF3FB' },
  thumbImg:  { width:'100%', height:'100%', objectFit:'cover', display:'block' },
  playIco:   { position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.3)', fontSize:28, color:'white', opacity:0, transition:'opacity 0.15s' },
  noV:       { height:110, background:'#F0F4F8', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'#9BA8B8', fontSize:13 },
  tbox:      { background:'#F7FAFD', borderRadius:10, padding:'10px 14px' },
  tLabel:    { fontSize:11, color:'#9BA8B8', marginBottom:3 },
  tVal:      { fontSize:14, fontWeight:700, lineHeight:1.5 },
  btn:       { flex:1, padding:'10px', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Tajawal, sans-serif', border:'2px solid', transition:'background 0.15s' },
  logBox:    { background:'white', borderRadius:16, border:'1px solid #D8EAF8', padding:20, marginTop:16 },
  logItem:   { display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:'#F7FAFD', marginBottom:6 },
  bottomBar: { position:'fixed', bottom:0, left:0, right:0, background:'white', borderTop:'1px solid #D8EAF8', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  migrateBtn:{ padding:'12px 32px', borderRadius:12, border:'2px solid #1D9E75', background:'#E1F5EE', color:'#0F6E56', fontSize:15, fontWeight:700, fontFamily:'Tajawal, sans-serif' },
  empty:     { textAlign:'center', padding:'80px 20px', color:'#6B8AA8', fontSize:18, fontWeight:700 },
  modalBg:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' },
  modalInner:{ background:'white', borderRadius:18, padding:16, width:'90%', maxWidth:580 },
  modalClose:{ marginTop:12, width:'100%', padding:10, borderRadius:10, border:'1px solid #D8EAF8', background:'transparent', fontFamily:'Tajawal, sans-serif', fontSize:14, color:'#6B8AA8', cursor:'pointer' },
}
