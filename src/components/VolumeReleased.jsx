import { useMemo, useState, useRef, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { monthLabel, sortedMonths } from '../utils/dataHelpers';
import SectionHeader from './SectionHeader';
import ItemMultiSelect from './ItemMultiSelect';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6','#a78bfa','#fb923c','#34d399','#60a5fa','#fbbf24'];

export default function VolumeReleased({ data }) {
  const [selectedItems, setSelectedItems] = useState(new Set());

  const items = useMemo(() => [...new Set(data.map(d => d['Item Number']))].sort(), [data]);

  const filtered = useMemo(() =>
    selectedItems.size === 0 ? data : data.filter(d => selectedItems.has(d['Item Number'])),
    [data, selectedItems]);

  const { chartData, itemKeys } = useMemo(() => {
    const monthSet = new Set();
    const byMonthItem = {};
    filtered.forEach(d => {
      const m = monthLabel(d['Actual Complete Date']);
      monthSet.add(m);
      const key = d['Item Number'];
      if (!byMonthItem[m]) byMonthItem[m] = {};
      byMonthItem[m][key] = (byMonthItem[m][key] || 0) + (d['Quantity Completed'] || 0);
    });
    const months = sortedMonths([...monthSet]);
    const allItems = [...new Set(filtered.map(d => d['Item Number']))].sort();
    return { chartData: months.map(m => ({ month: m, ...byMonthItem[m] })), itemKeys: allItems };
  }, [filtered]);

  return (
    <div>
      <SectionHeader title="Volume Released per Month" icon="📦" />

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <ItemMultiSelect items={items} selected={selectedItems} onChange={setSelectedItems} />
        {selectedItems.size > 0 && (
          <button onClick={() => setSelectedItems(new Set())}
            style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            Clear filters
          </button>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            {itemKeys.map((item, i) => (
              <Bar key={item} dataKey={item} stackId="a" fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              <th style={th}>Item Number</th>
              <th style={th}>Month (Actual Complete)</th>
              <th style={th}>Qty Completed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                <td style={td}>{d['Item Number']}</td>
                <td style={td}>{monthLabel(d['Actual Complete Date'])}</td>
                <td style={td}>{d['Quantity Completed']?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
const td = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' };
