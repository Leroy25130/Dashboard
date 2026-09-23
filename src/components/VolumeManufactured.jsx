import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { monthLabel, sortedMonths } from '../utils/dataHelpers';
import SectionHeader from './SectionHeader';
import ItemMultiSelect from './ItemMultiSelect';
import MultiSelect from './MultiSelect';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6','#a78bfa','#fb923c','#34d399','#60a5fa','#fbbf24'];

const th = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
const td = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' };
const clearBtn = { background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 };

export default function VolumeManufactured({ data }) {
  const [selectedItems,  setSelectedItems]  = useState(new Set());
  const [selectedMonths, setSelectedMonths] = useState(new Set());

  const items = useMemo(() => [...new Set(data.map(d => d['Item Number']))].sort(), [data]);

  // All months available in the data
  const allMonths = useMemo(() => {
    const ms = new Set(data.map(d => monthLabel(d['Start Date'])).filter(m => m && m !== 'Unknown'));
    return sortedMonths([...ms]);
  }, [data]);

  // Filter by item first, then optionally by month
  const itemFiltered = useMemo(() =>
    selectedItems.size === 0 ? data : data.filter(d => selectedItems.has(d['Item Number'])),
    [data, selectedItems]);

  const filtered = useMemo(() =>
    selectedMonths.size === 0
      ? itemFiltered
      : itemFiltered.filter(d => selectedMonths.has(monthLabel(d['Start Date']))),
    [itemFiltered, selectedMonths]);

  const { chartData, itemKeys } = useMemo(() => {
    const byMonthItem = {};
    const allTotals   = {};
    // Build totals over ALL items per month (for accurate label)
    itemFiltered.forEach(d => {
      const m = monthLabel(d['Start Date']);
      if (selectedMonths.size > 0 && !selectedMonths.has(m)) return;
      allTotals[m] = (allTotals[m] || 0) + (d['Work Order Quantity'] || 0);
    });
    filtered.forEach(d => {
      const m   = monthLabel(d['Start Date']);
      const key = d['Item Number'];
      if (!byMonthItem[m]) byMonthItem[m] = {};
      byMonthItem[m][key] = (byMonthItem[m][key] || 0) + (d['Work Order Quantity'] || 0);
    });
    const months   = sortedMonths(Object.keys(byMonthItem));
    const allItems = [...new Set(filtered.map(d => d['Item Number']))].sort();
    const rows = months.map(m => ({ month: m, __total: allTotals[m] || 0, ...byMonthItem[m] }));
    return { chartData: rows, itemKeys: allItems };
  }, [filtered, itemFiltered, selectedMonths]);

  // Grand total over selected months
  const grandTotal = chartData.reduce((s, r) => s + (r.__total || 0), 0);
  const hasFilter  = selectedItems.size > 0 || selectedMonths.size > 0;

  return (
    <div>
      <SectionHeader title="Volume Manufactured per Month" icon="🏭" />

      {/* Grand total pill */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '8px 18px', borderLeft: '3px solid #10b981' }}>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>
            Grand Total{selectedMonths.size > 0 ? ` (${selectedMonths.size} month${selectedMonths.size > 1 ? 's' : ''})` : ' (all months)'}
          </div>
          <div style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700 }}>{grandTotal.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <ItemMultiSelect items={items} selected={selectedItems} onChange={setSelectedItems} />
        <MultiSelect
          options={allMonths}
          selected={selectedMonths}
          onChange={setSelectedMonths}
          label="Month (Start):"
          allLabel="All months"
          minWidth={180}
        />
        {hasFilter && (
          <button onClick={() => { setSelectedItems(new Set()); setSelectedMonths(new Set()); }} style={clearBtn}>
            Clear filters
          </button>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 24, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(v, n) => n === '__total' ? null : [Number(v).toLocaleString(), n]}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} formatter={n => n === '__total' ? null : n} />
            {itemKeys.map((item, i) => {
              const isLast = i === itemKeys.length - 1;
              return (
                <Bar key={item} dataKey={item} stackId="a" fill={COLORS[i % COLORS.length]} radius={isLast ? [3,3,0,0] : [0,0,0,0]}>
                  {isLast && (
                    <LabelList
                      dataKey="__total"
                      position="top"
                      formatter={v => v ? v.toLocaleString() : ''}
                      style={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }}
                    />
                  )}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              {['Item Number','Item Description','Work Order Number','Month (Start Date)','WO Quantity'].map(h => (
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
                <td style={td}>{monthLabel(d['Start Date'])}</td>
                <td style={td}>{d['Work Order Quantity']?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
