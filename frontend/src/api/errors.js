// Backend messages (Russian / DRF English) -> Uzbek. Unknown text is shown as-is.
const EXACT = {
  "Отметьте хотя бы один правильный вариант.": "Kamida bitta to'g'ri variantni belgilang.",
  "correct: укажите true или false.": "“To'g'ri” yoki “Noto'g'ri” javobini tanlang.",
  "Допустимые ответы не должны повторяться.": "Qabul qilinadigan javoblar takrorlanmasin.",
  "Допустимы a-z, 0-9, _ и -, до 32 символов.": "Faqat a-z, 0-9, _ va - mumkin (32 belgigacha).",
  "Передайте все id вопросов этой игры ровно по одному разу.": "Savollar tartibi eskirgan. Sahifani yangilang.",
  "Конфликт состояния.": "Ma'lumot boshqa joyda o'zgargan. Sahifani yangilang va qayta urining.",
  "Код успешно подтверждён": "Kod tasdiqlandi.",
  "Пароль изменён": "Parol o'zgartirildi.",
  "Пароль изменён. Войдите заново.": "Parol o'zgartirildi. Qaytadan kiring.",
  "Регистрация успешна": "Ro'yxatdan o'tish muvaffaqiyatli.",
  "Неверный username или password": "Foydalanuvchi nomi yoki parol noto'g'ri.",
  "Подтвердите Telegram": "Avval Telegram orqali tasdiqlang.",
  "Неверный или просроченный код.": "Kod noto'g'ri yoki muddati o'tgan.",
  "Этот username уже занят.": "Bu foydalanuvchi nomi band.",
  "Неверный текущий пароль.": "Joriy parol noto'g'ri.",
  "Недействительный токен": "Seans yaroqsiz. Qaytadan kiring.",
  "Только для учителей.": "Bu bo'lim faqat o'qituvchilar uchun.",
  "Только для учеников.": "Bu bo'lim faqat o'quvchilar uchun.",
  "Класс с таким кодом не найден.": "Bunday kodli sinf topilmadi.",
  "Название не может быть пустым.": "Nom bo'sh bo'lmasligi kerak.",
  "Время вышло. Завершите игру, чтобы увидеть результат.": "Vaqt tugadi. Natijani ko'rish uchun o'yinni yakunlang.",
  "Эта попытка уже завершена.": "Bu urinish allaqachon yakunlangan.",
  "У игры уже есть попытки учеников. Создайте копию, чтобы изменить вопросы.": "Bu o'yinni o'quvchilar o'ynagan, shuning uchun savollarni o'zgartirib bo'lmaydi. Nusxa oling va nusxani tahrirlang.",
  "У игры есть попытки учеников — удалить нельзя. Переместите её в архив.": "O'quvchilar bu o'yinni o'ynagan, o'chirib bo'lmaydi. Arxivga o'tkazing.",
  "Эти данные уже изменены в другом окне. Обновите страницу, чтобы не потерять чужие правки.": "Bu ma'lumot boshqa oynada o'zgartirilgan. Sahifani yangilang, aks holda o'zgarishlar yo'qoladi.",
  "Игру нельзя опубликовать — исправьте ошибки.": "O'yinni nashr qilib bo'lmaydi — xatolarni tuzating.",
  "Добавьте хотя бы один вопрос.": "Kamida bitta savol qo'shing.",
  "Такого задания для вас нет.": "Sizda bunday topshiriq yo'q.",
  "В этой игре пока нет вопросов.": "Bu o'yinda hali savollar yo'q.",
  "Нельзя менять тип игры, пока в ней есть вопросы.": "Savollar bor ekan, o'yin turini o'zgartirib bo'lmaydi.",
  "Можно назначать только опубликованные игры (свои или публичные).": "Faqat nashr etilgan o'yinlarni (o'zingiznikini yoki ommaviyni) topshirish mumkin.",
  "Срок не может быть в прошлом.": "Muddat o'tmishda bo'lishi mumkin emas.",
  "Добавьте текст урока перед публикацией.": "Nashr qilishdan oldin dars matnini yozing.",
  "Только автор может изменять игру.": "O'yinni faqat muallifi o'zgartira oladi.",
  "Только автор может удалить игру.": "O'yinni faqat muallifi o'chira oladi.",
  "Только автор может изменять урок.": "Darsni faqat muallifi o'zgartira oladi.",
  "Только автор может удалить урок.": "Darsni faqat muallifi o'chira oladi.",
  "Токен принадлежит другому пользователю": "Token boshqa foydalanuvchiga tegishli.",
  "Некорректный формат ответа.": "Javob formati noto'g'ri.",
  "This field is required.": "Bu maydon to'ldirilishi shart.",
  "This field may not be blank.": "Bu maydon bo'sh bo'lmasligi kerak.",
  "This field may not be null.": "Bu maydon to'ldirilishi shart.",
  "A user with that username already exists.": "Bu foydalanuvchi nomi band.",
  "This password is too common.": "Bu parol juda oddiy. Boshqasini tanlang.",
  "This password is entirely numeric.": "Parol faqat raqamlardan iborat bo'lmasin.",
  "The password is too similar to the username.": "Parol foydalanuvchi nomiga juda o'xshash.",
  "The password is too similar to the first name.": "Parol ismingizga juda o'xshash.",
  "The password is too similar to the last name.": "Parol familiyangizga juda o'xshash.",
  "Not a valid string.": "Matn kiriting.",
  "Given token not valid for any token type": "Seans tugagan. Qaytadan kiring.",
  "Token is invalid or expired": "Seans tugagan. Qaytadan kiring.",
  "Unable to log in with provided credentials.": "Foydalanuvchi nomi yoki parol noto'g'ri.",
  "No active account found with the given credentials": "Foydalanuvchi nomi yoki parol noto'g'ri.",
  "Урок не найден.": "Dars topilmadi.",
  "Authentication credentials were not provided.": "Avval tizimga kiring.",
  "You do not have permission to perform this action.": "Sizda bu amalga ruxsat yo'q.",
  "Not found.": "Topilmadi.",
  "Invalid page.": "Sahifa topilmadi.",
  "Token is invalid": "Seans yaroqsiz. Qaytadan kiring.",
  "Token is blacklisted": "Seans tugagan. Qaytadan kiring.",
  "Upload a valid image. The file you uploaded was either not an image or a corrupted image.": "Rasm yaroqsiz. JPEG, PNG yoki WEBP yuklang.",
  "Файл слишком большой (максимум 3 МБ).": "Fayl juda katta (ko'pi bilan 3 MB).",
  "Допустимы только JPEG, PNG или WEBP.": "Faqat JPEG, PNG yoki WEBP mumkin.",
  "Максимум 50 вопросов в игре.": "Bitta o'yinda ko'pi bilan 50 ta savol bo'lishi mumkin.",
};

// "Вариант 3", "Пара 2, слева", "Текст вопроса" ... -> Uzbek label
const RU_LABEL = (l) => l.replace(/^Вариант (\d+)$/, "$1-variant").replace(/^Пара (\d+), слева$/, "$1-juft, chap").replace(/^Пара (\d+), справа$/, "$1-juft, o'ng")
  .replace(/^Пара (\d+)$/, "$1-juft").replace(/^Текст вопроса$/, "Savol matni").replace(/^Ответ$/, "Javob").replace(/^Баллы$/, "Ball");
const PATTERNS = [
  // ---- teacher-facing validation messages written in Russian by the backend (games / questions / lessons)
  [/^(.+): длина от (\d+) до (\d+) символов\.$/, (m) => `${RU_LABEL(m[1])}: ${m[2]} dan ${m[3]} gacha belgi bo'lsin.`],
  [/^(.+): от (\d+) до (\d+) символов\.$/, (m) => `${RU_LABEL(m[1])}: ${m[2]} dan ${m[3]} gacha belgi bo'lsin.`],
  [/^(.+): ожидается текст\.$/, (m) => `${RU_LABEL(m[1])}: matn yozing.`],
  [/^Баллы: от (\d+) до (\d+)\.$/, (m) => `Ball ${m[1]} dan ${m[2]} gacha bo'lsin.`],
  [/^Вариант (\d+): повторяется текст\.$/, (m) => `${m[1]}-variant: matn takrorlangan. Variantlar har xil bo'lsin.`],
  [/^Вариант (\d+): is_correct/, () => "Variant belgisi noto'g'ri. Sahifani yangilang."],
  [/^Пара (\d+): значения не должны повторяться\./, (m) => `${m[1]}-juft: chap va o'ng qiymat har xil bo'lsin.`],
  [/^options: нужно от (\d+) до (\d+) вариантов\./, (m) => `Variantlar soni ${m[1]} dan ${m[2]} gacha bo'lsin.`],
  [/^pairs: нужно от (\d+) до (\d+) пар\./, (m) => `Juftlar soni ${m[1]} dan ${m[2]} gacha bo'lsin.`],
  [/^accepted: от (\d+) до (\d+) допустимых ответов\./, (m) => `Qabul qilinadigan javoblar soni ${m[1]} dan ${m[2]} gacha bo'lsin.`],
  [/^time_limit_seconds: целое от (\d+) до (\d+)/, (m) => `Vaqt chegarasi ${m[1]} dan ${m[2]} soniyagacha bo'lsin (yoki bo'sh qoldiring).`],
  [/^Максимум (\d+) вопрос/, (m) => `Bir o'yinda ko'pi bilan ${m[1]} ta savol bo'lishi mumkin.`],
  [/^Файл слишком большой \(максимум (\d+)/, (m) => `Fayl juda katta (ko'pi bilan ${m[1]} MB).`],
  [/^Текст урока слишком длинный \(макс\. (\d+)\)/, (m) => `Dars matni juda uzun (ko'pi bilan ${m[1]} belgi).`],
  [/^Неизвестные настройки/, () => "Noma'lum sozlamalar yuborildi. Sahifani yangilang."],
  [/^Неизвестный тип игры/, () => "Noma'lum o'yin turi."],
  [/должен быть объектом\.$/, () => "Ma'lumot shakli noto'g'ri. Sahifani yangilang."],
  [/должен быть true\/false\.$/, () => "Qiymat noto'g'ri. Sahifani yangilang."],
  [/^Каждая? (пара|вариант) должна? быть объектом\./, () => "Ma'lumot shakli noto'g'ri. Sahifani yangilang."],

  [/This password is too short\. It must contain at least (\d+) characters?\./, (m) => `Parol juda qisqa (kamida ${m[1]} belgi).`],
  [/Ensure this field has at least (\d+) characters?\./, (m) => `Kamida ${m[1]} belgi bo'lishi kerak.`],
  [/Ensure this field has no more than (\d+) characters?\./, (m) => `Ko'pi bilan ${m[1]} belgi bo'lishi mumkin.`],
  [/Ensure this value is greater than or equal to (\d+)\./, (m) => `Qiymat kamida ${m[1]} bo'lishi kerak.`],
  [/Ensure this value is less than or equal to (\d+)\./, (m) => `Qiymat ko'pi bilan ${m[1]} bo'lishi mumkin.`],
  [/Request was throttled\. Expected available in (\d+) seconds?\./, (m) => `Juda ko'p urinish. ${m[1]} soniyadan keyin qayta urining.`],
  [/Enter a valid username/, () => "Foydalanuvchi nomida faqat harf, raqam va @/./+/-/_ belgilari bo'lishi mumkin."],
  [/is not a valid choice/, () => "Noto'g'ri tanlov."],
  [/Method ".+" not allowed/, () => "Bu amalga ruxsat berilmagan."],
  [/A valid integer is required/, () => "Butun son kiriting."],
];

export function tr(text) {
  if (typeof text !== "string") return text;
  if (EXACT[text]) return EXACT[text];
  for (const [re, fn] of PATTERNS) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  return text;
}

export const FIELD_LABELS = {
  username: "Foydalanuvchi nomi", password: "Parol", role: "Rol", first_name: "Ism", last_name: "Familiya", age: "Yosh",
  title: "Nom", name: "Nom", description: "Tavsif", prompt: "Savol matni", points: "Ball", content: "Javoblar",
  code: "Kod", new_password: "Yangi parol", current_password: "Joriy parol", due_at: "Muddat", game: "O'yin",
  config: "Sozlamalar", game_type: "O'yin turi", avatar: "Avatar", image: "Rasm", body: "Matn", summary: "Qisqa tavsif",
};
