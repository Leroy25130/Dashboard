import { useMemo, useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import KPICard from './components/KPICard';
import VolumeReleased from './components/VolumeReleased';
import VolumeManufactured from './components/VolumeManufactured';
import WorkOrderStatus from './components/WorkOrderStatus';
import Timeliness from './components/Timeliness';
import Yield from './components/Yield';
import Routing from './components/Routing';
import Absorption from './components/Absorption';
import UploadPanel from './components/UploadPanel';
import Overview from './pages/Overview';

const SECTIONS = [
  { id: 'released',     label: '📦 Volume Released' },
  { id: 'manufactured', label: '🏭 Volume Manufactured' },
  { id: 'status',       label: '📋 WO Status' },
  { id: 'timeliness',   label: '⏱️ Timeliness' },
  { id: 'yield',        label: '📊 Yield' },
  { id: 'routing',      label: '⚙️ Routing' },
  { id: 'absorption',   label: '🎯 Actual vs AOP' },
];

const NAV_TABS = [
  { id: 'summary',        label: '🗂 Manufacturing Summary' },
  { id: 'manufacturing',  label: '🔍 Mfg Detail View' },
];

function Dashboard() {
  const { woData, absorptionData, updateWO, updateAbsorption, lastUpdated } = useData();
  const [showUpload, setShowUpload] = useState(false);
  const [activePage, setActivePage] = useState('summary');

  const data = useMemo(() => woData, [woData]);

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

  const handleUpdate = (type, newData, filename) => {
    if (type === 'wo')         updateWO(newData, filename);
    if (type === 'absorption') updateAbsorption(newData, filename);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 32px', display: 'flex', alignItems: 'center', height: 56, position: 'sticky', top: 0, zIndex: 100, gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: '#f1f5f9', letterSpacing: '-0.3px', marginRight: 16 }}>
          Caldera Medical · Production
        </div>

        {/* Page tabs */}
        {NAV_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActivePage(tab.id)}
            style={{
              background: activePage === tab.id ? '#3b82f6' : 'transparent',
              color: activePage === tab.id ? '#fff' : '#94a3b8',
              border: activePage === tab.id ? 'none' : '1px solid #334155',
              borderRadius: 7, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              transition: 'all 0.15s',
            }}>
            {tab.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <button onClick={() => setShowUpload(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          ⬆️ Update Data
        </button>
      </div>

      {/* ── Manufacturing Summary (overview) ── */}
      {activePage === 'summary' && (
        <div style={{ overflowY: 'auto' }}>
          <Overview />
        </div>
      )}

      {/* ── Detail View ── */}
      {activePage === 'manufacturing' && (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
          {/* Sidebar */}
          <div style={{ width: 196, background: '#1e293b', borderRight: '1px solid #334155', padding: '20px 0', flexShrink: 0, position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
            <div style={{ padding: '0 16px 10px', color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Manufacturing
            </div>
            {SECTIONS.map(s => (
              <button key={s.id}
                onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', color: '#94a3b8', border: 'none', borderLeft: '3px solid transparent', padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}
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
                {data.length} work orders
                {lastUpdated?.wo
                  ? ` · updated ${new Date(lastUpdated.wo.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : ' · default data'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
              <KPICard title="Work Orders"         value={data.length}                     color="#3b82f6" />
              <KPICard title="Total Qty Completed" value={totalQtyCompleted.toLocaleString()} color="#10b981" />
              <KPICard title="Avg Yield"           value={`${avgYield}%`}                    color="#8b5cf6" sub="Qty Completed / WO Qty" />
              <KPICard title="Late WOs"            value={lateWOs}                           color="#ef4444" sub="Actual > Planned complete" />
            </div>

            <div id="released"><VolumeReleased data={data} /></div>
            <div id="manufactured"><VolumeManufactured data={data} /></div>
            <div id="status"><WorkOrderStatus data={data} /></div>
            <div id="timeliness"><Timeliness data={data} /></div>
            <div id="yield"><Yield data={data} /></div>
            <div id="routing"><Routing data={data} /></div>
            <div id="absorption"><Absorption data={absorptionData} /></div>

            <div style={{ height: 60 }} />
          </div>
        </div>
      )}

      {showUpload && (
        <UploadPanel
          onUpdate={handleUpdate}
          lastUpdated={lastUpdated}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return <DataProvider><Dashboard /></DataProvider>;
}
