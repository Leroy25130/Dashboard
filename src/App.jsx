import { useMemo, useState } from 'react';
import rawData from './data/wo_data.json';
import KPICard from './components/KPICard';
import VolumeReleased from './components/VolumeReleased';
import VolumeManufactured from './components/VolumeManufactured';
import WorkOrderStatus from './components/WorkOrderStatus';
import Timeliness from './components/Timeliness';
import Yield from './components/Yield';
import Routing from './components/Routing';

const SECTIONS = [
  { id: 'released',     label: '📦 Volume Released' },
  { id: 'manufactured', label: '🏭 Volume Manufactured' },
  { id: 'status',       label: '📋 WO Status' },
  { id: 'timeliness',   label: '⏱️ Timeliness' },
  { id: 'yield',        label: '📊 Yield' },
  { id: 'routing',      label: '⚙️ Routing' },
];

export default function App() {
  const data = useMemo(() => rawData.filter(d => (d['Quantity Completed'] || 0) > 0), []);

  const totalQtyCompleted = useMemo(() => data.reduce((s, d) => s + (d['Quantity Completed'] || 0), 0), [data]);
  const avgYield = useMemo(() => {
    const vals = data.filter(d => d['Work Order Quantity'] > 0)
      .map(d => (d['Quantity Completed'] / d['Work Order Quantity']) * 100);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/A';
  }, [data]);
  const lateWOs = useMemo(() =>
    data.filter(d => d['Complete Date'] && d['Actual Complete Date'] &&
      new Date(d['Actual Complete Date']) > new Date(d['Complete Date'])).length,
    [data]);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 32px', display: 'flex', alignItems: 'center', height: 56, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
          Caldera Medical · Production Dashboard
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#64748b', fontSize: 13 }}>Manufacturing</div>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        {/* Sidebar */}
        <div style={{ width: 196, background: '#1e293b', borderRight: '1px solid #334155', padding: '20px 0', flexShrink: 0, position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
          <div style={{ padding: '0 16px 10px', color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Manufacturing
          </div>
          {SECTIONS.map(s => (
            <button key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', color: '#94a3b8', border: 'none', borderLeft: '3px solid transparent', padding: '8px 16px', cursor: 'pointer', fontSize: 13, transition: 'color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.borderLeftColor = '#3b82f6'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderLeftColor = 'transparent'; }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#f1f5f9' }}>Manufacturing KPIs</h1>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
              {data.length} work orders · report date: June 2026
            </div>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
            <KPICard title="Work Orders" value={data.length} color="#3b82f6" />
            <KPICard title="Total Qty Completed" value={totalQtyCompleted.toLocaleString()} color="#10b981" />
            <KPICard title="Avg Yield" value={`${avgYield}%`} color="#8b5cf6" sub="Qty Completed / WO Qty" />
            <KPICard title="Late WOs" value={lateWOs} color="#ef4444" sub="Actual > Planned complete" />
          </div>

          <div id="released"><VolumeReleased data={data} /></div>
          <div id="manufactured"><VolumeManufactured data={data} /></div>
          <div id="status"><WorkOrderStatus data={data} /></div>
          <div id="timeliness"><Timeliness data={data} /></div>
          <div id="yield"><Yield data={data} /></div>
          <div id="routing"><Routing data={data} /></div>

          <div style={{ height: 60 }} />
        </div>
      </div>
    </div>
  );
}
