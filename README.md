# Bot bilan aloqa uzilsa (Telegram)

Tekshirish: `python dev.py --bot` (yoki `python backend/manage.py telegram_check`). U tokenni, Telegramga ulanishni va bot jarayonini
tekshirib, nima qilish kerakligini aytadi. Sayt o'zi ham **Telegram sahifalarida** bot holatini ko'rsatadi va ovozda tushuntiradi.

| Holat | Ma'nosi | Nima qilish kerak |
|---|---|---|
| `unreachable` | server Telegramga ulana olmayapti | internetni tekshiring; Telegram to'silgan bo'lsa VPN yoki `TELEGRAM_PROXY=http://host:port` |
| `bad_token` | token noto'g'ri/bekor qilingan | @BotFather dan yangi token, `TELEGRAM_BOT_TOKEN` ga yozing |
| `not_running` | bot jarayoni ishlamayapti | `python dev.py` (bot u bilan birga ishlaydi) yoki `python manage.py run_telegram_bot` |
| `conflict` | shu bot boshqa joyda ham ishlayapti | bitta nusxani to'xtating |
| `no_token` | token yozilmagan | `TELEGRAM_BOT_TOKEN` ni yozing |

Bot endi aloqa uzilganda **o'zi qayta ulanadi** (3 soniyadan 60 soniyagacha oshib boruvchi pauza bilan). Faqat token noto'g'ri bo'lsa to'xtaydi.

---

# Shirin ayol ovozi (tavsiya etiladi)

Brauzerning o'z ovozi qurilmaga bog'liq. Hamma qurilmada bir xil, **shirin ayol ovozi** uchun (Microsoft "Madina", o'zbekcha)
yozuvlarni bir marta yaratib qo'ying:

```bash
pip install edge-tts
python tools/make_audio.py      # internet kerak (faqat shu bir marta); frontend/public/audio/ ga yozadi
cd frontend && npm run build    # yozuvlar saytga qo'shiladi
```

Matnlarni o'zgartirsangiz yoki yangi mashq qo'shsangiz: avval `python tools/collect_phrases.py`, keyin yana `make_audio.py`
(tayyor yozuvlar saqlanadi, faqat yangilari yaratiladi). Yozuvi yo'q jumlani brauzer o'z ovozi bilan (ayol ovozi tanlanadi) o'qiydi.
Bola/ota-ona ovozni va tezlikni **⚙ Qulaylik** menyusida tanlaydi.

---

# Tez boshlash (mahalliy kompyuterda)

```bash
python dev.py          # Windows: start_windows.bat ni ikki marta bosing
```

Skript o'zi: `.venv` yaratadi, kutubxonalarni o'rnatadi, `backend/.env` ni (DEBUG=True) yozadi,
frontend'ni bir marta build qiladi (Node.js 20+ kerak) va serverni **http://127.0.0.1:8000** da ishga tushiradi.
Talab: **Python 3.12+**.

**Planshet/telefondan ochish (bir Wi-Fi):** `python dev.py --lan` (Windows: `start_windows.bat --lan`), so'ng terminalda chiqqan `http://192.168...:8000` manzilini oching.

**Parolni unutsangiz (mahalliy):** Telegram botsiz parolni shunday almashtiring:
`.venv\Scripts\python backend\manage.py changepassword foydalanuvchi_nomi` (Linux/Mac: `.venv/bin/python backend/manage.py changepassword nom`).
Sayt kodini o'zgartirgan bo'lsangiz `python dev.py` o'zi saytni qayta yig'adi.

**Muhim:** `backend/.env` uchun `backend/.env.example` dan foydalaning. Ildizdagi `.env.example` faqat **docker** uchun.
Ikkalasida ham izohlar alohida qatorda bo'lishi kerak. Telegram tokeni `TELEGRAM_BOT_TOKEN` nomi bilan yoziladi
(`BOT_TOKEN` ham taniladi). Mahalliy `DEBUG=True` va token yo'q bo'lsa, Telegram tasdiqlash avtomatik o'chiriladi,
shuning uchun botsiz ham ro'yxatdan o'tib kirish mumkin. Tokenni hech kimga yubormang; tarqalgan bo'lsa @BotFather da `/revoke`.

---

# Bolajon AI — autizmli bolalar uchun ijtimoiy va muloqot ko'nikmalarini rivojlantiruvchi platforma

```
backend/    Django REST API (auth + Telegram tasdiqlash, o'yinlar, Game Creator, sinflar, natijalar)
frontend/   React + Vite SPA (o'zbekcha interfeys)
```

Backend frontendni o'zi tarqatadi, shuning uchun production'da **bitta server, bitta port**:
`/` → ilova, `/api/v1/` → API, `/api/docs/` → Swagger, `/admin/`, `/media/` → yuklangan rasmlar.
CORS va proksi kerak emas.

## A) Bitta server (tavsiya etiladi)

```bash
cp backend/.env.example backend/.env     # SECRET_KEY, TELEGRAM_BOT_TOKEN ni to'ldiring
./build.sh                               # frontend build + siqish + migrate + collectstatic
./start.sh                               # http://localhost:8000   (gunicorn)
python backend/manage.py run_telegram_bot   # alohida terminalda: Telegram bot
```
Frontendni o'zgartirsangiz: faqat `cd frontend && npm run build` — serverni qayta ishga tushirish shart emas
(`index.html` har so'rovda yangilanadi, xeshli fayllar avtomatik almashadi; siqilgan `.gz` uchun
`python -m whitenoise.compress frontend/dist` ni ham ishga tushiring yoki `./build.sh` dan foydalaning).

## B) Docker (Postgres + bot bilan) — *yozilgan, lekin muallif muhitida sinalmagan*

```bash
cp .env.example .env        # SECRET_KEY, POSTGRES_PASSWORD, TELEGRAM_BOT_TOKEN, ALLOWED_HOSTS
docker compose up -d --build
```
Xizmatlar: `db` (Postgres 16), `web` (Django + ilova, :8000), `bot` (Telegram). Rasmlar va baza volume'larda saqlanadi.

## C) Ishlab chiqish (ikki terminal, tez qayta yuklash)

```bash
cd backend && python manage.py runserver          # :8000
cd frontend && npm install && npm run dev         # :5173  (/api va /media :8000 ga proksilanadi)
```
Yoki frontendni bir marta build qilib, faqat `runserver` ni ishlatish mumkin (DEBUG=True da ham ilovani tarqatadi).

Telegramsiz sinash: `backend/.env` da `REQUIRE_TELEGRAM_VERIFICATION=False`.

## Muhim sozlamalar (`backend/.env`)
| Kalit | Izoh |
|---|---|
| `DEBUG` | production'da `False` |
| `SECRET_KEY` | majburiy (DEBUG=False da bo'lmasa server ishga tushmaydi) |
| `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` | domeningiz |
| `SECURE_COOKIES` | HTTPS orqasida `True`. Oddiy http'da `DEBUG=False` sinasangiz `False` qiling |
| `SERVE_MEDIA` | `True`: rasmlarni Django beradi (kichik server uchun yetarli). Katta yuklama: nginx/S3 |
| `DATABASE_URL` | sukut: SQLite. Postgres: `postgres://user:pass@host:5432/db` |
| `FRONTEND_DIST` | build papkasi (sukut: `../frontend/dist`) |

## Frontend tuzilmasi
```
src/api/        fetch klient: JWT, yagona-uchuvchi refresh, xato tarjimasi (ru/en -> uz)
src/auth/       AuthContext, rol himoyasi
src/games/      registry.js — o'yin turi = Renderer + Editor + validatsiya (yangi tur shu yerda)
                Player.jsx — holat mashinasi: ready -> playing -> submitting -> feedback -> completing
src/pages/      public / student / teacher (har biri alohida chunk)
src/ui/         dizayn tizimi (Zumi maskoti, avatarlar, modal, toast ...)
src/styles/     tokens -> base -> components -> layout -> pages/games/creator
```
Yangi o'yin turi: backendda `games/question_types.py`, frontendda `games/registry.js` + `renderers/` + `editors/`.
