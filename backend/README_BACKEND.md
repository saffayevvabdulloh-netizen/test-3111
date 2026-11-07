# School Games — backend

## Run
```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill TELEGRAM_BOT_TOKEN (new token, see below)
python manage.py migrate
python manage.py fix_plaintext_passwords   # ONE TIME, only for DBs created by the old code
python manage.py runserver                 # API docs (Swagger): http://127.0.0.1:8000/api/docs/
python manage.py test                      # 63 tests
python manage.py run_telegram_bot          # production: bot as its own process
```
`runserver` also starts the bot in a thread when `RUN_TELEGRAM_BOT=True` and a token is set.
Local dev without Telegram: `REQUIRE_TELEGRAM_VERIFICATION=False` (accounts are active at once).

## Error shapes (what the frontend should handle)
| Status | Body |
|---|---|
| 400 validation | `{"field": ["msg"]}` or `{"detail": "..."}` |
| 400 login | `{"error": "Неверный username или password"}` |
| 403 login, Telegram not confirmed | `{"error", "code": "telegram_not_verified", "telegram_link"}` |
| 401 | missing / expired access token → call `POST /token/refresh/` |
| 409 | `{"code": "version_conflict" \| "game_has_attempts" \| "time_over" \| "attempt_completed", "detail": "..."}` |
| 429 | throttled (login/register/verify, class join) |
Lists are paginated: `{count, next, previous, results}` (20 per page), except `/games/{id}/questions/`.

## Endpoints (`/api/v1/`)
**Auth / profile** — `register/`, `login/`, `logout/`, `token/refresh/`, `verify-code/` (**username + code**),
`telegram-link/` (username + password), `password-reset/confirm/` (username, code, new_password — code comes from `/reset` in the bot),
`me/` (GET, PATCH first_name/last_name/avatar), `me/change-password/`

**Teacher — Game Creator** — `game-types/`, `games/` (list mine / create), `games/{id}/` (GET full with answers, PATCH, DELETE),
`games/{id}/publish|unpublish|archive|duplicate/`, `games/{id}/cover/` (multipart `image`),
`games/{id}/questions/` (+ `{qid}/`, `{qid}/duplicate/`, `{qid}/image/`, `reorder/` `{order:[ids]}`),
`games/{id}/preview/` + `preview/check/` (play a draft, nothing stored), `games/{id}/stats/`

**Teacher — classes** — `classes/`, `classes/{id}/`, `classes/{id}/students/`, `classes/{id}/students/{sid}/` (DELETE),
`classes/{id}/regenerate-code/`, `classes/{id}/assignments/`, `assignments/{id}/`, `assignments/{id}/results/`, `classes/{id}/results/`

**Lessons** — `lessons/` (+ `{id}/`, `publish|unpublish|archive/`, `cover/`)

**Student** — `games/` / `games/catalog/` (playable games), `games/{id}/attempts/` (start / resume),
`attempts/{id}/` , `attempts/{id}/answers/` `{question_id, answer}`, `attempts/{id}/complete/`,
`classes/join/` `{code}`, `me/classes/`, `me/assignments/`, `me/attempts/`, `me/progress/`

## Game types and answer shapes
| type | teacher `content` | student `answer` |
|---|---|---|
| quiz | `{"options":[{"text","is_correct"}]}` 2–6 | `{"selected":["o1"]}` |
| true_false | `{"correct": true}` | `{"value": true}` |
| matching | `{"pairs":[{"left","right"}]}` 2–8 (partial credit) | `{"pairs":[{"left","right"}]}` |
| fill_blank | `{"accepted":["a","b"],"case_sensitive":false}` | `{"text":"..."}` |
New type = one class in `games/question_types.py` (+ `@register`).
Game `config`: `shuffle_questions`, `shuffle_options`, `reveal_answers`, `time_limit_seconds` (10–3600 or null).

## Rules worth knowing
* Students never receive answers; wrong answers return `hint` + `explanation` (and `correct_answer` if `reveal_answers`).
* One answer per question per attempt (re-submit returns the stored result). One open attempt per student+game.
* After a game has attempts its questions are locked (409 `game_has_attempts`) — duplicate it to change them. Metadata stays editable.
* Optimistic locking: send the `version` you loaded in PATCH; stale → 409 `version_conflict`.
* Visibility: published + (`is_public` or the owner teaches one of the student's classes).
* Achievements (real, computed on completion): `first_game`, `perfect_score`, `five_games`, `ten_games`.

## Ovoz (o'zbekcha, serverda)

`POST /api/v1/tts/` &nbsp;`{"text": "..."}` &rarr; `audio/mpeg` (faqat tizimga kirgan foydalanuvchi, `THROTTLE_TTS` bilan cheklangan).

* **Standart: Microsoft "Madina"** (`uz-UZ-MadinaNeural`) &mdash; haqiqiy o'zbek ovozi, kalit kerak emas. Server internetga chiqa olishi kerak (`pip install -r requirements.txt` edge-tts'ni o'rnatadi).
* **Ixtiyoriy: ElevenLabs "Adam"** &mdash; `.env` da `TTS_PROVIDER=elevenlabs` va `ELEVENLABS_API_KEY=...`. Asosiy ovoz ishlamasa, ikkinchisi zaxira bo'ladi. Kalit faqat serverda, brauzerga chiqmaydi.
* Sozlamalar: `root/settings.py` (`EDGE_TTS_*`, `ELEVENLABS_*`), `voice/services.py` (`VOICE_SETTINGS`).
* Bir xil matn diskda keshlanadi (`backend/tts_cache/`).
* Frontend: `utils/sound.js` &rarr; `speak()` avval tayyor yozuvni, keyin server ovozini, oxirida brauzer ovozini ishlatadi. Bevosita: `speakElevenLabs(text)`.
