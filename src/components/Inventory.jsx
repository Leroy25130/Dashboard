import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import SectionHeader from './SectionHeader';
import MultiSelect from './MultiSelect';
import stdCost from '../data/std_cost_data.json';

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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Inventory({ data }) {
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
      <div style={{ height: 60 }} />
    </div>
  );
}
