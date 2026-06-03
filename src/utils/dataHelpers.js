import { format, parseISO } from 'date-fns';

export function parseDate(str) {
  if (!str) return null;
  try { return parseISO(str); } catch { return null; }
}

export function monthLabel(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return 'Unknown';
  return format(d, 'MMM yyyy');
}

export function sortedMonths(months) {
  return [...new Set(months)].sort((a, b) => {
    const [ma, ya] = a.split(' ');
    const [mb, yb] = b.split(' ');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return Number(ya) - Number(yb) || months.indexOf(ma) - months.indexOf(mb);
  });
}

export function daysBetween(a, b) {
  const da = parseDate(a), db = parseDate(b);
  if (!da || !db) return null;
  return Math.round((db - da) / 86400000);
}

export function yieldPct(completed, ordered) {
  if (!ordered || ordered === 0) return null;
  return ((completed / ordered) * 100).toFixed(1);
}
