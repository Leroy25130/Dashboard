import { useState, useRef, useCallback } from 'react';
import { parseExcelFile } from '../context/DataContext';

const FILE_TYPES = {
  wo:         { label: 'Work Order Detail Report', color: '#3b82f6', icon: '📋' },
  absorption: { label: 'AOP / ACT Volume File',    color: '#10b981', icon: '🎯' },
  cyclecount: { label: 'Cycle Count Report',        color: '#f59e0b', icon: '🔄' },
};

export default function UploadPanel({ onUpdate, lastUpdated, onClose }) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]     = useState(null); // { type: 'success'|'error', msg, fileType }
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef(null);

  const process = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    setStatus(null);
    try {
      const result = await parseExcelFile(file);
      onUpdate(result.type, result.data, file.name);
      setStatus({ type: 'success', fileType: result.type, msg: `"${file.name}" loaded successfully.` });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  }, [onUpdate]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) process(file);
  }, [process]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1e293b', borderRadius: 16, width: 520, maxWidth: '95vw', padding: 32, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', border: '1px solid #334155' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9' }}>Update Dashboard Data</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Drop an Excel file to refresh the KPIs</div>
          </div>
          <button onClick={onClose}
            style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#3b82f6' : '#334155'}`,
            borderRadius: 12, padding: '36px 24px', textAlign: 'center', cursor: 'pointer',
            background: dragging ? '#1d3a5e' : '#0f172a', transition: 'all 0.2s', marginBottom: 20,
          }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{loading ? '⏳' : '📂'}</div>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
            {loading ? 'Parsing file…' : dragging ? 'Release to upload' : 'Drag & drop your Excel file here'}
          </div>
          {!loading && (
            <div style={{ color: '#64748b', fontSize: 13 }}>or <span style={{ color: '#3b82f6', textDecoration: 'underline' }}>click to browse</span></div>
          )}
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) process(e.target.files[0]); e.target.value = ''; }} />
        </div>

        {/* Status message */}
        {status && (
          <div style={{
            borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13,
            background: status.type === 'success' ? '#052e16' : '#2d0a0a',
            border: `1px solid ${status.type === 'success' ? '#16a34a' : '#b91c1c'}`,
            color: status.type === 'success' ? '#4ade80' : '#f87171',
          }}>
            {status.type === 'success' && (
              <span style={{ fontWeight: 600, marginRight: 6 }}>
                {FILE_TYPES[status.fileType]?.icon} {FILE_TYPES[status.fileType]?.label} updated.
              </span>
            )}
            {status.msg}
          </div>
        )}

        {/* Accepted file types */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Accepted files</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(FILE_TYPES).map(([key, { label, color, icon }]) => {
              const lu = lastUpdated?.[key];
              return (
                <div key={key} style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', borderLeft: `3px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{icon} {label}</div>
                    {lu ? (
                      <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                        Last updated: {fmtDate(lu.at)} · {lu.filename}
                      </div>
                    ) : (
                      <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>Using default data</div>
                    )}
                  </div>
                  {lu && <span style={{ color: '#10b981', fontSize: 18 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ color: '#475569', fontSize: 11, textAlign: 'center' }}>
          Data is stored in your browser. Refresh the page to reload.
        </div>
      </div>
    </div>
  );
}
