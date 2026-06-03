import { useMemo, useState } from 'react';
import SectionHeader from './SectionHeader';

const STATUS_COLOR = { Closed: '#10b981', Released: '#3b82f6', Unreleased: '#f59e0b', Cancelled: '#ef4444' };

export default function WorkOrderStatus({ data }) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSeq, setSelectedSeq] = useState('All');

  const statuses = useMemo(() => [...new Set(data.map(d => d['Work Order Status'] || 'Unknown'))].sort(), [data]);
  const sequences = useMemo(() => {
    const vals = [...new Set(data.map(d => {
      const v = d['Current Operation Sequence'];
      return v != null ? String(v) : 'None';
    }))].sort((a, b) => {
      if (a === 'None') return 1;
      if (b === 'None') return -1;
      return Number(a) - Number(b);
    });
    return ['All', ...vals];
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter(d => {
      const seq = d['Current Operation Sequence'] != null ? String(d['Current Operation Sequence']) : 'None';
      return (selectedStatus === 'All' || (d['Work Order Status'] || 'Unknown') === selectedStatus) &&
             (selectedSeq === 'All' || seq === selectedSeq) &&
             (!q || d['Item Number']?.toLowerCase().includes(q) || String(d['Work Order Number']).toLowerCase().includes(q));
    });
  }, [data, search, selectedStatus, selectedSeq]);

  // Status counts reflect current seq + search filters (not the status filter itself)
  const statusCounts = useMemo(() => {
    const q = search.toLowerCase();
    const counts = {};
    data.forEach(d => {
      const seq = d['Current Operation Sequence'] != null ? String(d['Current Operation Sequence']) : 'None';
      if (selectedSeq !== 'All' && seq !== selectedSeq) return;
      if (q && !d['Item Number']?.toLowerCase().includes(q) && !String(d['Work Order Number']).toLowerCase().includes(q)) return;
      const s = d['Work Order Status'] || 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [data, selectedSeq, search]);

  const clearAll = selectedStatus !== 'All' || selectedSeq !== 'All' || search;

  return (
    <div>
      <SectionHeader title="Work Orders Status" icon="📋" />

      {/* Clickable status pills */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {statuses.map(s => {
          const count = statusCounts[s] || 0;
          const active = selectedStatus === s;
          const color = STATUS_COLOR[s] || '#64748b';
          return (
            <button key={s} onClick={() => setSelectedStatus(active ? 'All' : s)}
              style={{
                background: active ? `${color}22` : '#1e293b',
                border: `1.5px solid ${active ? color : '#334155'}`,
                borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}>
              <span style={{ color, fontWeight: 600, fontSize: 13 }}>{s}</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label style={labelStyle}>Current Op Sequence:</label>
          <select value={selectedSeq} onChange={e => setSelectedSeq(e.target.value)} style={selectStyle}>
            {sequences.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All' : s === 'None' ? 'None (blank)' : s}</option>
            ))}
          </select>
        </div>
        <input placeholder="Search by Item Number or WO Number…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '5px 12px', fontSize: 13, width: 280 }} />
        {clearAll && (
          <button onClick={() => { setSelectedStatus('All'); setSelectedSeq('All'); setSearch(''); }}
            style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
            Clear filters
          </button>
        )}
      </div>

      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>
        {filtered.length} work order{filtered.length !== 1 ? 's' : ''} shown
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              {['Item Number','Work Order Number','Current Op Seq','Current Op Name','WO Status'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                <td style={td}>{d['Item Number']}</td>
                <td style={td}>{d['Work Order Number']}</td>
                <td style={td}>{d['Current Operation Sequence'] ?? '—'}</td>
                <td style={td}>{d['Current Operation Name'] || '—'}</td>
                <td style={td}>
                  <span style={{ color: STATUS_COLOR[d['Work Order Status']] || '#94a3b8', fontWeight: 600 }}>
                    {d['Work Order Status']}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle = { color: '#94a3b8', fontSize: 13, marginRight: 8 };
const selectStyle = { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '5px 10px', fontSize: 13 };
const th = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
const td = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' };
