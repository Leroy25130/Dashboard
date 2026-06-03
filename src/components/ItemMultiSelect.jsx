import { useState, useRef, useEffect } from 'react';

export default function ItemMultiSelect({ items, selected, onChange, label = 'Item Number:' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (item) => {
    const next = new Set(selected);
    next.has(item) ? next.delete(item) : next.add(item);
    onChange(next);
  };

  const displayLabel = selected.size === 0 ? 'All items'
    : selected.size === 1 ? [...selected][0]
    : `${selected.size} items selected`;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <label style={{ color: '#94a3b8', fontSize: 13, marginRight: 8 }}>{label}</label>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '5px 12px', fontSize: 13, cursor: 'pointer', minWidth: 200, textAlign: 'left', display: 'inline-flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span>{displayLabel}</span>
        <span style={{ color: '#64748b', fontSize: 10 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, zIndex: 50, minWidth: 240, maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #334155', display: 'flex', gap: 8 }}>
            <button onClick={() => onChange(new Set())}
              style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>
              Clear all
            </button>
            <button onClick={() => onChange(new Set(items))}
              style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>
              Select all
            </button>
          </div>
          {items.map(item => (
            <label key={item}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', cursor: 'pointer', borderBottom: '1px solid #0f172a' }}
              onMouseEnter={e => e.currentTarget.style.background = '#334155'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <input type="checkbox" checked={selected.has(item)} onChange={() => toggle(item)}
                style={{ accentColor: '#3b82f6', width: 14, height: 14, cursor: 'pointer' }} />
              <span style={{ color: '#e2e8f0', fontSize: 13 }}>{item}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
