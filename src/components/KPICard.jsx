export default function KPICard({ title, value, sub, color = '#3b82f6' }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', borderLeft: `4px solid ${color}`, minWidth: 160 }}>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
