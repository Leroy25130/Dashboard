import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SectionHeader from './SectionHeader';

export default function Routing({ data }) {
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState('All');

  const items = useMemo(() => ['All', ...new Set(data.map(d => d['Item Number']))].sort(), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let d = selectedItem === 'All' ? data : data.filter(r => r['Item Number'] === selectedItem);
    if (q) d = d.filter(r => r['Item Number']?.toLowerCase().includes(q) || String(r['Work Order Number']).toLowerCase().includes(q));
    return d;
  }, [data, search, selectedItem]);

  const chartData = useMemo(() =>
    filtered
      .filter(d => d['Required Usage'] != null && d['Actual Quantity Usage'] != null)
      .map(d => ({
        wo: String(d['Work Order Number']),
        item: d['Item Number'],
        required: +(d['Required Usage'] || 0).toFixed(1),
        actual: +(d['Actual Quantity Usage'] || 0).toFixed(1),
        efficiency: d['Required Usage'] > 0
          ? +((d['Required Usage'] / d['Actual Quantity Usage']) * 100).toFixed(1)
          : null,
      }))
      .sort((a, b) => a.wo.localeCompare(b.wo)),
    [filtered]);

  const avgEff = useMemo(() => {
    const vals = chartData.filter(d => d.efficiency !== null && d.actual > 0).map(d => d.efficiency);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/A';
  }, [chartData]);

  const totalRequired = chartData.reduce((s, d) => s + d.required, 0).toFixed(0);
  const totalActual = chartData.reduce((s, d) => s + d.actual, 0).toFixed(0);

  return (
    <div>
      <SectionHeader title="Manufacturing Routing (Minutes)" icon="⚙️" />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Pill label="Avg Efficiency" value={`${avgEff}%`} color="#8b5cf6" />
        <Pill label="Total Required (min)" value={Number(totalRequired).toLocaleString()} color="#3b82f6" />
        <Pill label="Total Actual (min)" value={Number(totalActual).toLocaleString()} color="#f59e0b" />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <label style={{ color: '#94a3b8', fontSize: 13, marginRight: 8 }}>Filter by Item:</label>
          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)}
            style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '4px 10px', fontSize: 13 }}>
            {items.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '6px 12px', fontSize: 13, width: 240 }} />
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="wo" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} unit=" min" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              content={({ payload }) => payload?.length ? (
                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <div style={{ color: '#e2e8f0' }}>WO: {payload[0]?.payload?.wo} ({payload[0]?.payload?.item})</div>
                  <div style={{ color: '#3b82f6' }}>Required: {payload[0]?.payload?.required} min</div>
                  <div style={{ color: '#f59e0b' }}>Actual: {payload[0]?.payload?.actual} min</div>
                  {payload[0]?.payload?.efficiency !== null && (
                    <div style={{ color: '#10b981' }}>Efficiency: {payload[0]?.payload?.efficiency}%</div>
                  )}
                </div>
              ) : null}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Bar dataKey="required" name="Required (min)" fill="#3b82f6" />
            <Bar dataKey="actual" name="Actual (min)" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              {['Item Number','Item Description','Work Order #','Required (min)','Actual (min)','Efficiency %'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => {
              const eff = d['Required Usage'] > 0 && d['Actual Quantity Usage'] > 0
                ? +((d['Required Usage'] / d['Actual Quantity Usage']) * 100).toFixed(1) : null;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                  <td style={td}>{d['Item Number']}</td>
                  <td style={td}>{d['Item Description']}</td>
                  <td style={td}>{d['Work Order Number']}</td>
                  <td style={td}>{d['Required Usage'] != null ? d['Required Usage'].toLocaleString() : '—'}</td>
                  <td style={td}>{d['Actual Quantity Usage'] != null ? d['Actual Quantity Usage'].toLocaleString() : '—'}</td>
                  <td style={{ ...td, color: eff === null ? '#64748b' : eff >= 90 ? '#10b981' : eff >= 75 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                    {eff !== null ? `${eff}%` : '—'}
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
