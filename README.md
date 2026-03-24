# نديرة | Nadira.chat

منصّة RTL عربية كاملة لتوليد الصور بالذكاء الاصطناعي، مع واجهة حديثة وفق نظام تصميم **Sahjib** وخلفية Node.js/Express متكاملة مع:

- Stability AI لتوليد الصور
- Google Translate API لتحسين/ترجمة المدخلات العربية (اختياري)
- AWS S3 لحفظ الصور الناتجة

## البنية

```text
.
├── amplify.yml
├── README.md
└── server
    ├── .env.example
    ├── package.json
    ├── public
    │   ├── app.js
    │   ├── index.html
    │   └── styles.css
    └── server.js
```

## المتطلبات

- Node.js 18+
- مفاتيح API/خدمات سحابية:
  - `STABILITY_API_KEY`
  - `S3_BUCKET_NAME`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION` (اختياري، الافتراضي `us-east-1`)
  - `GOOGLE_TRANSLATE_API_KEY` (اختياري)

## تشغيل محلي

```bash
cd server
npm install
cp .env.example .env
# عدّل القيم في .env
npm start
```

بعد التشغيل:

- الواجهة: `http://localhost:3000`
- فحص الصحة: `http://localhost:3000/health`

## API

### POST `/api/generate`

Body:

```json
{
  "prompt": "منظر طبيعي جبلي مع بحيرة",
  "style": "واقعي",
  "aspectRatio": "1:1",
  "quality": "hd",
  "creativity": 7,
  "numImages": 2
}
```

Response (نجاح):

```json
{
  "success": true,
  "images": ["https://...png", "https://...png"],
  "enhancedPrompt": "..."
}
```

## النشر على AWS Amplify

1. اربط المستودع مع Amplify.
2. أضف متغيرات البيئة المذكورة في `.env.example`.
3. سيستخدم Amplify الملف `amplify.yml` في جذر المشروع.
4. سيتم تشغيل تطبيق الخادم (Express) مع الملفات الثابتة من `server/public`.

## ملاحظات

- كل النصوص في الواجهة عربية مع دعم RTL كامل.
- الأزرار تعتمد نمط Stroke/Outline دون تعبئة صلبة.
- تم إضافة تحسين أمني بسيط في الواجهة لمنع حقن HTML داخل وصف الصورة قبل العرض.
