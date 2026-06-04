import { useMemo, useState } from 'react';
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { monthLabel, sortedMonths } from '../utils/dataHelpers';
import SectionHeader from './SectionHeader';
import MultiSelect from './MultiSelect';

function toISO(d) { return d?.replace(/\//g, '-'); }

function Pill({ label, value, color }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '8px 16px', borderLeft: `3px solid ${color || '#475569'}` }}>
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const ITEM_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];
const th = { padding: '8px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
const td = { padding: '7px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' };
const clearBtnStyle = { background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 13 };
const TOOLTIP = { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 };

export default function Distribution({ data }) {
  // ── Shared option lists ───────────────────────────────────────────────────
  const allCustomers = useMemo(() =>
    [...new Set(data.map(r => r['Customer Name']).filter(Boolean))].sort(), [data]);

  const allMonths = useMemo(() => {
    const ms = data.map(r => monthLabel(toISO(r['Shipped Date']))).filter(m => m && m !== 'Unknown');
    return sortedMonths(ms);
  }, [data]);

  const allItems = useMemo(() =>
    [...new Set(data.map(r => r['Item']).filter(Boolean))].sort(), [data]);

  // ── OTIF state ────────────────────────────────────────────────────────────
  const [otifCustomers, setOtifCustomers] = useState(new Set());
  const [otifMonths,    setOtifMonths]    = useState(new Set());
  const [orderType,     setOrderType]     = useState('All');

  // ── Volume state ──────────────────────────────────────────────────────────
  const [volCustomers, setVolCustomers] = useState(new Set());
  const [volItems,     setVolItems]     = useState(new Set());

  // ── Mix state ─────────────────────────────────────────────────────────────
  const [mixMonths, setMixMonths] = useState(new Set());
  const [mixItems,  setMixItems]  = useState(new Set());

  // ── Shipments (grouped) ───────────────────────────────────────────────────
  const shipments = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const key = r['Shipment Number'];
      if (!key) return;
      if (!map[key]) map[key] = {
        shipNum: key,
        orderType: (r['Transfer Order Number'] && !r['Sales Order Number']) ? 'Transfer Order' : 'Sales Order',
        orderNum:  r['Sales Order Number'] ?? r['Transfer Order Number'],
        customer:  r['Customer Name'],
        sched:     r['Scheduled Shipment Date'],
        shipped:   r['Shipped Date'],
        lines: 0, qty: 0,
      };
      map[key].lines++;
      map[key].qty += Number(r['Shipped Quantity']) || 0;
    });
    return Object.values(map).map(s => ({
      ...s,
      delay: (s.sched && s.shipped)
        ? Math.round((new Date(toISO(s.shipped)) - new Date(toISO(s.sched))) / 86400000)
        : null,
      onTime: s.sched && s.shipped && s.shipped <= s.sched,
      month: monthLabel(toISO(s.shipped)),
    }));
  }, [data]);

  // ── OTIF filtered ─────────────────────────────────────────────────────────
  const otifFiltered = useMemo(() => shipments.filter(s => {
    if (otifCustomers.size > 0 && !otifCustomers.has(s.customer)) return false;
    if (otifMonths.size > 0 && !otifMonths.has(s.month)) return false;
    if (orderType === 'Sales'    && s.orderType !== 'Sales Order')    return false;
    if (orderType === 'Transfer' && s.orderType !== 'Transfer Order') return false;
    return true;
  }), [shipments, otifCustomers, otifMonths, orderType]);

  const onTimeCount = otifFiltered.filter(s => s.onTime).length;
  const lateCount   = otifFiltered.length - onTimeCount;
  const otifPct     = otifFiltered.length > 0 ? ((onTimeCount / otifFiltered.length) * 100).toFixed(1) : 'N/A';
  const otifColor   = otifPct === 'N/A' ? '#64748b' : Number(otifPct) >= 95 ? '#10b981' : Number(otifPct) >= 80 ? '#f59e0b' : '#ef4444';

  const otifByMonth = useMemo(() => {
    const map = {};
    otifFiltered.forEach(s => {
      if (!map[s.month]) map[s.month] = { month: s.month, 'On Time': 0, Late: 0 };
      s.onTime ? map[s.month]['On Time']++ : map[s.month].Late++;
    });
    return sortedMonths(Object.keys(map)).map(m => {
      const { 'On Time': ot, Late } = map[m];
      return { month: m, 'On Time': ot, Late, 'OTIF %': ot + Late > 0 ? +((ot / (ot + Late)) * 100).toFixed(1) : 0 };
    });
  }, [otifFiltered]);

  const otifHasFilter = otifCustomers.size > 0 || otifMonths.size > 0 || orderType !== 'All';

  // ── Volume filtered ───────────────────────────────────────────────────────
  const volFiltered = useMemo(() => data.filter(r => {
    if (volCustomers.size > 0 && !volCustomers.has(r['Customer Name'])) return false;
    if (volItems.size > 0 && !volItems.has(r['Item'])) return false;
    return true;
  }), [data, volCustomers, volItems]);

  const volByMonth = useMemo(() => {
    const map = {};
    volFiltered.forEach(r => {
      const m = monthLabel(toISO(r['Shipped Date']));
      if (m === 'Unknown') return;
      if (!map[m]) map[m] = { month: m, qty: 0 };
      map[m].qty += Number(r['Shipped Quantity']) || 0;
    });
    return sortedMonths(Object.keys(map)).map(m => map[m]);
  }, [volFiltered]);

  const totalVolQty = volFiltered.reduce((s, r) => s + (Number(r['Shipped Quantity']) || 0), 0);
  const totalVolShipments = new Set(volFiltered.map(r => r['Shipment Number']).filter(Boolean)).size;

  // ── Mix filtered ──────────────────────────────────────────────────────────
  const mixFiltered = useMemo(() => data.filter(r => {
    const m = monthLabel(toISO(r['Shipped Date']));
    if (mixMonths.size > 0 && !mixMonths.has(m)) return false;
    if (mixItems.size > 0 && !mixItems.has(r['Item'])) return false;
    return true;
  }), [data, mixMonths, mixItems]);

  // Per-item totals for table
  const mixByItem = useMemo(() => {
    const map = {};
    mixFiltered.forEach(r => {
      const k = r['Item']; if (!k) return;
      if (!map[k]) map[k] = { item: k, desc: r['Description'] || '', qty: 0 };
      map[k].qty += Number(r['Shipped Quantity']) || 0;
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [mixFiltered]);

  // Stacked bar chart: top 8 items per month
  const mixChartData = useMemo(() => {
    const topItems = mixByItem.slice(0, 8).map(i => i.item);
    const map = {};
    mixFiltered.filter(r => topItems.includes(r['Item'])).forEach(r => {
      const m = monthLabel(toISO(r['Shipped Date']));
      if (m === 'Unknown') return;
      if (!map[m]) { map[m] = { month: m }; topItems.forEach(i => { map[m][i] = 0; }); }
      map[m][r['Item']] = (map[m][r['Item']] || 0) + (Number(r['Shipped Quantity']) || 0);
    });
    return { rows: sortedMonths(Object.keys(map)).map(m => map[m]), items: topItems };
  }, [mixFiltered, mixByItem]);

  const mixTotal = mixByItem.reduce((s, r) => s + r.qty, 0);
  const mixHasFilter = mixMonths.size > 0 || mixItems.size > 0;

  return (
    <div>
      {/* ── OTIF ──────────────────────────────────────────────────────────── */}
      <div id="dist-otif"><SectionHeader title="OTIF Delivery Performance" icon="🎯" /></div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Pill label="Total Shipments" value={otifFiltered.length} color="#3b82f6" />
        <Pill label="On Time"         value={onTimeCount}         color="#10b981" />
        <Pill label="Late"            value={lateCount}           color="#ef4444" />
        <Pill label="OTIF %"          value={otifPct === 'N/A' ? '—' : `${otifPct}%`} color={otifColor} />
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={allCustomers} selected={otifCustomers} onChange={setOtifCustomers} label="Customer:"        allLabel="All customers" minWidth={200} />
        <MultiSelect options={allMonths}    selected={otifMonths}    onChange={setOtifMonths}    label="Month (Shipped):" allLabel="All months"    minWidth={180} />
        <div style={{ display: 'flex', gap: 4 }}>
          {[['All','All Orders'],['Sales','Sales Orders'],['Transfer','Transfer Orders']].map(([val, lbl]) => (
            <button key={val} onClick={() => setOrderType(val)} style={{
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: orderType === val ? '#3b82f6' : '#1e293b',
              color:      orderType === val ? '#fff'    : '#94a3b8',
              border: `1px solid ${orderType === val ? '#3b82f6' : '#334155'}`,
            }}>{lbl}</button>
          ))}
        </div>
        {otifHasFilter && (
          <button onClick={() => { setOtifCustomers(new Set()); setOtifMonths(new Set()); setOrderType('All'); }} style={clearBtnStyle}>Clear filters</button>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={otifByMonth} margin={{ top: 5, right: 50, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis yAxisId="left"  tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip contentStyle={TOOLTIP} labelStyle={{ color: '#e2e8f0', fontWeight: 600 }} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            <Bar  yAxisId="left"  dataKey="On Time" stackId="a" fill="#10b981" />
            <Bar  yAxisId="left"  dataKey="Late"    stackId="a" fill="#ef4444" radius={[3,3,0,0]} />
            <Line yAxisId="right" type="monotone"   dataKey="OTIF %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>{otifFiltered.length} shipments shown</div>
      <div style={{ overflowX: 'auto', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#1e293b' }}>
            {['Order Type','Order Number','Shipment #','Customer','Lines','Shipped Qty','Scheduled Ship Date','Shipped Date','Delay (days)','Status'].map(h => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {otifFiltered.map((s, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                <td style={td}>{s.orderType}</td>
                <td style={td}>{s.orderNum ?? '—'}</td>
                <td style={td}>{s.shipNum}</td>
                <td style={td}>{s.customer ?? '—'}</td>
                <td style={td}>{s.lines}</td>
                <td style={td}>{s.qty.toLocaleString()}</td>
                <td style={td}>{s.sched ?? '—'}</td>
                <td style={td}>{s.shipped ?? '—'}</td>
                <td style={{ ...td, color: s.delay == null ? '#64748b' : s.delay > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                  {s.delay == null ? '—' : s.delay > 0 ? `+${s.delay}` : s.delay}
                </td>
                <td style={{ ...td, color: s.onTime ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {s.onTime ? 'On Time' : 'Late'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Volume Shipped ────────────────────────────────────────────────── */}
      <div id="dist-volume"><SectionHeader title="Volume Shipped" icon="📦" /></div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Pill label="Total Shipped Qty" value={totalVolQty.toLocaleString()} color="#3b82f6" />
        <Pill label="Total Shipments"   value={totalVolShipments}            color="#8b5cf6" />
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={allCustomers} selected={volCustomers} onChange={setVolCustomers} label="Customer:" allLabel="All customers" minWidth={200} />
        <MultiSelect options={allItems}     selected={volItems}     onChange={setVolItems}     label="Item:"     allLabel="All items"    minWidth={180} />
        {(volCustomers.size > 0 || volItems.size > 0) && (
          <button onClick={() => { setVolCustomers(new Set()); setVolItems(new Set()); }} style={clearBtnStyle}>Clear filters</button>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 32 }}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={volByMonth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip contentStyle={TOOLTIP} labelStyle={{ color: '#e2e8f0', fontWeight: 600 }} formatter={v => [v.toLocaleString(), 'Shipped Qty']} />
            <Bar dataKey="qty" name="Shipped Qty" fill="#3b82f6" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Product Mix / Qty Shipped ─────────────────────────────────────── */}
      <div id="dist-mix"><SectionHeader title="Product Mix / Quantity Shipped" icon="🏷️" /></div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <MultiSelect options={allMonths} selected={mixMonths} onChange={setMixMonths} label="Month (Shipped):" allLabel="All months" minWidth={180} />
        <MultiSelect options={allItems}  selected={mixItems}  onChange={setMixItems}  label="Item:"           allLabel="All items"   minWidth={180} />
        {mixHasFilter && (
          <button onClick={() => { setMixMonths(new Set()); setMixItems(new Set()); }} style={clearBtnStyle}>Clear filters</button>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Top 8 items stacked by month</div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={mixChartData.rows} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip contentStyle={TOOLTIP} labelStyle={{ color: '#e2e8f0', fontWeight: 600 }} formatter={(v, n) => [v.toLocaleString(), n]} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            {mixChartData.items.map((item, idx) => (
              <Bar key={item} dataKey={item} stackId="a" fill={ITEM_COLORS[idx % ITEM_COLORS.length]}
                radius={idx === mixChartData.items.length - 1 ? [3,3,0,0] : [0,0,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>{mixByItem.length} items shown</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#1e293b' }}>
            {['Item','Description','Shipped Qty','% of Total'].map(h => <th key={h} style={th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {mixByItem.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : '#1e293b' }}>
                <td style={td}>{r.item}</td>
                <td style={td}>{r.desc}</td>
                <td style={td}>{r.qty.toLocaleString()}</td>
                <td style={td}>{mixTotal > 0 ? ((r.qty / mixTotal) * 100).toFixed(1) : '0.0'}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
