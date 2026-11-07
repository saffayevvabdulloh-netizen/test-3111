// Privacy policy and terms (Uzbek). They describe what this software really does; the operator's own details
// (name, address, e-mail, where the servers stand, register number) come from the server settings (.env: LEGAL_*).
import { Link } from "react-router-dom";

const blank = (v, what) => (v ? <b>{v}</b> : <i className="legal__todo">[{what} sozlamalarda kiritilmagan]</i>);

export function PrivacyText({ legal = {}, version = "" }) {
  return (
    <>
      <p className="muted">Siyosat versiyasi: {version || "—"}. «Shaxsga doir ma'lumotlar to'g'risida»gi O'zbekiston Respublikasi Qonuni (ZRU-547) talablariga muvofiq.</p>

      <h2>1. Operator</h2>
      <p>Ma'lumotlarni qayta ishlovchi (operator): {blank(legal.operator, "operator nomi")}{legal.tin ? <>, STIR/JShShIR: <b>{legal.tin}</b></> : null}. Manzil: {blank(legal.address, "manzil")}.
        Aloqa: {blank(legal.email, "e-pochta")}{legal.phone ? <>, <b>{legal.phone}</b></> : null}.</p>

      <h2>2. Qanday ma'lumotlar qayta ishlanadi</h2>
      <ul>
        <li><b>Hisob:</b> ism, familiya, foydalanuvchi nomi, parol (faqat shifrlangan ko'rinishda), rol (bola / ota-ona / ustoz), ixtiyoriy: yosh va avatar.</li>
        <li><b>Bola uchun:</b> mashq va o'yin natijalari, yulduzlar, kunlik kayfiyat belgisi (ixtiyoriy tugma), sinf, bog'langan ota-ona.</li>
        <li><b>Ota-ona va ustoz uchun:</b> bolalar ro'yxati, o'zaro yozishmalar (chat), ustoz yaratgan darslar va o'yinlar.</li>
        <li><b>Xavfsizlik jurnali:</b> kirish va chiqish vaqti, IP-manzil, muvaffaqiyatsiz urinishlar, parol almashtirish, rozilik va ma'lumot so'rovlari.</li>
        <li><b>Qurilmada qoladigan ma'lumot:</b> kirish belgisi (token) va qulaylik sozlamalari brauzer xotirasida saqlanadi. Reklama va kuzatuv cookie-lari ishlatilmaydi.</li>
        <li>Puls o'lchash (ixtiyoriy, tugma bosilganda) kamera tasvirini <b>qurilmaning o'zida</b> ishlaydi: tasvir serverga yuborilmaydi va saqlanmaydi. Bu tibbiy o'lchov emas.</li>
      </ul>

      <h2>3. Maqsad va huquqiy asos</h2>
      <p>Ma'lumotlar faqat ta'lim va rivojlantiruvchi xizmatni ko'rsatish uchun: bolaning mashqlarini yuritish, natijalarni uning ustoziga va ota-onasiga ko'rsatish, ota-ona va ustoz o'rtasida aloqa, hisob xavfsizligini ta'minlash uchun qayta ishlanadi. Asos — sub'ektning roziligi; <b>bola uchun rozilikni ota-onasi yoki qonuniy vakili beradi</b>. Ma'lumotlar reklama, savdo yoki profil tuzish uchun ishlatilmaydi va sotilmaydi.</p>

      <h2>4. Kimga ko'rinadi</h2>
      <ul>
        <li>Bolaning natijalari va kayfiyatini faqat <b>o'zi, o'z sinfining ustozi va bog'langan ota-onasi</b> ko'radi.</li>
        <li>Chat yozishmalarini faqat suhbatdagi ikki kishi ko'radi.</li>
        <li>Boshqa shaxslarga ma'lumot qonunda belgilangan hollardagina, vakolatli organ talabi bilan beriladi.</li>
        <li>Administrator hisoblarni ochish, parolni tiklash va xavfsizlik uchun texnik kirish huquqiga ega.</li>
      </ul>

      <h2>5. Saqlash joyi va chet elga uzatish</h2>
      <p>Ma'lumotlar bazasi O'zbekiston Respublikasi hududida joylashgan serverda saqlanadi: {blank(legal.data_location, "server joylashuvi")}.
        {legal.register_number ? <> Ma'lumotlar bazasi Shaxsga doir ma'lumotlar bazalari davlat reestrida qayd etilgan, guvohnoma raqami: <b>{legal.register_number}</b>.</> : null}</p>
      <p>Ovozli yordamchi uchun faqat dasturning <b>o'z tayyor jumlalari</b> («Barakalla!» kabi) chet el ovoz xizmatiga yuborilishi mumkin. Ism, xabar yoki boshqa shaxsiy ma'lumot ovoz xizmatiga <b>hech qachon yuborilmaydi</b>. Telegram orqali tasdiqlash yoqilgan bo'lsa, Telegram identifikatori ham chet el xizmatiga tegishli bo'ladi; sukut bo'yicha bu o'chiq.</p>

      <h2>6. Saqlash muddati</h2>
      <p>Hisob va natijalar hisob o'chirilguncha saqlanadi. Chat xabarlari 365 kundan, xavfsizlik jurnali 365 kundan, kayfiyat yozuvlari 730 kundan keyin avtomatik o'chiriladi. Hisob o'chirilsa, unga tegishli ma'lumotlar yo'q qilinadi.</p>

      <h2>7. Sizning huquqlaringiz</h2>
      <ul>
        <li><b>Ko'rish va nusxa olish:</b> Profil → «Mening ma'lumotlarim» → «Yuklab olish». Ota-ona bolasining ma'lumotini «Bolalarim» sahifasidan yuklab oladi.</li>
        <li><b>To'g'rilash:</b> ism, yosh va avatarni Profil sahifasida o'zgartirish mumkin; boshqasi uchun administratorga murojaat qiling.</li>
        <li><b>O'chirish va rozilikni qaytarib olish:</b> ota-ona, ustoz o'z hisobini Profil sahifasida o'chiradi; ota-ona bola hisobini «Bolalarim» sahifasida o'chiradi. Rozilik qaytarib olinsa, qayta ishlash to'xtatiladi va ma'lumot yo'q qilinadi.</li>
        <li>Barcha so'rovlar bo'yicha {blank(legal.email, "e-pochta")} manziliga yozishingiz mumkin. Huquqlaringiz buzilgan bo'lsa, Shaxsga doir ma'lumotlarni himoya qilish vakolatli organiga yoki sudga murojaat qilish huquqiga egasiz.</li>
      </ul>

      <h2>8. Himoya choralari</h2>
      <p>Parollar zamonaviy shifrlash usulida saqlanadi; ulanish HTTPS orqali; kirishga urinishlar cheklangan; administrator tomonidan berilgan parol birinchi kirishda almashtiriladi; barcha muhim amallar jurnalga yoziladi; hisoblar rollar bo'yicha ajratilgan.</p>

      <h2>9. Bolalar va yosh belgisi</h2>
      <p>Xizmat bolalar uchun mo'ljallangan, kontenti zararsiz. Axborot mahsulotining yosh belgisi: <b>{legal.age_label || "0+"}</b> («Bolalarni ularning sog'lig'iga va rivojlanishiga zarar yetkazuvchi axborotdan himoya qilish to'g'risida»gi Qonunga muvofiq).</p>

      <h2>10. O'zgarishlar</h2>
      <p>Siyosat o'zgarsa, versiya raqami yangilanadi va hamma foydalanuvchidan qayta rozilik so'raladi. Batafsil shartlar: <Link to="/terms">Foydalanish shartlari</Link>.</p>
    </>
  );
}

export function TermsText() {
  return (
    <>
      <h2>1. Umumiy</h2>
      <p>Bolajon AI — autizmli va rivojlanishida qo'llab-quvvatlash kerak bo'lgan bolalar uchun ijtimoiy va muloqot ko'nikmalarini o'rgatuvchi o'yin-mashqlar platformasi. Hisoblarni faqat administrator ochadi; foydalanuvchi o'zi ro'yxatdan o'tmaydi.</p>
      <h2>2. Tibbiy xizmat emas</h2>
      <p>Platforma tibbiy tashxis qo'ymaydi va davolash o'rnini bosmaydi. Puls o'lchash va kayfiyat belgilari taxminiy va yordamchi xarakterda. Bolaning sog'lig'i bo'yicha qarorlarni shifokor va mutaxassis bilan qabul qiling.</p>
      <h2>3. Hisob xavfsizligi</h2>
      <p>Foydalanuvchi nomi va parolni boshqalarga bermang. Administrator bergan parolni birinchi kirishda almashtiring. Hisobdagi harakatlar uchun hisob egasi (bola uchun — ota-ona yoki vasiy) javobgar.</p>
      <h2>4. Muloqot qoidalari</h2>
      <p>Chat faqat bola ta'limi masalalari uchun. Haqorat, tahdid, reklama va nomaqbul material yuborish taqiqlanadi. Qoidabuzar hisob administrator tomonidan o'chirilishi mumkin.</p>
      <h2>5. Kontent va mualliflik</h2>
      <p>Ustozlar yaratgan o'yin va darslar uchun ularning o'zlari javobgar; boshqalarning mualliflik huquqini buzadigan material joylamang.</p>
      <h2>6. Shaxsiy ma'lumotlar</h2>
      <p>Ma'lumotlar <Link to="/privacy">Maxfiylik siyosati</Link> bo'yicha qayta ishlanadi.</p>
      <h2>7. O'zgarishlar</h2>
      <p>Shartlar o'zgarishi mumkin; yangi versiya e'lon qilinganda foydalanuvchiga xabar beriladi.</p>
    </>
  );
}
