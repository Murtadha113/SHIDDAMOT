# Shidda Migrator

مشروع مؤقت لنقل الفيديوهات من Cloudinary إلى Bunny CDN.

## خطوات النشر على Vercel

1. ارفع المجلد على GitHub (repo جديد)
2. افتح Vercel وأنشئ مشروع جديد من الـ repo
3. أضف هذه Environment Variables في Vercel:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
BUNNY_STORAGE_ZONE
BUNNY_API_KEY
BUNNY_CDN_URL
```

4. انشر وافتح الرابط
5. راجع الأسئلة واضغط 🚀
6. بعد الانتهاء احذف المشروع من Vercel وGitHub
