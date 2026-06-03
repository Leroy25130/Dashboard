export default function SectionHeader({ title, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 36 }}>
      {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#e2e8f0' }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: '#334155', marginLeft: 8 }} />
    </div>
  );
}
