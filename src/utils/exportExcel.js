import * as XLSX from 'xlsx';

// Download rows as an .xlsx file in the browser.
// columns: [{ header, value: row => any, width? }] — Date values become real Excel dates.
export function downloadExcel({ rows, columns, sheetName = 'Sheet1', fileName }) {
  const aoa = [
    columns.map(c => c.header),
    ...rows.map(r => columns.map(c => {
      const v = c.value(r);
      return v === undefined ? null : v;
    })),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'dd-mmm-yyyy' });
  ws['!cols'] = columns.map(c => ({ wch: c.width || Math.max(10, c.header.length + 2) }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: columns.length - 1 } }) };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, fileName, { compression: true });
}

export function todayStamp() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
