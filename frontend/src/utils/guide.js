// Spoken explanations (read aloud by the "Eshit" buttons). One place, plain short sentences:
// easy to hear, easy to translate, and tools/collect_phrases.py turns every string here into a voice clip.
export const GUIDE = {
  register: "Bu ro'yxatdan o'tish sahifasi. Avval kimligingizni tanlang: bola yoki mutaxassis. Keyin foydalanuvchi nomini yozing. Kamida uchta belgi bo'lsin. Keyin parol o'ylab toping. Kamida sakkizta belgi bo'lsin va faqat raqamdan iborat bo'lmasin. Oxirida yashil tugmani bosing.",
  login: "Bu kirish sahifasi. Foydalanuvchi nomingizni yozing. Keyin parolingizni yozing. Parolni ko'rish uchun ko'z belgisini bosing. Oxirida yashil Kirish tugmasini bosing.",
  verify: "Hisobingizni Telegram orqali tasdiqlaymiz. Birinchi qadam: sariq tugmani bosib, Telegram botni oching va Start tugmasini bosing. Bot sizga oltita raqamli kod yuboradi. Ikkinchi qadam: kodni shu sahifaga yozing va Tasdiqlash tugmasini bosing.",
  verifyStep1: "Telegram botni oching va Start tugmasini bosing. Bot sizga oltita raqamli kod yuboradi.",
  verifyStep2: "Botdan kelgan oltita raqamli kodni shu yerga yozing. Keyin Tasdiqlash tugmasini bosing. Kod besh daqiqa amal qiladi.",
  breakTime: "Dam olish vaqti. Ozgina suv ichamiz va sekin nafas olamiz.",
  forgot: "Parolni tiklash. Telegramda botga reset deb yozing. Bot sizga oltita raqamli kod yuboradi. Kodni va yangi parolni shu sahifaga yozing. Oxirida Parolni o'zgartirish tugmasini bosing.",
};

// What to tell the person for each state of the Telegram bot (also shown as text).
export const BOT = {
  ok: "Bot ulangan va ishlayapti. Telegramda Start tugmasini bosing. Kod bir necha soniyada keladi.",
  not_running: "Bot hozir ishlamayapti, shuning uchun kod kelmaydi. Serverni boshqaradigan odamga ayting: botni ishga tushirish kerak.",
  unreachable: "Server Telegramga ulana olmayapti. Internetni tekshirish kerak. Agar Telegram to'silgan bo'lsa, VPN yoki proksi kerak. Bir ozdan keyin yana urinib ko'ring.",
  bad_token: "Botning kaliti noto'g'ri. Administrator BotFather'dan yangi token olib, sozlamaga yozishi kerak.",
  no_token: "Bot sozlanmagan: token yozilmagan. Administrator tokenni sozlamaga yozishi kerak.",
  conflict: "Bu bot boshqa joyda ham ishlab turibdi. Bitta nusxasini to'xtatish kerak.",
  rate_limited: "Telegram sekinlashishni so'rayapti. Bir daqiqadan keyin yana urinib ko'ring.",
  error: "Botda kutilmagan xato bor. Bir ozdan keyin yana urinib ko'ring.",
  server: "Saytning serveriga ulanib bo'lmadi. Internetni tekshiring va yana urinib ko'ring.",
};
export const BOT_TITLE = {
  ok: "Bot ulangan",
  checking: "Bot tekshirilmoqda...",
};
