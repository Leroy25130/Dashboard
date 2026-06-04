import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, CartesianGrid,
} from 'recharts';
import SectionHeader from './SectionHeader';
import MultiSelect from './MultiSelect';
import { monthLabel, sortedMonths } from '../utils/dataHelpers';

const th = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
const td = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' };
const labelStyle = { color: '#94a3b8', fontSize: 13, marginRight: 8 };
const selectStyle = { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '5px 10px', fontSize: 13 };

function Pill({ label, value, color, sub }) {
  return (
    <div style={{ background: '#1e293b', border: `1px solid #334155`, borderRadius: 10, padding: '14px 20px', minWidth: 160 }}>
      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ color: color || '#e2e8f0', fontSize: 26, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const fmtCurrency = (v) => {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
};

const TOOLTIP_STYLE = { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 13 };

export default function CycleCount({ data }) {
  // ── Section 1 filters ──────────────────────────────────────────────────────
  const [s1Subinv, setS1Subinv] = useState(new Set());
  const [s1Items,  setS1Items]  = useState(new Set());

  // ── Section 3 filters ──────────────────────────────────────────────────────
  const [s3Items,  setS3Items]  = useState(new Set());
  const [s3Search, setS3Search] = useState('');

  // ── Section 4 filters ──────────────────────────────────────────────────────
  const [s4Subinv, setS4Subinv] = useState(new Set());

  // Derived option lists
  const allSubinventories = useMemo(() =>
    [...new Set(data.map(r => r['Subinventory']).filter(Boolean))].sort(), [data]);
  const allItems = useMemo(() =>
    [...new Set(data.map(r => r['Item Number']).filter(Boolean))].sort(), [data]);

  // ── Section 1 — Inventory Accuracy ────────────────────────────────────────
  const s1Filtered = useMemo(() => {
    return data.filter(r =>
      (s1Subinv.size === 0 || s1Subinv.has(r['Subinventory'])) &&
      (s1Items.size  === 0 || s1Items.has(r['Item Number']))
    );
  }, [data, s1Subinv, s1Items]);

  const s1Total   = s1Filtered.length;
  const s1Matched = s1Filtered.filter(r => r['Matched and Approved'] === 1 || r['Matched and Approved'] === '1' || r['Matched and Approved'] === true).length;
  const s1AccRate = s1Total > 0 ? ((s1Matched / s1Total) * 100).toFixed(1) : '0.0';
  const accColor  = parseFloat(s1AccRate) >= 99 ? '#10b981' : '#ef4444';

  const s1ChartData = useMemo(() => {
    const byMonth = {};
    s1Filtered.forEach(r => {
      const m = monthLabel(r['Count Due Date']);
      if (!byMonth[m]) byMonth[m] = { month: m, Matched: 0, 'Not Matched': 0 };
      const matched = r['Matched and Approved'] === 1 || r['Matched and Approved'] === '1' || r['Matched and Approved'] === true;
      if (matched) byMonth[m].Matched++;
      else byMonth[m]['Not Matched']++;
    });
    return sortedMonths(Object.keys(byMonth)).map(m => byMonth[m]);
  }, [s1Filtered]);

  // ── Section 2 — Adjustment Value ──────────────────────────────────────────
  const adjRows = useMemo(() =>
    data.filter(r => r['Adjustment Quantity'] !== 0 && r['Adjustment Quantity'] != null && r['Adjustment Quantity'] !== ''),
    [data]);

  const grossAdj = useMemo(() => adjRows.reduce((s, r) => s + (Number(r['Gross Adjustment Value']) || 0), 0), [adjRows]);
  const netAdj   = useMemo(() => adjRows.reduce((s, r) => s + (Number(r['Net Adjustment Value'])   || 0), 0), [adjRows]);

  // ── Section 3 — Performance by Item ───────────────────────────────────────
  const s3Filtered = useMemo(() => {
    const q = s3Search.toLowerCase();
    return data.filter(r =>
      (s3Items.size === 0 || s3Items.has(r['Item Number'])) &&
      (!q || (r['Item Number'] || '').toLowerCase().includes(q) || (r['Item Description'] || '').toLowerCase().includes(q))
    );
  }, [data, s3Items, s3Search]);

  const s3ItemStats = useMemo(() => {
    const map = {};
    s3Filtered.forEach(r => {
      const key = r['Item Number'];
      if (!key) return;
      if (!map[key]) map[key] = { item: key, desc: r['Item Description'] || '', total: 0, matched: 0, subinvs: new Set() };
      map[key].total++;
      if (r['Matched and Approved'] === 1 || r['Matched and Approved'] === '1' || r['Matched and Approved'] === true) map[key].matched++;
      if (r['Subinventory']) map[key].subinvs.add(r['Subinventory']);
    });
    return Object.values(map)
      .map(v => ({ ...v, subinvs: [...v.subinvs].join(', '), acc: v.total > 0 ? ((v.matched / v.total) * 100).toFixed(1) : '0.0' }))
      .sort((a, b) => b.total - a.total);
  }, [s3Filtered]);

  const top20Chart = useMemo(() =>
    s3ItemStats.slice(0, 20).map(v => ({ item: v.item, Counts: v.total })),
    [s3ItemStats]);

  const uniqueItems = useMemo(() => new Set(data.map(r => r['Item Number']).filter(Boolean)).size, [data]);

  // ── Section 4 — Count History ──────────────────────────────────────────────
  const s4Filtered = useMemo(() =>
    data.filter(r => s4Subinv.size === 0 || s4Subinv.has(r['Subinventory'])),
    [data, s4Subinv]);

  const s4ChartData = useMemo(() => {
    const byMonth = {};
    s4Filtered.forEach(r => {
      const m = monthLabel(r['Count Due Date']);
      if (!byMonth[m]) byMonth[m] = { month: m, Counts: 0, matched: 0 };
      byMonth[m].Counts++;
      if (r['Matched and Approved'] === 1 || r['Matched and Approved'] === '1' || r['Matched and Approved'] === true) byMonth[m].matched++;
    });
    return sortedMonths(Object.keys(byMonth)).map(m => ({
      ...byMonth[m],
      Accuracy: byMonth[m].Counts > 0 ? parseFloat(((byMonth[m].matched / byMonth[m].Counts) * 100).toFixed(1)) : 0,
    }));
  }, [s4Filtered]);

  // ── Section 5 — Recounts ──────────────────────────────────────────────────
  const recountItems = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const key = r['Item Number'];
      if (!key) return;
      if (!map[key]) map[key] = { item: key, desc: r['Item Description'] || '', recounts: 0 };
      map[key].recounts += Number(r['Recounts']) || 0;
    });
    return Object.values(map).sort((a, b) => b.recounts - a.recounts);
  }, [data]);

  const totalRecounts = useMemo(() => data.reduce((s, r) => s + (Number(r['Recounts']) || 0), 0), [data]);
  const itemsWithRecount = recountItems.filter(r => r.recounts > 0).length;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#f1f5f9' }}>Cycle Count KPIs</h1>
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{data.length} count records</div>
      </div>

      {/* ── Section 1: Inventory Accuracy ─────────────────────────────────── */}
      <SectionHeader title="Inventory Accuracy" />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <MultiSelect options={allSubinventories} selected={s1Subinv} onChange={setS1Subinv} label="Subinventory:" minWidth={180} allLabel="All Subinventories" />
        <MultiSelect options={allItems}          selected={s1Items}  onChange={setS1Items}  label="Item:"          minWidth={160} allLabel="All Items" />
      </div>

      {/* Pills */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <Pill label="Total Counts"       value={s1Total}                                                    />
        <Pill label="Matched & Approved" value={`${s1Matched} / ${s1Total}`} color="#10b981"               />
        <Pill label="Accuracy Rate"      value={`${s1AccRate}%`}             color={accColor}              />
      </div>

      {/* Bar chart */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 16px', marginBottom: 32 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>Matched vs Not Matched by Month</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={s1ChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 13 }} />
            <Bar dataKey="Matched"     stackId="a" fill="#10b981" />
            <Bar dataKey="Not Matched" stackId="a" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Section 2: Adjustment Value ───────────────────────────────────── */}
      <SectionHeader title="Adjustment Value" />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <Pill label="Items with Adjustments" value={adjRows.length}             />
        <Pill label="Gross Adjustment Value" value={fmtCurrency(grossAdj)}      color={grossAdj < 0 ? '#ef4444' : '#e2e8f0'} />
        <Pill label="Net Adjustment Value"   value={fmtCurrency(netAdj)}        color={netAdj < 0   ? '#ef4444' : '#e2e8f0'} />
      </div>

      {adjRows.length > 0 ? (
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Item Number</th>
                <th style={th}>Description</th>
                <th style={th}>Lot</th>
                <th style={th}>Subinventory</th>
                <th style={{ ...th, textAlign: 'right' }}>Unit Cost</th>
                <th style={{ ...th, textAlign: 'right' }}>Adj Qty</th>
                <th style={{ ...th, textAlign: 'right' }}>Gross Adj Value</th>
                <th style={{ ...th, textAlign: 'right' }}>Net Adj Value</th>
              </tr>
            </thead>
            <tbody>
              {adjRows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                  <td style={td}>{r['Item Number']}</td>
                  <td style={td}>{r['Item Description']}</td>
                  <td style={td}>{r['Lot']}</td>
                  <td style={td}>{r['Subinventory']}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtCurrency(r['Unit Cost'])}</td>
                  <td style={{ ...td, textAlign: 'right', color: r['Adjustment Quantity'] < 0 ? '#ef4444' : '#10b981' }}>{r['Adjustment Quantity']}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtCurrency(r['Gross Adjustment Value'])}</td>
                  <td style={{ ...td, textAlign: 'right', color: r['Net Adjustment Value'] < 0 ? '#ef4444' : '#e2e8f0' }}>{fmtCurrency(r['Net Adjustment Value'])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 32, color: '#10b981', fontWeight: 600, fontSize: 14 }}>
          No adjustment rows found — all counts matched perfectly.
        </div>
      )}

      {/* ── Section 3: Performance by Item ────────────────────────────────── */}
      <SectionHeader title="Performance by Item" />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <MultiSelect options={allItems} selected={s3Items} onChange={setS3Items} label="Item:" minWidth={160} allLabel="All Items" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={labelStyle}>Search:</span>
          <input
            value={s3Search}
            onChange={e => setS3Search(e.target.value)}
            placeholder="Item / description…"
            style={{ ...selectStyle, minWidth: 200 }}
          />
        </div>
        <span style={{ color: '#64748b', fontSize: 13 }}>{uniqueItems} unique items tracked</span>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 16px', marginBottom: 20 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>Top 20 Items by Count Frequency</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={top20Chart} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="item" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-40} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="Counts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Item Number</th>
              <th style={th}>Description</th>
              <th style={{ ...th, textAlign: 'right' }}>Total Counts</th>
              <th style={{ ...th, textAlign: 'right' }}>Matched</th>
              <th style={{ ...th, textAlign: 'right' }}>Accuracy %</th>
              <th style={th}>Subinventory</th>
            </tr>
          </thead>
          <tbody>
            {s3ItemStats.map((r, i) => (
              <tr key={r.item} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                <td style={td}>{r.item}</td>
                <td style={td}>{r.desc}</td>
                <td style={{ ...td, textAlign: 'right' }}>{r.total}</td>
                <td style={{ ...td, textAlign: 'right' }}>{r.matched}</td>
                <td style={{ ...td, textAlign: 'right', color: parseFloat(r.acc) >= 99 ? '#10b981' : '#ef4444' }}>{r.acc}%</td>
                <td style={{ ...td, fontSize: 12, color: '#94a3b8' }}>{r.subinvs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Section 4: Count History ───────────────────────────────────────── */}
      <SectionHeader title="Count History" />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <MultiSelect options={allSubinventories} selected={s4Subinv} onChange={setS4Subinv} label="Subinventory:" minWidth={180} allLabel="All Subinventories" />
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 16px', marginBottom: 32 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>Counts per Month with Accuracy %</div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={s4ChartData} margin={{ top: 4, right: 56, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis yAxisId="left"  tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => name === 'Accuracy' ? `${value}%` : value} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 13 }} />
            <Bar     yAxisId="left"  dataKey="Counts"   fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Line    yAxisId="right" dataKey="Accuracy" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Section 5: Recounts ───────────────────────────────────────────── */}
      <SectionHeader title="Recounts" />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <Pill label="Total Recounts"          value={totalRecounts}    color="#10b981" />
        <Pill label="Items Requiring Recount" value={itemsWithRecount} color={itemsWithRecount > 0 ? '#ef4444' : '#10b981'} />
      </div>

      {totalRecounts === 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #052e16 0%, #064e3b 100%)',
          border: '1px solid #16a34a',
          borderRadius: 10,
          padding: '16px 24px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <span style={{ color: '#4ade80', fontWeight: 600, fontSize: 14 }}>
            All cycle counts completed without recount — excellent inventory control!
          </span>
        </div>
      )}

      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Item Number</th>
              <th style={th}>Description</th>
              <th style={{ ...th, textAlign: 'right' }}>Recounts</th>
            </tr>
          </thead>
          <tbody>
            {recountItems.map((r, i) => (
              <tr key={r.item} style={{ background: i % 2 === 0 ? 'transparent' : '#162032' }}>
                <td style={td}>{r.item}</td>
                <td style={td}>{r.desc}</td>
                <td style={{ ...td, textAlign: 'right', color: r.recounts > 0 ? '#ef4444' : '#64748b' }}>{r.recounts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ height: 60 }} />
    </div>
  );
}
