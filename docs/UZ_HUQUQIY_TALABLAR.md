# O'zbekiston qonunchiligi va xavfsizlik: nima qilingan, nima sizning zimmangizda

> Diqqat: bu hujjat yuridik xulosa emas. Dasturchi sifatida talablarni texnik jihatdan bajardik; ishga tushirishdan oldin **O'zbekiston yuristi** bilan tekshirtiring.

## 1. «Shaxsga doir ma'lumotlar to'g'risida»gi Qonun (ZRU-547)

| Talab | Dasturda | Sizning vazifangiz |
|---|---|---|
| Sub'ekt roziligi (bola uchun — ota-ona/vasiy) | Birinchi kirishda to'liq ekranli rozilik oynasi; rozilik versiyasi va vaqti saqlanadi; versiya o'zgarsa qayta so'raydi; rozilikka qadar API yopiq | Ota-onadan **yozma rozilik** oling (admin: «Rozilik yozma olingan» amali shuni belgilaydi) |
| Maqsadga muvofiqlik, minimal ma'lumot | Faqat ism, natijalar, chat, jurnal; reklama/kuzatuv yo'q | — |
| Sub'ekt huquqlari: ko'rish, nusxa, o'chirish | Profil → «Mening ma'lumotlarim» (JSON yuklab olish, hisobni o'chirish); ota-ona bola ma'lumotini yuklaydi/o'chiradi | So'rovlarga e-pochta orqali javob bering |
| Saqlash muddati | `python manage.py purge_old_data` (chat 365, jurnal 365, kayfiyat 730 kun) | Kuniga bir marta cron'ga qo'ying |
| Lokalizatsiya (O'zbekiston hududidagi server) | Ma'lumotlar bazasi faqat sizning serveringizda | **Serverni O'zbekistonda joylashtiring** (UZ hosting/ma'lumotlar markazi) |
| Davlat reestri | `LEGAL_REGISTER_NUMBER` sozlamasi maxfiylik sahifasida ko'rinadi | Ma'lumotlar bazasini **Shaxsga doir ma'lumotlar bazalari davlat reestrida** ro'yxatdan o'tkazing |
| Chet elga uzatish | Ovoz xizmatiga faqat tayyor jumlalar (`TTS_ALLOWLIST_ONLY`); ism/xabar hech qachon yuborilmaydi | Telegram yoqsangiz — rozilikda ko'rsating yoki o'chiq qoldiring |
| Operator ma'lumoti | Maxfiylik siyosati `LEGAL_*` dan to'ladi | `.env` da `LEGAL_OPERATOR`, `LEGAL_ADDRESS`, `LEGAL_EMAIL` va boshqalarni to'ldiring |
| Xavfsizlik choralari | Quyida 3-bo'lim | HTTPS, zaxira nusxa, serverni yangilab turish |

## 2. Bolalarni zararli axborotdan himoya qilish to'g'risidagi Qonun
- Yosh belgisi: sukut bo'yicha **0+** (`AGE_LABEL`), saytning pastki qismida va maxfiylik siyosatida ko'rsatiladi.
- Chat faqat ota-ona ↔ ustoz; begona bilan yozishmaydi; o'quvchilar bir-birini ko'rmaydi.

## 3. Texnik xavfsizlik
- Parol: scrypt; administrator bergan parol birinchi kirishda majburan almashtiriladi.
- Kirish urinishlari cheklangan (IP va hisob bo'yicha); admin kirishida ham (10 urinish/15 daqiqa).
- JWT: access 20 daqiqa, refresh 7 kun, chiqishda qora ro'yxat.
- Sarlavhalar: CSP, Permissions-Policy, COOP/CORP, nosniff, `/api/` uchun `no-store`; HTTPS_ONLY=True bo'lsa HSTS.
- Admin manzili `ADMIN_URL` bilan almashtiriladi (masalan `boshqaruv-x7k/`).
- Audit jurnali (kirish, xato kirish, parol, rozilik, eksport, o'chirish) — adminda faqat o'qiladi.
- Bog'liqliklar tekshirildi: `pip-audit` va `npm audit` — zaifliklar yo'q (Pillow 13.0.0, DRF 3.18.2).

## 4. Ishga tushirishdan oldin ro'yxat
1. `.env`: `SECRET_KEY` (uzun tasodifiy), `DEBUG=False`, `ALLOWED_HOSTS`, `HTTPS_ONLY=True`, `NUM_PROXIES=1` (nginx ortida), `ADMIN_URL`, `LEGAL_*`.
2. Server O'zbekistonda; HTTPS sertifikati.
3. Ma'lumotlar bazasini davlat reestrida ro'yxatdan o'tkazing.
4. Ota-onalardan yozma rozilik; yurist tekshiruvi.
5. Kunlik cron: `python manage.py purge_old_data`; zaxira nusxa.

## 5. Hozircha qilinmagan (ochiq aytamiz)
- Admin uchun 2 bosqichli kirish (2FA) yo'q — kuchli parol va maxfiy `ADMIN_URL` ishlating.
- Kirish belgilari brauzer `localStorage` da; CSP bilan himoyalangan, lekin httpOnly cookie emas.
- Xato xabarlarining ba'zilari hali rus tilida bo'lishi mumkin.
