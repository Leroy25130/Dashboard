import { useMemo, useState } from 'react';
import SectionHeader from './SectionHeader';

const STATUS_COLOR = { Closed: '#10b981', Released: '#3b82f6', Unreleased: '#f59e0b', Cancelled: '#ef4444' };

export default function WorkOrderStatus({ data }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter(d =>
      !q || d['Item Number']?.toLowerCase().includes(q) ||
      String(d['Work Order Number']).toLowerCase().includes(q)
    );
  }, [data, search]);

  const statusCounts = useMemo(() => {
    const counts = {};
    data.forEach(d => { const s = d['Work Order Status'] || 'Unknown'; counts[s] = (counts[s] || 0) + 1; });
    return counts;
  }, [data]);

  return (
    <div>
      <SectionHeader title="Work Orders Status" icon="📋" />

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {Object.entries(statusCounts).map(([s, c]) => (
          <div key={s} style={{ background: '#1e293b', borderRadius: 8, padding: '8px 16px', borderLeft: `3px solid ${STATUS_COLOR[s] || '#64748b'}` }}>
            <span style={{ color: STATUS_COLOR[s] || '#94a3b8', fontWeight: 600 }}>{s}</span>
            <span style={{ color: '#e2e8f0', marginLeft: 8, fontWeight: 700 }}>{c}</span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <input placeholder="Search by Item Number or WO Number…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '6px 12px', fontSize: 13, width: 300 }} />
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

const th = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
const td = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' };
