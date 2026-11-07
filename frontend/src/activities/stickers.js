// Sticker album: a gentle, predictable reward. Every 2 stars unlock the next sticker (24 stickers = 48 stars,
// exactly the stars of all 16 mini games), so effort is always visible and nothing is ever taken away.
export const STICKERS = [
  ["🦁", "Arslon"], ["🐘", "Fil"], ["🦒", "Jirafa"], ["🐼", "Panda"], ["🐯", "Yo'lbars"], ["🦊", "Tulki"],
  ["🐰", "Quyon"], ["🐶", "It"], ["🐱", "Mushuk"], ["🦄", "Yakkashox"], ["🐢", "Toshbaqa"], ["🐬", "Delfin"],
  ["🦋", "Kapalak"], ["🐞", "Xonqizi"], ["🌈", "Kamalak"], ["⭐", "Yulduz"], ["🚀", "Raketa"], ["🚂", "Poyezd"],
  ["🎈", "Shar"], ["🍎", "Olma"], ["🏆", "Kubok"], ["🎨", "Bo'yoqlar"], ["🧸", "Ayiqcha"], ["🌻", "Kungaboqar"],
];
export const STARS_PER_STICKER = 2;
export const unlockedCount = (totalStars) => Math.min(STICKERS.length, Math.floor(totalStars / STARS_PER_STICKER));
// stickers newly earned when the total goes from `before` to `after`
export const newStickers = (before, after) => STICKERS.slice(unlockedCount(before), unlockedCount(after));
