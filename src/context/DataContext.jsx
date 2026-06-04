import { createContext, useContext, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import defaultWO from '../data/wo_data.json';
import defaultAbsorption from '../data/absorption_data.json';
import defaultCycleCount from '../data/cycle_count_data.json';
import defaultDistribution from '../data/distribution_data.json';
import defaultPO from '../data/po_data.json';

const DataContext = createContext(null);

const LS_WO      = 'caldera_wo_data';
const LS_ABS     = 'caldera_absorption_data';
const LS_CC      = 'caldera_cycle_count_data';
const LS_DIST    = 'caldera_distribution_data';
const LS_PO      = 'caldera_po_data';
const LS_VERSION = 'caldera_data_version';
const CACHE_VERSION = '2';  // bump this whenever default data changes

// Clear stale localStorage if version doesn't match
if (localStorage.getItem(LS_VERSION) !== CACHE_VERSION) {
  [LS_WO, LS_ABS, LS_CC, LS_DIST, LS_PO, 'caldera_last_updated'].forEach(k => localStorage.removeItem(k));
  localStorage.setItem(LS_VERSION, CACHE_VERSION);
}

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

// ── WO file parser ────────────────────────────────────────────────────────────
function parseWOFile(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  // find header row (contains "Work Order Number")
  let headerIdx = raw.findIndex(r => r.some(v => String(v ?? '').includes('Work Order Number')));
  if (headerIdx === -1) throw new Error('Could not find header row in WO file');

  const headers = raw[headerIdx];
  const rows = raw.slice(headerIdx + 1)
    .filter(r => r.some(v => v !== null))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        let v = r[i] ?? null;
        // Excel dates come as serial numbers
        if (v !== null && typeof v === 'number' && String(h).toLowerCase().includes('date')) {
          const d = XLSX.SSF.parse_date_code(v);
          if (d) v = new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0).toISOString();
        }
        obj[h] = v;
      });
      return obj;
    })
  return rows;
}

// ── Absorption file parser ────────────────────────────────────────────────────
const ABS_MONTHS = ['Jan 2026','Feb 2026','Mar 2026','Apr 2026','May 2026','Jun 2026',
                    'Jul 2026','Aug 2026','Sep 2026','Oct 2026','Nov 2026','Dec 2026'];

function parseAbsorptionFile(workbook) {
  // find the sheet with AOP data
  const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('aop') || n.toLowerCase().includes('dem')) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  function findBlockHeader(label) {
    return raw.findIndex(r => String(r[0] ?? '').trim().startsWith(label));
  }

  const aopHeaderIdx  = findBlockHeader('AOP 2026');
  const ltHeaderIdx   = findBlockHeader('AOP 2026 - Latest');
  const actHeaderIdx  = findBlockHeader('ACT 2026');

  if (aopHeaderIdx === -1) throw new Error('Could not find AOP 2026 block');

  function extractBlock(labelRow, nextLabelRow) {
    const headerRow = raw[labelRow + 1];
    const monthCols = {};
    headerRow.forEach((v, i) => {
      if (v instanceof Date || (typeof v === 'number' && v > 40000)) {
        const d = typeof v === 'number' ? XLSX.SSF.parse_date_code(v) : null;
        const date = d ? new Date(d.y, d.m - 1, 1) : (v instanceof Date ? v : null);
        if (date) {
          const label = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          monthCols[label] = i;
        }
      } else if (typeof v === 'string' && v.startsWith('2026')) {
        const date = new Date(v);
        if (!isNaN(date)) {
          const label = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          monthCols[label] = i;
        }
      }
    });

    const end = nextLabelRow ?? raw.length;
    const result = [];
    for (let i = labelRow + 2; i < end; i++) {
      const row = raw[i];
      const code = row[0];
      if (!code || String(code).trim() === '') continue;
      const entry = { code: String(code).trim(), description: String(row[1] ?? '').trim() };
      ABS_MONTHS.forEach(m => {
        const idx = monthCols[m];
        entry[m] = idx !== undefined ? (Number(row[idx]) || 0) : 0;
      });
      result.push(entry);
    }
    return result;
  }

  return {
    aop: extractBlock(aopHeaderIdx, ltHeaderIdx !== -1 ? ltHeaderIdx : undefined),
    lt:  ltHeaderIdx  !== -1 ? extractBlock(ltHeaderIdx,  actHeaderIdx !== -1 ? actHeaderIdx : undefined) : defaultAbsorption.lt,
    act: actHeaderIdx !== -1 ? extractBlock(actHeaderIdx, undefined) : defaultAbsorption.act,
  };
}

// ── Cycle Count file parser ───────────────────────────────────────────────────
function parseCycleCountFile(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  let headerIdx = raw.findIndex(r => r.some(v => String(v ?? '').includes('Count Sequence') || String(v ?? '').includes('Item Number')));
  if (headerIdx === -1) throw new Error('Could not find header row in Cycle Count file');

  const headers = raw[headerIdx];
  const rows = raw.slice(headerIdx + 1)
    .filter(r => r.some(v => v !== null))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        let v = r[i] ?? null;
        if (h === 'Count Due Date' && v !== null && typeof v === 'number') {
          const d = XLSX.SSF.parse_date_code(v);
          if (d) v = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
        }
        obj[h] = v;
      });
      return obj;
    });
  return rows;
}

// ── Distribution file parser ──────────────────────────────────────────────────
function parseDistributionFile(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  let headerIdx = raw.findIndex(r =>
    r.some(v => String(v ?? '').includes('Scheduled Shipment Date') ||
                String(v ?? '').includes('Customer Name') ||
                String(v ?? '').includes('Shipment Number'))
  );
  if (headerIdx === -1) throw new Error('Could not find header row in Distribution file');

  const headers = raw[headerIdx];
  const rows = raw.slice(headerIdx + 1)
    .filter(r => r.some(v => v !== null))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = r[i] ?? null;
      });
      return obj;
    });
  return rows;
}

// ── PO file parser ────────────────────────────────────────────────────────────
function parsePOFile(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  let headerIdx = raw.findIndex(r =>
    r.some(v => String(v ?? '').includes('Supplier Name')) &&
    r.some(v => String(v ?? '').includes('Document Number'))
  );
  if (headerIdx === -1) throw new Error('Could not find header row in PO file');

  const headers = raw[headerIdx];
  const rows = raw.slice(headerIdx + 1)
    .filter(r => r.some(v => v !== null))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = r[i] ?? null;
      });
      return obj;
    });
  return rows;
}

// ── Detect file type and parse ────────────────────────────────────────────────
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
        const sheetNames = wb.SheetNames.join(' ').toLowerCase();
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const firstCell  = String(XLSX.utils.sheet_to_json(firstSheet, { header: 1 })[0]?.[0] ?? '').toLowerCase();

        if (firstCell.includes('work order') || firstCell.includes('caldera work order')) {
          resolve({ type: 'wo', data: parseWOFile(wb) });
        } else if (sheetNames.includes('aop') || sheetNames.includes('dem') || firstCell.includes('tvt budget')) {
          resolve({ type: 'absorption', data: parseAbsorptionFile(wb) });
        } else if (firstCell.includes('cycle count') || sheetNames.includes('cycle count')) {
          resolve({ type: 'cyclecount', data: parseCycleCountFile(wb) });
        } else if (sheetNames.includes('purchase order')) {
          resolve({ type: 'po', data: parsePOFile(wb) });
        } else if (sheetNames.includes('shipment') || firstCell.includes('transfer and sales') || firstCell.includes('scheduled shipment') || firstCell.includes('inventory organization')) {
          resolve({ type: 'distribution', data: parseDistributionFile(wb) });
        } else {
          // Try to detect distribution by header content
          const firstSheet2 = wb.Sheets[wb.SheetNames[0]];
          const rows2 = XLSX.utils.sheet_to_json(firstSheet2, { header: 1, defval: null });
          const hasDistHeaders = rows2.slice(0, 10).some(r =>
            r.some(v => String(v ?? '').includes('Scheduled Shipment Date') || String(v ?? '').includes('Shipment Number'))
          );
          if (hasDistHeaders) {
            resolve({ type: 'distribution', data: parseDistributionFile(wb) });
          } else {
            // Try to detect PO by header content
            const hasPOHeaders = rows2.slice(0, 10).some(r =>
              r.some(v => String(v ?? '').includes('Supplier Name')) &&
              r.some(v => String(v ?? '').includes('Document Number'))
            );
            if (hasPOHeaders) {
              resolve({ type: 'po', data: parsePOFile(wb) });
            } else {
              reject(new Error('File not recognised. Expected a Work Order Detail Report, AOP/ACT volume file, Cycle Count Report, Distribution Report, or Purchase Order Report.'));
            }
          }
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function DataProvider({ children }) {
  const [woData,           setWOData]           = useState(() => loadLS(LS_WO,   defaultWO));
  const [absorptionData,   setAbsorptionData]   = useState(() => loadLS(LS_ABS,  defaultAbsorption));
  const [cycleCountData,   setCycleCountData]   = useState(() => loadLS(LS_CC,   defaultCycleCount));
  const [distributionData, setDistributionData] = useState(() => loadLS(LS_DIST, defaultDistribution));
  const [poData,           setPOData]           = useState(() => loadLS(LS_PO,   defaultPO));
  const [lastUpdated,    setLastUpdated]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('caldera_last_updated') || '{}'); } catch { return {}; }
  });

  const updateWO = (data, filename) => {
    setWOData(data);
    localStorage.setItem(LS_WO, JSON.stringify(data));
    const ts = { ...lastUpdated, wo: { filename, at: new Date().toISOString() } };
    setLastUpdated(ts);
    localStorage.setItem('caldera_last_updated', JSON.stringify(ts));
  };

  const updateAbsorption = (data, filename) => {
    setAbsorptionData(data);
    localStorage.setItem(LS_ABS, JSON.stringify(data));
    const ts = { ...lastUpdated, absorption: { filename, at: new Date().toISOString() } };
    setLastUpdated(ts);
    localStorage.setItem('caldera_last_updated', JSON.stringify(ts));
  };

  const updateCycleCount = (data, filename) => {
    setCycleCountData(data);
    localStorage.setItem(LS_CC, JSON.stringify(data));
    const ts = { ...lastUpdated, cyclecount: { filename, at: new Date().toISOString() } };
    setLastUpdated(ts);
    localStorage.setItem('caldera_last_updated', JSON.stringify(ts));
  };

  const updateDistribution = (data, filename) => {
    setDistributionData(data);
    localStorage.setItem(LS_DIST, JSON.stringify(data));
    const ts = { ...lastUpdated, distribution: { filename, at: new Date().toISOString() } };
    setLastUpdated(ts);
    localStorage.setItem('caldera_last_updated', JSON.stringify(ts));
  };

  const updatePO = (data, filename) => {
    setPOData(data);
    localStorage.setItem(LS_PO, JSON.stringify(data));
    const ts = { ...lastUpdated, po: { filename, at: new Date().toISOString() } };
    setLastUpdated(ts);
    localStorage.setItem('caldera_last_updated', JSON.stringify(ts));
  };

  return (
    <DataContext.Provider value={{ woData, absorptionData, cycleCountData, distributionData, poData, updateWO, updateAbsorption, updateCycleCount, updateDistribution, updatePO, lastUpdated }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() { return useContext(DataContext); }
