Qarang: ../README.md

Muhim qarorlar
* Tokenlar `localStorage` da (SPA uchun odatiy; XSS xavfi mavjud — CSP tavsiya etiladi).
* Sessiya faqat server 401 qaytarganda tugaydi; tarmoq xatosi/bekor qilingan so'rov seansni o'chirmaydi.
* Barcha yaratish/saqlash/boshlash amallari sinxron "single-flight" qulf bilan himoyalangan (qo'sh bosish).
* Backend xabarlari (ru/en) `src/api/errors.js` da o'zbekchaga tarjima qilinadi; noma'lum matn o'zgarmay ko'rsatiladi.
* Yutuq nomlari backend `key` bo'yicha `src/ui/Cards.jsx` da tarjima qilinadi.
* Tovushlar: WebAudio, fayl yo'q; sarlavhadagi tugma va Profil'da o'chiriladi.
