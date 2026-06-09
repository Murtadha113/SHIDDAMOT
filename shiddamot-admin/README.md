# شدة موت — لوحة الأسئلة

لوحة أدمن منفصلة عن اللعبة، تشتغل على نفس Firebase (مشروع shidda).
تتكفّل بـ: **رفع الأسئلة** · **مراجعة الأسئلة** · **الفئات*.

## التشغيل
```bash
npm install
cp .env.example .env.local   # المفاتيح معبّأة جاهزة
npm run dev
```

## النشر على Vercel
1. ارفع المشروع على repo جديد
2. Vercel → New Project → اختر الـ repo
3. **Environment Variables** → انسخ كل اللي في `.env.example`
4. Deploy

## نقاط مهمة
- **مفاتيح الرفع (Bunny + imgBB) سرية** — تشتغل في السيرفر فقط عبر `/api/upload`، ما تنزل المتصفح إطلاقاً. عشان كذا بدون بادئة `NEXT_PUBLIC_`.
- **الصور** → imgBB (نفس النظام الحالي)
- **الصوت + الفيديو** → Bunny CDN (مجلد `audio/` و `videos/`)
- **رفع الأسئلة** → batch (450 سؤال بكل طلب) بدل سؤال سؤال — أسرع وأرخص بكثير.
- **مراجعة الأسئلة** → تحمّل أسئلة الفئة المختارة فقط، مو كل القاعدة — هذا اللي يحل مشكلة الـ drop في اللعبة.

## الأعمدة المدعومة في CSV/Excel
`content, answer, categoryId, difficulty, hint, type, mediaUrl, answerMediaUrl, answerMediaType, option1-4, trial`
(تدعم أسماء عربية للأعمدة بعد)
