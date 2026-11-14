const SHORT = ['', 'K', 'M', 'B', 'T'];

/** Suffixe pour un groupe de milliers : K, M, B, T puis aa, ab, ac… */
function suffix(group: number): string {
  if (group < SHORT.length) return SHORT[group];
  const n = group - SHORT.length;
  const a = Math.floor(n / 26);
  const b = n % 26;
  return String.fromCharCode(97 + (a % 26)) + String.fromCharCode(97 + b);
}

/** 1234 -> "1.23K", 15 -> "15", 2.5e15 -> "2.5aa". */
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return String(Math.floor(n));
  const group = Math.min(Math.floor(Math.log10(n) / 3), 200);
  const v = n / Math.pow(1000, group);
  const s = v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
  return s.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1') + suffix(group);
}

export const money = (n: number): string => '$' + fmt(n);

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
