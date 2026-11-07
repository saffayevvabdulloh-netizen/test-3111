# Bolajon AI — yangilanishlar

- **Uslub**: `styles/tokens.css` + barcha CSS pastel "candy" ko'rinishga o'tkazildi (qora ramka o'rniga yumshoq chiziq/soya).
- **Brend nomi**: faqat `src/brand.js` ichida (hozir Bolajon AI). O'zgartirsangiz butun UI yangilanadi.
- **Maskot**: `ui/Mascot.jsx` — qoplon, do'ppida (eski API saqlangan: mood, size). `MascotSay` — nutq pufagi bilan.
- **Ovoz**: `utils/sound.js` — yumshoq marimba/qo'ng'iroq effektlari, exo, limiter. `speak()` — o'zbekcha (yoki turkcha) ovoz topilsa gapiradi, topilmasa jim.
- **Puls (rPPG)**: `ui/PulseWidget.jsx` + `utils/rppg.js` — haqiqiy kamera, faqat tugma bosilganda, video qurilmadan chiqmaydi. Taxminiy, tibbiy emas.
- **Mini o'yinlar** (`src/activities`, marshrut `/app/fun`, `/app/fun/:id`): 12 ta mashq. Yangi mashq qo'shish: `games/` ichida komponent yozing + `registry.js`ga 1 qator.
- Yulduzlar qurilmada saqlanadi (`activities/progress.js`), backend o'zgarmagan.

## 7-yangilanish: ovoz
- **Ovoz tanlash**: yozuv (`public/audio`) -> bo'lmasa qurilmaning eng yaxshi AYOL ovozi (o'zbekcha, so'ng turkcha; erkak/ingliz/rus ovozlar tanlanmaydi). Menyuda ovozni tanlash, "Sekin gapirsin", "Ovozni tinglash".
- `tools/make_audio.py` (Madina ovozi, `pip install edge-tts`) va `tools/collect_phrases.py` (89 jumla). Yozuvlarni men bu muhitda yarata olmadim (internet yo'q): skriptni o'zingizda bir marta ishga tushiring.
- **Alifbo** mashqi (28 harf: bossa harf va so'z aytiladi), **Yumshoq musiqa** (o'chiq turadi), ko'proq maqtov so'zlari, natija kartasida bola ismi.

## 8-yangilanish: kirish va ro'yxatdan o'tish (haqiqiy router bilan tekshirilgan)
- **Xato tuzatildi:** chuqur havoladan (masalan `/app/games/1`) kirilsa, login'dan keyin shu sahifaga qaytmay `/app` ga tushardi (`GuestOnly` va `Login` yo'naltirishlari poygalashardi). Endi `afterLoginPath()` bitta joyda.
- Login/Register/Forgot/Verify: parolni ko'rsatish tugmasi; "Kirish" tugmasi endi o'chirilmaydi (autofill bo'lsa qotib qolmasin), qiymatlar to'g'ridan-to'g'ri formadan o'qiladi; xato bo'lsa parol maydoni tanlanadi; bo'sh yuborilsa nima yetishmayotgani aytiladi.
- Tarjimalar: "parol ismga o'xshash", "Token is invalid or expired", "Unable to log in..." va boshqalar o'zbekchaga o'giriladi.
- Windows: bot `print` dagi emoji (UnicodeEncodeError xavfi) olib tashlandi; Python skriptlari kod sahifasidan qat'i nazar yiqilmaydi.
- `dev.py`: manba `dist` dan yangi bo'lsa saytni o'zi qayta yig'adi; `--lan` rejimi (telefon/planshet).

## 9-yangilanish: bot aloqasi va ovozli tushuntirishlar
- **Xato topildi:** bot birinchi tarmoq xatosida abadiy to'xtardi va hech kim bilmasdi. Endi `telegram_bot/supervisor.py` uni o'zi qayta ulaydi (pauza 3 -> 60 s), xatoni turlarga ajratadi (`health.py`), faqat noto'g'ri tokenda to'xtaydi.
- Bot har 20 soniyada `BotHeartbeat` (migratsiya `users/0003`) ga yozadi; `GET /api/v1/bot-status/` saytga holatni beradi (texnik tafsilot oshkor qilinmaydi). Havola endi botning **haqiqiy** @username'i bilan yasaladi (`.env` dagi xato nom endi zarar qilmaydi).
- `python manage.py telegram_check` / `python dev.py --bot`: tashxis; `TELEGRAM_PROXY` sozlamasi.
- Saytda: Tasdiqlash sahifasida bot holati (yashil/qizil) + sababi + **Eshit**; Ro'yxatdan o'tish/Parolni tiklash sahifalarida bot ishlamasa oldindan ogohlantiradi.
- **Eshit** tugmalari: har bir sahifa nima ekanini, tasdiqlash qadamlarini, xato xabarlarini va har bir mashqning **Tushuntirishi**ni aytib beradi (yozuv bo'lsa ayol ovozi). Tugma bosilganda maskot ovozi o'chiq bo'lsa ham gapiradi; qayta bossa to'xtaydi; qurilmada ovoz bo'lmasa buni ochiq aytadi.
- `tools/collect_phrases.py`: endi 173 jumla (tushuntirishlar va xato matnlari ham). Ularni ovozga aylantirish: `python tools/make_audio.py`.

## 10-yangilanish: chuqur tekshiruv va yangi imkoniyatlar
- **Differensial test**: frontend `validate` va backend `clean()` (haqiqiy kod) 34 chegaraviy holatda; o'quvchi javob shakllari backend `grade()` bilan (8/8). Topilgan nomuvofiqlik: "katta-kichik harf farqlanadi" rejimida ichki bo'sh joylar; chegaralar (6 variant, 8 juft, 10 javob, uzunliklar) endi frontendda ham tekshiriladi.
- **O'qituvchiga ko'rinadigan ruscha xato matnlari** (variant takrorlangan, ball 1-100, matn uzunligi, fayl hajmi...) o'zbekchaga o'giriladi.
- **Qulaylik tekshiruvi** (nomsiz tugma, belgisiz maydon, takroriy id, kontrast): muammo topilmadi; matnli havolalarning bosish maydoni kattalashtirildi.
- **Nafas olamiz** mashqi (4 marta; ovozli ko'rsatma; sokin rejimda doira qimirlamaydi); qiyin kayfiyat tanlansa tinchlanish tugmasi chiqadi.
- **Stikerlar albomi** (Yutuqlar sahifasi): har 2 yulduz = 1 stiker, mashq tugaganda yangi stiker e'loni.
- **Chop etiladigan hisobot** (sinf > Kayfiyat > Hisobot): 30 kunlik kayfiyat, mashqlar jadvali, imzo joyi; A4 PDF.
- **CSV eksport** (Excel formulalardan himoyalangan, UTF-8).
- **Dam olish eslatmasi** (ixtiyoriy, sukut: o'chiq): Qulaylik menyusida 10/15/20/30 daqiqa.

- **Ota-ona roli** (`role=parent`, marshrut `/parent`): ro'yxatdan o'tishda «Ota-ona» tanlanadi. Bolani ulash: bola profilidagi **Ota-ona kodi** (6 belgi) ni ota-ona «Bolalarim» sahifasida kiritadi (`/parent/children/`, `/me/family/`).
- **Chat ota-ona ↔ ustoz** (`/parent/chat`, `/teach/chat`, API `/chat/threads/`): faqat bolasi ustozning sinfida bo'lgan ota-ona va shu ustoz yozisha oladi. Yangi xabarlar 4 soniyada polling bilan keladi, menyuda o'qilmagan xabarlar soni ko'rinadi.
- Migratsiya: `python manage.py migrate` (users 0005, school 0003, chat 0001).

- **Hisoblarni administrator ochadi**: ro'yxatdan o'tish yopiq (`ALLOW_REGISTRATION=False`). Bola, ota-ona va ustoz faqat kiradi.
  - `/admin/` → Foydalanuvchilar → «Add»: rol, ism, login, parol. Bola sahifasida sinf va ota-onalarni, ota-ona sahifasida bolalarini bog'lash mumkin. «Yangi parol yaratish» amali parolni tiklaydi, «Hisobni o'chirish» kirishni to'xtatadi.
  - Ko'p hisob bir martada: `python manage.py import_users people.csv --out accounts.csv` (ustunlar: `role,first_name,last_name,username,password,child,class_code`; bo'sh login/parol o'zi yaratiladi; `--dry-run` sinab ko'radi). `accounts.csv` dagi login/parollarni oilalarga bering va faylni o'chiring.
  - Saytni qayta ochish kerak bo'lsa: `ALLOW_REGISTRATION=True`.
- **Tezlik**: build vaqtida JS/CSS `.br/.gz` ga siqiladi (`npm run build`), API javoblari gzip, DB ulanishlari qayta ishlatiladi, SQLite WAL rejimida. Login limiti endi sinf bitta IP dan kirsa ham to'smaydi (har bir hisobga alohida cheklov).

- **Kuchaytirish (3-bosqich)**:
  - Login 4 marta tezroq: parollar `scrypt` bilan tekshiriladi (~0.2 s), eski parollar kirishda o'zi yangilanadi. Mavjud bo'lmagan nom bilan urinish vaqti ham bir xil (nom bilinmaydi).
  - Server: `gunicorn` ko'p oqimli (`gthread`, `WEB_CONCURRENCY` / `WEB_THREADS`), ishchilar vaqti-vaqti bilan yangilanadi. Bir nechta ishchi/server bo'lsa `.env` ga `REDIS_URL` yozing (limitlar umumiy bo'ladi).
  - Rasmlar yuklanganda 1280 px gacha kichraytiriladi va siqiladi (telefon rasmi 5 MB → ~200 KB, GPS ma'lumoti o'chadi); `/media` brauzerda 30 kun saqlanadi.
  - Ovoz: server ovozi 1.8 soniyada javob bermasa, qurilma ovozi darhol gapiradi (mashq qotib qolmaydi); server javobi keyingi safar uchun keshda saqlanadi.
  - Menyu sahifalari bo'sh vaqtda oldindan yuklanadi (bosganda ~0.1 s). Zaif internetda 3.5 s dan keyin saqlangan sahifa ochiladi.
  - Chat so'rovlari suhbat tinch bo'lsa siyrak (4 → 8 → 15 s).
  - HTTPS ortida: `HTTPS_ONLY=True` (HSTS, yo'naltirish, cookie) — `.env.example` ga qarang.

- **O'yinlar ko'rinishi**: har bir mini-o'yin o'z mavzusiga ega (rang, fon naqshi, suzib yuruvchi rasmlar): `src/activities/themes.js`. Yangi mashq qo'shsangiz, shu faylga 1 qator yozing (`THEMES.id = T(rang1, rang2, sarlavha_rangi, naqsh, [rasmlar])`), bo'lmasa oddiy ko'k mavzu ishlaydi. Ustozlar yaratgan o'yinlar (viktorina, to'g'ri/noto'g'ri, juftlash, javob yoz) turiga qarab o'z mavzusini oladi (`TYPE_THEMES`). Ro'yxat bo'limlarga bo'lingan, kartalar o'yin rangida, 3 yulduz olingan o'yinda 🏆 ko'rinadi. Sokin rejimda bezaklar harakatsiz va xira. Telefonda sarlavha alohida qatorga tushadi.

- **Xavfsizlik va O'zbekiston qonunlari (v6)**: birinchi kirishda majburiy parol almashtirish va rozilik oynasi; `/privacy` va `/terms` sahifalari (operator ma'lumoti `.env` dan); yosh belgisi (0+); Profilda ma'lumotni yuklab olish/hisobni o'chirish; ota-ona bola ma'lumotini yuklaydi/o'chiradi; audit jurnali, saqlash muddati (`purge_old_data`), CSP va xavfsizlik sarlavhalari, admin kirish limiti, maxfiy `ADMIN_URL`; ovoz xizmatiga faqat tayyor jumlalar; Pillow/DRF yangilandi. Batafsil: `docs/UZ_HUQUQIY_TALABLAR.md`.
