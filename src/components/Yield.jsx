import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { monthLabel, sortedMonths } from '../utils/dataHelpers';
import SectionHeader from './SectionHeader';
import MultiSelect from './MultiSelect';

export default function Yield({ data }) {
  const [search, setSearch] = useState('');
  const [threshold, setThreshold] = useState(95);
  const [selectedMonths, setSelectedMonths] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState(new Set());

  const rows = useMemo(() => data.map(d => ({
    ...d,
    month: monthLabel(d['Actual Complete Date']) === 'Unknown' ? 'No Date' : monthLabel(d['Actual Complete Date']),
    yieldPct: d['Work Order Quantity'] > 0
      ? +((d['Quantity Completed'] / d['Work Order Quantity']) * 100).toFixed(1)
      : null,
  })), [data]);

  const months = useMemo(() => {
    const dated = rows.filter(r => r.month !== 'No Date').map(r => r.month);
    const sorted = sortedMonths(dated);
    const hasNoDate = rows.some(r => r.month === 'No Date');
    return hasNoDate ? [...sorted, 'No Date'] : sorted;
  }, [rows]);

  const items = useMemo(() =>
    [...new Set(rows.map(r => r['Item Number']).filter(Boolean))].sort(),
  [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(d =>
      (selectedMonths.size === 0 || selectedMonths.has(d.month)) &&
      (selectedItems.size === 0 || selectedItems.has(d['Item Number'])) &&
      (!q || d['Item Number']?.toLowerCase().includes(q) || String(d['Work Order Number']).toLowerCase().includes(q))
    );
  }, [rows, search, selectedMonths, selectedItems]);

  const chartData = useMemo(() =>
    filtered.filter(r => r.yieldPct !== null)
      .map(r => ({ wo: String(r['Work Order Number']), item: r['Item Number'], desc: r['Item Description'], yield: r.yieldPct }))
      .sort((a, b) => a.yield - b.yield),
    [filtered]);

  const avgYield = useMemo(() => {
    const vals = filtered.filter(r => r.yieldPct !== null).map(r => r.yieldPct);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/A';
  }, [filtered]);

  const below = filtered.filter(r => r.yieldPct !== null && r.yieldPct < threshold).length;

  const hasFilters = selectedMonths.size > 0 || selectedItems.size > 0 || search;

  return (
    <div>
      <SectionHeader title="Manufacturing Yield %" icon="📊" />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        <Pill label="Avg Yield" value={`${avgYield}%`} color="#10b981" />
        <Pill label={`Below ${threshold}%`} value={below} color="#ef4444" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ color: '#94a3b8', fontSize: 12 }}>Threshold %</label>
          <input type="number" value={threshold} min={0} max={100} onChange={e => setThreshold(Number(e.target.value))}
            style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px', fontSize: 13, width: 80 }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect
          options={months}
          selected={selectedMonths}
          onChange={setSelectedMonths}
          label="Month (Actual Complete):"
          allLabel="All months"
          minWidth={180}
        />
        <MultiSelect
          options={items}
          selected={selectedItems}
          onChange={setSelectedItems}
          label="Item Number:"
          allLabel="All items"
          minWidth={180}
        />
        <input placeholder="Search by Item Number or WO Number…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '5px 12px', fontSize: 13, width: 280 }} />
        {hasFilters && (
          <button onClick={() => { setSelectedMonths(new Set()); setSelectedItems(new Set()); setSearch(''); }}
            style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            Clear filters
          </button>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="wo" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
            <ReferenceLine y={threshold} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: `${threshold}%`, fill: '#f59e0b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              content={({ payload }) => payload?.length ? (
                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                  <div style={{ color: '#e2e8f0' }}>WO: {payload[0]?.payload?.wo}</div>
                  <div style={{ color: '#94a3b8' }}>{payload[0]?.payload?.item}</div>
                  <div style={{ color: payload[0]?.value < threshold ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    Yield: {payload[0]?.value}%
                  </div>
                </div>
              ) : null}
            />
            <Bar dataKey="yield">
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.yield < threshold ? '#ef4444' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              {['Item Number','Item Description','Work Order #','Actual Complete Month','WO Qty','Qty Completed','Yield %'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                <td style={td}>{d['Item Number']}</td>
                <td style={td}>{d['Item Description']}</td>
                <td style={td}>{d['Work Order Number']}</td>
                <td style={td}>{d.month}</td>
                <td style={td}>{d['Work Order Quantity']?.toLocaleString()}</td>
                <td style={td}>{d['Quantity Completed']?.toLocaleString()}</td>
                <td style={{ ...td, color: d.yieldPct < threshold ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                  {d.yieldPct !== null ? `${d.yieldPct}%` : '—'}
                </td>
              </tr>
            ))}
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
