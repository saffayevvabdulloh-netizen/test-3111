// Client-side checks that mirror the backend (users/serializer.py + Django validators),
// so mistakes are shown instantly instead of after a round trip.
export const USERNAME_RE = /^[\p{L}\p{N}@.+_-]+$/u;
export const normUsername = (v) => v.trim().toLowerCase();

export function usernameError(v) {
  const u = normUsername(v);
  if (!u) return "Foydalanuvchi nomini yozing.";
  if (u.length < 3) return "Kamida 3 ta belgi kerak.";
  if (u.length > 150) return "Juda uzun (ko'pi bilan 150 belgi).";
  if (!USERNAME_RE.test(u)) return "Faqat harf, raqam va . _ - + @ belgilari mumkin (probel va ' mumkin emas).";
  return "";
}

export function passwordError(pw, username = "") {
  if (!pw) return "Parolni yozing.";
  if (pw.length < 8) return `Kamida 8 ta belgi kerak (hozir ${pw.length}).`;
  if (/^\d+$/.test(pw)) return "Parol faqat raqamlardan iborat bo'lmasin.";
  const u = normUsername(username);
  if (u && pw.toLowerCase() === u) return "Parol foydalanuvchi nomi bilan bir xil bo'lmasin.";
  if (/^(.)\1+$/.test(pw) || ["password", "qwertyui", "12345678", "parol123", "11111111"].includes(pw.toLowerCase())) return "Bu parol juda oddiy. Boshqasini tanlang.";
  return "";
}

// 0..4 + label, only a hint for the user (the server decides)
export function passwordStrength(pw) {
  let n = 0;
  if (pw.length >= 8) n++;
  if (pw.length >= 12) n++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++;
  if (/\d/.test(pw) && /[^\d]/.test(pw)) n++;
  if (/[^\p{L}\p{N}]/u.test(pw)) n++;
  const score = Math.min(4, n);
  return { score, label: ["Juda zaif", "Zaif", "O'rtacha", "Yaxshi", "Kuchli"][score] };
}
