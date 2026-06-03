import { useMemo, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { parseDate, daysBetween } from '../utils/dataHelpers';
import SectionHeader from './SectionHeader';

export default function Timeliness({ data }) {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => data.map(d => {
    const delta = daysBetween(d['Complete Date'], d['Actual Complete Date']);
    return { ...d, delta };
  }), [data]);

  const scatterData = useMemo(() => rows.filter(r => r.delta !== null).map(r => ({
    wo: r['Work Order Number'],
    item: r['Item Number'],
    delta: r.delta,
  })), [rows]);

  const onTime = rows.filter(r => r.delta !== null && r.delta <= 0).length;
  const late = rows.filter(r => r.delta !== null && r.delta > 0).length;
  const avgDelay = useMemo(() => {
    const vals = rows.filter(r => r.delta !== null).map(r => r.delta);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/A';
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(d => !q || d['Item Number']?.toLowerCase().includes(q) || String(d['Work Order Number']).toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div>
      <SectionHeader title="Work Orders Timeliness" icon="⏱️" />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Pill label="On Time / Early" value={onTime} color="#10b981" />
        <Pill label="Late" value={late} color="#ef4444" />
        <Pill label="Avg Delay (days)" value={avgDelay} color="#f59e0b" />
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Delay in days (Actual Complete − Planned Complete). Negative = early, Positive = late.</div>
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="wo" name="WO" tick={false} label={{ value: 'Work Orders', fill: '#64748b', fontSize: 12 }} />
            <YAxis dataKey="delta" name="Delay (days)" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              formatter={(v, n) => [v, n]}
              content={({ payload }) => payload?.length ? (
                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <div style={{ color: '#e2e8f0' }}>WO: {payload[0]?.payload?.wo}</div>
                  <div style={{ color: '#94a3b8' }}>Item: {payload[0]?.payload?.item}</div>
                  <div style={{ color: payload[0]?.payload?.delta > 0 ? '#ef4444' : '#10b981' }}>
                    {payload[0]?.payload?.delta > 0 ? 'Late' : 'Early'}: {Math.abs(payload[0]?.payload?.delta)} days
                  </div>
                </div>
              ) : null}
            />
            <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.8} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginBottom: 12 }}>
        <input placeholder="Search by Item Number or WO Number…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '6px 12px', fontSize: 13, width: 300 }} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              {['Item Number','Item Description','Work Order #','Planned Complete','Actual Complete','Delay (days)'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => {
              const late = d.delta > 0;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                  <td style={td}>{d['Item Number']}</td>
                  <td style={td}>{d['Item Description']}</td>
                  <td style={td}>{d['Work Order Number']}</td>
                  <td style={td}>{d['Complete Date'] ? new Date(d['Complete Date']).toLocaleDateString() : '—'}</td>
                  <td style={td}>{d['Actual Complete Date'] ? new Date(d['Actual Complete Date']).toLocaleDateString() : '—'}</td>
                  <td style={{ ...td, color: d.delta === null ? '#64748b' : late ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                    {d.delta === null ? '—' : (d.delta > 0 ? `+${d.delta}` : d.delta)}
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

function Pill({ label, value, color }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '8px 16px', borderLeft: `3px solid ${color}` }}>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const th = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
const td = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' };
