// CSV for Excel / Google Sheets. Cells that start with = + - @ could be run as formulas when opened
// (names are typed by users!), so they get a leading apostrophe. UTF-8 BOM keeps Uzbek letters intact in Excel.
export const csvCell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows) => "\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
export function downloadCsv(filename, rows) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
