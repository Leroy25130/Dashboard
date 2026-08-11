import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, ReferenceLine,
} from 'recharts';
import SectionHeader from './SectionHeader';
import MultiSelect from './MultiSelect';
import stdCost from '../data/std_cost_data.json';
import { monthLabel, sortedMonths } from '../utils/dataHelpers';

const FG_CODES = new Set([
  '810051','810061','810081','830041',
  '810041A','810041B','810041BL','810081L',
  '830041B','830041BL','TVTOML','TVTRL',
]);

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d) ? null : Math.floor((d - TODAY) / 86400000);
}

function expiryColor(days) {
  if (days === null) return '#64748b';
  if (days < 0)   return '#ef4444';   // expired
  if (days <= 30) return '#ef4444';   // critical
  if (days <= 90) return '#f59e0b';   // warning
  if (days <= 180) return '#f97316';  // watch
  return '#10b981';                   // ok
}

function expiryLabel(days) {
  if (days === null) return '—';
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  return `${days}d`;
}

const BUCKET_DEFS = [
  { label: 'Expired',   min: -Infinity, max: -1,  color: '#ef4444' },
  { label: '0–30 days', min: 0,         max: 30,  color: '#ef4444' },
  { label: '31–60 days',min: 31,        max: 60,  color: '#f59e0b' },
  { label: '61–90 days',min: 61,        max: 90,  color: '#f59e0b' },
  { label: '91–180 days',min: 91,       max: 180, color: '#f97316' },
];

function bucketIdx(days) {
  if (days === null) return -1;
  return BUCKET_DEFS.findIndex(b => days >= b.min && days <= b.max);
}

function Pill({ label, value, color, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: active ? color + '22' : '#1e293b',
      borderRadius: 8, padding: '8px 16px',
      borderLeft: `3px solid ${color || '#475569'}`,
      cursor: onClick ? 'pointer' : 'default',
      outline: active ? `1px solid ${color}` : 'none',
      minWidth: 110,
    }}>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const th = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
const td = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' };
const TOOLTIP = { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 };
const clearBtn = { background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 };

// ── Stock Overview ────────────────────────────────────────────────────────────
function StockOverview({ data }) {
  const allSubs     = useMemo(() => [...new Set(data.map(r => r['Subinventory']).filter(Boolean))].sort(), [data]);
  const allStatuses = useMemo(() => [...new Set(data.map(r => r['Material Status']).filter(Boolean))].sort(), [data]);

  const [selSubs,     setSelSubs]     = useState(new Set());
  const [selStatuses, setSelStatuses] = useState(new Set());

  const filtered = useMemo(() => data.filter(r => {
    if (selSubs.size     > 0 && !selSubs.has(r['Subinventory']))      return false;
    if (selStatuses.size > 0 && !selStatuses.has(r['Material Status'])) return false;
    return r['Quantity'] > 0;
  }), [data, selSubs, selStatuses]);

  // Group by item for chart (top 20 by qty)
  const byItem = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r['Item'] || 'Unknown';
      if (!map[k]) map[k] = { item: k, desc: r['Item Description'] || '', qty: 0 };
      map[k].qty += Number(r['Quantity']) || 0;
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [filtered]);

  const top20 = byItem.slice(0, 20);

  // Group by subinventory for pills
  const bySub = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const k = r['Subinventory'] || 'Unknown';
      map[k] = (map[k] || 0) + (Number(r['Quantity']) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const totalQty   = filtered.reduce((s, r) => s + (Number(r['Quantity']) || 0), 0);
  const uniqueLots  = new Set(filtered.map(r => r['Lot'])).size;
  const uniqueItems = new Set(filtered.map(r => r['Item'])).size;

  return (
    <div id="inv-stock">
      <SectionHeader title="Stock Overview" icon="📦" />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <Pill label="Total Qty on Hand" value={totalQty.toLocaleString()} color="#3b82f6" />
        <Pill label="Unique Items"      value={uniqueItems}               color="#10b981" />
        <Pill label="Lots"              value={uniqueLots}                color="#8b5cf6" />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <MultiSelect options={allSubs}     selected={selSubs}     onChange={setSelSubs}     label="Subinventory"     minWidth={180} />
        <MultiSelect options={allStatuses} selected={selStatuses} onChange={setSelStatuses} label="Material Status"  minWidth={160} />
        {(selSubs.size > 0 || selStatuses.size > 0) && (
          <button onClick={() => { setSelSubs(new Set()); setSelStatuses(new Set()); }} style={clearBtn}>Clear filters</button>
        )}
      </div>

      {/* Subinventory breakdown pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {bySub.map(([sub, qty]) => (
          <div key={sub} style={{ background: '#1e293b', borderRadius: 6, padding: '5px 12px', fontSize: 13 }}>
            <span style={{ color: '#94a3b8' }}>{sub}: </span>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{qty.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Top 20 items by quantity on hand</div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={top20} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 140 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis type="category" dataKey="item" tick={{ fill: '#94a3b8', fontSize: 11 }} width={135} />
            <Tooltip contentStyle={TOOLTIP} formatter={(v) => [v.toLocaleString(), 'Qty']}
              labelFormatter={(l, p) => `${l} — ${p?.[0]?.payload?.desc || ''}`} />
            <Bar dataKey="qty" name="Qty" fill="#3b82f6" radius={[0,3,3,0]}>
              <LabelList dataKey="qty" position="right" style={{ fill: '#94a3b8', fontSize: 11 }} formatter={v => v.toLocaleString()} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155' }}>
          {filtered.length} lot lines shown
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
              <tr>
                <th style={th}>Item</th>
                <th style={th}>Description</th>
                <th style={th}>Lot</th>
                <th style={th}>Subinventory</th>
                <th style={th}>Material Status</th>
                <th style={{ ...th, textAlign: 'right' }}>Quantity</th>
                <th style={th}>UOM</th>
                <th style={th}>Expiration Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                  <td style={td}>{r['Item']}</td>
                  <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r['Item Description']}</td>
                  <td style={td}>{r['Lot']}</td>
                  <td style={td}>{r['Subinventory']}</td>
                  <td style={td}>{r['Material Status']}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{r['Quantity']?.toLocaleString() ?? '—'}</td>
                  <td style={td}>{r['Item Primary Unit of Measure']}</td>
                  <td style={td}>{r['Expiration Date'] ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 300 && <div style={{ padding: '10px 16px', color: '#64748b', fontSize: 12 }}>Showing 300 of {filtered.length} rows</div>}
        </div>
      </div>
    </div>
  );
}

// ── Expiry Section (shared by Components and FG) ──────────────────────────────
function ExpirySection({ id, title, icon, rows }) {
  const allSubs   = useMemo(() => [...new Set(rows.map(r => r['Subinventory']).filter(Boolean))].sort(), [rows]);
  const allItems  = useMemo(() => [...new Set(rows.map(r => r['Item']).filter(Boolean))].sort(), [rows]);

  const [selSubs,  setSelSubs]  = useState(new Set());
  const [selItems, setSelItems] = useState(new Set());
  const [activeBucket, setActiveBucket] = useState(null);

  // Enrich with days/bucket
  const enriched = useMemo(() => rows
    .map(r => {
      const days = daysUntil(r['Expiration Date']);
      return { ...r, _days: days, _bucket: bucketIdx(days) };
    })
    .filter(r => r._bucket >= 0)       // only within-180-days or expired
    .sort((a, b) => (a._days ?? 999) - (b._days ?? 999)),
  [rows]);

  const bucketCounts = useMemo(() =>
    BUCKET_DEFS.map((b, i) => ({ ...b, count: enriched.filter(r => r._bucket === i).length })),
  [enriched]);

  const filtered = useMemo(() => enriched.filter(r => {
    if (selSubs.size   > 0 && !selSubs.has(r['Subinventory']))  return false;
    if (selItems.size  > 0 && !selItems.has(r['Item']))         return false;
    if (activeBucket !== null && r._bucket !== activeBucket)    return false;
    return true;
  }), [enriched, selSubs, selItems, activeBucket]);

  const expired   = enriched.filter(r => r._days !== null && r._days < 0).length;
  const critical  = enriched.filter(r => r._days !== null && r._days >= 0 && r._days <= 30).length;
  const expiring  = enriched.filter(r => r._days !== null && r._days > 30 && r._days <= 180).length;
  const withQty   = enriched.filter(r => r['Quantity'] > 0).length;

  return (
    <div id={id}>
      <SectionHeader title={title} icon={icon} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <Pill label="Expired Lots"       value={expired}  color="#ef4444" />
        <Pill label="Critical (≤30d)"    value={critical} color="#ef4444" />
        <Pill label="Expiring (31–180d)" value={expiring} color="#f97316" />
        <Pill label="With Qty > 0"       value={withQty}  color="#f59e0b" />
      </div>

      {/* Bucket pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {bucketCounts.map((b, i) => (
          <Pill key={b.label} label={b.label} value={b.count} color={b.color}
            active={activeBucket === i} onClick={() => setActiveBucket(prev => prev === i ? null : i)} />
        ))}
        {activeBucket !== null && (
          <button onClick={() => setActiveBucket(null)} style={{ ...clearBtn, alignSelf: 'center' }}>Clear</button>
        )}
      </div>

      {/* Chart by item */}
      <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Lots expiring / expired within 180 days by item</div>
        <ResponsiveContainer width="100%" height={Math.max(180, Math.min(400, enriched.length * 22 + 40))}>
          <BarChart
            data={Object.entries(
              enriched.reduce((acc, r) => {
                const k = r['Item'] || 'Unknown';
                if (!acc[k]) acc[k] = { item: k, lots: 0 };
                acc[k].lots++;
                return acc;
              }, {})
            ).map(([, v]) => v).sort((a, b) => b.lots - a.lots).slice(0, 20)}
            layout="vertical"
            margin={{ top: 4, right: 50, bottom: 4, left: 120 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
            <YAxis type="category" dataKey="item" tick={{ fill: '#94a3b8', fontSize: 11 }} width={115} />
            <Tooltip contentStyle={TOOLTIP} formatter={v => [v, 'Lots']} />
            <Bar dataKey="lots" name="Lots" fill="#f59e0b" radius={[0,3,3,0]}>
              <LabelList dataKey="lots" position="right" style={{ fill: '#94a3b8', fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <MultiSelect options={allSubs}  selected={selSubs}  onChange={setSelSubs}  label="Subinventory" minWidth={180} />
        <MultiSelect options={allItems} selected={selItems} onChange={setSelItems} label="Item"         minWidth={180} />
        {(selSubs.size > 0 || selItems.size > 0) && (
          <button onClick={() => { setSelSubs(new Set()); setSelItems(new Set()); }} style={clearBtn}>Clear filters</button>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155' }}>
          {filtered.length} lots{activeBucket !== null ? ` — ${BUCKET_DEFS[activeBucket].label}` : ''}
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 440, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
              <tr>
                <th style={th}>Item</th>
                <th style={th}>Description</th>
                <th style={th}>Lot</th>
                <th style={th}>Subinventory</th>
                <th style={th}>Material Status</th>
                <th style={{ ...th, textAlign: 'right' }}>Quantity</th>
                <th style={th}>Expiration Date</th>
                <th style={{ ...th, textAlign: 'right' }}>Days</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((r, i) => {
                const color = expiryColor(r._days);
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                    <td style={td}>{r['Item']}</td>
                    <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r['Item Description']}</td>
                    <td style={td}>{r['Lot']}</td>
                    <td style={td}>{r['Subinventory']}</td>
                    <td style={td}>{r['Material Status']}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{r['Quantity']?.toLocaleString() ?? '—'}</td>
                    <td style={{ ...td, color, fontWeight: 600 }}>{r['Expiration Date']}</td>
                    <td style={{ ...td, textAlign: 'right', color, fontWeight: 700 }}>{expiryLabel(r._days)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 300 && <div style={{ padding: '10px 16px', color: '#64748b', fontSize: 12 }}>Showing 300 of {filtered.length} rows</div>}
        </div>
      </div>
    </div>
  );
}

// ── Quarantine ────────────────────────────────────────────────────────────────
function QuarantineSection({ data }) {
  const quarRows = useMemo(() => data.filter(r => r['Material Status'] === 'Quarantine'), [data]);

  const allSubs  = useMemo(() => [...new Set(quarRows.map(r => r['Subinventory']).filter(Boolean))].sort(), [quarRows]);
  const allItems = useMemo(() => [...new Set(quarRows.map(r => r['Item']).filter(Boolean))].sort(), [quarRows]);

  const [selSubs,  setSelSubs]  = useState(new Set());
  const [selItems, setSelItems] = useState(new Set());

  const filtered = useMemo(() => quarRows.filter(r => {
    if (selSubs.size  > 0 && !selSubs.has(r['Subinventory'])) return false;
    if (selItems.size > 0 && !selItems.has(r['Item']))        return false;
    return true;
  }), [quarRows, selSubs, selItems]);

  const totalQty    = quarRows.reduce((s, r) => s + (Number(r['Quantity']) || 0), 0);
  const uniqueItems = new Set(quarRows.map(r => r['Item'])).size;
  const uniqueLots  = new Set(quarRows.map(r => r['Lot'])).size;

  // By item chart
  const byItem = useMemo(() => {
    const map = {};
    quarRows.forEach(r => {
      const k = r['Item'] || 'Unknown';
      if (!map[k]) map[k] = { item: k, qty: 0, lots: 0 };
      map[k].qty  += Number(r['Quantity']) || 0;
      map[k].lots += 1;
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 20);
  }, [quarRows]);

  return (
    <div id="inv-quar">
      <SectionHeader title="Quarantine" icon="⚠️" />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <Pill label="Quarantine Lots"  value={uniqueLots}              color="#ef4444" />
        <Pill label="Unique Items"     value={uniqueItems}             color="#f59e0b" />
        <Pill label="Total Qty"        value={totalQty.toLocaleString()} color="#8b5cf6" />
      </div>

      <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Top 20 items in Quarantine by quantity</div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={byItem} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis type="category" dataKey="item" tick={{ fill: '#94a3b8', fontSize: 11 }} width={115} />
            <Tooltip contentStyle={TOOLTIP} formatter={(v, n) => [v.toLocaleString(), n]} />
            <Bar dataKey="qty" name="Qty" fill="#ef4444" radius={[0,3,3,0]}>
              <LabelList dataKey="qty" position="right" style={{ fill: '#94a3b8', fontSize: 11 }} formatter={v => v.toLocaleString()} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <MultiSelect options={allSubs}  selected={selSubs}  onChange={setSelSubs}  label="Subinventory" minWidth={180} />
        <MultiSelect options={allItems} selected={selItems} onChange={setSelItems} label="Item"         minWidth={180} />
        {(selSubs.size > 0 || selItems.size > 0) && (
          <button onClick={() => { setSelSubs(new Set()); setSelItems(new Set()); }} style={clearBtn}>Clear filters</button>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155' }}>
          {filtered.length} lots in quarantine
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 440, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
              <tr>
                <th style={th}>Item</th>
                <th style={th}>Description</th>
                <th style={th}>Lot</th>
                <th style={th}>Subinventory</th>
                <th style={{ ...th, textAlign: 'right' }}>Quantity</th>
                <th style={th}>UOM</th>
                <th style={th}>Expiration Date</th>
                <th style={th}>Origination Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                  <td style={td}>{r['Item']}</td>
                  <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r['Item Description']}</td>
                  <td style={td}>{r['Lot']}</td>
                  <td style={td}>{r['Subinventory']}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{r['Quantity']?.toLocaleString() ?? '—'}</td>
                  <td style={td}>{r['Item Primary Unit of Measure']}</td>
                  <td style={{ ...td, color: expiryColor(daysUntil(r['Expiration Date'])), fontWeight: 600 }}>{r['Expiration Date'] ?? '—'}</td>
                  <td style={td}>{r['Origination Date'] ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 300 && <div style={{ padding: '10px 16px', color: '#64748b', fontSize: 12 }}>Showing 300 of {filtered.length} rows</div>}
        </div>
      </div>
    </div>
  );
}

// ── Inventory Value ───────────────────────────────────────────────────────────
const SUBASSY_CODES = new Set(['P18244','P18122','P24244','P25244']);

function fmtVal(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'K';
  return v.toLocaleString();
}

const BAR_COLORS = {
  Total: '#e2e8f0',
  'Finished Goods': '#3b82f6',
  'Sub-Assembly': '#10b981',
  Components: '#f59e0b',
};

function InventoryValue({ data }) {
  const values = useMemo(() => {
    let total = 0, fg = 0, subassy = 0, comp = 0;
    data.filter(r => r['Quantity'] > 0).forEach(r => {
      const cost = stdCost[r['Item']]?.cost || 0;
      const val  = (r['Quantity'] || 0) * cost;
      total += val;
      if (FG_CODES.has(r['Item']))      fg      += val;
      else if (SUBASSY_CODES.has(r['Item'])) subassy += val;
      else                              comp    += val;
    });
    return {
      total:   Math.round(total),
      fg:      Math.round(fg),
      subassy: Math.round(subassy),
      comp:    Math.round(comp),
    };
  }, [data]);

  const chartData = [
    { category: 'Total',          value: values.total   },
    { category: 'Finished Goods', value: values.fg      },
    { category: 'Sub-Assembly',   value: values.subassy },
    { category: 'Components',     value: values.comp    },
  ];

  return (
    <div id="inv-value">
      <SectionHeader title="Inventory Value" icon="💰" />

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {chartData.map(r => (
          <Pill key={r.category} label={r.category}
            value={'CHF ' + fmtVal(r.value)}
            color={BAR_COLORS[r.category]} />
        ))}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 13 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={fmtVal}
              label={{ value: 'CHF', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={TOOLTIP}
              labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
              formatter={v => ['CHF ' + v.toLocaleString(), 'Value']}
            />
            <Bar dataKey="value" radius={[4,4,0,0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={BAR_COLORS[entry.category]} />
              ))}
              <LabelList dataKey="value" position="top"
                formatter={v => 'CHF ' + fmtVal(v)}
                style={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0f172a' }}>
                <th style={th}>Category</th>
                <th style={{ ...th, textAlign: 'right' }}>Value (CHF)</th>
                <th style={{ ...th, textAlign: 'right' }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                  <td style={{ ...td, color: BAR_COLORS[r.category], fontWeight: 600 }}>{r.category}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{'CHF ' + r.value.toLocaleString()}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#94a3b8' }}>
                    {r.category === 'Total' ? '100%' : values.total > 0 ? ((r.value / values.total) * 100).toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Components at Risk ────────────────────────────────────────────────────────
const SUBASSY_CODES_SET = new Set(['P18244','P18122','P24244','P25244']);

const RISK_FLAGS = [
  { key: 'Expired',        label: 'Expired',           color: '#ef4444' },
  { key: 'Expiring ≤30d',  label: 'Expiring ≤ 30 days', color: '#ef4444' },
  { key: 'Expiring ≤90d',  label: 'Expiring ≤ 90 days', color: '#f59e0b' },
  { key: 'Quarantine',     label: 'Quarantine',         color: '#8b5cf6' },
  { key: 'Restricted (I)', label: 'Status I',           color: '#f97316' },
  { key: 'Restricted (E)', label: 'Status E',           color: '#f97316' },
  { key: 'Restricted (N)', label: 'Status N',           color: '#64748b' },
  { key: 'Below Min Stock',label: 'Below Min Stock',    color: '#3b82f6' },
  { key: 'Lead Time Risk', label: 'Lead Time Risk',     color: '#06b6d4' },
];

function riskLevel(flags) {
  if (flags.has('Expired') || flags.has('Expiring ≤30d') || flags.has('Below Min Stock')) return 'HIGH';
  if (flags.has('Quarantine') || flags.has('Restricted (I)') || flags.has('Restricted (E)') || flags.has('Expiring ≤90d')) return 'MEDIUM';
  return 'LOW';
}
const RISK_LEVEL_COLOR = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' };

function ComponentsAtRisk({ data }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const allSubs  = useMemo(() => [...new Set(data.map(r => r['Subinventory']).filter(Boolean))].sort(), [data]);
  const [selSubs,       setSelSubs]       = useState(new Set());
  const [activeFlag,    setActiveFlag]    = useState(null);
  const [activeLevel,   setActiveLevel]   = useState(null);

  // Aggregate risk per item
  const atRiskItems = useMemo(() => {
    const compRows = data.filter(r => !FG_CODES.has(r['Item']) && !SUBASSY_CODES_SET.has(r['Item']));
    const map = {};
    compRows.forEach(r => {
      const k = r['Item'];
      if (!map[k]) map[k] = {
        item: k, desc: r['Item Description'] || '', qty: 0, lots: 0,
        flags: new Set(), nearestExp: null, subinventories: new Set(),
        minQty: null, leadTime: null,
      };
      const entry = map[k];
      entry.qty  += Number(r['Quantity']) || 0;
      entry.lots += 1;
      entry.subinventories.add(r['Subinventory']);

      // Expiry flags (only on lots with qty > 0)
      if (r['Expiration Date'] && (r['Quantity'] || 0) > 0) {
        const days = Math.floor((new Date(r['Expiration Date']) - today) / 86400000);
        if (days < 0)        entry.flags.add('Expired');
        else if (days <= 30) entry.flags.add('Expiring ≤30d');
        else if (days <= 90) entry.flags.add('Expiring ≤90d');
        if (!entry.nearestExp || r['Expiration Date'] < entry.nearestExp) entry.nearestExp = r['Expiration Date'];
      }

      // Status flags
      const s = r['Material Status'];
      if (s === 'Quarantine')              entry.flags.add('Quarantine');
      if (s === 'I')                       entry.flags.add('Restricted (I)');
      if (s === 'E')                       entry.flags.add('Restricted (E)');
      if (s === 'N')                       entry.flags.add('Restricted (N)');

      // Min stock / lead time (populate when data available)
      if (r['Minimum Quantity'] != null && r['Minimum Quantity'] > 0) {
        entry.minQty = r['Minimum Quantity'];
        if (entry.qty < r['Minimum Quantity']) entry.flags.add('Below Min Stock');
      }
      const lt = r['Variable Lead Time'] || r['Processing Lead Time'] || r['Fixed Lead Time'];
      if (lt != null) entry.leadTime = lt;
    });

    return Object.values(map)
      .filter(e => e.flags.size > 0)
      .map(e => ({ ...e, level: riskLevel(e.flags), subinventories: [...e.subinventories].join(', '), flags: e.flags }))
      .sort((a, b) => {
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return order[a.level] - order[b.level] || a.nearestExp?.localeCompare(b.nearestExp || '') || 0;
      });
  }, [data, today]);

  const flagCounts = useMemo(() => RISK_FLAGS.map(f => ({
    ...f, count: atRiskItems.filter(r => r.flags.has(f.key)).length,
  })), [atRiskItems]);

  const filtered = useMemo(() => atRiskItems.filter(r => {
    if (selSubs.size   > 0 && ![...r.subinventories.split(', ')].some(s => selSubs.has(s))) return false;
    if (activeFlag  && !r.flags.has(activeFlag))  return false;
    if (activeLevel && r.level !== activeLevel)    return false;
    return true;
  }), [atRiskItems, selSubs, activeFlag, activeLevel]);

  const highCount   = atRiskItems.filter(r => r.level === 'HIGH').length;
  const mediumCount = atRiskItems.filter(r => r.level === 'MEDIUM').length;

  const chartData = flagCounts.filter(f => f.count > 0);

  return (
    <div id="inv-atrisk">
      <SectionHeader title="Components at Risk" icon="🚨" />

      {/* Level pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <Pill label="Total at Risk"  value={atRiskItems.length} color="#e2e8f0" />
        <Pill label="HIGH risk"      value={highCount}          color="#ef4444"
          active={activeLevel === 'HIGH'}   onClick={() => setActiveLevel(p => p === 'HIGH'   ? null : 'HIGH')} />
        <Pill label="MEDIUM risk"    value={mediumCount}        color="#f59e0b"
          active={activeLevel === 'MEDIUM'} onClick={() => setActiveLevel(p => p === 'MEDIUM' ? null : 'MEDIUM')} />
      </div>

      {/* Risk flag bar chart */}
      <div style={{ background: '#1e293b', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Items at risk by flag (click bar to filter)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 20, bottom: 40, left: 0 }}
            onClick={e => e?.activePayload && setActiveFlag(p => p === e.activePayload[0].payload.key ? null : e.activePayload[0].payload.key)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP} cursor={{ fill: '#334155' }} formatter={v => [v, 'Items']} />
            <Bar dataKey="count" radius={[4,4,0,0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={activeFlag === entry.key ? entry.color : entry.color + '99'} />
              ))}
              <LabelList dataKey="count" position="top" style={{ fill: '#94a3b8', fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pending data notice */}
      {atRiskItems.every(r => !r.flags.has('Below Min Stock') && !r.flags.has('Lead Time Risk')) && (
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 16px', marginBottom: 16, borderLeft: '3px solid #334155', color: '#64748b', fontSize: 13 }}>
          ℹ️ <strong style={{ color: '#94a3b8' }}>Below Min Stock</strong> and <strong style={{ color: '#94a3b8' }}>Lead Time Risk</strong> flags will activate once a file with min/max quantities and lead times is uploaded.
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <MultiSelect options={allSubs} selected={selSubs} onChange={setSelSubs} label="Subinventory" minWidth={180} />
        {(selSubs.size > 0 || activeFlag || activeLevel) && (
          <button onClick={() => { setSelSubs(new Set()); setActiveFlag(null); setActiveLevel(null); }} style={clearBtn}>Clear filters</button>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13, borderBottom: '1px solid #334155' }}>
          {filtered.length} at-risk component{filtered.length !== 1 ? 's' : ''}
          {activeFlag ? ` — ${activeFlag}` : ''}
          {activeLevel ? ` — ${activeLevel} risk` : ''}
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1 }}>
              <tr>
                <th style={th}>Risk Level</th>
                <th style={th}>Item</th>
                <th style={th}>Description</th>
                <th style={th}>Risk Flags</th>
                <th style={{ ...th, textAlign: 'right' }}>Total Qty</th>
                <th style={th}>Nearest Expiry</th>
                <th style={th}>Subinventory</th>
                <th style={th}>Min Stock</th>
                <th style={th}>Lead Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                  <td style={td}>
                    <span style={{ background: RISK_LEVEL_COLOR[r.level] + '22', color: RISK_LEVEL_COLOR[r.level], borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
                      {r.level}
                    </span>
                  </td>
                  <td style={td}>{r.item}</td>
                  <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {[...r.flags].map(f => {
                        const meta = RISK_FLAGS.find(rf => rf.key === f);
                        return (
                          <span key={f} style={{ background: (meta?.color || '#64748b') + '22', color: meta?.color || '#64748b', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {f}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{r.qty.toLocaleString()}</td>
                  <td style={{ ...td, color: r.nearestExp ? expiryColor(daysUntil(r.nearestExp)) : '#64748b', fontWeight: 600 }}>{r.nearestExp ?? '—'}</td>
                  <td style={td}>{r.subinventories}</td>
                  <td style={{ ...td, color: '#64748b' }}>{r.minQty != null ? r.minQty.toLocaleString() : '—'}</td>
                  <td style={{ ...td, color: '#64748b' }}>{r.leadTime != null ? `${r.leadTime}d` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
// ── Inventory FG Safety Stock ────────────────────────────────────────────────
const SS_TARGET   = 2.5;
const SS_MIN      = 2.0;
const SS_MAX      = 3.5;

function coverageColor(c) {
  if (c === null || c === undefined) return '#64748b';
  if (c < SS_MIN)  return '#ef4444'; // critical
  if (c < SS_TARGET) return '#f59e0b'; // below target
  if (c <= SS_MAX) return '#10b981'; // on target
  return '#8b5cf6'; // excess
}
function coverageStatus(c) {
  if (c === null || c === undefined) return '—';
  if (c < SS_MIN)    return '🔴 Critical';
  if (c < SS_TARGET) return '🟡 Below target';
  if (c <= SS_MAX)   return '🟢 On target';
  return '🟣 Excess';
}

function toISOInv(d) { return d?.replace(/\//g, '-'); }

function InventoryFGSS({ data, salesData }) {
  const [ssMonths, setSsMonths] = useState(new Set());

  // ── Available months from sales data ────────────────────────────────────
  const availableMonths = useMemo(() => {
    const ms = new Set();
    (salesData || []).forEach(r => {
      const m = monthLabel(toISOInv(r['Shipped Date']));
      if (m && m !== 'Unknown') ms.add(m);
    });
    return sortedMonths([...ms]);
  }, [salesData]);

  // Last 6 complete months (exclude the current, potentially partial, month)
  const currentMonthLabel = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
  const last6Complete = useMemo(() =>
    availableMonths.filter(m => m !== currentMonthLabel).slice(-6),
    [availableMonths, currentMonthLabel]);

  const effectiveMonths = ssMonths.size > 0 ? [...ssMonths] : last6Complete;
  const numMonths = effectiveMonths.length;

  // ── Current stock at DCNTL per FG item ───────────────────────────────────
  const dcntlStock = useMemo(() => {
    const map = {};
    (data || []).filter(r => r['Subinventory'] === 'DCNTL' && FG_CODES.has(r['Item']) && r['Material Status'] === 'Active').forEach(r => {
      map[r['Item']] = (map[r['Item']] || 0) + (Number(r['Quantity']) || 0);
    });
    return map;
  }, [data]);

  // Item descriptions
  const itemDesc = useMemo(() => {
    const map = {};
    (data || []).forEach(r => {
      if (r['Item'] && r['Item Description'] && !map[r['Item']]) map[r['Item']] = r['Item Description'];
    });
    (salesData || []).forEach(r => {
      if (r['Item'] && r['Description'] && !map[r['Item']]) map[r['Item']] = r['Description'];
    });
    return map;
  }, [data, salesData]);

  // ── Monthly shipments per FG item (within effective months) ──────────────
  const fgShipments = useMemo(() => {
    const map = {}; // item -> { total, byMonth }
    const monthSet = new Set(effectiveMonths);
    (salesData || []).forEach(r => {
      if (!FG_CODES.has(r['Item'])) return;
      if (!r['Shipped Date'] || r['Shipped Quantity'] == null) return;
      const m = monthLabel(toISOInv(r['Shipped Date']));
      if (!monthSet.has(m)) return;
      if (!map[r['Item']]) map[r['Item']] = { total: 0, byMonth: {} };
      const qty = Number(r['Shipped Quantity']) || 0;
      map[r['Item']].total += qty;
      map[r['Item']].byMonth[m] = (map[r['Item']].byMonth[m] || 0) + qty;
    });
    return map;
  }, [salesData, effectiveMonths]);

  // ── KPI rows (all FG items that appear in DCNTL or have shipments) ────────
  const allFGItems = useMemo(() => {
    const s = new Set([...Object.keys(dcntlStock), ...Object.keys(fgShipments)]);
    return [...s].filter(i => FG_CODES.has(i)).sort();
  }, [dcntlStock, fgShipments]);

  const kpiRows = useMemo(() => allFGItems.map(item => {
    const stock      = dcntlStock[item] || 0;
    const total      = fgShipments[item]?.total || 0;
    const avgDemand  = numMonths > 0 ? total / numMonths : 0;
    const ssTarget   = +(avgDemand * SS_TARGET).toFixed(0);
    const coverage   = avgDemand > 0 ? +(stock / avgDemand).toFixed(2) : null;
    return { item, desc: itemDesc[item] || '', stock, avgDemand: +avgDemand.toFixed(1), ssTarget, coverage, byMonth: fgShipments[item]?.byMonth || {} };
  }), [allFGItems, dcntlStock, fgShipments, numMonths, itemDesc]);

  const critical   = kpiRows.filter(r => r.coverage !== null && r.coverage < SS_MIN).length;
  const belowTgt   = kpiRows.filter(r => r.coverage !== null && r.coverage >= SS_MIN && r.coverage < SS_TARGET).length;
  const onTarget   = kpiRows.filter(r => r.coverage !== null && r.coverage >= SS_TARGET && r.coverage <= SS_MAX).length;
  const excess     = kpiRows.filter(r => r.coverage !== null && r.coverage > SS_MAX).length;
  const noData     = kpiRows.filter(r => r.coverage === null).length;

  const chartRows  = kpiRows.filter(r => r.avgDemand > 0).sort((a, b) => (a.coverage ?? 999) - (b.coverage ?? 999));

  // Monthly shipment chart data per effective month
  const demandChartData = useMemo(() => effectiveMonths.map(m => {
    const row = { month: m };
    allFGItems.forEach(item => { row[item] = fgShipments[item]?.byMonth[m] || 0; });
    return row;
  }), [effectiveMonths, allFGItems, fgShipments]);

  const th2 = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155', fontSize: 12 };
  const td2 = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b', fontSize: 13 };
  const clearBtn = { background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 };

  return (
    <div id="inv-fgss">
      <SectionHeader title="Inventory FG Safety Stock" icon="📊" />

      {/* Info band */}
      <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#64748b', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <span>Target: <strong style={{ color: '#10b981' }}>2.5 months</strong> coverage</span>
        <span>Min: <strong style={{ color: '#ef4444' }}>2.0 months</strong></span>
        <span>Max: <strong style={{ color: '#8b5cf6' }}>3.5 months</strong></span>
        <span>Stock location: <strong style={{ color: '#f1f5f9' }}>DCNTL</strong> · Material Status: <strong style={{ color: '#f1f5f9' }}>Active only</strong></span>
        <span>Period: <strong style={{ color: '#f1f5f9' }}>{numMonths} month{numMonths !== 1 ? 's' : ''}</strong>
          {ssMonths.size === 0 && <span style={{ color: '#475569' }}> (default: last 6 complete)</span>}
        </span>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Pill label="Critical < 2 months"    value={critical}  color="#ef4444" />
        <Pill label="Below target 2–2.5 m"   value={belowTgt}  color="#f59e0b" />
        <Pill label="On target 2.5–3.5 m"    value={onTarget}  color="#10b981" />
        <Pill label="Excess > 3.5 months"    value={excess}    color="#8b5cf6" />
        {noData > 0 && <Pill label="No demand data" value={noData} color="#475569" />}
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <MultiSelect
          options={availableMonths}
          selected={ssMonths}
          onChange={setSsMonths}
          label="Shipment months:"
          allLabel="Default (last 6 complete)"
          minWidth={220}
        />
        {ssMonths.size > 0 && (
          <button onClick={() => setSsMonths(new Set())} style={clearBtn}>Reset to default</button>
        )}
        <div style={{ color: '#64748b', fontSize: 12 }}>
          {effectiveMonths.join(' · ')}
        </div>
      </div>

      {/* ── Coverage bar chart ─────────────────────────────────────────── */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>
          Coverage (months) = DCNTL stock ÷ avg monthly demand · reference lines at 2.0 / 2.5 / 3.5 months
        </div>
        <ResponsiveContainer width="100%" height={Math.max(280, chartRows.length * 40)}>
          <BarChart layout="vertical" data={chartRows} margin={{ top: 16, right: 90, bottom: 4, left: 84 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} unit="m" />
            <YAxis type="category" dataKey="item" tick={{ fill: '#e2e8f0', fontSize: 12 }} width={80} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
              content={({ payload, label }) => payload?.length ? (
                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                  <div style={{ color: '#94a3b8' }}>{payload[0]?.payload?.desc}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ color: coverageColor(payload[0]?.payload?.coverage), fontWeight: 700 }}>
                      {payload[0]?.payload?.coverage !== null ? `${payload[0].payload.coverage}m coverage` : 'No demand'}
                    </span>
                  </div>
                  <div style={{ color: '#94a3b8', marginTop: 2 }}>Stock: {payload[0]?.payload?.stock?.toLocaleString()}</div>
                  <div style={{ color: '#94a3b8' }}>Avg demand: {payload[0]?.payload?.avgDemand?.toLocaleString()}/month</div>
                  <div style={{ color: '#94a3b8' }}>SS target (2.5×): {payload[0]?.payload?.ssTarget?.toLocaleString()}</div>
                </div>
              ) : null}
            />
            <ReferenceLine x={SS_MIN}    stroke="#ef4444" strokeDasharray="5 4" label={{ value: '2.0m', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
            <ReferenceLine x={SS_TARGET} stroke="#f59e0b" strokeDasharray="5 4" label={{ value: '2.5m', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
            <ReferenceLine x={SS_MAX}    stroke="#8b5cf6" strokeDasharray="5 4" label={{ value: '3.5m', fill: '#8b5cf6', fontSize: 10, position: 'insideTopRight' }} />
            <Bar dataKey="coverage" radius={[0,3,3,0]}>
              <LabelList dataKey="coverage" position="right" formatter={v => v !== null ? `${v}m` : '—'} style={{ fill: '#94a3b8', fontSize: 11 }} />
              {chartRows.map((row, i) => <Cell key={i} fill={coverageColor(row.coverage)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Monthly demand chart ───────────────────────────────────────── */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>Monthly shipments by FG item over selected period</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={demandChartData} margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0', fontWeight: 600 }} formatter={v => [v.toLocaleString(), '']} />
            {allFGItems.map((item, idx) => {
              const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6','#a78bfa'];
              return <Bar key={item} dataKey={item} stackId="a" fill={colors[idx % colors.length]} name={item} />;
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Detail table ───────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              {['Item','Description','Current Stock (DCNTL)','Avg Monthly Demand','SS Target (×2.5)','Coverage (months)','Status'].map(h => (
                <th key={h} style={th2}>{h}</th>
              ))}
              {effectiveMonths.map(m => <th key={m} style={{ ...th2, whiteSpace: 'nowrap' }}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {kpiRows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                <td style={{ ...td2, fontWeight: 700 }}>{r.item}</td>
                <td style={{ ...td2, color: '#94a3b8', maxWidth: 200 }}>{r.desc}</td>
                <td style={{ ...td2, fontWeight: 700, color: '#f1f5f9' }}>{r.stock.toLocaleString()}</td>
                <td style={td2}>{r.avgDemand.toLocaleString()}</td>
                <td style={td2}>{r.ssTarget.toLocaleString()}</td>
                <td style={{ ...td2, fontWeight: 700, color: coverageColor(r.coverage), fontSize: 14 }}>
                  {r.coverage !== null ? `${r.coverage}m` : '—'}
                </td>
                <td style={{ ...td2, fontWeight: 600, color: coverageColor(r.coverage) }}>{coverageStatus(r.coverage)}</td>
                {effectiveMonths.map(m => (
                  <td key={m} style={{ ...td2, textAlign: 'right', color: r.byMonth[m] ? '#e2e8f0' : '#475569' }}>
                    {(r.byMonth[m] || 0).toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Inventory({ data, salesData }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 40, color: '#64748b', fontSize: 15 }}>No inventory data available. Upload an Inventory Management Report via "Update Data".</div>;
  }

  const compRows = data.filter(r => !FG_CODES.has(r['Item']));
  const fgRows   = data.filter(r =>  FG_CODES.has(r['Item']));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#f1f5f9' }}>Inventory KPIs</h1>
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{data.length} lot lines</div>
      </div>

      <InventoryValue data={data} />
      <div style={{ marginTop: 32 }}><StockOverview data={data} /></div>
      <div style={{ marginTop: 32 }}>
        <ExpirySection id="inv-comp-exp" title="Components Expiry / Shelf Life" icon="🧪" rows={compRows} />
      </div>
      <div style={{ marginTop: 32 }}>
        <ExpirySection id="inv-fg-exp" title="FG Expiry / Shelf Life" icon="✅" rows={fgRows} />
      </div>
      <div style={{ marginTop: 32 }}>
        <QuarantineSection data={data} />
      </div>
      <div style={{ marginTop: 32 }}>
        <ComponentsAtRisk data={data} />
      </div>
      <div style={{ marginTop: 32 }}>
        <InventoryFGSS data={data} salesData={salesData || []} />
      </div>
      <div style={{ height: 60 }} />
    </div>
  );
}
