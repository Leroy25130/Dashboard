import { useMemo, useState } from 'react';
import SectionHeader from './SectionHeader';
import MultiSelect from './MultiSelect';

const STATUS_COLOR = { Closed: '#10b981', Released: '#3b82f6', Completed: '#06b6d4', Canceled: '#ef4444', 'On Hold': '#f59e0b' };

export default function WorkOrderStatus({ data }) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedSeqs, setSelectedSeqs] = useState(new Set());
  const [selectedOpName, setSelectedOpName] = useState('All');

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
    return vals;
  }, [data]);

  const opNames = useMemo(() => {
    const vals = [...new Set(data.map(d => {
      const v = d['Current Operation Name'];
      return v != null && v !== '' ? String(v) : 'None';
    }))].sort((a, b) => {
      if (a === 'None') return 1;
      if (b === 'None') return -1;
      return a.localeCompare(b);
    });
    return ['All', ...vals];
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter(d => {
      const seq    = d['Current Operation Sequence'] != null ? String(d['Current Operation Sequence']) : 'None';
      const opName = d['Current Operation Name'] != null && d['Current Operation Name'] !== '' ? String(d['Current Operation Name']) : 'None';
      return (selectedStatus === 'All' || (d['Work Order Status'] || 'Unknown') === selectedStatus) &&
             (selectedSeqs.size === 0 || selectedSeqs.has(seq)) &&
             (selectedOpName === 'All' || opName === selectedOpName) &&
             (!q || d['Item Number']?.toLowerCase().includes(q) || String(d['Work Order Number']).toLowerCase().includes(q));
    });
  }, [data, search, selectedStatus, selectedSeqs, selectedOpName]);

  // Status counts reflect all active filters except the status pill itself
  const statusCounts = useMemo(() => {
    const q = search.toLowerCase();
    const counts = {};
    data.forEach(d => {
      const seq    = d['Current Operation Sequence'] != null ? String(d['Current Operation Sequence']) : 'None';
      const opName = d['Current Operation Name'] != null && d['Current Operation Name'] !== '' ? String(d['Current Operation Name']) : 'None';
      if (selectedSeqs.size > 0 && !selectedSeqs.has(seq)) return;
      if (selectedOpName !== 'All' && opName !== selectedOpName) return;
      if (q && !d['Item Number']?.toLowerCase().includes(q) && !String(d['Work Order Number']).toLowerCase().includes(q)) return;
      const s = d['Work Order Status'] || 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [data, selectedSeqs, selectedOpName, search]);

  const clearAll = selectedStatus !== 'All' || selectedSeqs.size > 0 || selectedOpName !== 'All' || search;

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
        <MultiSelect
          options={sequences}
          selected={selectedSeqs}
          onChange={setSelectedSeqs}
          label="Current Op Sequence:"
          allLabel="All sequences"
          minWidth={180}
        />
        <div>
          <label style={labelStyle}>Current Op Name:</label>
          <select value={selectedOpName} onChange={e => setSelectedOpName(e.target.value)} style={selectStyle}>
            {opNames.map(n => (
              <option key={n} value={n}>{n === 'All' ? 'All' : n === 'None' ? 'None (blank)' : n}</option>
            ))}
          </select>
        </div>
        <input placeholder="Search by Item Number or WO Number…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '5px 12px', fontSize: 13, width: 240 }} />
        {clearAll && (
          <button onClick={() => { setSelectedStatus('All'); setSelectedSeqs(new Set()); setSelectedOpName('All'); setSearch(''); }}
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
