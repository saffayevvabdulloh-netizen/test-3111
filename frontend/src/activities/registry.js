// Mini games for the youngest learners (run fully in the browser; stars are kept on the device).
import { lazy } from "react";

export const CATS = [
  { key: "nutq", label: "Nutq va so'zlar", tone: "sky", emoji: "🗣️", art: ["🔤", "🎤", "🦁"] },
  { key: "emotsiya", label: "Emotsiyalar", tone: "sun", emoji: "😊", art: ["😄", "😢", "🥰"] },
  { key: "ijtimoiy", label: "Ijtimoiy ko'nikmalar", tone: "grape", emoji: "🤝", art: ["👦", "👧", "👋"] },
  { key: "odat", label: "Kunlik odatlar", tone: "emerald", emoji: "🪥", art: ["🪥", "🧼", "🧸"] },
  { key: "mantiq", label: "Mantiq va topishmoqlar", tone: "coral", emoji: "🧩", art: ["🔺", "🍎", "🧠"] },
];

const MODS = {
  speech: () => import("./games/speech.jsx"), emotions: () => import("./games/emotions.jsx"),
  calm: () => import("./games/calm.jsx"), habits: () => import("./games/habits.jsx"), logic: () => import("./games/logic.jsx"), social: () => import("./games/social.jsx"),
};
const L = ({ file, fn }) => lazy(() => MODS[file]().then((m) => ({ default: m[fn] })));

export const ACTIVITIES = [
  { id: "harf", cat: "nutq", title: "Harfni ayt!", sub: "Eshit va takrorla", emoji: "🔤", scene: "meadow", tone: "sky", rounds: 6, intro: "Harfni birga aytamiz!", how: "Harf va rasm chiqadi. Eshit tugmasini bos va tingla. Keyin mikrofon tugmasini bosib, harfni yoki so'zni ayt.", C: L({ file: "speech", fn: "Letters" }) },
  { id: "alifbo", cat: "nutq", title: "Alifbo", sub: "Harfni bos va tingla", emoji: "🔤", scene: "meadow", tone: "sun", rounds: 6, intro: "Istalgan harfni bos!", how: "Istalgan harfni bos. Men harfni va shu harfdan boshlanadigan so'zni aytaman. Oltita turli harfni tingla.", C: L({ file: "speech", fn: "Alphabet" }) },
  { id: "emotsiya", cat: "emotsiya", title: "Emotsiyani top!", sub: "Mos yuzni tanla", emoji: "😄", scene: "room", tone: "sun", rounds: 6, intro: "Yuzlarga diqqat bilan qara!", how: "Tepada hissiyotning nomi yozilgan. Pastdagi yuzlardan shunga mos keladiganini tanla.", C: L({ file: "emotions", fn: "default" }) },
  { id: "nafas", cat: "emotsiya", title: "Nafas olamiz", sub: "Tinchlanish mashqi", emoji: "🫧", scene: "meadow", tone: "sky", rounds: 4, intro: "Birga sekin nafas olamiz.", how: "Doira kattalashganda burundan sekin nafas ol. Keyin ushla. Doira kichraygach, og'izdan sekin chiqar. To'rt marta takrorlaymiz.", C: L({ file: "calm", fn: "Breathing" }) },
  { id: "salom", cat: "ijtimoiy", title: "Eshitib, takrorla!", sub: "Chiroyli so'zlar", emoji: "👋", scene: "school", tone: "grape", rounds: 5, intro: "Odobli so'zlarni aytamiz!", how: "Chiroyli so'zni eshit. Keyin mikrofon tugmasini bosib, o'zing takrorla.", C: L({ file: "speech", fn: "Greetings" }) },
  { id: "hikoya", cat: "ijtimoiy", title: "Hikoya: Maktabga boramiz", sub: "Ijtimoiy hikoya", emoji: "🏫", scene: "school", tone: "grape", rounds: 5, intro: "Hikoyani birga o'qiymiz!", how: "Bu qisqa hikoya. Eshit tugmasini bos va tingla. Keyin Keyingi tugmasini bos.", C: L({ file: "social", fn: "SchoolStory" }) },
  { id: "navbat", cat: "ijtimoiy", title: "Hikoya: Navbat kutamiz", sub: "Ijtimoiy hikoya", emoji: "⏳", scene: "room", tone: "sun", rounds: 5, intro: "Kutish ham ko'nikma!", how: "Bu navbat kutish haqida hikoya. Eshit tugmasini bos va tingla. Keyin Keyingi tugmasini bos.", C: L({ file: "social", fn: "QueueStory" }) },
  { id: "vaziyat", cat: "ijtimoiy", title: "Nima qilaman?", sub: "To'g'ri qarorni tanla", emoji: "🤔", scene: "school", tone: "sky", rounds: 5, intro: "Qaysi javob mehribon?", how: "Vaziyatni o'qi yoki eshit. Uchta javobdan eng mehribonini tanla. Xato bo'lsa, qayta urinib ko'r.", C: L({ file: "social", fn: "Situations" }) },
  { id: "jadval", cat: "odat", title: "Mening kunim", sub: "Kunlik jadvalni tuz", emoji: "🗓️", scene: "room", tone: "emerald", rounds: 5, intro: "Kun tartibini bilish — tinchlik!", how: "Kunim qanday o'tadi? Rasmlarni tartib bilan joylashtir: avval nima, keyin nima.", C: L({ file: "habits", fn: "DaySchedule" }) },
  { id: "tish", cat: "odat", title: "Toza tishlar — sog'lom tabassum!", sub: "Tishlarni to'g'ri tozalash", emoji: "🪥", scene: "bath", tone: "emerald", rounds: 3, intro: "Kichik odatlar — katta salomatlik!", how: "Avval tish pastasini bos. Keyin ikki daqiqa tishingni yuvamiz. Oxirida suv bilan chayqaymiz.", C: L({ file: "habits", fn: "Teeth" }) },
  { id: "qol", cat: "odat", title: "Qo'lni to'g'ri yuvish", sub: "Ketma-ketlikni top", emoji: "🧼", scene: "bath", tone: "sky", rounds: 4, intro: "Avval nima, keyin nima?", how: "Qo'lni yuvish tartibini top. Rasmni bos, so'ng kerakli raqamli katakni bos. Yoki rasmni sudrab olib bor.", C: L({ file: "habits", fn: "HandWash" }) },
  { id: "oyinchoq", cat: "odat", title: "O'yinchoqlarni joyiga yig'!", sub: "Xonani tartibga keltir", emoji: "🧸", scene: "room", tone: "coral", rounds: 5, intro: "Xonani toza qilamiz!", how: "Yerdagi o'yinchoqni bos, so'ng savatni bos. Yoki o'yinchoqni sudrab, savatga tashla.", C: L({ file: "habits", fn: "Toys" }) },
  { id: "shakl", cat: "mantiq", title: "Shakllarni o'z joyiga qo'y!", sub: "Har bir shaklni mos teshikka", emoji: "🔺", scene: "room", tone: "coral", rounds: 4, intro: "Qaysi shakl qayerga mos?", how: "Har bir shaklni o'ziga mos teshikka sudrab joylashtir.", C: L({ file: "logic", fn: "Shapes" }) },
  { id: "meva", cat: "mantiq", title: "Mevalarni rangiga qarab ajrat!", sub: "Qizil, sariq, yashil", emoji: "🍎", scene: "garden", tone: "emerald", rounds: 6, intro: "Rangga e'tibor ber!", how: "Mevalarni rangiga qarab savatlarga sol: qizil, sariq va yashil.", C: L({ file: "logic", fn: "Fruits" }) },
  { id: "soya", cat: "mantiq", title: "Har bir narsaning soyasini top!", sub: "Narsani soyasiga olib bor", emoji: "🦆", scene: "garden", tone: "sky", rounds: 4, intro: "Soyalar sirli-ku!", how: "Har bir narsani uning soyasiga sudrab olib bor.", C: L({ file: "logic", fn: "Shadows" }) },
  { id: "sanoq", cat: "mantiq", title: "Sanashni o'rganamiz!", sub: "Nechta bor?", emoji: "🔢", scene: "meadow", tone: "sun", rounds: 5, intro: "Birga sanaymiz!", how: "Rasmlarni sana. Keyin to'g'ri raqamni bos.", C: L({ file: "logic", fn: "Counting" }) },
  { id: "xotira", cat: "mantiq", title: "Xotira o'yini", sub: "Juftliklarni top", emoji: "🐼", scene: "meadow", tone: "grape", rounds: 4, intro: "Kartalarni yaxshi eslab qol!", how: "Kartani bos va rasmni ko'r. Bir xil ikkita rasmni top.", C: L({ file: "logic", fn: "Memory" }) },
];
export const byId = (id) => ACTIVITIES.find((a) => a.id === id);
export const nextOf = (id) => { const i = ACTIVITIES.findIndex((a) => a.id === id); return ACTIVITIES[(i + 1) % ACTIVITIES.length]; };
