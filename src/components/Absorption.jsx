import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import SectionHeader from './SectionHeader';
import MultiSelect from './MultiSelect';

const MONTHS = ['Jan 2026','Feb 2026','Mar 2026','Apr 2026','May 2026','Jun 2026',
                 'Jul 2026','Aug 2026','Sep 2026','Oct 2026','Nov 2026','Dec 2026'];

const SERIES = [
  { key: 'AOP',             label: 'AOP',             color: '#3b82f6' },
  { key: 'Latest Estimate', label: 'Latest Estimate', color: '#8b5cf6' },
  { key: 'Actual',          label: 'Actual',          color: '#10b981' },
];

export default function Absorption({ data }) {
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [visibleSeries, setVisibleSeries] = useState(new Set(['AOP', 'Latest Estimate', 'Actual']));

  const toggleSeries = (key) => {
    setVisibleSeries(prev => {
      if (prev.size === 1 && prev.has(key)) return prev;
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const codes = useMemo(() => {
    return [...new Set((data?.aop ?? []).map(r => r.code))].sort();
  }, [data]);

  const toMap = (rows) => Object.fromEntries((rows ?? []).map(r => [r.code, r]));
  const aopMap = useMemo(() => toMap(data?.aop), [data]);
  const ltMap  = useMemo(() => toMap(data?.lt),  [data]);
  const actMap = useMemo(() => toMap(data?.act),  [data]);

  const filteredCodes = selectedCodes.size === 0 ? codes : codes.filter(c => selectedCodes.has(c));
  const filteredMonths = selectedMonth === 'All' ? MONTHS : [selectedMonth];

  // Chart data: one bar-group per month, summed across selected codes
  const chartData = useMemo(() => filteredMonths.map(m => {
    let aop = 0, lt = 0, act = 0;
    filteredCodes.forEach(code => {
      aop += aopMap[code]?.[m] ?? 0;
      lt  += ltMap[code]?.[m]  ?? 0;
      act += actMap[code]?.[m] ?? 0;
    });
    return { month: m, AOP: aop, 'Latest Estimate': lt, Actual: act };
  }), [filteredCodes, filteredMonths, aopMap, ltMap, actMap]);

  // Table data: one row per code × month combination (filtered)
  const tableRows = useMemo(() => {
    const rows = [];
    filteredCodes.forEach(code => {
      const desc = aopMap[code]?.description || ltMap[code]?.description || '';
      filteredMonths.forEach(m => {
        const aop = aopMap[code]?.[m] ?? 0;
        const lt  = ltMap[code]?.[m]  ?? 0;
        const act = actMap[code]?.[m] ?? 0;
        rows.push({ code, desc, month: m, aop, lt, act });
      });
    });
    return rows;
  }, [filteredCodes, filteredMonths, aopMap, ltMap, actMap]);

  // Summary pills across filtered selection
  const totalAop = chartData.reduce((s, r) => s + r.AOP, 0);
  const totalLt  = chartData.reduce((s, r) => s + r['Latest Estimate'], 0);
  const totalAct = chartData.reduce((s, r) => s + r.Actual, 0);
  const vsAop    = totalAop > 0 ? (((totalAct - totalAop) / totalAop) * 100).toFixed(1) : 'N/A';
  const vsLt     = totalLt  > 0 ? (((totalAct - totalLt)  / totalLt)  * 100).toFixed(1) : 'N/A';

  return (
    <div>
      <SectionHeader title="Actual & Projected Volume vs AOP / Latest Estimate" icon="🎯" />

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Pill label="Total AOP"            value={totalAop.toLocaleString()} color="#3b82f6" />
        <Pill label="Total Latest Estimate" value={totalLt.toLocaleString()}  color="#8b5cf6" />
        <Pill label="Total Actual"          value={totalAct.toLocaleString()} color="#10b981" />
        <Pill label="Actual vs AOP"
          value={vsAop === 'N/A' ? '—' : `${vsAop > 0 ? '+' : ''}${vsAop}%`}
          color={vsAop === 'N/A' ? '#64748b' : Number(vsAop) >= 0 ? '#10b981' : '#ef4444'} />
        <Pill label="Actual vs Latest Est."
          value={vsLt === 'N/A' ? '—' : `${vsLt > 0 ? '+' : ''}${vsLt}%`}
          color={vsLt === 'N/A' ? '#64748b' : Number(vsLt) >= 0 ? '#10b981' : '#ef4444'} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect
          options={codes}
          selected={selectedCodes}
          onChange={setSelectedCodes}
          label="Code:"
          allLabel="All codes"
          minWidth={180}
        />
        <div>
          <label style={labelStyle}>Month:</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={selectStyle}>
            <option value="All">All months</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {(selectedCodes.size > 0 || selectedMonth !== 'All') && (
          <button onClick={() => { setSelectedCodes(new Set()); setSelectedMonth('All'); }}
            style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Chart */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        {/* Series toggles */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {SERIES.map(s => {
            const active = visibleSeries.has(s.key);
            return (
              <button key={s.key} onClick={() => toggleSeries(s.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: active ? `${s.color}22` : '#0f172a',
                  color: active ? s.color : '#475569',
                  border: `1.5px solid ${active ? s.color : '#334155'}`,
                  borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  transition: 'all 0.15s',
                }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: active ? s.color : '#334155', display: 'inline-block' }} />
                {s.label}
              </button>
            );
          })}
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
              formatter={(v, name) => [v.toLocaleString(), name]}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            {SERIES.filter(s => visibleSeries.has(s.key)).map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3,3,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              {['Code','Description','Month','AOP','Latest Estimate','Actual','vs AOP','vs Latest Est.'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r, i) => {
              const vsAopPct = r.aop > 0 ? (((r.act - r.aop) / r.aop) * 100).toFixed(1) : null;
              const vsLtPct  = r.lt  > 0 ? (((r.act - r.lt)  / r.lt)  * 100).toFixed(1) : null;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                  <td style={td}>{r.code}</td>
                  <td style={td}>{r.desc}</td>
                  <td style={td}>{r.month}</td>
                  <td style={td}>{r.aop.toLocaleString()}</td>
                  <td style={td}>{r.lt.toLocaleString()}</td>
                  <td style={td}>{r.act.toLocaleString()}</td>
                  <td style={{ ...td, color: varColor(vsAopPct), fontWeight: 600 }}>
                    {vsAopPct !== null ? `${vsAopPct > 0 ? '+' : ''}${vsAopPct}%` : '—'}
                  </td>
                  <td style={{ ...td, color: varColor(vsLtPct), fontWeight: 600 }}>
                    {vsLtPct !== null ? `${vsLtPct > 0 ? '+' : ''}${vsLtPct}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function varColor(pct) {
  if (pct === null) return '#64748b';
  return Number(pct) >= 0 ? '#10b981' : '#ef4444';
}

function Pill({ label, value, color }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '8px 16px', borderLeft: `3px solid ${color}` }}>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const labelStyle = { color: '#94a3b8', fontSize: 13, marginRight: 8 };
const selectStyle = { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '5px 10px', fontSize: 13 };
const th = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
const td = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' };
